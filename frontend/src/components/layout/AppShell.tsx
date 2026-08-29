import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  FileText,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { endSession, useMe } from "@/lib/session";
import { DISCLAIMER } from "@/lib/types";

const NAV = [
  { to: "/", label: "Sohbet", icon: MessageSquare, testid: "nav-chat-tab" },
  { to: "/timeline", label: "Zaman Çizelgesi", icon: Activity, testid: "nav-timeline-tab" },
  { to: "/trends", label: "Trendler", icon: LineChart, testid: "nav-trends-tab" },
  { to: "/records", label: "Kayıtlar", icon: FileText, testid: "nav-records-tab" },
  { to: "/profile", label: "Profil", icon: UserIcon, testid: "nav-profile-tab" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-testid={item.testid}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150",
              active
                ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { data: me } = useMe();
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2">
        <p className="font-heading text-lg font-semibold tracking-tight text-slate-900">
          ClinicaGPT
        </p>
        <p className="mt-0.5 text-xs text-slate-500">Kişisel sağlık asistanı</p>
      </div>

      <NavLinks onNavigate={onNavigate} />

      <div className="mt-auto space-y-3">
        <div
          data-testid="privacy-pill"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-800"
        >
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          <span>Orijinal belgeleriniz saklanmaz, analizden sonra silinir.</span>
        </div>
        {me && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <p
              data-testid="sidebar-user-name"
              className="truncate text-sm font-medium text-slate-900"
            >
              {me.name}
            </p>
            <p className="truncate text-xs text-slate-500">{me.email}</p>
            <Button
              variant="ghost"
              size="sm"
              data-testid="logout-button"
              onClick={() => void endSession()}
              className="mt-2 h-8 w-full justify-start px-2 text-xs text-slate-600"
            >
              <LogOut className="size-3.5" /> Çıkış yap
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-[#F3F4F6] md:block">
        <SidebarBody />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-[#F3F4F6] p-0">
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Menüyü aç"
            data-testid="sidebar-toggle-button"
            className="md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <h1
            data-testid="page-title"
            className="font-heading text-base font-semibold tracking-tight text-slate-900"
          >
            {title}
          </h1>
        </header>

        <p
          data-testid="medical-disclaimer-banner"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] leading-relaxed text-amber-800"
        >
          {DISCLAIMER}
        </p>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}
