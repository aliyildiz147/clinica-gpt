"""Auth routes — Emergent-managed Google Auth + a demo profile for trials."""
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import (
    clear_session_cookie,
    create_session,
    current_user,
    set_session_cookie,
    _token_from_request,
)
from lib.db import db
from models.schemas import OkResponse, ProfileUpdate, User

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


async def _upsert_user(email: str, name: str, picture: str | None) -> str:
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"name": name or existing.get("name"), "picture": picture}},
        )
        return existing["user_id"]
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one(
        {
            "user_id": user_id,
            "email": email,
            "name": name or email.split("@")[0],
            "picture": picture,
            "birth_year": None,
            "blood_type": None,
            "chronic_conditions": None,
            "allergies": None,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return user_id


@router.post("/session", response_model=User)
async def exchange_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID başlığı gerekli")

    async with httpx.AsyncClient(timeout=20) as client:
        upstream = await client.get(SESSION_DATA_URL, headers={"X-Session-ID": session_id})
    if upstream.status_code != 200:
        raise HTTPException(status_code=401, detail="Google oturumu doğrulanamadı")
    data = upstream.json()

    user_id = await _upsert_user(data.get("email", ""), data.get("name", ""), data.get("picture"))
    await create_session(user_id, data["session_token"])
    set_session_cookie(response, data["session_token"])

    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**doc)


@router.post("/demo", response_model=User)
async def demo_login(response: Response):
    """Demo profile so the app can be tried without a Google account."""
    user_id = await _upsert_user("demo@clinicagpt.app", "Demo Kullanıcı", None)
    token = f"demo_{uuid.uuid4().hex}"
    await create_session(user_id, token)
    set_session_cookie(response, token)
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**doc)


@router.get("/me", response_model=User)
async def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=User)
async def update_profile(payload: ProfileUpdate, user: User = Depends(current_user)):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if changes:
        await db.users.update_one({"user_id": user.user_id}, {"$set": changes})
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return User(**doc)


@router.post("/logout", response_model=OkResponse)
async def logout(request: Request, response: Response):
    token = _token_from_request(request)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    clear_session_cookie(response)
    return OkResponse()
