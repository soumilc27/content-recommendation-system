import os
from typing import Tuple, Dict
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Surprise is optional; used for SVD
try:
    from surprise import Dataset, Reader, SVD
    HAS_SURPRISE = True
except Exception:
    HAS_SURPRISE = False


def load_ml100k_ratings(ml100k_folder: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Load u.data and u.item from a MovieLens 100k folder.

    Returns (ratings_df, items_df)
    ratings_df columns: ['user_id','item_id','rating','timestamp']
    items_df columns: parsed from u.item (movie id, title, ...)
    """
    udata = os.path.join(ml100k_folder, 'u.data')
    uitem = os.path.join(ml100k_folder, 'u.item')
    if not os.path.exists(udata) or not os.path.exists(uitem):
        raise FileNotFoundError('ml-100k folder missing u.data or u.item')
    ratings = pd.read_csv(udata, sep='\t', names=['user_id','item_id','rating','timestamp'], encoding='latin-1')
    # u.item pipe-separated; first two fields are id and title
    items = pd.read_csv(uitem, sep='|', header=None, encoding='latin-1')
    items = items.rename(columns={0:'movie_id', 1:'title'})
    return ratings, items


def train_svd_and_item_sim(ml100k_folder: str, n_factors: int = 50) -> Tuple[np.ndarray, Dict[int,int]]:
    """Train Surprise SVD on ml-100k and return item-item cosine similarity matrix and mapping movie_id->index.

    The returned similarity matrix rows/cols correspond to sorted movie_ids (as ints) and also mapped to content CSV indices externally.
    """
    ratings, items = load_ml100k_ratings(ml100k_folder)
    df = ratings[['user_id','item_id','rating']]
    if HAS_SURPRISE:
        reader = Reader(rating_scale=(1,5))
        data = Dataset.load_from_df(df[['user_id','item_id','rating']], reader)
        trainset = data.build_full_trainset()
        algo = SVD(n_factors=n_factors, random_state=42)
        algo.fit(trainset)
        raw2inner = {int(raw): inner for raw, inner in trainset._raw2inner_id.items()}
        movie_ids = sorted([int(mid) for mid in raw2inner.keys()])
        factors = []
        id_to_index = {}
        for idx, mid in enumerate(movie_ids):
            inner = raw2inner[mid]
            vec = algo.qi[inner]
            factors.append(vec)
            id_to_index[mid] = idx
        factors = np.vstack(factors)
        sim = cosine_similarity(factors)
        return sim, id_to_index
    else:
        # fallback: build user-item matrix and apply TruncatedSVD on items
        from sklearn.decomposition import TruncatedSVD
        pivot = df.pivot(index='user_id', columns='item_id', values='rating').fillna(0)
        # items as columns; compute item-factor matrix via TruncatedSVD on transpose
        item_matrix = pivot.T  # rows=item_id, cols=user_id
        svd = TruncatedSVD(n_components=min(n_factors, item_matrix.shape[1]-1 or 1), random_state=42)
        item_factors = svd.fit_transform(item_matrix)
        movie_ids = [int(cid) for cid in item_matrix.index.tolist()]
        id_to_index = {mid: idx for idx, mid in enumerate(movie_ids)}
        sim = cosine_similarity(item_factors)
        return sim, id_to_index
