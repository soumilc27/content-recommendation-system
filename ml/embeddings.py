import numpy as np


def compute_embeddings(texts, model_name='all-MiniLM-L6-v2'):
    """Compute sentence embeddings for a list of texts."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as e:
        raise ImportError(
            "sentence-transformers is required for semantic search. "
            "Install with: pip install sentence-transformers"
        ) from e
    model = SentenceTransformer(model_name)
    emb = model.encode(texts, show_progress_bar=False)
    return np.array(emb)
