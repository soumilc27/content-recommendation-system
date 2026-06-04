# CineMind AI - Architecture Overview

High level components:

- Frontend (Next.js): modern UI, mood selector, semantic search, watchlist.
- Backend (FastAPI): auth, recommendation APIs, semantic search, analytics.
- ML (Python): hybrid recommender, embeddings, persona engine, explainability.
- Database: Postgres in production (`DATABASE_URL`); SQLite for local dev. Alembic migrations in `backend/migrations/`.
- Optional cache (Redis): session, popularity counters, vector index.

Flow:
1. User interacts with Next.js UI.
2. Frontend calls FastAPI endpoints for recommendations/search.
3. Backend queries ML services or precomputed indexes and returns ranked results with explanations.
4. Interactions (likes/skips) are written to DB and used to adapt recommendations.

Deployment:
- Frontend → Vercel
- Backend → Render or Railway
- Database → Supabase/Postgres

