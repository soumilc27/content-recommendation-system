# CineMind AI

CineMind AI — an emotionally-aware, explainable hybrid movie recommendation platform.

This scaffold contains:
- `backend/` — FastAPI backend skeleton and API routes
- `ml/` — data processing, embeddings and hybrid recommender stubs
- `frontend/` — Next.js frontend placeholder and UI guidance
- `docs/` — architecture and roadmap

Quickstart (development):

1. Backend (Python)

```bash
# create venv, install
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

2. ML (Python)

```bash
# from repository root
python -m pip install -r backend/requirements.txt
python -c "from ml.data_processing import load_movielens; print(load_movielens('movielens_100k.csv/movielens_100k.csv').shape)"
```

3. Frontend

See `frontend/README.md` for Next.js setup and deployment notes.

4. Database migrations (from `backend/`):

```bash
cd backend
alembic upgrade head
```

Set `ADMIN_API_KEY` in `backend/.env` for `/api/v1/admin/*` routes.

Next steps: follow `docs/ROADMAP.md` to build features phase-by-phase.
