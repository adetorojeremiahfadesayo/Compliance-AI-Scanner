# auth.py
from fastapi import Header, HTTPException

from app.config import settings


async def verify_api_token(x_api_token: str = Header(default="")):
    """Gates write/read API routes behind a shared access token.

    No-op when API_ACCESS_TOKEN is unset (default), so local dev and the
    seeded demo flow keep working without extra setup. Set API_ACCESS_TOKEN
    in production to stop the public deployment URL from being usable by
    anyone who finds it.
    """
    if not settings.API_ACCESS_TOKEN:
        return
    if x_api_token != settings.API_ACCESS_TOKEN:
        raise HTTPException(status_code=401, detail="Missing or invalid API access token.")
