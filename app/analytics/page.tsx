"use client";

import { AppShell } from "@/components/app-shell";
import { GlobalFilters } from "@/components/analytics/global-filters";
import { MetricCard } from "@/components/analytics/metric-card";
import { apiFetch, type AcademicAnalyticsDashboard, type SyncStatus } from "@/lib/api";
import { Database, RefreshCw, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const sections = [
  {
    title: "Rendimiento y avance",
    codes: ["approval_rate", "assignment_delivery", "course_completion"]
  },
  {
    title: "Uso de la plataforma",
    codes: ["estimated_concurrency", "visit_periodicity"]
  },
  {
    title: "Gestion de aulas",
    codes: ["students_by_course"]
  },
  {
    title: "Diseno de cursos",
    codes: ["content_types"]
  }
];

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Analitica academica">
          <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando...</p>
        </AppShell>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [dashboard, setDashboard] = useState<AcademicAnalyticsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<"structure" | "participants" | "all" | null>(null);
  const [syncSeconds, setSyncSeconds] = useState(0);
  const indicatorsByCode = useMemo(
    () => new Map(dashboard?.indicators.map((indicator) => [indicator.code, indicator]) ?? []),
    [dashboard]
  );
  const actionableAttentionItems = useMemo(
    () => dashboard?.attention_items.filter((item) => item.severity !== "info") ?? [],
    [dashboard]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await apiFetch<AcademicAnalyticsDashboard>(`/analytics/summary${queryString ? `?${queryString}` : ""}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar analitica");
    } finally {
      setLoading(false);
    }
  }

  async function sync(mode: "structure" | "participants" | "all") {
    const paths = {
      structure: "/analytics/sync/structure",
      participants: "/analytics/sync/participants",
      all: "/analytics/sync"
    };
    setSyncing(mode);
    setSyncSeconds(0);
    setError(null);
    try {
      await apiFetch<SyncStatus>(paths[mode], { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo sincronizar analitica");
    } finally {
      window.setTimeout(() => {
        setSyncing(null);
        setSyncSeconds(0);
      }, 350);
    }
  }

  useEffect(() => {
    void load();
  }, [queryString]);

  useEffect(() => {
    if (!syncing) {
      return;
    }
    const timer = window.setInterval(() => {
      setSyncSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [syncing]);

  return (
    <AppShell title="Analitica academica">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Analitica academica</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Indicadores de rendimiento, participacion, avance y gestion de las aulas virtuales.
            </p>
            {dashboard && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded border border-slate-200 bg-white px-2 py-1">Periodo: {dashboard.period}</span>
                <span className="rounded border border-slate-200 bg-white px-2 py-1">
                  Zona horaria: {dashboard.timezone}
                </span>
                <span className="rounded border border-slate-200 bg-white px-2 py-1">
                  Cobertura: {dashboard.coverage == null ? "No disponible" : `${Math.round(dashboard.coverage * 100)}%`}
                </span>
                {dashboard.last_sync && (
                  <span className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1">
                    <span>Ultima sincronizacion:</span>
                    <span
                      className={`rounded px-2 py-0.5 font-semibold ${
                        dashboard.last_sync.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {syncStatusLabel(dashboard.last_sync.status)}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-semibold ${
                        dashboard.last_sync.sync_type === "analytics_snapshot"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {syncScopeLabel(dashboard.last_sync.sync_type)}
                    </span>
                    <span>{dashboard.last_sync.total_processed} registros</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => sync("structure")}
              disabled={syncing !== null}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Database className={`h-4 w-4 ${syncing === "structure" ? "animate-pulse" : ""}`} />
              {syncing === "structure" ? "Sincronizando..." : "Sincronizar estructura"}
            </button>
            <button
              type="button"
              onClick={() => sync("participants")}
              disabled={syncing !== null}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded border border-institutional-primary bg-white px-4 text-sm font-semibold text-institutional-primary transition-colors hover:bg-institutional-extralightblue disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Users className={`h-4 w-4 ${syncing === "participants" ? "animate-pulse" : ""}`} />
              {syncing === "participants" ? "Sincronizando..." : "Sincronizar participantes"}
            </button>
            <button
              type="button"
              onClick={() => sync("all")}
              disabled={syncing !== null}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${syncing === "all" ? "animate-spin" : ""}`} />
              {syncing === "all" ? "Sincronizando..." : "Todo"}
            </button>
          </div>
        </div>

        {syncing && (
          <div className="rounded border border-institutional-extralightblue bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-institutional-primary opacity-30" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-institutional-primary" />
                </span>
                <span className="font-medium text-slate-950">{syncLabel(syncing)}</span>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-600">
                En ejecucion · {formatDuration(syncSeconds)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Puedes permanecer en esta pantalla; los botones volveran a habilitarse cuando Moodle confirme el resultado.
            </p>
          </div>
        )}

        <Suspense
          fallback={
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Cargando filtros...
            </div>
          }
        >
          <GlobalFilters />
        </Suspense>

        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando...</p>}

        {dashboard && (
          <>
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h3 className="text-base font-semibold text-slate-950">{section.title}</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {section.codes.map((code) => {
                    const indicator = indicatorsByCode.get(code);
                    return indicator ? <MetricCard key={indicator.code} indicator={indicator} /> : null;
                  })}
                </div>
              </section>
            ))}

            {actionableAttentionItems.length > 0 && (
              <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">Requieren atencion</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="py-3 pr-4 font-semibold">Situacion</th>
                        <th className="py-3 pr-4 font-semibold">Metrica</th>
                        <th className="py-3 pr-4 font-semibold">Severidad</th>
                        <th className="py-3 pr-4 font-semibold">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionableAttentionItems.map((item) => (
                        <tr key={item.code} className="border-b border-slate-100">
                          <td className="py-3 pr-4 font-medium text-slate-950">{item.label}</td>
                          <td className="py-3 pr-4">{item.metric_code}</td>
                          <td className="py-3 pr-4">{severityLabel(item.severity)}</td>
                          <td className="py-3 pr-4 text-slate-600">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function severityLabel(severity: "info" | "warning" | "critical") {
  const labels = {
    info: "Informativa",
    warning: "Revision",
    critical: "Critica"
  };
  return labels[severity];
}

function syncLabel(syncing: "structure" | "participants" | "all") {
  const labels = {
    structure: "Sincronizando estructura de cursos y categorias",
    participants: "Sincronizando participantes por curso",
    all: "Sincronizando estructura y participantes"
  };
  return labels[syncing];
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function syncScopeLabel(value: string) {
  const labels: Record<string, string> = {
    analytics_snapshot: "Total",
    analytics_structure: "Parcial",
    analytics_participants: "Parcial"
  };
  return labels[value] ?? "Parcial";
}

function syncStatusLabel(value: string) {
  const labels: Record<string, string> = {
    completed: "Completada",
    processing: "Procesando",
    failed: "Fallida",
    cancelled: "Cancelada"
  };
  return labels[value] ?? value;
}
