"""Semantic search over movie metadata using sentence embeddings."""
import os
import json
from pathlib import Path
from typing import List, Dict, Optional

import numpy as np

from .embeddings import compute_embeddings


def _models_dir() -> str:
    return str(Path(__file__).resolve().parent / 'models')


def _cache_paths():
    base = _models_dir()
    return (
        os.path.join(base, 'movie_embeddings.npy'),
        os.path.join(base, 'movie_embedding_meta.json'),
    )


def build_movie_corpus(df) -> List[str]:
    texts = []
    for _, row in df.iterrows():
        parts = [
            str(row.get('title', '')),
            str(row.get('genres', '')),
            str(row.get('directors', '')),
            str(row.get('actors', '')),
        ]
        texts.append(' '.join(p for p in parts if p).strip())
    return texts


def save_embedding_cache(embeddings: np.ndarray, meta: List[Dict]):
    os.makedirs(_models_dir(), exist_ok=True)
    emb_path, meta_path = _cache_paths()
    np.save(emb_path, embeddings)
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f)


def load_embedding_cache():
    emb_path, meta_path = _cache_paths()
    if not os.path.exists(emb_path) or not os.path.exists(meta_path):
        return None, None
    embeddings = np.load(emb_path)
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    return embeddings, meta


def ensure_embeddings(model, model_name: str = 'all-MiniLM-L6-v2', force: bool = False):
    if not force:
        cached_emb, cached_meta = load_embedding_cache()
        if cached_emb is not None and cached_meta is not None:
            return cached_emb, cached_meta

    texts = build_movie_corpus(model.df)
    meta = [
        {
            'movie_id': int(row['movie_id']) if 'movie_id' in row and row['movie_id'] is not None else None,
            'title': row['title'],
            'genres': row.get('genres'),
        }
        for _, row in model.df.iterrows()
    ]
    embeddings = compute_embeddings(texts, model_name=model_name)
    save_embedding_cache(embeddings, meta)
    return embeddings, meta


def semantic_search(
    model,
    query: str,
    k: int = 10,
    mood: Optional[str] = None,
    model_name: str = 'all-MiniLM-L6-v2',
    use_persisted: bool = True,
) -> List[Dict]:
    from .pipeline import mood_to_genres

    if use_persisted:
        embeddings, meta = load_embedding_cache()
        if embeddings is None:
            embeddings, meta = ensure_embeddings(model, model_name=model_name)
    else:
        embeddings, meta = ensure_embeddings(model, model_name=model_name, force=True)

    query_emb = compute_embeddings([query], model_name=model_name)[0]
    norms = np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query_emb)
    norms = np.where(norms == 0, 1e-9, norms)
    scores = embeddings @ query_emb / norms

    mood_genres = mood_to_genres(mood) if mood else []
    ranked_idx = np.argsort(scores)[::-1]

    results = []
    for idx in ranked_idx:
        item = meta[idx]
        if mood_genres:
            genres = str(item.get('genres', '')).lower()
            if not any(g in genres for g in mood_genres):
                continue
        results.append({
            'title': item['title'],
            'score': float(scores[idx]),
            'movie_id': item.get('movie_id'),
            'explanation': f"Semantic match for '{query}'",
        })
        if len(results) >= k:
            break
    return results
