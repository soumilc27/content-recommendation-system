"""
Run to generate persona model from ml-100k and persist it.
"""
import os
from ml.persona import build_and_save_persona_model

possible = [os.path.join(os.getcwd(), 'ml-100k', 'ml-100k'), os.path.join(os.getcwd(), 'ml-100k')]
folder = None
for p in possible:
    if os.path.exists(p):
        folder = p
        break
if folder is None:
    print('ml-100k folder not found')
else:
    model, summary = build_and_save_persona_model(folder)
    print('Persona model saved. Summary:')
    print(summary)
