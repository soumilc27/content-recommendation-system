from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import os

from app.services.gemini import summarize_recommendations

router = APIRouter()

class RecommendRequest(BaseModel):
    title: Optional[str] = None
    mood: Optional[str] = None
    k: int = 10

class MovieRec(BaseModel):
    title: str
    score: float
    explanation: str
    movie_id: Optional[int] = None
    avg_rating: Optional[float] = None
    rating_count: Optional[int] = None

class RecommendResponse(BaseModel):
    recommended: List[MovieRec]
    explanation: str
    ai_summary: Optional[str] = None

from app.services.ml_loader import get_ml_model


@router.post("/recommend", response_model=RecommendResponse)
def recommend_movies(req: RecommendRequest):
    """Recommend movies using the content model and simple mood-aware logic.

    Provide `title` as seed to get similar movies, or omit title to get mood-based top picks.
    """
    model = get_ml_model()
    if req.title:
        recs = model.recommend_by_title(req.title, k=req.k, mood=req.mood)
        explanation = f"Recommendations based on '{req.title}' (content-based + mood)"
    else:
        recs = model.recommend_topk(k=req.k, mood=req.mood)
        explanation = f"Top picks for mood '{req.mood}'" if req.mood else "Top picks"

    # ensure movie_id present when content df has it
    enriched = []
    for r in recs:
        # r may already include movie_id from model; try to find by title fallback
        if 'movie_id' not in r or r.get('movie_id') is None:
            t = r.get('title')
            try:
                idx = model._find_title_index(t)
                if idx is not None and 'movie_id' in model.df.columns:
                    r['movie_id'] = int(model.df.loc[int(idx), 'movie_id'])
            except Exception:
                r['movie_id'] = None
        # attach avg rating from ml-100k if available
        try:
            from ml.ratings import get_avg_ratings
            avgmap = get_avg_ratings()
            if r.get('movie_id') and r['movie_id'] in avgmap:
                r['avg_rating'] = avgmap[r['movie_id']]['avg']
                r['rating_count'] = avgmap[r['movie_id']]['count']
        except Exception:
            pass

        enriched.append(MovieRec(
            title=r.get('title', ''),
            score=r.get('score', 0.0),
            explanation=r.get('explanation', ''),
            movie_id=r.get('movie_id'),
            avg_rating=r.get('avg_rating'),
            rating_count=r.get('rating_count')
        ))

    ai_summary = summarize_recommendations(req.title, req.mood, [item.model_dump() for item in enriched])

    return RecommendResponse(recommended=enriched, explanation=explanation, ai_summary=ai_summary)

