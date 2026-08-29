"""Health record routes: ingestion (document → structured data), timeline, trends."""
import os
import tempfile
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from lib import ai
from lib.auth import current_user
from lib.db import db
from models.schemas import (
    HealthRecord,
    IngestResponse,
    OkResponse,
    TextIngestRequest,
    TrendPoint,
    TrendSeries,
    User,
)

router = APIRouter(tags=["records"])

ALLOWED = {
    "application/pdf": ("pdf", ".pdf"),
    "image/jpeg": ("image", ".jpg"),
    "image/jpg": ("image", ".jpg"),
    "image/png": ("image", ".png"),
    "text/plain": ("text", ".txt"),
}


async def _save_record(user_id: str, data: Dict[str, Any], source_type: str) -> HealthRecord:
    record = HealthRecord(
        user_id=user_id,
        record_type=data["record_type"],
        source_type=source_type,
        record_date=str(data["record_date"])[:10],
        title=data["title"],
        summary=data.get("summary") or "",
        findings=[str(x) for x in data.get("findings", [])],
        diagnoses=[str(x) for x in data.get("diagnoses", [])],
        medications=[str(x) for x in data.get("medications", [])],
        lab_results=data.get("lab_results", []),
    )
    await db.health_records.insert_one(record.model_dump())
    return record


@router.get("/records", response_model=List[HealthRecord])
async def list_records(user: User = Depends(current_user)):
    docs = (
        await db.health_records.find({"user_id": user.user_id}, {"_id": 0})
        .sort("record_date", -1)
        .to_list(500)
    )
    return [HealthRecord(**d) for d in docs]


@router.get("/records/{record_id}", response_model=HealthRecord)
async def get_record(record_id: str, user: User = Depends(current_user)):
    doc = await db.health_records.find_one(
        {"record_id": record_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return HealthRecord(**doc)


@router.delete("/records/{record_id}", response_model=OkResponse)
async def delete_record(record_id: str, user: User = Depends(current_user)):
    res = await db.health_records.delete_one(
        {"record_id": record_id, "user_id": user.user_id}
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    return OkResponse()


@router.post("/records/ingest-text", response_model=IngestResponse)
async def ingest_text(payload: TextIngestRequest, user: User = Depends(current_user)):
    if not payload.content.strip():
        raise HTTPException(status_code=422, detail="Metin boş olamaz")
    try:
        data = await ai.extract_from_document(
            session_id=f"extract_{user.user_id}", text=payload.content
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Belge analiz edilemedi: {exc}") from exc
    record = await _save_record(user.user_id, data, "text")
    return IngestResponse(record=record, original_deleted=True)


@router.post("/records/ingest-file", response_model=IngestResponse)
async def ingest_file(file: UploadFile = File(...), user: User = Depends(current_user)):
    mime = (file.content_type or "").lower()
    if mime not in ALLOWED:
        raise HTTPException(
            status_code=415, detail="Yalnızca PDF, JPG, PNG veya TXT yüklenebilir"
        )
    source_type, suffix = ALLOWED[mime]

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=422, detail="Dosya boş")

    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(payload)
            tmp_path = tmp.name
        data = await ai.extract_from_document(
            session_id=f"extract_{user.user_id}",
            file_path=tmp_path,
            mime_type="application/pdf" if source_type == "pdf" else mime,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Belge analiz edilemedi: {exc}") from exc
    finally:
        # Privacy guarantee: the original file never persists past processing.
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    record = await _save_record(user.user_id, data, source_type)
    return IngestResponse(record=record, original_deleted=True)


def _to_float(raw: Any) -> float | None:
    try:
        return float(str(raw).replace(",", ".").strip())
    except (TypeError, ValueError):
        return None


@router.get("/trends", response_model=List[TrendSeries])
async def trends(user: User = Depends(current_user)):
    docs = (
        await db.health_records.find({"user_id": user.user_id}, {"_id": 0})
        .sort("record_date", 1)
        .to_list(500)
    )
    series: Dict[str, List[TrendPoint]] = {}
    for doc in docs:
        for lab in doc.get("lab_results") or []:
            value = _to_float(lab.get("value"))
            if value is None:
                continue
            name = (lab.get("test_name") or "").strip()
            if not name:
                continue
            series.setdefault(name, []).append(
                TrendPoint(
                    record_date=str(doc.get("record_date"))[:10],
                    value=value,
                    unit=lab.get("unit"),
                    reference_range=lab.get("reference_range"),
                    flag=lab.get("flag"),
                )
            )
    return [
        TrendSeries(test_name=name, points=sorted(points, key=lambda p: p.record_date))
        for name, points in sorted(series.items(), key=lambda kv: -len(kv[1]))
    ]
