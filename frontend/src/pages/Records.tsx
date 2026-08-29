import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import DocumentUploadDialog from "@/components/health/DocumentUploadDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiDelete, apiErrorMessage, apiGet } from "@/lib/api";
import {
  RECORD_TYPE_LABELS,
  formatDateTr,
  type HealthRecord,
  type OkResponse,
} from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  pdf: "PDF",
  image: "Fotoğraf",
  text: "Metin",
  manual: "Manuel",
};

export default function Records() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const recordsQuery = useQuery<HealthRecord[]>({
    queryKey: ["records"],
    queryFn: () => apiGet<HealthRecord[]>("/records"),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<OkResponse>(`/records/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["records"] });
      void queryClient.invalidateQueries({ queryKey: ["trends"] });
      toast.success("Kayıt silindi");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Kayıt silinemedi")),
  });

  const records = recordsQuery.isError ? [] : (recordsQuery.data ?? []);

  return (
    <AppShell title="Kayıtlar">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-md text-[15px] leading-relaxed text-slate-600">
            Belgelerinizden çıkarılan yapılandırılmış sağlık verileri. Orijinal dosyalar
            saklanmaz.
          </p>
          <Button data-testid="records-add-button" onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" /> Belge ekle
          </Button>
        </div>

        {records.length === 0 ? (
          <p
            data-testid="records-empty-state"
            className="mt-10 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500"
          >
            Henüz kayıt yok.
          </p>
        ) : (
          <ul data-testid="records-list" className="mt-6 space-y-3">
            {records.map((rec) => (
              <li
                key={rec.record_id}
                data-testid="record-item"
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow duration-150 hover:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] text-slate-500">
                        {formatDateTr(rec.record_date)}
                      </span>
                      <Badge variant="secondary" className="text-[11px]">
                        {RECORD_TYPE_LABELS[rec.record_type] ?? rec.record_type}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {SOURCE_LABELS[rec.source_type] ?? rec.source_type}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        {rec.lab_results.length} parametre
                      </span>
                    </div>
                    <h3 className="mt-1.5 truncate font-heading text-base font-medium tracking-tight text-slate-900">
                      {rec.title}
                    </h3>
                    {rec.summary && (
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {rec.summary}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Kaydı sil"
                    data-testid="delete-record-button"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(rec.record_id)}
                  >
                    <Trash2 className="size-4 text-rose-700" strokeWidth={1.75} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </AppShell>
  );
}
