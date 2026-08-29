import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiPostWithHeaders } from "@/lib/api";
import { beginSession } from "@/lib/session";
import type { User } from "@/lib/types";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const sessionId = new URLSearchParams(location.hash.replace(/^#/, "")).get("session_id");
    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    void (async () => {
      try {
        await apiPostWithHeaders<User>("/auth/session", { "X-Session-ID": sessionId });
        beginSession();
        window.history.replaceState(null, "", "/");
        navigate("/", { replace: true });
      } catch {
        setFailed(true);
      }
    })();
  }, [location.hash, navigate]);

  return (
    <div className="flex min-h-svh items-center justify-center px-6 text-center">
      <p data-testid="auth-callback-status" className="text-sm text-slate-500">
        {failed ? "Giriş tamamlanamadı. Lütfen tekrar deneyin." : "Oturum hazırlanıyor..."}
      </p>
    </div>
  );
}
