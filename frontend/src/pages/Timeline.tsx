import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import {
  FLAG_LABELS,
  RECORD_TYPE_LABELS,
  formatDateTr,
  type HealthRecord,
} from "@/lib/types";

function flagClass(flag?: string | null): string {
  if (flag === "yuksek") return "text-rose-700";
  if (flag === "dusuk") return "text-sky-700";
  if (flag === "normal") return "text-emerald-700";
  return "text-slate-500";
}

export default function Timeline() {
  const recordsQuery = useQuery<HealthRecord[]>({
    queryKey: ["records"],
    queryFn: () => apiGet<HealthRecord[]>("/records"),
    retry: false,
  });

  const records = recordsQuery.isError ? [] : (recordsQuery.data ?? []);

  return (
    <AppShell title="Zaman Çizelgesi">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-[15px] leading-relaxed text-slate-600">
          Sağlık kayıtlarınız en yeniden eskiye doğru kronolojik olarak listelenir.
        </p>

        {records.length === 0 ? (
          <p
            data-testid="timeline-empty-state"
            className="mt-10 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500"
          >
            Henüz kayıt yok. Sohbet ekranındaki ataç simgesiyle ilk belgenizi ekleyin.
          </p>
        ) : (
          <ol data-testid="timeline-list" className="mt-8 space-y-8">
            {records.map((rec) => (
              <li
                key={rec.record_id}
                data-testid="timeline-item"
                className="relative border-l border-slate-200 pl-6"
              >
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-teal-600" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px] text-slate-500">
                    {formatDateTr(rec.record_date)}
                  </span>
                  <Badge variant="secondary" className="text-[11px]">
                    {RECORD_TYPE_LABELS[rec.record_type] ?? rec.record_type}
                  </Badge>
                </div>
                <h3 className="mt-1.5 font-heading text-lg font-medium tracking-tight text-slate-900">
                  {rec.title}
                </h3>
                {rec.summary && (
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {rec.summary}
                  </p>
                )}

                {rec.lab_results.length > 0 && (
                  <dl className="mt-3 space-y-1.5">
                    {rec.lab_results.map((lab, i) => (
                      <div
                        key={`${rec.record_id}-${lab.test_name}-${i}`}
                        className="flex flex-wrap items-baseline gap-x-2 text-sm"
                      >
                        <dt className="text-slate-700">{lab.test_name}:</dt>
                        <dd className={`font-mono ${flagClass(lab.flag)}`}>
                          {lab.value} {lab.unit ?? ""}
                        </dd>
                        <span className="font-mono text-[11px] text-slate-400">
                          ref {lab.reference_range ?? "—"} ·{" "}
                          {FLAG_LABELS[lab.flag ?? "bilinmiyor"] ?? lab.flag}
                        </span>
                      </div>
                    ))}
                  </dl>
                )}

                {rec.findings.length > 0 && (
                  <p className="mt-3 text-sm text-slate-600">
                    <span className="text-slate-500">Bulgular: </span>
                    {rec.findings.join(" · ")}
                  </p>
                )}
                {rec.diagnoses.length > 0 && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="text-slate-500">Tanılar: </span>
                    {rec.diagnoses.join(" · ")}
                  </p>
                )}
                {rec.medications.length > 0 && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="text-slate-500">İlaçlar: </span>
                    {rec.medications.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
