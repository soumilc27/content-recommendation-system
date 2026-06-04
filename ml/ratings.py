import os
from typing import Tuple, Dict
import pandas as pd

from .cf import load_ml100k_ratings

_cached = None


def find_ml100k_folder() -> str:
    candidates = [
        os.path.join(os.getcwd(), 'ml-100k', 'ml-100k'),
        os.path.join(os.getcwd(), 'ml-100k'),
        r'd:\ml-100k\ml-100k',
        r'd:\ml-100k',
    ]
    for c in candidates:
        if os.path.exists(os.path.join(c, 'u.data')) and os.path.exists(os.path.join(c, 'u.item')):
            return c
    raise FileNotFoundError('Could not locate ml-100k folder (looked in common locations).')


def get_avg_ratings(ml100k_folder: str = None) -> Dict[int, Dict[str, float]]:
    """Return mapping item_id -> {avg: float, count: int} using ml-100k u.data."""
    global _cached
    if _cached is not None:
        return _cached
    if ml100k_folder is None:
        ml100k_folder = find_ml100k_folder()
    ratings, items = load_ml100k_ratings(ml100k_folder)
    grp = ratings.groupby('item_id')['rating'].agg(['mean','count']).reset_index()
    result = {}
    for _, r in grp.iterrows():
        result[int(r['item_id'])] = {'avg': float(r['mean']), 'count': int(r['count'])}
    _cached = result
    return result
