import os

from fastapi import Header, HTTPException, status


def require_admin(x_admin_key: str | None = Header(default=None, alias='X-Admin-Key')):
    """Protect admin routes with ADMIN_API_KEY from environment."""
    expected = os.getenv('ADMIN_API_KEY')
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Admin API key not configured. Set ADMIN_API_KEY in environment.',
        )
    if not x_admin_key or x_admin_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid or missing admin API key',
        )
