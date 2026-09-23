"use client";

import { AppShell } from "@/components/app-shell";
import { GlobalFilters } from "@/components/analytics/global-filters";
import { MetricCard } from "@/components/analytics/metric-card";
import { apiFetch, type AnalyticsDetail } from "@/lib/api";
import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const defaultDateFrom = "2026-01-01";
const defaultDateTo = "2026-09-09";
const defaultExcludedCourses = "1032";
const pageSize = 25;

export default function AnalyticsReportPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Reporte">
          <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando...</p>
        </AppShell>
      }
    >
      <AnalyticsReportContent />
    </Suspense>
  );
}

function AnalyticsReportContent() {
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<AnalyticsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryString = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (!next.get("date_from")) next.set("date_from", defaultDateFrom);
    if (!next.get("date_to")) next.set("date_to", defaultDateTo);
    if (!next.get("unique_students")) next.set("unique_students", "true");
    if (!next.get("exclude_course_ids")) next.set("exclude_course_ids", defaultExcludedCourses);
    return next.toString();
  }, [searchParams]);
  const uniqueMode = queryString.includes("unique_students=true");
  const rows = useMemo(() => {
    const raw = detail?.rows ?? [];
    return uniqueMode ? uniqueStudentRows(raw) : raw;
  }, [detail, uniqueMode]);
  const columns = useMemo(() => {
    const raw = detail?.columns ?? [];
    return uniqueMode && raw.length > 0 && !raw.includes("Cursos con acceso")
      ? [...raw.slice(0, 6), "Cursos con acceso", ...raw.slice(6)]
      : raw;
  }, [detail, uniqueMode]);
  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [rows, search]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setDetail(await apiFetch<AnalyticsDetail>(`/analytics/report/active-students?${queryString}`));
        setPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el reporte");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [queryString]);

  return (
    <AppShell title="Reporte">
      <div className="space-y-5">
        <div className="flex border-b border-slate-200 text-sm font-semibold">
          <Link href="/analytics" className="px-4 py-2 text-slate-600 transition-colors hover:text-slate-950">
            Resumen
          </Link>
          <Link
            href="/analytics/report"
            className="border-b-2 border-institutional-primary px-4 py-2 text-institutional-primary"
          >
            Reporte
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-950">Estudiantes con acceso</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Consulta Moodle en vivo. Deja categoria y curso en blanco para revisar todos los cursos y mostrar solo estudiantes
            con acceso a la plataforma o al aula virtual dentro del rango. Puedes marcar estudiantes unicos y excluir cursos
            base por ID.
          </p>
        </div>

        <GlobalFilters
          defaults={{
            date_from: defaultDateFrom,
            date_to: defaultDateTo,
            unique_students: true,
            exclude_course_ids: defaultExcludedCourses
          }}
          showStudentReportControls
        />

        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando reporte...</p>}

        {detail && (
          <>
            <MetricCard indicator={detail.metric} />
            <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block max-w-xl flex-1 text-sm font-medium text-slate-700">
                  Buscar
                  <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Estudiante, correo, curso o shortname"
                    className="mt-1 h-10 w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={filteredRows.length === 0}
                  onClick={() => exportCsv(columns, filteredRows)}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                {filteredRows.length > 0 ? (
                  <table className="w-full min-w-[980px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase text-slate-500">
                        {columns.map((column) => (
                          <th key={column} className="whitespace-nowrap py-2 pr-3">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          {columns.map((column) => (
                            <td key={column} className="max-w-72 py-2 pr-3 align-top">
                              <Cell column={column} value={row[column]} />
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

              {filteredRows.length > pageSize && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {Math.min((page - 1) * pageSize + 1, filteredRows.length)}-
                    {Math.min(page * pageSize, filteredRows.length)} de {filteredRows.length}
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

function Cell({ column, value }: { column: string; value: unknown }) {
  const text = String(value ?? "-");
  if (column === "Moodle") {
    return text === "-" ? (
      "-"
    ) : (
      <a href={text} target="_blank" rel="noreferrer" className="font-semibold text-institutional-primary hover:underline">
        Abrir
      </a>
    );
  }
  if (column === "Estado") {
    return <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{text}</span>;
  }
  if (column.startsWith("Ultimo acceso")) {
    return formatDate(text);
  }
  if (["Estudiante", "Curso", "Categoria"].includes(column)) {
    return <span className="block truncate font-medium text-slate-900" title={text}>{text}</span>;
  }
  return text || "-";
}

function formatDate(value: string) {
  if (value === "-") return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-NI");
}

function uniqueStudentRows(rows: Array<Record<string, unknown>>) {
  const byStudent = new Map<string, Record<string, unknown>>();
  const coursesByStudent = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = String(row["ID Moodle"] || row.Correo || row.Usuario || "").trim().toLowerCase();
    if (!key || key === "-") continue;
    if (!coursesByStudent.has(key)) coursesByStudent.set(key, new Set());
    coursesByStudent.get(key)?.add(String(row.Curso ?? ""));
    const current = byStudent.get(key);
    if (!current || accessKey(row) > accessKey(current)) byStudent.set(key, { ...row });
  }
  for (const [key, row] of byStudent.entries()) {
    row["Cursos con acceso"] = coursesByStudent.get(key)?.size ?? 1;
  }
  return Array.from(byStudent.values());
}

function accessKey(row: Record<string, unknown>) {
  return [
    String(row["Ultimo acceso plataforma"] ?? "-"),
    String(row["Ultimo acceso al curso"] ?? "-")
  ].sort().at(-1) ?? "-";
}

function exportCsv(columns: string[], rows: Array<Record<string, unknown>>) {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => `"${String(row[column] ?? "").replaceAll('"', '""')}"`).join(","));
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reporte-estudiantes-activos.csv";
  link.click();
  URL.revokeObjectURL(url);
}
