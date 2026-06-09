"""Shared lazy loader for the ContentModel (repo-root CSV + ml package)."""
import os
from pathlib import Path

from dotenv import load_dotenv

ML_MODEL = None


def get_ml_model():
    global ML_MODEL
    if ML_MODEL is None:
        from ml.pipeline import ContentModel

        current_file = Path(__file__).resolve()
        repo_root = current_file.parents[3]
        backend_root = current_file.parents[2]
        load_dotenv(repo_root / '.env', override=False)
        load_dotenv(backend_root / '.env', override=True)

        csv_env = os.getenv('MOVIELENS_CSV', 'movielens_100k.csv')
        csv_path = Path(csv_env)
        if not csv_path.is_absolute():
            csv_path = repo_root / csv_path
        if not csv_path.exists():
            raise FileNotFoundError(f"MovieLens CSV not found at {csv_path}")
        model = ContentModel(str(csv_path))
        model.build()
        ML_MODEL = model
    return ML_MODEL
