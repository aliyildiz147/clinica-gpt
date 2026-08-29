import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { apiErrorMessage, apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { DISCLAIMER, PRIVACY_NOTICE, type User } from "@/lib/types";

export default function Login() {
  const navigate = useNavigate();

  const demoMutation = useMutation({
    mutationFn: () => apiPost<User>("/auth/demo"),
    onSuccess: () => {
      beginSession();
      navigate("/", { replace: true });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Demo profiline girilemedi")),
  });

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="flex min-h-svh flex-col justify-center bg-background px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <p className="font-heading text-3xl font-semibold tracking-tight text-slate-900">
          ClinicaGPT
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Tahlillerinizi, raporlarınızı ve reçetelerinizi yükleyin; yapay zekâ bunları
          yapılandırılmış bir sağlık geçmişine dönüştürsün ve sorularınızı yanıtlasın.
        </p>

        <div className="mt-8 space-y-3">
          <Button
            className="w-full"
            data-testid="google-login-button"
            onClick={googleLogin}
          >
            Google ile devam et
          </Button>
          <Button
            variant="outline"
            className="w-full"
            data-testid="demo-login-button"
            disabled={demoMutation.isPending}
            onClick={() => demoMutation.mutate()}
          >
            <Sparkles className="size-4" /> Demo profiliyle dene
          </Button>
        </div>

        <p className="mt-8 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {PRIVACY_NOTICE}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{DISCLAIMER}</p>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
