from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.gemini import summarize_movie_detail, summarize_movie_plot

router = APIRouter()

class MovieRec(BaseModel):
    title: str
    score: float
    explanation: str
    movie_id: Optional[int] = None
    avg_rating: Optional[float] = None
    rating_count: Optional[int] = None

class MovieDetail(BaseModel):
    movie_id: int
    title: str
    genres: Optional[str]
    description: Optional[str]
    recommendations: List[MovieRec]
    ai_summary: Optional[str] = None
    ai_plot: Optional[str] = None


@router.get('/movie/{movie_id}', response_model=MovieDetail)
def get_movie_detail(movie_id: int, k: int = 6):
    try:
        from app.api.v1.recommend import get_ml_model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML pipeline not available: {e}")
    model = get_ml_model()
    # find by movie_id in df
    if model.df is None or 'movie_id' not in model.df.columns:
        raise HTTPException(status_code=404, detail="Movie metadata not available")
    matches = model.df[model.df['movie_id'] == movie_id]
    if matches.empty:
        raise HTTPException(status_code=404, detail="Movie not found")
    row = matches.iloc[0]
    title = row['title']
    desc = row.get('description') if 'description' in row else None
    genres = row.get('genres') if 'genres' in row else None
    # get recommendations by title
    try:
        recs = model.recommend_by_title(title, k=k)
    except Exception:
        recs = []
    enriched = []
    for r in recs:
        # r may already include movie_id; try fallback if missing
        if 'movie_id' not in r or r.get('movie_id') is None:
            t = r.get('title')
            try:
                idx = model._find_title_index(t)
                if idx is not None and 'movie_id' in model.df.columns:
                    r['movie_id'] = int(model.df.loc[int(idx), 'movie_id'])
            except Exception:
                r['movie_id'] = None

        # attach avg rating and rating count if available
        try:
            from ml.ratings import get_avg_ratings
            avgmap = get_avg_ratings()
            if r.get('movie_id') and r['movie_id'] in avgmap:
                r['avg_rating'] = avgmap[r['movie_id']]['avg']
                r['rating_count'] = avgmap[r['movie_id']]['count']
        except Exception:
            pass

        enriched.append({
            'title': r.get('title'),
            'score': r.get('score', 0.0),
            'explanation': r.get('explanation', ''),
            'movie_id': r.get('movie_id'),
            'avg_rating': r.get('avg_rating'),
            'rating_count': r.get('rating_count')
        })
    ai_summary = summarize_movie_detail(title, genres, enriched)
    ai_plot = summarize_movie_plot(title, genres, desc)
    return {
        'movie_id': int(movie_id),
        'title': title,
        'genres': genres,
        'description': desc,
        'recommendations': enriched,
        'ai_summary': ai_summary,
        'ai_plot': ai_plot,
    }
