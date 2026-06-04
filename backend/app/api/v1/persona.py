from fastapi import APIRouter, HTTPException
from typing import Optional
import os

router = APIRouter()

@router.get('/persona/{user_id}')
def get_persona(user_id: int):
    try:
        from ml.persona import load_persona_model, get_user_persona
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persona module not available: {e}")
    model = load_persona_model()
    if model is None:
        raise HTTPException(status_code=404, detail='Persona model not trained. Run persona generation script.')
    result = get_user_persona(user_id, model)
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    return result

@router.post('/persona/train')
def train_personas():
    try:
        from ml.persona import build_and_save_persona_model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persona module not available: {e}")
    # find ml-100k folder
    from pathlib import Path
    repo_root = Path(__file__).resolve().parents[4]
    possible = [repo_root / 'ml-100k' / 'ml-100k', repo_root / 'ml-100k']
    folder = None
    for p in possible:
        if p.exists():
            folder = str(p)
            break
    if folder is None:
        raise HTTPException(status_code=404, detail='ml-100k folder not found')
    model, summary = build_and_save_persona_model(folder)
    return {'status': 'trained', 'summary': summary}
