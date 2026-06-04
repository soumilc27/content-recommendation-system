import numpy as np


class HybridRecommender:
    """Starter hybrid recommender combining content & collaborative signals.

    This is a scaffold: implement fit(), recommend() with real models later.
    """
    def __init__(self):
        self.content_matrix = None
        self.collab_matrix = None

    def fit(self, content_matrix=None, collab_matrix=None):
        self.content_matrix = content_matrix
        self.collab_matrix = collab_matrix

    def recommend(self, idx, topk=10):
        # simple average of content and collab scores if both exist
        if self.content_matrix is None and self.collab_matrix is None:
            return []
        scores = None
        if self.content_matrix is not None:
            scores = self.content_matrix[idx]
        if self.collab_matrix is not None:
            if scores is None:
                scores = self.collab_matrix[idx]
            else:
                scores = (scores + self.collab_matrix[idx]) / 2.0
        top_indices = np.argsort(scores)[::-1][:topk]
        return top_indices
