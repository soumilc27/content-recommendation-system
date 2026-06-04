# Database migrations (Alembic)

Migrations run from the `backend/` directory so `app` imports resolve correctly.

## Quick start

```bash
cd backend
pip install -r requirements.txt

# SQLite (default)
alembic upgrade head

# If tables already exist from create_all (existing dev.db):
alembic stamp head

# Postgres
set DATABASE_URL=postgresql://user:pass@localhost:5432/cinemind
alembic upgrade head
```

## Create a new revision after model changes

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

`env.py` loads `DATABASE_URL` from `.env` via `app.core.settings`.
