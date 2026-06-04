import re
from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

from .data_processing import load_movielens, basic_preprocess
import os
from typing import Optional
try:
    from .cf import train_svd_and_item_sim
    HAS_CF = True
except Exception:
    HAS_CF = False


class ContentModel:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df: Optional[pd.DataFrame] = None
        self.tfidf = None
        self.tfidf_matrix = None
        self.sim_matrix = None
        self.indices = None

    def build(self):
        df = load_movielens(self.csv_path)
        df = basic_preprocess(df)
        # build combined field
        df['combined'] = df.apply(lambda x: (str(x.get('directors','')) + ' ' + str(x.get('actors','')) + ' ' + str(x.get('genres',''))), axis=1)
        df['combined'] = df['combined'].str.lower()
        df['combined'] = df['combined'].str.replace('[^\\w\\s]', '', regex=True)
        self.df = df.reset_index(drop=True)

        self.tfidf = TfidfVectorizer(analyzer='word', ngram_range=(1,3), min_df=1, stop_words='english')
        self.tfidf_matrix = self.tfidf.fit_transform(self.df['combined'])
        self.sim_matrix = linear_kernel(self.tfidf_matrix, self.tfidf_matrix)
        self.indices = pd.Series(self.df.index, index=self.df.title.str.lower())

        # try to load precomputed collaborative similarity from ml/models
        self.collab_sim = None
        self.movieid_to_collab_index = None
        csv_dir = os.path.dirname(os.path.abspath(self.csv_path))
        models_dir = os.path.join(csv_dir, 'ml', 'models')
        sim_path = os.path.join(models_dir, 'cf_sim.npy')
        idmap_path = os.path.join(models_dir, 'id_to_index.json')
        if os.path.exists(sim_path) and os.path.exists(idmap_path):
            try:
                import json
                self.collab_sim = np.load(sim_path)
                with open(idmap_path, 'r', encoding='utf-8') as f:
                    id_to_index = json.load(f)
                # convert keys to int
                id_to_index = {int(k): int(v) for k, v in id_to_index.items()}
                self.movieid_to_collab_index = id_to_index
                # align collab_sim to content df indices if movie_id column exists
                if 'movie_id' in self.df.columns:
                    n = len(self.df)
                    aligned = np.zeros((n, n), dtype=float)
                    movieid_to_dfindex = {int(r['movie_id']): idx for idx, r in self.df.iterrows() if str(r.get('movie_id','')).isdigit()}
                    for mid, pos in self.movieid_to_collab_index.items():
                        if mid in movieid_to_dfindex:
                            i = movieid_to_dfindex[mid]
                            for other_mid, other_pos in self.movieid_to_collab_index.items():
                                if other_mid in movieid_to_dfindex:
                                    j = movieid_to_dfindex[other_mid]
                                    aligned[i, j] = self.collab_sim[pos, other_pos]
                    self.collab_sim = aligned
            except Exception:
                self.collab_sim = None
                self.movieid_to_collab_index = None

    def _find_title_index(self, title: str) -> Optional[int]:
        if title is None:
            return None
        t = title.lower()
        if t in self.indices:
            return int(self.indices[t])
        # fallback: substring match
        matches = [idx for key, idx in self.indices.items() if t in key]
        return int(matches[0]) if matches else None

    def recommend_by_title(self, title: str, k: int = 10, mood: Optional[str] = None) -> List[Dict]:
        if self.sim_matrix is None:
            raise RuntimeError('Model not built')
        idx = self._find_title_index(title)
        if idx is None:
            return []
        content_scores = self.sim_matrix[idx]
        # if collaborative similarity exists, combine them
        if getattr(self, 'collab_sim', None) is not None:
            collab_scores = self.collab_sim[idx]
            # weighted average: content_weight default 0.6
            content_weight = 0.6
            combined_scores = content_weight * content_scores + (1 - content_weight) * collab_scores
        else:
            combined_scores = content_scores
        sim_scores = list(enumerate(combined_scores))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        recommended = []
        count = 0
        for i, score in sim_scores:
            if i == idx:
                continue
            title_i = self.df.loc[i, 'title']
            explanation = self._explain(idx, i, mood)
            recommended.append({'title': title_i, 'score': float(score), 'explanation': explanation})
            count += 1
            if count >= k:
                break
        return recommended

    def recommend_from_titles(
        self,
        titles: List[str],
        k: int = 10,
        exclude_movie_ids: Optional[List[int]] = None,
        mood: Optional[str] = None,
    ) -> List[Dict]:
        """Aggregate similar picks across multiple seed titles (e.g. a wishlist)."""
        if self.sim_matrix is None or not titles:
            return []

        seed_indices: List[int] = []
        exclude_indices = set()

        for title in titles:
            idx = self._find_title_index(title)
            if idx is None:
                continue
            seed_indices.append(idx)
            exclude_indices.add(idx)

        if 'movie_id' in self.df.columns and exclude_movie_ids:
            for movie_id in exclude_movie_ids:
                try:
                    matches = self.df[self.df['movie_id'] == int(movie_id)]
                    for idx in matches.index.tolist():
                        exclude_indices.add(int(idx))
                except Exception:
                    continue

        if not seed_indices:
            return []

        n = len(self.sim_matrix)
        agg = np.zeros(n, dtype=float)
        for idx in seed_indices:
            scores = self.sim_matrix[idx]
            if getattr(self, 'collab_sim', None) is not None:
                collab_scores = self.collab_sim[idx]
                scores = 0.6 * scores + 0.4 * collab_scores
            agg += scores
        agg /= len(seed_indices)

        for idx in exclude_indices:
            if 0 <= idx < n:
                agg[idx] = -1.0

        sim_scores = sorted(enumerate(agg), key=lambda x: x[1], reverse=True)
        recommended: List[Dict] = []
        best_seed = seed_indices[0]

        for i, score in sim_scores:
            if i in exclude_indices or score < 0:
                continue
            for seed_idx in seed_indices:
                if self.sim_matrix[seed_idx][i] >= self.sim_matrix[best_seed][i]:
                    best_seed = seed_idx
                    break
            title_i = self.df.loc[i, 'title']
            explanation = self._explain(best_seed, i, mood)
            if len(seed_indices) > 1:
                explanation = f"Wishlist match; {explanation}"
            item = {
                'title': title_i,
                'score': float(score),
                'explanation': explanation,
            }
            if 'movie_id' in self.df.columns:
                try:
                    item['movie_id'] = int(self.df.loc[i, 'movie_id'])
                except Exception:
                    item['movie_id'] = None
            recommended.append(item)
            if len(recommended) >= k:
                break

        return recommended

    def recommend_topk(self, k: int = 10, mood: Optional[str] = None) -> List[Dict]:
        # fallback popular by genres matching mood
        if self.df is None:
            return []
        # naive: return first k with mood match
        mood = (mood or '').lower()
        if mood:
            mood_genres = mood_to_genres(mood)
            def mood_score(row):
                genres = str(row.get('genres','')).lower()
                return sum(1 for g in mood_genres if g in genres)
            scored = self.df.copy()
            scored['mood_score'] = scored.apply(mood_score, axis=1)
            scored = scored.sort_values(['mood_score'], ascending=False)
            result = []
            for _, r in scored.head(k).iterrows():
                result.append({'title': r['title'], 'score': float(r.get('mood_score',0)), 'explanation': f"Mood match: {mood}"})
            return result
        else:
            return [{'title': t, 'score': 0.0, 'explanation': 'Top list (no mood)'} for t in self.df['title'].head(k).tolist()]

    def _explain(self, src_idx: int, tgt_idx: int, mood: Optional[str]) -> str:
        src = self.df.loc[src_idx]
        tgt = self.df.loc[tgt_idx]
        reasons = []
        # genre overlap
        src_genres = set(str(src.get('genres','')).lower().split())
        tgt_genres = set(str(tgt.get('genres','')).lower().split())
        gen_overlap = src_genres.intersection(tgt_genres)
        if gen_overlap:
            reasons.append('Shared genres: ' + ', '.join(gen_overlap))
        # actor/director overlap (simple substring match)
        src_people = set(re.findall(r"\\w+", str(src.get('actors','')).lower())) | set(re.findall(r"\\w+", str(src.get('directors','')).lower()))
        tgt_people = set(re.findall(r"\\w+", str(tgt.get('actors','')).lower())) | set(re.findall(r"\\w+", str(tgt.get('directors','')).lower()))
        people_overlap = src_people.intersection(tgt_people)
        if people_overlap:
            sample = ', '.join(list(people_overlap)[:3])
            reasons.append('Shared cast/crew: ' + sample)
        # mood match
        if mood:
            mood_genres = mood_to_genres(mood)
            if any(g in str(tgt.get('genres','')).lower() for g in mood_genres):
                reasons.append(f"Matches mood '{mood}' via {', '.join(mood_genres)}")
        if not reasons:
            return 'Similar content features (TF-IDF similarity)'
        return '; '.join(reasons)


    def get_tfidf_feature_importance(self, title: str, top_n: int = 20) -> Dict[str, float]:
        idx = self._find_title_index(title)
        if idx is None:
            return {}
        tfidf_vector = self.tfidf_matrix[idx].toarray().flatten()
        feature_names = np.array(self.tfidf.get_feature_names_out())
        top_indices = np.argsort(tfidf_vector)[-top_n:][::-1]
        return {
            feature_names[i]: float(tfidf_vector[i])
            for i in top_indices if tfidf_vector[i] > 0
        }

    def get_score_breakdown(self, src_title: str, tgt_title: str) -> Dict:
        src_idx = self._find_title_index(src_title)
        tgt_idx = self._find_title_index(tgt_title)
        if src_idx is None or tgt_idx is None:
            return {}
        content_score = self.sim_matrix[src_idx][tgt_idx]
        collab_score = (self.collab_sim[src_idx][tgt_idx]
                       if getattr(self, 'collab_sim', None) is not None
                       else 0.0)
        content_weight = 0.6
        total_score = content_weight * content_score + (1 - content_weight) * collab_score
        return {
            'content_score': float(content_score),
            'content_weight': content_weight,
            'collaborative_score': float(collab_score),
            'collaborative_weight': (1 - content_weight),
            'total_score': float(total_score),
            'breakdown': [
                {
                    'component': 'content',
                    'score': float(content_score),
                    'percentage': (content_weight * content_score / total_score * 100) if total_score > 0 else 0
                },
                {
                    'component': 'collaborative',
                    'score': float(collab_score),
                    'percentage': ((1-content_weight) * collab_score / total_score * 100) if total_score > 0 else 0
                }
            ]
        }

    def search_by_query(self, query: str, k: int = 10, mood: Optional[str] = None) -> List[Dict]:
        """Search movies by title, genre, cast, or keyword using TF-IDF (no extra ML deps)."""
        if self.tfidf_matrix is None or self.df is None:
            raise RuntimeError('Model not built')

        q = (query or '').strip().lower()
        if not q:
            return []

        query_vec = self.tfidf.transform([q])
        scores = linear_kernel(query_vec, self.tfidf_matrix).flatten().copy()

        for idx, row in self.df.iterrows():
            title = str(row.get('title', '')).lower()
            genres = str(row.get('genres', '')).lower()
            people = f"{row.get('directors', '')} {row.get('actors', '')}".lower()
            if q == title:
                scores[idx] += 2.0
            elif q in title:
                scores[idx] += 1.0
            if q in genres or q in people:
                scores[idx] += 0.3

        mood_genres = mood_to_genres(mood) if mood else []
        ranked_idx = np.argsort(scores)[::-1]

        results: List[Dict] = []
        for idx in ranked_idx:
            if scores[idx] <= 0:
                continue
            row = self.df.iloc[idx]
            if mood_genres:
                genres = str(row.get('genres', '')).lower()
                if not any(g in genres for g in mood_genres):
                    continue
            movie_id = row.get('movie_id')
            results.append({
                'title': row['title'],
                'score': float(scores[idx]),
                'movie_id': int(movie_id) if movie_id is not None and pd.notna(movie_id) else None,
                'explanation': f"Match for '{query}'",
            })
            if len(results) >= k:
                break
        return results


def mood_to_genres(mood: str) -> List[str]:
    mood = (mood or '').lower()
    mapping = {
        'happy': ['comedy', 'family', 'romance'],
        'sad': ['drama', 'romance'],
        'mentally tired': ['comedy', 'family'],
        'excited': ['action', 'thriller', 'adventure'],
        'relaxed': ['drama', 'romance', 'comedy'],
        'curious': ['mystery', 'sci-fi'],
        'emotional': ['drama', 'romance']
    }
    return mapping.get(mood, [])
