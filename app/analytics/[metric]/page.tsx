"use client";

import { AppShell } from "@/components/app-shell";
import { GlobalFilters } from "@/components/analytics/global-filters";
import { MetricCard } from "@/components/analytics/metric-card";
import { apiFetch, type AnalyticsDetail } from "@/lib/api";
import { Download } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const endpoints: Record<string, string> = {
  "approval-rate": "/analytics/approvals",
  "estimated-concurrency": "/analytics/concurrency",
  "assignment-delivery": "/analytics/assignments",
  "course-completion": "/analytics/completion",
  "visit-periodicity": "/analytics/visits",
  "teachers-without-editing": "/analytics/teachers-without-editing",
  "students-by-course": "/analytics/students-by-course",
  "content-types": "/analytics/content-types"
};
const pageSize = 20;

export default function AnalyticsMetricPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Detalle analitico">
          <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando...</p>
        </AppShell>
      }
    >
      <MetricDetailContent />
    </Suspense>
  );
}

function MetricDetailContent() {
  const params = useParams<{ metric: string }>();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [detail, setDetail] = useState<AnalyticsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const endpoint = endpoints[params.metric];
  const pageCount = detail ? Math.max(1, Math.ceil(detail.rows.length / pageSize)) : 1;
  const visibleRows = useMemo(
    () => detail?.rows.slice((page - 1) * pageSize, page * pageSize) ?? [],
    [detail, page]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!endpoint) throw new Error("Metrica no reconocida");
        setDetail(await apiFetch<AnalyticsDetail>(`${endpoint}${queryString ? `?${queryString}` : ""}`));
        setPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el detalle");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [endpoint, queryString]);

  return (
    <AppShell title="Detalle analitico">
      <div className="space-y-5">
        <GlobalFilters />
        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando...</p>}
        {detail && (
          <>
            <MetricCard indicator={detail.metric} />
            <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Detalle</h2>
                  <p className="mt-1 text-sm text-slate-600">{detail.metric.formula}</p>
                </div>
                <button
                  type="button"
                  disabled={detail.rows.length === 0}
                  onClick={() => exportCsv(detail)}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                {detail.rows.length > 0 ? (
                  <table className="w-full min-w-[720px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase text-slate-500">
                        {detail.columns.map((column) => (
                          <th key={column} className="whitespace-nowrap py-2 pr-3">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-slate-100">
                          {detail.columns.map((column) => (
                            <td key={column} className="max-w-80 py-2 pr-3 align-top">
                              <DetailCell column={column} value={row[column]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">{detail.empty_message}</p>
                )}
              </div>
              {detail.rows.length > pageSize && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {Math.min((page - 1) * pageSize + 1, detail.rows.length)}-
                    {Math.min(page * pageSize, detail.rows.length)} de {detail.rows.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      className="h-8 cursor-pointer rounded border border-slate-300 px-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={page === pageCount}
                      onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                      className="h-8 cursor-pointer rounded border border-slate-300 px-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function exportCsv(detail: AnalyticsDetail) {
  const header = detail.columns.join(",");
  const rows = detail.rows.map((row) =>
    detail.columns.map((column) => `"${String(row[column] ?? "").replaceAll('"', '""')}"`).join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${detail.metric.code}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function DetailCell({ column, value }: { column: string; value: unknown }) {
  const text = String(value ?? "-");
  if (column === "Aula virtual") {
    return <span className="block max-w-96 truncate font-medium text-slate-950" title={text}>{text}</span>;
  }
  if (column === "Docente") {
    return <span className="block max-w-72 truncate text-slate-700" title={text}>{text}</span>;
  }
  if (column === "Moodle") {
    return text === "-" ? (
      "-"
    ) : (
      <a href={text} target="_blank" rel="noreferrer" className="font-semibold text-institutional-primary hover:underline">
        Abrir
      </a>
    );
  }
  if (column === "Visible") {
    const visible = text === "Visible";
    return (
      <span
        className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold ${
          visible ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}
      >
        {text}
      </span>
    );
  }
  if (column === "Estado") {
    const good = ["En rango", "Activo"].includes(text);
    return (
      <span
        className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
          good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}
      >
        {text}
      </span>
    );
  }
  if (column === "Porcentaje") {
    const percentage = Math.max(0, Math.min(Number(text.replace("%", "")) || 0, 100));
    return (
      <div className="min-w-36">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-slate-900">{text}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
          <div
            className={`h-full rounded ${percentage >= 80 ? "bg-emerald-500" : "bg-red-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
  return text;
}
