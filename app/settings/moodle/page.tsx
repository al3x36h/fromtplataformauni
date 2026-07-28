"use client";

import { AppShell } from "@/components/app-shell";
import {
  apiFetch,
  type MoodleConnectionResult,
  type MoodleFunctionsResult
} from "@/lib/api";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function MoodleSettingsPage() {
  const [connection, setConnection] = useState<MoodleConnectionResult | null>(null);
  const [functions, setFunctions] = useState<MoodleFunctionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function testConnection() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<MoodleConnectionResult>("/moodle/test-connection", {
        method: "POST"
      });
      setConnection(result);
      const fn = await apiFetch<MoodleFunctionsResult>("/moodle/functions");
      setFunctions(fn);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar Moodle");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void testConnection();
  }, []);

  return (
    <AppShell title="Configuracion Moodle">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Estado de conexion</h2>
              <p className="mt-1 text-sm text-slate-600">El token no se muestra en el navegador.</p>
            </div>
            <Activity className="h-5 w-5 text-institutional-primary" aria-hidden="true" />
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <InfoRow label="Estado" value={connection?.status ?? "Sin probar"} />
            <InfoRow label="Sitio" value={connection?.site_name ?? "-"} />
            <InfoRow label="Version" value={connection?.release ?? "-"} />
            <InfoRow label="Usuario token" value={connection?.username ?? "-"} />
            <InfoRow
              label="Latencia"
              value={connection?.latency_ms ? `${connection.latency_ms} ms` : "-"}
            />
          </dl>

          {error && (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={testConnection}
            disabled={loading}
            className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-4 font-semibold text-white transition-colors hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Probando..." : "Probar conexion"}
          </button>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Funciones Moodle</h2>
          <p className="mt-1 text-sm text-slate-600">
            La aplicacion verifica funciones antes de usar cada operacion.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <FunctionList title="Disponibles" items={functions?.available ?? []} tone="ok" />
            <FunctionList title="Requeridas faltantes" items={functions?.missing_required ?? []} tone="missing" />
            <FunctionList title="Opcionales no disponibles" items={functions?.missing_optional ?? []} tone="optional" />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Las funciones opcionales no bloquean la sincronizacion; solo habilitan mejoras como duplicar cursos o consultar usuarios con mas detalle.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right font-medium text-slate-950">{value}</dd>
    </div>
  );
}

function FunctionList({ title, items, tone = "missing" }: { title: string; items: string[]; tone?: "ok" | "missing" | "optional" }) {
  return (
    <div className="rounded border border-slate-200">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="max-h-[420px] space-y-2 overflow-auto p-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Sin registros</p>
        ) : (
          items.map((item) => (
            <div key={item} className="flex items-start gap-2 rounded bg-slate-50 px-3 py-2 text-sm">
              {tone === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : tone === "optional" ? (
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <span className="break-all text-slate-700">{item}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
