# ClinicaGPT — Living Spec

Yapay zekâ destekli kişisel sağlık kaydı ve sağlık verisi analiz uygulaması (Türkçe arayüz).

## Ne yapar
- Kullanıcı PDF / JPG / PNG / serbest metin sağlık belgesi yükler.
- Backend belgeyi geçici dosyaya yazar, Gemini ile yapılandırılmış JSON'a çevirir, **geçici dosyayı siler** (gizlilik taahhüdü: orijinal belge saklanmaz).
- Yapılandırılmış kayıt zaman çizelgesine eklenir; aynı testin farklı tarihli sonuçları trend olarak karşılaştırılır.
- Kullanıcı sohbet üzerinden kendi sağlık geçmişi hakkında soru sorar; LLM yalnızca kayıtlı verileri bağlam olarak alır ve tanı koymaz (her yanıtın sonunda tıbbi uyarı).

## Stack
FastAPI (backend, /api prefix) + MongoDB (motor) + Vite/React 19/TS + Tailwind v4 + shadcn (base-ui).
LLM: `emergentintegrations` → Gemini (`gemini-3.1-pro-preview` belge çıkarımı, `gemini-3.5-flash` sohbet), anahtar `EMERGENT_LLM_KEY` yalnızca backend/.env içinde.

## Veri modeli (Firestore'a taşınabilir — her koleksiyon `user_id` taşır, id'ler string uuid)
- `users`: user_id, email, name, picture, birth_year, blood_type, chronic_conditions, allergies, created_at
- `user_sessions`: user_id, session_token, expires_at (7 gün), created_at
- `health_records`: record_id, user_id, record_type (kan_tahlili|goruntuleme|doktor_raporu|recete|ilac|tani|semptom|ameliyat|ziyaret|diger), source_type (pdf|image|text|manual), record_date (YYYY-MM-DD), title, summary, findings[], diagnoses[], medications[], lab_results[{test_name,value,unit,reference_range,flag}], created_at
- `chat_messages`: message_id, user_id, role (user|assistant), content, created_at

Firestore karşılığı: `profiles/{user_id}` + `profiles/{user_id}/healthRecords/{record_id}` + `.../chatMessages/{message_id}`.

## API (hepsi /api altında)
- `POST /api/auth/session` (X-Session-ID → Emergent Google Auth), `POST /api/auth/demo`, `GET/PATCH /api/auth/me`, `POST /api/auth/logout`
- `GET /api/records`, `GET /api/records/{id}`, `DELETE /api/records/{id}`
- `POST /api/records/ingest-text`, `POST /api/records/ingest-file` (multipart)
- `GET /api/trends`
- `GET /api/chat/messages`, `DELETE /api/chat/messages`, `POST /api/chat`

## Sayfalar
`/login` (Google + demo), `/` sohbet (ChatGPT benzeri), `/timeline`, `/trends`, `/records`, `/profile`. Oturum httpOnly cookie (`session_token`).

## Roller
Tek rol: kullanıcı. Her sorgu `user_id` ile izole.

## MVP dışı (sonraki adımlar)
Streaming yanıt, çoklu sohbet oturumu, PDF rapor dışa aktarma, hatırlatıcılar, gerçek Firestore backend, ilaç etkileşim kontrolü.
