"""
Train collaborative filtering SVD on MovieLens 100k and persist similarity matrix.
Run from repo root.
"""
import os
import json
import numpy as np
from ml.cf import train_svd_and_item_sim


def main():
    # locate ml-100k folder
    possible = [os.path.join(os.getcwd(), 'ml-100k', 'ml-100k'), os.path.join(os.getcwd(), 'ml-100k')]
    folder = None
    for p in possible:
        if os.path.exists(p):
            folder = p
            break
    if folder is None:
        print('ml-100k folder not found; expected ml-100k/ml-100k or ml-100k in repo root')
        return
    print('Training SVD on', folder)
    sim, id_to_index = train_svd_and_item_sim(folder)
    os.makedirs(os.path.join('ml','models'), exist_ok=True)
    np.save(os.path.join('ml','models','cf_sim.npy'), sim)
    # convert keys to strings for JSON
    id_to_index_str = {str(k): int(v) for k,v in id_to_index.items()}
    with open(os.path.join('ml','models','id_to_index.json'), 'w', encoding='utf-8') as f:
        json.dump(id_to_index_str, f)
    print('Saved cf_sim.npy', sim.shape, 'and id_to_index.json', len(id_to_index_str))

if __name__ == '__main__':
    main()
