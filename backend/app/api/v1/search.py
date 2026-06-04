from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    k: int = 10
    mood: Optional[str] = None
    model_name: Optional[str] = None
    use_persisted: bool = True
    use_semantic: bool = False


class SearchResult(BaseModel):
    title: str
    score: float
    movie_id: Optional[int] = None
    explanation: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[SearchResult]
    mode: str = "tfidf"


@router.post('/search', response_model=SearchResponse)
def search_movies(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    try:
        from app.services.ml_loader import get_ml_model
        model = get_ml_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search not available: {e}")
    query = req.query.strip()

    if req.use_semantic:
        try:
            from ml.semantic_search import semantic_search
            hits = semantic_search(
                model,
                query=query,
                k=req.k,
                mood=req.mood,
                model_name=req.model_name or 'all-MiniLM-L6-v2',
                use_persisted=req.use_persisted,
            )
            return {'results': hits, 'mode': 'semantic'}
        except ImportError:
            pass
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Semantic search failed: {e}")

    try:
        hits = model.search_by_query(query, k=req.k, mood=req.mood)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")

    return {'results': hits, 'mode': 'tfidf'}
