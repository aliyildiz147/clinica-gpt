"""Pydantic v2 models for ClinicaGPT.

Data model is document-oriented and Firestore-portable: every collection uses a
string uuid primary key and carries `user_id`, so each collection maps 1:1 to a
Firestore subcollection under `profiles/{user_id}/...` with no schema change.
"""
from datetime import datetime, timezone
from typing import List, Literal, Optional
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


RecordType = Literal[
    "kan_tahlili",
    "goruntuleme",
    "doktor_raporu",
    "recete",
    "ilac",
    "tani",
    "semptom",
    "ameliyat",
    "ziyaret",
    "diger",
]

SourceType = Literal["pdf", "image", "text", "manual"]


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    birth_year: Optional[int] = None
    blood_type: Optional[str] = None
    chronic_conditions: Optional[str] = None
    allergies: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    birth_year: Optional[int] = None
    blood_type: Optional[str] = None
    chronic_conditions: Optional[str] = None
    allergies: Optional[str] = None


class LabResult(BaseModel):
    test_name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: Optional[str] = "bilinmiyor"


class HealthRecord(BaseModel):
    record_id: str = Field(default_factory=_uuid)
    user_id: str
    record_type: str = "diger"
    source_type: str = "text"
    record_date: str  # ISO yyyy-mm-dd, anchored server-side
    title: str
    summary: str = ""
    findings: List[str] = []
    diagnoses: List[str] = []
    medications: List[str] = []
    lab_results: List[LabResult] = []
    created_at: datetime = Field(default_factory=_now)


class TextIngestRequest(BaseModel):
    content: str


class IngestResponse(BaseModel):
    record: HealthRecord
    original_deleted: bool = True


class TrendPoint(BaseModel):
    record_date: str
    value: float
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: Optional[str] = None


class TrendSeries(BaseModel):
    test_name: str
    points: List[TrendPoint]


class ChatMessage(BaseModel):
    message_id: str = Field(default_factory=_uuid)
    user_id: str
    role: str
    content: str
    created_at: datetime = Field(default_factory=_now)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    user_message: ChatMessage
    assistant_message: ChatMessage


class OkResponse(BaseModel):
    ok: bool = True
