import os
from pathlib import Path
from typing import Dict, Any, List
import json
import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import joblib

from .cf import load_ml100k_ratings


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _default_persona_path() -> str:
    return str(_repo_root() / 'ml' / 'models' / 'persona.pkl')


PERSONA_LABELS = [
    'Binge Watcher',
    'Thriller Addict',
    'Comfort Viewer',
    'Experimental Explorer',
    'Nostalgia-Driven'
]


def build_user_embeddings(ml100k_folder: str, n_components: int = 50):
    ratings, items = load_ml100k_ratings(ml100k_folder)
    pivot = ratings.pivot(index='user_id', columns='item_id', values='rating').fillna(0)
    # center rows
    scaler = StandardScaler(with_std=False)
    pivot_centered = scaler.fit_transform(pivot)
    svd = TruncatedSVD(n_components=min(n_components, pivot_centered.shape[1]-1 or 1), random_state=42)
    user_emb = svd.fit_transform(pivot_centered)
    user_index = list(pivot.index)
    return user_emb, user_index


def cluster_users(user_emb: np.ndarray, n_clusters: int = 5):
    k = min(n_clusters, user_emb.shape[0])
    km = KMeans(n_clusters=k, random_state=42)
    labels = km.fit_predict(user_emb)
    return km, labels


def summarize_personas(labels: List[int], user_index: List[int]) -> Dict[int, Dict[str, Any]]:
    # simple persona summaries: counts per persona
    persona_summary = {}
    for i, uid in enumerate(user_index):
        lab = int(labels[i])
        if lab not in persona_summary:
            persona_summary[lab] = {'count': 0, 'users': []}
        persona_summary[lab]['count'] += 1
        persona_summary[lab]['users'].append(int(uid))
    # map labels to human-friendly names
    for lab in persona_summary:
        persona_summary[lab]['name'] = PERSONA_LABELS[lab % len(PERSONA_LABELS)]
    return persona_summary


def build_and_save_persona_model(ml100k_folder: str, out_path: str = 'ml/models/persona.pkl'):
    user_emb, user_index = build_user_embeddings(ml100k_folder)
    km, labels = cluster_users(user_emb, n_clusters=len(PERSONA_LABELS))
    model = {'kmeans': km, 'user_index': user_index, 'labels': labels.tolist()}
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    joblib.dump(model, out_path)
    summary = summarize_personas(labels, user_index)
    summary_path = _repo_root() / 'ml' / 'models' / 'persona_summary.json'
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f)
    return model, summary


def load_persona_model(path: str | None = None):
    path = path or _default_persona_path()
    if not os.path.exists(path):
        return None
    return joblib.load(path)


def get_user_persona(user_id: int, model: Dict[str, Any]) -> Dict[str, Any]:
    # returns persona label and nearest users
    if model is None:
        return {'error': 'persona model not available'}
    if 'kmeans' not in model or 'user_index' not in model:
        return {'error': 'invalid persona model'}
    user_index = model['user_index']
    if user_id not in user_index:
        return {'error': 'user_id not in dataset'}
    idx = user_index.index(user_id)
    lab = int(model['labels'][idx])
    name = PERSONA_LABELS[lab % len(PERSONA_LABELS)]
    # find sample users in same cluster
    same = [int(u) for i,u in enumerate(user_index) if int(model['labels'][i])==lab][:10]
    return {'user_id': int(user_id), 'persona_label': lab, 'persona_name': name, 'peers': same}
