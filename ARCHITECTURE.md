# ClinicaGPT — Mimari Açıklaması

## 1. Teknoloji mimarisi
- **Backend:** FastAPI (async), tüm uçlar tek `APIRouter(prefix="/api")` üzerinde. Uvicorn, port 8001.
- **Frontend:** Vite + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui. Veri erişimi TanStack Query, tüm çağrılar `/api` göreli yolundan (proxy) geçer.
- **LLM:** `emergentintegrations` → Gemini. Belge çıkarımı `gemini-3.1-pro-preview` (PDF + görsel doğrudan modele gider, ayrı OCR servisi gerekmez), sohbet `gemini-3.5-flash`.
- **Anahtar güvenliği:** `EMERGENT_LLM_KEY` yalnızca `backend/.env`'de; istemciye hiçbir zaman gönderilmez. Tüm LLM çağrıları server-side.

## 2. Veritabanı yapısı (MongoDB, Firestore'a taşınabilir)
`users`, `user_sessions`, `health_records`, `chat_messages` — hepsi string `uuid` id + `user_id` alanı taşır.
Firestore karşılığı doğrudan: `profiles/{user_id}`, `profiles/{user_id}/healthRecords/{recordId}`, `profiles/{user_id}/chatMessages/{messageId}`.
Alan listesi `memory/SPEC.md` içinde. Önerilen sapma: belge metnini değil **normalize edilmiş `lab_results[]` dizisini** saklıyoruz — trend/karşılaştırma sorguları böylece LLM'e ihtiyaç duymadan çalışıyor, LLM yalnızca yorumlama katmanında.

## 3. AI / doküman işleme akışı
1. İstemci dosyayı `POST /api/records/ingest-file` (multipart) veya metni `ingest-text` ile gönderir.
2. Backend içeriği **geçici** bir dosyaya yazar (`tempfile`).
3. Gemini'ye şema zorunlu bir prompt ile gönderilir → yalnızca JSON döner (record_type, record_date, title, summary, findings, diagnoses, medications, lab_results).
4. JSON doğrulanır/normalize edilir, `record_date` yoksa sunucu saatiyle (`lib/dates.py`) doldurulur.
5. `finally` bloğunda geçici dosya **silinir** (hata durumunda da).
6. Yapılandırılmış kayıt Mongo'ya yazılır.
Sohbette ise kullanıcının tüm kayıtları düz metin bağlama çevrilir (`lib/ai.py:build_context`) ve modele sistem mesajı olarak verilir; model kayıt dışına çıkamaz, tanı koymaz, her yanıta uyarı ekler.

## 4. Güvenlik ve gizlilik mimarisi
- Orijinal dosya diskte kalıcı değil, DB'de hiç yok, log'lanmıyor.
- Oturum: httpOnly + Secure + SameSite=None cookie (`session_token`), 7 gün, DB'de saklanır; token JSON gövdesinde dönmez.
- Her sorgu `user_id` ile filtrelenir → kullanıcılar arası veri sızıntısı yok. Mongo `_id` hiçbir yanıtta yer almaz.
- Çıkışta hem sunucu oturumu hem react-query önbelleği temizlenir.

## 5. Gereken API/servisler
- Emergent Google Auth (`auth.emergentagent.com` + `session-data` ucu) — ek anahtar gerekmez.
- Emergent Universal LLM key (Gemini) — dilediğiniz an kendi OpenAI/Gemini anahtarınızla değiştirilebilir.
- MongoDB (pod içi). Firestore'a geçiş için yalnızca veri erişim katmanı değişir.

## 6. MVP'ye dahil olanlar
Google/demo giriş, ChatGPT benzeri sohbet, PDF/JPG/PNG/metin yükleme + AI yapılandırma, orijinal dosya silme garantisi, kronolojik zaman çizelgesi, test bazlı trend grafiği ve karşılaştırma, kayıt listesi + silme, profil, kalıcı tıbbi uyarı, mobil öncelikli responsive arayüz.

## 7. Sonraki adımlar
Token bazlı streaming yanıt, çoklu sohbet oturumu, gerçek Firestore backend, PDF özet dışa aktarma, ilaç etkileşim uyarıları, tahlil hatırlatıcıları, aile/bakıcı paylaşımı, KVKK/GDPR veri indirme-silme self servis.
