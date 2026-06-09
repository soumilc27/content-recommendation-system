from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd

from app.services.gemini import summarize_recommendations
from app.services.ml_loader import get_ml_model

router = APIRouter()

@router.get("/movie/{movie_id}/dna")
def get_movie_dna(movie_id: int):
    """Get Movie DNA data - top TF-IDF features for a movie."""
    model = get_ml_model()

    # Find movie by ID or return empty
    if 'movie_id' not in model.df.columns:
        raise HTTPException(status_code=400, detail="Movie ID mapping not available")

    movie_rows = model.df[model.df['movie_id'] == movie_id]
    if movie_rows.empty:
        raise HTTPException(status_code=404, detail=f"Movie with ID {movie_id} not found")

    movie_title = movie_rows.iloc[0]['title']
    features = model.get_tfidf_feature_importance(movie_title, top_n=15)

    return {
        'movie_id': movie_id,
        'title': movie_title,
        'genres': movie_rows.iloc[0]['genres'].split('|') if pd.notna(movie_rows.iloc[0]['genres']) else [],
        'top_features': features
    }


@router.post("/movie/score-breakdown")
def get_score_breakdown(request: dict):
    """Get score breakdown between two movies."""
    source_title = request.get('source_title')
    target_title = request.get('target_title')

    if not source_title or not target_title:
        raise HTTPException(status_code=400, detail="source_title and target_title required")

    model = get_ml_model()
    breakdown = model.get_score_breakdown(source_title, target_title)

    if not breakdown:
        raise HTTPException(status_code=404, detail="One or both movies not found")

    # Get feature importance for context
    target_features = model.get_tfidf_feature_importance(target_title, top_n=5)

    return {
        'source_title': source_title,
        'target_title': target_title,
        'total_score': breakdown['total_score'],
        'components': breakdown['breakdown'],
        'top_contributing_features': target_features
    }


@router.post("/recommendations/with-explanations")
def recommend_with_explanations(request: dict):
    """Enhanced recommendations with detailed score breakdowns."""
    title = request.get('title')
    mood = request.get('mood')
    k = request.get('k', 10)

    model = get_ml_model()

    if title:
        recs = model.recommend_by_title(title, k=k, mood=mood)
        explanation = f"Recommendations based on '{title}'"
    else:
        recs = model.recommend_topk(k=k, mood=mood)
        explanation = f"Top picks for mood '{mood}'" if mood else "Top picks"

    # Enrich with score breakdowns
    enriched = []
    for r in recs:
        if 'movie_id' not in r or r.get('movie_id') is None:
            t = r.get('title')
            try:
                idx = model._find_title_index(t)
                if idx is not None and 'movie_id' in model.df.columns:
                    r['movie_id'] = int(model.df.loc[int(idx), 'movie_id'])
            except Exception:
                r['movie_id'] = None

        # Attach rating data
        try:
            from ml.ratings import get_avg_ratings
            avgmap = get_avg_ratings()
            if r.get('movie_id') and r['movie_id'] in avgmap:
                r['avg_rating'] = avgmap[r['movie_id']]['avg']
                r['rating_count'] = avgmap[r['movie_id']]['count']
        except Exception:
            pass

        # Add score breakdown if we have a source title
        breakdown = None
        if title:
            try:
                breakdown_data = model.get_score_breakdown(title, r.get('title'))
                breakdown = {
                    'total_score': breakdown_data['total_score'],
                    'components': breakdown_data['breakdown'],
                    'top_contributing_features': breakdown_data.get('top_contributing_features', {})
                }
            except Exception:
                pass

        enriched.append({
            'title': r.get('title', ''),
            'score': r.get('score', 0.0),
            'explanation': r.get('explanation', ''),
            'movie_id': r.get('movie_id'),
            'avg_rating': r.get('avg_rating'),
            'rating_count': r.get('rating_count'),
            'score_breakdown': breakdown
        })

    ai_summary = summarize_recommendations(title, mood, enriched)

    return {
        'recommended': enriched,
        'explanation': explanation,
        'ai_summary': ai_summary
    }


@router.get("/visualization/recommendation-space")
def get_recommendation_space(sample_size: Optional[int] = None):
    """Get all movies in 2D recommendation space using PCA/UMAP."""
    model = get_ml_model()

    try:
        from sklearn.decomposition import PCA
    except ImportError:
        raise HTTPException(status_code=500, detail="PCA not available")

    # Use TF-IDF matrix for dimensionality reduction
    tfidf_dense = model.tfidf_matrix.toarray()

    # Apply PCA to get 2D coordinates
    pca = PCA(n_components=2, random_state=42)
    coords_2d = pca.fit_transform(tfidf_dense)

    # Build response
    movies_data = []
    genres_set = set()

    for idx, row in model.df.iterrows():
        genres = str(row.get('genres', '')).split('|') if pd.notna(row.get('genres')) else []
        primary_genre = genres[0] if genres else 'unknown'
        genres_set.add(primary_genre)

        movie_data = {
            'movie_id': row.get('movie_id'),
            'title': row['title'],
            'x': float(coords_2d[idx, 0]),
            'y': float(coords_2d[idx, 1]),
            'genre_cluster': primary_genre,
            'genres': genres
        }
        movies_data.append(movie_data)

    # Assign colors to genres
    genre_colors = {g: f'hsl({i * 360 / len(genres_set)}, 70%, 60%)' for i, g in enumerate(genres_set)}

    for movie in movies_data:
        movie['color'] = genre_colors.get(movie['genre_cluster'], '#808080')

    return {
        'movies': movies_data,
        'explained_variance': float(pca.explained_variance_ratio_[0] + pca.explained_variance_ratio_[1]),
        'genre_colors': genre_colors
    }
