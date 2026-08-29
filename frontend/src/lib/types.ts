// Hand-written mirrors of backend/models/schemas.py — keep both sides in sync.

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  birth_year?: number | null;
  blood_type?: string | null;
  chronic_conditions?: string | null;
  allergies?: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  name?: string;
  birth_year?: number;
  blood_type?: string;
  chronic_conditions?: string;
  allergies?: string;
}

export interface LabResult {
  test_name: string;
  value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  flag?: string | null;
}

export interface HealthRecord {
  record_id: string;
  user_id: string;
  record_type: string;
  source_type: string;
  record_date: string;
  title: string;
  summary: string;
  findings: string[];
  diagnoses: string[];
  medications: string[];
  lab_results: LabResult[];
  created_at: string;
}

export interface IngestResponse {
  record: HealthRecord;
  original_deleted: boolean;
}

export interface TrendPoint {
  record_date: string;
  value: number;
  unit?: string | null;
  reference_range?: string | null;
  flag?: string | null;
}

export interface TrendSeries {
  test_name: string;
  points: TrendPoint[];
}

export interface ChatMessage {
  message_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export interface OkResponse {
  ok: boolean;
}

export const RECORD_TYPE_LABELS: Record<string, string> = {
  kan_tahlili: "Kan Tahlili",
  goruntuleme: "Görüntüleme",
  doktor_raporu: "Doktor Raporu",
  recete: "Reçete",
  ilac: "İlaç",
  tani: "Tanı",
  semptom: "Semptom",
  ameliyat: "Ameliyat",
  ziyaret: "Klinik Ziyareti",
  diger: "Diğer",
};

export const FLAG_LABELS: Record<string, string> = {
  normal: "Normal",
  yuksek: "Yüksek",
  dusuk: "Düşük",
  bilinmiyor: "—",
};

export const DISCLAIMER =
  "ClinicaGPT bir hekim veya tanı koyucu değildir. Üretilen bilgiler bilgilendirme amaçlıdır; kesin teşhis ve tedavi için lütfen hekiminize danışınız.";

export const PRIVACY_NOTICE =
  "Gizlilik Taahhüdü: Yüklenen orijinal belgeler sunucularda saklanmaz, analiz sonrası anında silinir. Yalnızca yapılandırılmış sağlık verileriniz saklanır.";

export function formatDateTr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
