"""Shared lazy loader for the ContentModel (repo-root CSV + ml package)."""
import os

ML_MODEL = None


def get_ml_model():
    global ML_MODEL
    if ML_MODEL is None:
        from ml.pipeline import ContentModel

        current_file = os.path.abspath(__file__)
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
        csv_path = os.path.join(repo_root, 'movielens_100k.csv')
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"MovieLens CSV not found at {csv_path}")
        model = ContentModel(csv_path)
        model.build()
        ML_MODEL = model
    return ML_MODEL
