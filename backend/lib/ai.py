"""LLM layer: document understanding (OCR/parsing) + health-history chat.

Server-side only — the API key never leaves the backend.
"""
import json
import os
import re
from typing import Any, Dict, List, Optional

from emergentintegrations.llm.chat import (
    FileContentWithMimeType,
    LlmChat,
    UserMessage,
)

from lib.dates import today_iso

EXTRACT_MODEL = "gemini-3.1-pro-preview"
CHAT_MODEL = "gemini-3.5-flash"

DISCLAIMER = (
    "ClinicaGPT bir hekim veya tanı koyucu değildir. Üretilen bilgiler bilgilendirme "
    "amaçlıdır; kesin teşhis ve tedavi için lütfen hekiminize danışınız."
)

RECORD_TYPES = [
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

EXTRACT_SYSTEM = f"""Sen bir tıbbi doküman yapılandırma motorusun. Verilen sağlık
belgesini (kan tahlili, MR/BT/röntgen raporu, doktor raporu, reçete, epikriz vb.)
oku ve SADECE geçerli JSON döndür. Açıklama, markdown veya kod bloğu ekleme.

JSON şeması:
{{
  "record_type": {RECORD_TYPES},
  "record_date": "YYYY-MM-DD",   // belgede tarih yoksa null
  "title": "kısa Türkçe başlık, örn: Hemogram ve Biyokimya Paneli",
  "summary": "2-4 cümlelik Türkçe, tanı koymayan, açıklayıcı özet",
  "findings": ["belgedeki bulgular, Türkçe kısa maddeler"],
  "diagnoses": ["belgede yazan tanılar"],
  "medications": ["ilaç adı ve dozu"],
  "lab_results": [
    {{"test_name": "CRP", "value": "28", "unit": "mg/L",
      "reference_range": "0-5", "flag": "yuksek|dusuk|normal|bilinmiyor"}}
  ]
}}

Kurallar: değer alanını sayı olarak yaz (birim ayrı alanda). Belgede olmayan bilgiyi
uydurmadan boş liste/null bırak. Tanı koyma, sadece belgede yazanı yapılandır."""

CHAT_SYSTEM = f"""Sen ClinicaGPT'sin: kullanıcının kendi sağlık kayıtlarını açıklayan,
karşılaştıran ve anlaşılır hale getiren Türkçe bir sağlık asistanısın.

Kurallar:
- ASLA tanı koyma, kesin tıbbi karar verdiğini iddia etme, ilaç/doz önerme.
- Sadece kullanıcının aşağıda verilen kayıtlı sağlık geçmişini bağlam olarak kullan.
- Değerleri tarihleriyle karşılaştır, trendi (arttı/azaldı/stabil) açıkça belirt.
- Bağlamda veri yoksa "kayıtlarınızda bu bilgi bulunmuyor" de, tahmin etme.
- Kısa, sade, madde işaretli ve anlaşılır yaz. Gerektiğinde hekime başvurulmasını hatırlat.
- Yanıtının sonuna şu satırı ekle: "_{DISCLAIMER}_"
"""


def _api_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY tanımlı değil")
    return key


def _parse_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    match = re.search(r"\{.*\}", cleaned, re.S)
    if match:
        cleaned = match.group(0)
    return json.loads(cleaned)


async def extract_from_document(
    session_id: str,
    text: Optional[str] = None,
    file_path: Optional[str] = None,
    mime_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Return structured health data. The caller deletes the temp file afterwards."""
    chat = LlmChat(
        api_key=_api_key(),
        session_id=session_id,
        system_message=EXTRACT_SYSTEM,
    ).with_model("gemini", EXTRACT_MODEL)

    files = None
    prompt = "Bu sağlık belgesini yapılandırılmış JSON'a çevir."
    if file_path and mime_type:
        files = [FileContentWithMimeType(file_path=file_path, mime_type=mime_type)]
    if text:
        prompt = f"{prompt}\n\nBelge metni:\n{text}"

    reply = await chat.send_message(UserMessage(text=prompt, file_contents=files))
    data = _parse_json(reply if isinstance(reply, str) else str(reply))

    if data.get("record_type") not in RECORD_TYPES:
        data["record_type"] = "diger"
    if not data.get("record_date"):
        data["record_date"] = today_iso()
    if not data.get("title"):
        data["title"] = "Sağlık Kaydı"
    for key in ("findings", "diagnoses", "medications", "lab_results"):
        if not isinstance(data.get(key), list):
            data[key] = []
    return data


def build_context(records: List[Dict[str, Any]]) -> str:
    if not records:
        return "Kullanıcının kayıtlı sağlık verisi yok."
    lines = [f"Bugünün tarihi: {today_iso()}", "Kullanıcının sağlık geçmişi:"]
    for rec in records:
        lines.append(f"\n[{rec.get('record_date')}] {rec.get('title')} ({rec.get('record_type')})")
        if rec.get("summary"):
            lines.append(f"  Özet: {rec['summary']}")
        for lab in rec.get("lab_results", []) or []:
            lines.append(
                f"  Test: {lab.get('test_name')} = {lab.get('value')} {lab.get('unit') or ''}"
                f" (ref: {lab.get('reference_range') or '-'}, durum: {lab.get('flag')})"
            )
        for field, label in (
            ("findings", "Bulgular"),
            ("diagnoses", "Tanılar"),
            ("medications", "İlaçlar"),
        ):
            items = rec.get(field) or []
            if items:
                lines.append(f"  {label}: {', '.join(str(i) for i in items)}")
    return "\n".join(lines)


async def answer_question(
    session_id: str,
    question: str,
    records: List[Dict[str, Any]],
    history: List[Dict[str, Any]],
) -> str:
    chat = LlmChat(
        api_key=_api_key(),
        session_id=session_id,
        system_message=CHAT_SYSTEM + "\n\n" + build_context(records),
    ).with_model("gemini", CHAT_MODEL)

    convo = ""
    for msg in history[-8:]:
        who = "Kullanıcı" if msg.get("role") == "user" else "ClinicaGPT"
        convo += f"{who}: {msg.get('content')}\n"
    prompt = (f"Önceki konuşma:\n{convo}\n" if convo else "") + f"Kullanıcı sorusu: {question}"

    reply = await chat.send_message(UserMessage(text=prompt))
    return reply if isinstance(reply, str) else str(reply)
