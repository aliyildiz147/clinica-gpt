"""Chat routes — the assistant answers only from the user's stored health history."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from lib import ai
from lib.auth import current_user
from lib.db import db
from models.schemas import ChatMessage, ChatRequest, ChatResponse, OkResponse, User

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/messages", response_model=List[ChatMessage])
async def list_messages(user: User = Depends(current_user)):
    docs = (
        await db.chat_messages.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", 1)
        .to_list(300)
    )
    return [ChatMessage(**d) for d in docs]


@router.delete("/messages", response_model=OkResponse)
async def clear_messages(user: User = Depends(current_user)):
    await db.chat_messages.delete_many({"user_id": user.user_id})
    return OkResponse()


@router.post("", response_model=ChatResponse)
async def send(payload: ChatRequest, user: User = Depends(current_user)):
    text = payload.message.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Mesaj boş olamaz")

    user_msg = ChatMessage(user_id=user.user_id, role="user", content=text)
    await db.chat_messages.insert_one(user_msg.model_dump())

    records = (
        await db.health_records.find({"user_id": user.user_id}, {"_id": 0})
        .sort("record_date", 1)
        .to_list(200)
    )
    history = (
        await db.chat_messages.find({"user_id": user.user_id}, {"_id": 0})
        .sort("created_at", 1)
        .to_list(300)
    )

    try:
        answer = await ai.answer_question(
            session_id=f"chat_{user.user_id}",
            question=text,
            records=records,
            history=history[:-1],
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Yanıt üretilemedi: {exc}") from exc

    assistant_msg = ChatMessage(user_id=user.user_id, role="assistant", content=answer)
    await db.chat_messages.insert_one(assistant_msg.model_dump())
    return ChatResponse(user_message=user_msg, assistant_message=assistant_msg)
