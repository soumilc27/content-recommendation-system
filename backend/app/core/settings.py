from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import os

from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent

load_dotenv(REPO_ROOT / '.env', override=False)
load_dotenv(BACKEND_ROOT / '.env', override=True)


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    admin_api_key: str | None
    xai_api_key: str | None
    xai_model: str
    xai_timeout_seconds: int
    ollama_api_key: str | None
    ollama_model: str
    ollama_base_url: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            'DATABASE_URL',
            f'sqlite:///{(BACKEND_ROOT / "dev.db").as_posix()}',
        ),
        secret_key=os.getenv('SECRET_KEY', 'dev-secret-change-in-production'),
        admin_api_key=os.getenv('ADMIN_API_KEY'),
        xai_api_key=os.getenv('XAI_API_KEY') or os.getenv('GROK_API_KEY'),
        xai_model=os.getenv('XAI_MODEL', 'grok-4.3'),
        xai_timeout_seconds=int(os.getenv('XAI_TIMEOUT_SECONDS', '20')),
        ollama_api_key=os.getenv('OLLAMA_API_KEY'),
        ollama_model=os.getenv('OLLAMA_MODEL', 'gemma3:27b'),
        ollama_base_url=os.getenv('OLLAMA_BASE_URL', 'https://ollama.com/v1'),
    )
