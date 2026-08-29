"""Session auth helpers — httpOnly cookie sessions backed by Mongo."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, Request, Response

from lib.db import db
from models.schemas import User

COOKIE_NAME = "session_token"
SESSION_DAYS = 7


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_DAYS * 24 * 60 * 60,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/", secure=True, samesite="none")


async def create_session(user_id: str, token: str) -> None:
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
            "created_at": datetime.now(timezone.utc),
        }
    )


def _token_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token
    header = request.headers.get("Authorization") or ""
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return None


async def current_user(request: Request) -> User:
    token = _token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Oturum bulunamadı")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Oturum geçersiz")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at is not None and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Oturum süresi doldu")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    return User(**user_doc)
