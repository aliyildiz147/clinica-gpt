import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AuthCallback from "@/pages/AuthCallback";
import Chat from "@/pages/Chat";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Records from "@/pages/Records";
import Timeline from "@/pages/Timeline";
import Trends from "@/pages/Trends";
import { useMe } from "@/lib/session";

function Protected({ children }: { children: React.ReactNode }) {
  const { isPending, isError } = useMe();
  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-slate-500">Yükleniyor...</p>
      </div>
    );
  }
  if (isError) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();

  // Process a fresh OAuth session_id BEFORE any /auth/me check can race it.
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Chat />
          </Protected>
        }
      />
      <Route
        path="/timeline"
        element={
          <Protected>
            <Timeline />
          </Protected>
        }
      />
      <Route
        path="/trends"
        element={
          <Protected>
            <Trends />
          </Protected>
        }
      />
      <Route
        path="/records"
        element={
          <Protected>
            <Records />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
