from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app import models
from app.schemas.user import UserUpdate, WatchlistIn, WatchlistOut, WatchlistWithMovieOut
from app.services.gemini import summarize_taste_profile

router = APIRouter()


def _load_watchlist_items(db: Session, current_user: models.User):
    return (
        db.query(models.Watchlist, models.Movie)
        .join(models.Movie, models.Watchlist.movie_id == models.Movie.id)
        .filter(models.Watchlist.user_id == current_user.id)
        .order_by(models.Watchlist.created_at.desc())
        .all()
    )

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
    movie = db.query(models.Movie).filter(models.Movie.movie_id == item.movie_id).first()
    if not movie:
        movie = models.Movie(movie_id=item.movie_id, title=str(item.movie_id))
        db.add(movie)
        db.commit()
        db.refresh(movie)

    existing = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id,
        models.Watchlist.movie_id == movie.id,
    ).first()
    if existing:
        return {
            'id': existing.id,
            'movie_id': movie.movie_id,
            'created_at': existing.created_at,
            'movie': movie,
        }

    watch = models.Watchlist(user_id=current_user.id, movie_id=movie.id)
    db.add(watch)
    db.commit()
    db.refresh(watch)
    return {
        'id': watch.id,
        'movie_id': movie.movie_id,
        'created_at': watch.created_at,
        'movie': movie,
    }

@router.get('/users/me/watchlist', response_model=List[WatchlistWithMovieOut])
def list_watchlist(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    items = _load_watchlist_items(db, current_user)

    return [
        {
            'id': watch.id,
            'movie_id': movie.movie_id,
            'created_at': watch.created_at,
            'movie': movie,
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
            'movie': movie,
        }
        for watch, movie in items
    ]
    return {
        'ai_summary': summarize_taste_profile(watchlist),
        'count': len(watchlist),
    }


@router.delete('/users/me/watchlist/{watch_id}')
def remove_watchlist_item(watch_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.Watchlist).filter(models.Watchlist.id == watch_id, models.Watchlist.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Watchlist item not found')
    db.delete(item)
    db.commit()
    return {'status': 'deleted'}
