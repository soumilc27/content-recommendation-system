from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app import models
from app.schemas.user import UserUpdate, WatchlistIn, WatchlistOut, WatchlistWithMovieOut
from app.services.gemini import explain_taste_word, generate_taste_word, summarize_recommendations, summarize_taste_profile
from app.services.taste_analytics import compute_taste_metrics
from app.services.ml_loader import get_ml_model
from app.services.movie_catalog import get_or_create_catalog_movie, movie_summary_dict, sync_movie_from_catalog


class WatchlistRecommendRequest(BaseModel):
    k: int = 10
    mood: Optional[str] = None

router = APIRouter()


def _load_watchlist_items(db: Session, current_user: models.User):
    rows = (
        db.query(models.Watchlist, models.Movie)
        .join(models.Movie, models.Watchlist.movie_id == models.Movie.id)
        .filter(models.Watchlist.user_id == current_user.id)
        .order_by(models.Watchlist.created_at.desc())
        .all()
    )
    return [(watch, sync_movie_from_catalog(movie, db)) for watch, movie in rows]

@router.get('/users/me')
def read_own_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put('/users/me')
def update_own_profile(payload: UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if payload.email is not None:
        current_user.email = payload.email
    if payload.is_active is not None:
        current_user.is_active = payload.is_active
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post('/users/me/watchlist', response_model=WatchlistWithMovieOut)
def add_watchlist_item(item: WatchlistIn, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    movie = get_or_create_catalog_movie(db, item.movie_id)

    existing = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id,
        models.Watchlist.movie_id == movie.id,
    ).first()
    if existing:
        return {
            'id': existing.id,
            'movie_id': movie.movie_id,
            'created_at': existing.created_at,
            'movie': movie_summary_dict(movie),
        }

    watch = models.Watchlist(user_id=current_user.id, movie_id=movie.id)
    db.add(watch)
    db.commit()
    db.refresh(watch)
    return {
        'id': watch.id,
        'movie_id': movie.movie_id,
        'created_at': watch.created_at,
        'movie': movie_summary_dict(movie),
    }

@router.get('/users/me/watchlist', response_model=List[WatchlistWithMovieOut])
def list_watchlist(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    items = _load_watchlist_items(db, current_user)

    return [
        {
            'id': watch.id,
            'movie_id': movie.movie_id,
            'created_at': watch.created_at,
            'movie': movie_summary_dict(movie),
        }
        for watch, movie in items
    ]


@router.get('/users/me/watchlist/insights')
def watchlist_insights(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    items = _load_watchlist_items(db, current_user)
    watchlist = [
        {
            'id': watch.id,
            'movie_id': movie.movie_id,
            'created_at': watch.created_at,
            'movie': movie_summary_dict(movie),
        }
        for watch, movie in items
    ]
    taste_word = generate_taste_word(watchlist)
    return {
        'ai_summary': summarize_taste_profile(watchlist),
        'taste_word': taste_word,
        'taste_word_explanation': explain_taste_word(taste_word, watchlist) if taste_word else '',
        'taste_metrics': compute_taste_metrics(watchlist),
        'count': len(watchlist),
    }


def _enrich_recommendations(recs: list[dict]) -> list[dict]:
    model = get_ml_model()
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
        try:
            from ml.ratings import get_avg_ratings
            avgmap = get_avg_ratings()
            if r.get('movie_id') and r['movie_id'] in avgmap:
                r['avg_rating'] = avgmap[r['movie_id']]['avg']
                r['rating_count'] = avgmap[r['movie_id']]['count']
        except Exception:
            pass
        enriched.append(r)
    return enriched


@router.post('/users/me/watchlist/recommendations')
def recommend_from_watchlist(
    payload: WatchlistRecommendRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    items = _load_watchlist_items(db, current_user)
    if not items:
        raise HTTPException(status_code=400, detail='Add movies to your wishlist to get recommendations.')

    titles = []
    exclude_ids = []
    for _watch, movie in items:
        summary = movie_summary_dict(movie)
        if summary.get('title'):
            titles.append(str(summary['title']))
        exclude_ids.append(int(movie.movie_id))

    model = get_ml_model()
    recs = model.recommend_from_titles(
        titles,
        k=payload.k,
        exclude_movie_ids=exclude_ids,
        mood=payload.mood,
    )
    enriched = _enrich_recommendations(recs)
    seed_label = ', '.join(titles[:4])
    if len(titles) > 4:
        seed_label += f' and {len(titles) - 4} more'
    explanation = f"Recommendations based on your wishlist ({len(titles)} saved {'title' if len(titles) == 1 else 'titles'})"
    ai_summary = summarize_recommendations(seed_label, payload.mood, enriched)

    return {
        'recommended': enriched,
        'explanation': explanation,
        'ai_summary': ai_summary,
        'wishlist_count': len(titles),
    }


@router.delete('/users/me/watchlist/{watch_id}')
def remove_watchlist_item(watch_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.Watchlist).filter(models.Watchlist.id == watch_id, models.Watchlist.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Watchlist item not found')
    db.delete(item)
    db.commit()
    return {'status': 'deleted'}
