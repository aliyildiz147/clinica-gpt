import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/layout/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { formatDateTr, type TrendSeries } from "@/lib/types";

export default function Trends() {
  const [selected, setSelected] = useState("");

  const trendsQuery = useQuery<TrendSeries[]>({
    queryKey: ["trends"],
    queryFn: () => apiGet<TrendSeries[]>("/trends"),
    retry: false,
  });

  const series = trendsQuery.isError ? [] : (trendsQuery.data ?? []);
  const active = useMemo(
    () => series.find((s) => s.test_name === selected) ?? series[0],
    [series, selected],
  );

  const chartData = (active?.points ?? []).map((p) => ({
    date: formatDateTr(p.record_date),
    value: p.value,
  }));

  const first = active?.points[0];
  const last = active?.points[active.points.length - 1];
  const delta = first && last ? last.value - first.value : 0;

  return (
    <AppShell title="Trendler">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-[15px] leading-relaxed text-slate-600">
          Aynı testin farklı tarihlerdeki sonuçlarını karşılaştırın.
        </p>

        {series.length === 0 ? (
          <p
            data-testid="trends-empty-state"
            className="mt-10 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500"
          >
            Karşılaştırılacak sayısal test sonucu bulunamadı.
          </p>
        ) : (
          <div className="mt-6">
            <Select
              value={active?.test_name ?? ""}
              onValueChange={(v: string) => setSelected(v)}
            >
              <SelectTrigger
                className="w-full sm:w-72"
                data-testid="biomarker-trend-selector"
                aria-label="Test seç"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {series.map((s) => (
                  <SelectItem key={s.test_name} value={s.test_name}>
                    {s.test_name} ({s.points.length} ölçüm)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div
              data-testid="trend-chart"
              className="mt-6 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-lg font-medium tracking-tight text-slate-900">
                  {active?.test_name} {last?.unit ? `(${last.unit})` : ""}
                </h2>
                <p
                  data-testid="trend-delta"
                  className={`font-mono text-sm ${
                    delta > 0 ? "text-rose-700" : delta < 0 ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(2)} değişim
                </p>
              </div>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      stroke="#E2E8F0"
                    />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} stroke="#E2E8F0" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0D9488"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#0D9488" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 font-mono text-[11px] text-slate-500">
                Referans aralığı: {last?.reference_range ?? "—"}
              </p>
            </div>

            <ul data-testid="trend-points-list" className="mt-6 space-y-2">
              {(active?.points ?? []).map((p, i) => (
                <li
                  key={`${p.record_date}-${i}`}
                  className="flex items-baseline justify-between border-b border-slate-100 pb-2 text-sm"
                >
                  <span className="font-mono text-slate-500">
                    {formatDateTr(p.record_date)}
                  </span>
                  <span className="font-mono text-slate-900">
                    {p.value} {p.unit ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
