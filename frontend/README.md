# Frontend (Next.js) for CineMind AI

Next.js 13 + Tailwind app with a Netflix-style olive theme.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000/api/v1`).

## Pages

- `/` — mood-based recommendations with AI summary
- `/search` — semantic search (`POST /api/v1/search`)
- `/recommend` — similar movies by title
- `/movie/[id]` — movie detail and watchlist
- `/movie/[id]/explain` — score breakdown vs. top similar movie
- `/profile`, `/wishlist`, `/login`, `/register`
- `/dashboard/taste-profile` — watchlist taste insights

Demo login: `demo` / `demo123`
