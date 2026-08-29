import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp, Loader2, Paperclip } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import DocumentUploadDialog from "@/components/health/DocumentUploadDialog";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import type { ChatMessage, ChatResponse } from "@/lib/types";

const SUGGESTIONS = [
  "Son kan tahlilimde dikkat çeken değerler hangileri?",
  "CRP değerim son 6 ayda nasıl değişti?",
  "Geçmiş MR raporlarımda ne var?",
  "Bu sonuçlarımı daha önceki sonuçlarımla karşılaştır.",
];

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      data-testid={isUser ? "chat-message-user" : "chat-message-assistant"}
      className={isUser ? "flex justify-end" : "flex justify-start"}
    >
      <div
        className={
          isUser
            ? "max-w-[85%] animate-rise rounded-2xl bg-slate-100 px-4 py-3 text-[15px] leading-relaxed text-slate-900"
            : "max-w-[95%] animate-rise whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        }
      >
        {message.content}
      </div>
    </div>
  );
}

export default function Chat() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery<ChatMessage[]>({
    queryKey: ["chat-messages"],
    queryFn: () => apiGet<ChatMessage[]>("/chat/messages"),
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => apiPost<ChatResponse>("/chat", { message }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Yanıt alınamadı")),
  });

  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMutation.isPending]);

  const submit = (value: string) => {
    const text = value.trim();
    if (!text || sendMutation.isPending) return;
    setDraft("");
    sendMutation.mutate(text);
  };

  const empty = messages.length === 0 && !sendMutation.isPending;

  return (
    <AppShell title="Sohbet">
      <div className="flex h-[calc(100svh-104px)] flex-col">
        <div
          data-testid="chat-messages-container"
          className="flex-1 overflow-y-auto px-4 py-8"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {empty && (
              <div className="pt-6">
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Sağlık geçmişiniz hakkında konuşalım
                </h2>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
                  Bir soru yazın ya da yeni bir tahlil, rapor veya reçete ekleyin. Yanıtlar
                  yalnızca sizin kayıtlı sağlık verilerinize dayanır.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      data-testid={`chat-suggestion-${i}`}
                      onClick={() => submit(s)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-700 transition-colors duration-150 hover:border-teal-600 hover:text-teal-800"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <Bubble key={m.message_id} message={m} />
            ))}

            {sendMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                <span data-testid="chat-thinking-indicator">
                  Kayıtlarınız inceleniyor
                </span>
                <span className="inline-block h-4 w-[2px] animate-caret bg-teal-600" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="px-4 pb-5">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.04)] transition-colors duration-150 focus-within:border-teal-600">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Belge veya fotoğraf ekle"
              data-testid="chat-upload-trigger"
              onClick={() => setUploadOpen(true)}
            >
              <Paperclip className="size-5 text-slate-500" strokeWidth={1.75} />
            </Button>
            <textarea
              rows={1}
              value={draft}
              data-testid="chat-message-input"
              placeholder="Sağlık geçmişiniz hakkında bir şey sorun..."
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(draft);
                }
              }}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400"
            />
            <Button
              size="icon"
              aria-label="Gönder"
              data-testid="chat-send-button"
              disabled={!draft.trim() || sendMutation.isPending}
              onClick={() => submit(draft)}
            >
              <ArrowUp className="size-5" strokeWidth={2} />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-400">
            Yüklediğiniz orijinal belgeler saklanmaz; yalnızca yapılandırılmış veriler kalır.
          </p>
        </div>
      </div>

      <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </AppShell>
  );
}
