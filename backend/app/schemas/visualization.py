from pydantic import BaseModel
from typing import List, Dict, Optional, Tuple


class ScoreComponent(BaseModel):
    component: str  # "content" or "collaborative"
    score: float
    percentage: float


class ScoreBreakdown(BaseModel):
    movie_title: str
    movie_id: Optional[int] = None
    total_score: float
    components: List[ScoreComponent]
    feature_importance: Optional[Dict[str, float]] = None


class FeatureImportance(BaseModel):
    feature: str
    tfidf_weight: float
    contribution_percentage: float


class MovieDNA(BaseModel):
    movie_id: Optional[int] = None
    title: str
    genres: List[str]
    top_features: Dict[str, float]


class RecommendationSpacePoint(BaseModel):
    movie_id: Optional[int] = None
    title: str
    x: float
    y: float
    z: Optional[float] = None
    genre_cluster: str


class UserTasteProfile(BaseModel):
    preferred_genres: Dict[str, float]
    favorite_actors: Dict[str, float]
    favorite_directors: Dict[str, float]
    top_keywords: List[Tuple[str, float]]
    taste_diversity_score: float


class RecommendationWithExplanation(BaseModel):
    title: str
    score: float
    explanation: str
    movie_id: Optional[int] = None
    avg_rating: Optional[float] = None
    rating_count: Optional[int] = None
    score_breakdown: Optional[ScoreBreakdown] = None


class RecommendationsWithExplanations(BaseModel):
    recommended: List[RecommendationWithExplanation]
    explanation: str
