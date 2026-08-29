import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiErrorMessage, apiPost, apiUpload } from "@/lib/api";
import { PRIVACY_NOTICE, type IngestResponse } from "@/lib/types";

export default function DocumentUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");

  const done = (res: IngestResponse) => {
    void queryClient.invalidateQueries({ queryKey: ["records"] });
    void queryClient.invalidateQueries({ queryKey: ["trends"] });
    toast.success(`Kayıt oluşturuldu: ${res.record.title}`, {
      description: "Orijinal belge silindi, yalnızca yapılandırılmış veri saklandı.",
    });
    setFile(null);
    setText("");
    onOpenChange(false);
  };

  const fileMutation = useMutation({
    mutationFn: (f: File) => apiUpload<IngestResponse>("/records/ingest-file", f),
    onSuccess: done,
    onError: (err) => toast.error(apiErrorMessage(err, "Belge analiz edilemedi")),
  });

  const textMutation = useMutation({
    mutationFn: (content: string) =>
      apiPost<IngestResponse>("/records/ingest-text", { content }),
    onSuccess: done,
    onError: (err) => toast.error(apiErrorMessage(err, "Metin analiz edilemedi")),
  });

  const busy = fileMutation.isPending || textMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="document-upload-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Sağlık belgesi ekle</DialogTitle>
          <DialogDescription>
            PDF, fotoğraf veya serbest metin yükleyin; yapay zekâ içeriği yapılandırılmış
            sağlık verisine çevirir.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file">
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="file" data-testid="upload-tab-file">
              Dosya / Fotoğraf
            </TabsTrigger>
            <TabsTrigger value="text" data-testid="upload-tab-text">
              Metin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="pt-4">
            <button
              type="button"
              data-testid="document-upload-dropzone"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition-colors duration-150 hover:border-teal-600 hover:bg-teal-50/40"
            >
              <Upload className="size-5 text-slate-500" strokeWidth={1.75} />
              <span className="text-sm text-slate-700">
                {file ? file.name : "Dosya seçmek için tıklayın"}
              </span>
              <span className="text-xs text-slate-500">PDF, JPG, PNG veya TXT</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              data-testid="document-upload-input"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              className="mt-4 w-full"
              disabled={!file || busy}
              data-testid="document-upload-submit-button"
              onClick={() => file && fileMutation.mutate(file)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Analiz et ve kaydet
            </Button>
          </TabsContent>

          <TabsContent value="text" className="pt-4">
            <Textarea
              rows={7}
              value={text}
              data-testid="document-upload-textarea"
              placeholder="Tahlil sonuçlarını veya rapor metnini buraya yapıştırın..."
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              className="mt-4 w-full"
              disabled={!text.trim() || busy}
              data-testid="document-text-submit-button"
              onClick={() => textMutation.mutate(text)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Analiz et ve kaydet
            </Button>
          </TabsContent>
        </Tabs>

        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-800">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {PRIVACY_NOTICE}
        </p>
      </DialogContent>
    </Dialog>
  );
}
