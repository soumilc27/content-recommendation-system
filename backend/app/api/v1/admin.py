from fastapi import APIRouter, BackgroundTasks, Depends
from pathlib import Path
import subprocess
import sys
import os
import json

from app.api.v1.admin_deps import require_admin

router = APIRouter()
REPO_ROOT = Path(__file__).resolve().parents[4]


@router.post('/admin/train_cf', dependencies=[Depends(require_admin)])
def train_cf(background_tasks: BackgroundTasks):
    """Trigger CF training in background by running the training module."""
    def _run():
        try:
            subprocess.run([sys.executable, '-m', 'ml.train_cf'], check=True, cwd=str(REPO_ROOT))
        except subprocess.CalledProcessError:
            pass
    background_tasks.add_task(_run)
    return {'status': 'started'}


@router.post('/admin/compute_avg_ratings', dependencies=[Depends(require_admin)])
def compute_avg_ratings(background_tasks: BackgroundTasks):
    """Compute average ratings from local ml-100k dataset and persist to ml/models/avg_ratings.json."""
    def _run_compute():
        try:
            from ml.ratings import get_avg_ratings
            models_dir = REPO_ROOT / 'ml' / 'models'
            models_dir.mkdir(parents=True, exist_ok=True)
            out_path = models_dir / 'avg_ratings.json'
            avg = get_avg_ratings()
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(avg, f)
        except Exception:
            pass

    background_tasks.add_task(_run_compute)
    return {'status': 'started'}
