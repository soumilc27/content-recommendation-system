from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

class UserUpdate(BaseModel):
    email: Optional[str]
    is_active: Optional[bool]

class WatchlistIn(BaseModel):
    movie_id: int

class WatchlistOut(BaseModel):
    id: int
    movie_id: int
    created_at: Optional[datetime] = None


class MovieSummaryOut(BaseModel):
    id: int
    movie_id: int
    title: str
    genres: Optional[str] = None
    year: Optional[int] = None
    imdb_url: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WatchlistWithMovieOut(WatchlistOut):
    movie: MovieSummaryOut

