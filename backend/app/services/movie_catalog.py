from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app import models


def lookup_movie_metadata(movie_id: int) -> dict[str, Any] | None:
    try:
        from app.services.ml_loader import get_ml_model
    except Exception:
        return None

    try:
        model = get_ml_model()
    except Exception:
        return None

    if model.df is None or 'movie_id' not in model.df.columns:
        return None

    matches = model.df[model.df['movie_id'] == movie_id]
    if matches.empty:
        return None

    row = matches.iloc[0]
    genres = row.get('genres')
    year = row.get('year')

    directors = row.get('directors')
    actors = row.get('actors')

    return {
        'title': row.get('title'),
        'genres': None if genres is None or str(genres) == 'nan' else str(genres),
        'year': int(year) if year is not None and str(year) != 'nan' else None,
        'directors': None if directors is None or str(directors) == 'nan' else str(directors),
        'actors': None if actors is None or str(actors) == 'nan' else str(actors),
    }


def _needs_metadata(movie: models.Movie) -> bool:
    title = (movie.title or '').strip()
    genres = (movie.genres or '').strip()
    stub_title = title == str(movie.movie_id)
    missing_genres = not genres or genres.lower() in {'unknown', 'n/a', 'none'}
    return stub_title or missing_genres


def sync_movie_from_catalog(movie: models.Movie, db: Session) -> models.Movie:
    metadata = lookup_movie_metadata(movie.movie_id)
    if not metadata:
        return movie

    updated = False
    title = metadata.get('title')
    if title and (not movie.title or movie.title == str(movie.movie_id)):
        movie.title = str(title)
        updated = True

    genres = metadata.get('genres')
    if genres and (not movie.genres or movie.genres.lower() in {'unknown', 'n/a', 'none'}):
        movie.genres = genres
        updated = True

    year = metadata.get('year')
    if year and not movie.year:
        movie.year = year
        updated = True

    if updated:
        db.add(movie)
        db.commit()
        db.refresh(movie)

    return movie


def movie_summary_dict(movie: models.Movie) -> dict[str, Any]:
    """Merge DB movie fields with catalog metadata for API responses."""
    metadata = lookup_movie_metadata(movie.movie_id) or {}
    title = (movie.title or '').strip()
    genres = (movie.genres or '').strip()

    if not title or title == str(movie.movie_id):
        title = str(metadata.get('title') or title or movie.movie_id)
    if not genres or genres.lower() in {'unknown', 'n/a', 'none'}:
        genres = metadata.get('genres')

    year = movie.year if movie.year is not None else metadata.get('year')

    return {
        'id': movie.id,
        'movie_id': movie.movie_id,
        'title': title,
        'genres': genres,
        'year': year,
        'imdb_url': movie.imdb_url,
        'description': movie.description,
    }


def get_or_create_catalog_movie(db: Session, movie_id: int) -> models.Movie:
    movie = db.query(models.Movie).filter(models.Movie.movie_id == movie_id).first()
    metadata = lookup_movie_metadata(movie_id)

    if movie is None:
        movie = models.Movie(
            movie_id=movie_id,
            title=str(metadata['title']) if metadata and metadata.get('title') else str(movie_id),
            genres=metadata.get('genres') if metadata else None,
            year=metadata.get('year') if metadata else None,
        )
        db.add(movie)
        db.commit()
        db.refresh(movie)
        return movie

    if _needs_metadata(movie):
        return sync_movie_from_catalog(movie, db)

    return movie
