"""Idempotent demo seed: a demo profile with a realistic Turkish health history."""
import asyncio
import uuid
from datetime import datetime, timezone

from lib.db import db

DEMO_EMAIL = "demo@clinicagpt.app"

RECORDS = [
    {
        "record_type": "kan_tahlili",
        "source_type": "pdf",
        "record_date": "2025-03-03",
        "title": "Hemogram ve Biyokimya Paneli",
        "summary": "CRP belirgin yüksek, hemoglobin referans aralığının altında. Ferritin düşük.",
        "findings": ["Akut faz belirteçlerinde yükselme", "Hafif anemi tablosu"],
        "diagnoses": [],
        "medications": [],
        "lab_results": [
            {"test_name": "CRP", "value": "28", "unit": "mg/L", "reference_range": "0-5", "flag": "yuksek"},
            {"test_name": "Hemoglobin", "value": "11.2", "unit": "g/dL", "reference_range": "13-17", "flag": "dusuk"},
            {"test_name": "Ferritin", "value": "9", "unit": "ng/mL", "reference_range": "30-400", "flag": "dusuk"},
            {"test_name": "Glukoz", "value": "98", "unit": "mg/dL", "reference_range": "70-100", "flag": "normal"},
            {"test_name": "TSH", "value": "2.1", "unit": "mIU/L", "reference_range": "0.4-4.0", "flag": "normal"},
        ],
    },
    {
        "record_type": "recete",
        "source_type": "image",
        "record_date": "2025-03-05",
        "title": "E-Reçete — Demir ve Antibiyotik",
        "summary": "Demir takviyesi ve kısa süreli antibiyotik tedavisi reçete edilmiş.",
        "findings": [],
        "diagnoses": ["Demir eksikliği anemisi (ön tanı)"],
        "medications": ["Ferro Sanol Duodenal 100 mg, günde 1 kez", "Amoksisilin 1000 mg, günde 2 kez, 7 gün"],
        "lab_results": [],
    },
    {
        "record_type": "goruntuleme",
        "source_type": "pdf",
        "record_date": "2025-04-18",
        "title": "Lomber MR Raporu",
        "summary": "L4-L5 seviyesinde hafif disk protrüzyonu tanımlanmış, kök basısı belirtilmemiş.",
        "findings": ["L4-L5 hafif disk protrüzyonu", "Vertebra yüksekliklerinde kayıp yok"],
        "diagnoses": ["Lomber disk protrüzyonu"],
        "medications": [],
        "lab_results": [],
    },
    {
        "record_type": "kan_tahlili",
        "source_type": "pdf",
        "record_date": "2025-05-15",
        "title": "Kontrol Kan Tahlili",
        "summary": "CRP gerilemiş, hemoglobin ve ferritin yükselme eğiliminde.",
        "findings": ["Enflamasyon belirteçlerinde gerileme"],
        "diagnoses": [],
        "medications": [],
        "lab_results": [
            {"test_name": "CRP", "value": "12", "unit": "mg/L", "reference_range": "0-5", "flag": "yuksek"},
            {"test_name": "Hemoglobin", "value": "12.4", "unit": "g/dL", "reference_range": "13-17", "flag": "dusuk"},
            {"test_name": "Ferritin", "value": "22", "unit": "ng/mL", "reference_range": "30-400", "flag": "dusuk"},
            {"test_name": "Glukoz", "value": "104", "unit": "mg/dL", "reference_range": "70-100", "flag": "yuksek"},
            {"test_name": "TSH", "value": "2.4", "unit": "mIU/L", "reference_range": "0.4-4.0", "flag": "normal"},
        ],
    },
    {
        "record_type": "doktor_raporu",
        "source_type": "text",
        "record_date": "2025-09-02",
        "title": "Kardiyoloji Kontrol Notu",
        "summary": "Tansiyon takibi normal seyirde, EKO bulguları olağan olarak raporlanmış.",
        "findings": ["EF %60", "Kapak patolojisi saptanmadı"],
        "diagnoses": [],
        "medications": [],
        "lab_results": [
            {"test_name": "CRP", "value": "4", "unit": "mg/L", "reference_range": "0-5", "flag": "normal"},
            {"test_name": "Hemoglobin", "value": "13.6", "unit": "g/dL", "reference_range": "13-17", "flag": "normal"},
            {"test_name": "Ferritin", "value": "48", "unit": "ng/mL", "reference_range": "30-400", "flag": "normal"},
        ],
    },
]


async def main() -> None:
    user = await db.users.find_one({"email": DEMO_EMAIL}, {"_id": 0})
    if user:
        user_id = user["user_id"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": DEMO_EMAIL,
                "name": "Demo Kullanıcı",
                "picture": None,
                "birth_year": 1988,
                "blood_type": "A Rh+",
                "chronic_conditions": "Yok",
                "allergies": "Penisilin (hafif döküntü)",
                "created_at": datetime.now(timezone.utc),
            }
        )

    for rec in RECORDS:
        exists = await db.health_records.find_one(
            {"user_id": user_id, "title": rec["title"], "record_date": rec["record_date"]}
        )
        if exists:
            continue
        await db.health_records.insert_one(
            {
                "record_id": str(uuid.uuid4()),
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc),
                **rec,
            }
        )

    count = await db.health_records.count_documents({"user_id": user_id})
    print(f"Demo user {user_id} ({DEMO_EMAIL}) has {count} health records.")


if __name__ == "__main__":
    asyncio.run(main())
