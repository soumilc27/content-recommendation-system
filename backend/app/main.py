import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is on sys.path so `ml` package can be imported when
# starting the backend from the `backend` folder.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.api.v1 import recommend, persona, admin, auth, users, search, movies, visualizations

app = FastAPI(title="CineMind AI - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(recommend.router, prefix="/api/v1")
app.include_router(persona.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(movies.router, prefix="/api/v1")
app.include_router(visualizations.router, prefix="/api/v1")


@app.on_event("startup")
def startup_event():
    # Create DB tables automatically for local development
    try:
        from app.db.base import Base
        from app.db.session import engine, SessionLocal
        from app import models
        from app.core import security
        from app.api.v1.recommend import get_ml_model
        
        Base.metadata.create_all(bind=engine)

        # Warm-load the MovieLens model so the CSV is validated at startup.
        get_ml_model()
        
        # Seed demo user
        db = SessionLocal()
        try:
            demo_user = db.query(models.User).filter(models.User.username == "demo").first()
            if not demo_user:
                print("Seeding demo user...")
                hashed_pwd = security.get_password_hash("demo123")
                new_user = models.User(
                    username="demo",
                    email="demo@cinemind.ai",
                    hashed_password=hashed_pwd,
                    is_active=True
                )
                db.add(new_user)
                db.commit()
                print("Demo user created successfully.")
        except Exception as e:
            print(f"Error seeding database: {e}")
        finally:
            db.close()
            
    except Exception as e:
        print(f"Startup error: {e}")



@app.get("/")
def root():
    return {"message": "CineMind AI backend is running.", "search_mode": "tfidf"}
