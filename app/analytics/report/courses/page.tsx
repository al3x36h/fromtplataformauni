"use client";

import { AppShell } from "@/components/app-shell";
import { GlobalFilters } from "@/components/analytics/global-filters";
import { MetricCard } from "@/components/analytics/metric-card";
import { apiFetch, type AnalyticsDetail } from "@/lib/api";
import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

const pageSize = 25;

type CourseGroup = {
  key: string;
  course: string;
  shortname: string;
  courseId: string;
  summaryCategory: string;
  summaryPath: string;
  category: string;
  createdAt: string;
  modifiedAt: string;
  startAt: string;
  moodle: string;
  rows: Array<Record<string, unknown>>;
  teachers: number;
  students: number;
  participants: number;
};

type CategoryGroup = {
  category: string;
  path: string;
  courses: CourseGroup[];
  teachers: number;
  students: number;
  participants: number;
};

export default function CreatedCoursesReportPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Aulas creadas">
          <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando...</p>
        </AppShell>
      }
    >
      <CreatedCoursesReportContent />
    </Suspense>
  );
}

function CreatedCoursesReportContent() {
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<AnalyticsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const defaultDateTo = new Date().toISOString().slice(0, 10);
  const queryString = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (!next.get("date_from")) next.set("date_from", "2026-01-01");
    if (!next.get("date_to")) next.set("date_to", defaultDateTo);
    if (!next.get("date_field")) next.set("date_field", "timemodified");
    return next.toString();
  }, [defaultDateTo, searchParams]);
  const activeQuery = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const rows = detail?.rows ?? [];
  const columns = detail?.columns ?? [];
  const groups = useMemo(() => groupCourseRows(rows), [rows]);
  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return groups;
    return groups.filter((group) => groupMatchesSearch(group, needle));
  }, [groups, search]);
  const categoryGroups = useMemo(() => groupByCategory(filteredGroups), [filteredGroups]);
  const pageCount = Math.max(1, Math.ceil(categoryGroups.length / pageSize));
  const visibleCategoryGroups = categoryGroups.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<AnalyticsDetail>(`/analytics/report/created-courses?${queryString}`);
        if (requestId.current === currentRequest) {
          setDetail(result);
          setPage(1);
        }
      } catch (err) {
        if (requestId.current === currentRequest) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el reporte");
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
        }
      }
    }

    void load();
  }, [queryString]);

  return (
    <AppShell title="Aulas creadas">
      <div className="space-y-5">
        <div className="flex border-b border-slate-200 text-sm font-semibold">
          <Link href="/analytics" className="px-4 py-2 text-slate-600 transition-colors hover:text-slate-950">
            Resumen
          </Link>
          <Link href="/analytics/report" className="px-4 py-2 text-slate-600 transition-colors hover:text-slate-950">
            Estudiantes activos
          </Link>
          <Link
            href="/analytics/report/courses"
            className="border-b-2 border-institutional-primary px-4 py-2 text-institutional-primary"
          >
            Aulas creadas
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-950">Aulas creadas y matriculados</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Consulta Moodle en vivo. Usa el rango para localizar aulas por fecha real de creacion y listar los usuarios
            matriculados en cada aula.
          </p>
        </div>

        <GlobalFilters
          defaults={{ date_from: "2026-01-01", date_to: defaultDateTo, date_field: "timemodified" }}
          categoriesEndpoint="/analytics/categories?live=true"
          showCourseDateField
        />

        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded border border-slate-200 bg-white p-5 text-sm">Cargando reporte...</p>}

        {detail && (
          <>
            <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              Consulta actual: {activeQuery.get("date_from") ?? "-"} a {activeQuery.get("date_to") ?? "-"}
              {" · "}
              Fecha: {dateFieldLabel(activeQuery.get("date_field"))}
              {activeQuery.get("category_id") ? ` · Categoria Moodle ${activeQuery.get("category_id")}` : " · Todas las categorias"}
            </p>
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
                    placeholder="Curso, categoria, usuario, correo o rol"
                    className="mt-1 h-10 w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={filteredGroups.length === 0}
                  onClick={() => exportCategorySummaryCsv(categoryGroups)}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Excel resumen
                </button>
                <button
                  type="button"
                  disabled={rows.length === 0}
                  onClick={() => exportExcel(columns, rows, "reporte-aulas-creadas-detalle.xls", "Detalle")}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Excel detalle
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {categoryGroups.length > 0 ? (
                  visibleCategoryGroups.map((category) => (
                    <details
                      key={category.category}
                      open={categoryGroups.length <= 6}
                      className={`overflow-hidden rounded border-2 bg-white transition-colors ${areaColor(category.category).panel}`}
                    >
                      <summary className={`cursor-pointer list-none p-4 transition-colors ${areaColor(category.category).header}`}>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px] lg:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 shrink-0 rounded-full ${areaColor(category.category).dot}`} />
                              <p className="truncate text-sm font-semibold text-slate-950" title={category.category}>
                                {category.category}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">
                              {category.courses.length} aulas creadas en esta categoria
                            </p>
                            {category.path !== category.category && (
                              <p className="mt-1 truncate text-xs text-slate-500" title={category.path}>
                                {category.path}
                              </p>
                            )}
                          </div>
                          <SummaryBadge label="Docentes" value={category.teachers} />
                          <SummaryBadge label="Estudiantes" value={category.students} />
                          <SummaryBadge label="Total matriculas" value={category.participants} />
                        </div>
                      </summary>

                      <div className="space-y-3 p-4">
                        {category.courses.map((group) => (
                          <details key={group.key} className="rounded border border-slate-200 bg-white p-3">
                            <summary className="cursor-pointer list-none">
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_155px_130px_auto] lg:items-center">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950" title={group.course}>
                                    {group.course}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-600" title={group.shortname}>
                                    {group.shortname}
                                  </p>
                                  {group.category !== group.summaryCategory && (
                                    <p className="mt-1 truncate text-xs text-slate-500" title={group.category}>
                                      {group.category}
                                    </p>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600">
                                  <p className="font-semibold uppercase text-slate-500">ID Moodle</p>
                                  <p>{group.courseId}</p>
                                </div>
                                <div className="text-xs text-slate-600">
                                  <p className="font-semibold uppercase text-slate-500">Fechas</p>
                                  <p>{formatDate(group.createdAt)}</p>
                                  <p className="text-slate-500">Mod. {formatDate(group.modifiedAt)}</p>
                                </div>
                                <div className="flex gap-2 text-xs">
                                  <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                                    {group.teachers} docentes
                                  </span>
                                  <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                    {group.students} estudiantes
                                  </span>
                                </div>
                                {group.moodle !== "-" && (
                                  <a
                                    href={group.moodle}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-semibold text-institutional-primary hover:underline"
                                  >
                                    Abrir
                                  </a>
                                )}
                              </div>
                            </summary>

                            <div className="mt-4 overflow-x-auto rounded border border-slate-200 bg-white">
                              <table className="w-full min-w-[780px] border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase text-slate-500">
                                    <th className="py-2 pl-3 pr-3">Usuario</th>
                                    <th className="py-2 pr-3">Correo</th>
                                    <th className="py-2 pr-3">Rol</th>
                                    <th className="py-2 pr-3">ID Moodle usuario</th>
                                    <th className="py-2 pr-3">Ultimo acceso al curso</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.rows.map((row, index) => (
                                    <tr key={`${group.key}-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="max-w-72 py-2 pl-3 pr-3 align-top">
                                        <Cell column="Usuario" value={row.Usuario} />
                                      </td>
                                      <td className="py-2 pr-3 align-top">{String(row.Correo ?? "-")}</td>
                                      <td className="py-2 pr-3 align-top">
                                        <Cell column="Rol" value={row.Rol} />
                                      </td>
                                      <td className="py-2 pr-3 align-top">{String(row["ID Moodle usuario"] ?? "-")}</td>
                                      <td className="py-2 pr-3 align-top">
                                        <Cell column="Ultimo acceso al curso" value={row["Ultimo acceso al curso"]} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">{detail.empty_message}</p>
                )}
              </div>

              {categoryGroups.length > pageSize && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {Math.min((page - 1) * pageSize + 1, categoryGroups.length)}-
                    {Math.min(page * pageSize, categoryGroups.length)} de {categoryGroups.length} categorias
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

function SummaryBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-base text-slate-950">{value.toLocaleString("es-NI")}</p>
    </div>
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
  if (column === "Rol") {
    return <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">{text}</span>;
  }
  if (column.includes("Fecha") || column.startsWith("Ultimo acceso")) {
    return formatDate(text);
  }
  if (["Curso", "Categoria", "Usuario"].includes(column)) {
    return <span className="block truncate font-medium text-slate-900" title={text}>{text}</span>;
  }
  return text || "-";
}

function groupCourseRows(rows: Array<Record<string, unknown>>): CourseGroup[] {
  const groups = new Map<string, CourseGroup>();

  for (const row of rows) {
    const courseId = String(row["ID Moodle curso"] ?? "-");
    const key = courseId !== "-" ? courseId : `${String(row.Curso ?? "-")}-${String(row["Fecha creacion"] ?? "-")}`;
    const current =
      groups.get(key) ??
      ((): CourseGroup => {
        const category = String(row.Categoria ?? "-");
        const receivedSummary = String(row["Resumen categoria"] ?? "");
        const receivedPath = String(row["Ruta resumen"] ?? (receivedSummary || category));
        const detectedArea = areaKey(receivedSummary) ?? areaKey(receivedPath) ?? areaKey(category);
        const summaryCategory = detectedArea ?? (receivedSummary || category);
        return {
          key,
          course: String(row.Curso ?? "-"),
          shortname: String(row["Nombre corto"] ?? "-"),
          courseId,
          summaryCategory,
          summaryPath: summaryPathForArea(receivedPath, summaryCategory),
          category,
          createdAt: String(row["Fecha creacion"] ?? "-"),
          modifiedAt: String(row["Fecha modificacion"] ?? "-"),
          startAt: String(row["Fecha inicio"] ?? "-"),
          moodle: String(row.Moodle ?? "-"),
          rows: [],
          teachers: 0,
          students: 0,
          participants: 0,
        };
      })();

    current.rows.push(row);
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .map((group) => {
      const participantRows = group.rows.filter((row) => String(row.Usuario ?? "-") !== "-");
      return {
        ...group,
        rows: participantRows.length > 0 ? participantRows : group.rows,
        teachers: participantRows.filter((row) => String(row.Rol ?? "").toLowerCase().includes("teacher")).length,
        students: participantRows.filter((row) => String(row.Rol ?? "").toLowerCase().includes("student")).length,
        participants: participantRows.length,
      };
    })
    .sort(
      (left, right) =>
        left.summaryCategory.localeCompare(right.summaryCategory) ||
        String(right.createdAt).localeCompare(String(left.createdAt)),
    );
}

function groupByCategory(groups: CourseGroup[]): CategoryGroup[] {
  const categories = new Map<string, CategoryGroup>();
  for (const group of groups) {
    const current =
      categories.get(group.summaryCategory) ??
      ({
        category: group.summaryCategory,
        path: group.summaryPath,
        courses: [],
        teachers: 0,
        students: 0,
        participants: 0,
      } satisfies CategoryGroup);
    if (current.path !== group.summaryPath) current.path = "Varias rutas";
    current.courses.push(group);
    current.teachers += group.teachers;
    current.students += group.students;
    current.participants += group.participants;
    categories.set(group.summaryCategory, current);
  }

  return Array.from(categories.values()).sort((left, right) => left.category.localeCompare(right.category));
}

function groupMatchesSearch(group: CourseGroup, needle: string) {
  const values = [
    group.course,
    group.shortname,
    group.courseId,
    group.summaryCategory,
    group.summaryPath,
    group.category,
    group.createdAt,
    ...group.rows.flatMap((row) => [row.Usuario, row.Correo, row.Rol, row["ID Moodle usuario"]]),
  ];
  return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
}

function formatDate(value: string) {
  if (value === "-") return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-NI");
}

function dateFieldLabel(value: string | null) {
  if (value === "timecreated") return "Creacion Moodle";
  if (value === "startdate") return "Inicio del curso";
  return "Ultima modificacion";
}

function exportCategorySummaryCsv(categories: CategoryGroup[]) {
  const columns = [
    "Tipo",
    "Categoria",
    "Ruta resumen",
    "Curso",
    "Shortname",
    "ID Moodle curso",
    "Fecha creacion",
    "Docentes",
    "Estudiantes",
    "Matriculados",
    "Moodle",
  ];
  const totals = categories.reduce(
    (acc, category) => ({
      courses: acc.courses + category.courses.length,
      teachers: acc.teachers + category.teachers,
      students: acc.students + category.students,
      participants: acc.participants + category.participants,
    }),
    { courses: 0, teachers: 0, students: 0, participants: 0 },
  );
  const summaryRows = categories.flatMap((category) => [
    {
      Tipo: "Resumen por area",
      Categoria: category.category,
      "Ruta resumen": category.path,
      Curso: `${category.courses.length} aulas`,
      Docentes: category.teachers,
      Estudiantes: category.students,
      Matriculados: category.participants,
    },
  ]);
  const courseRows = categories.flatMap((category) => [
    {
      Tipo: `Detalle ${category.category}`,
      Categoria: category.category,
      "Ruta resumen": category.path,
      Curso: `${category.courses.length} aulas`,
      Docentes: category.teachers,
      Estudiantes: category.students,
      Matriculados: category.participants,
    },
    ...category.courses.map((course) => ({
      Tipo: "Aula",
      Categoria: category.category,
      "Ruta resumen": course.summaryPath,
      Curso: course.course,
      Shortname: course.shortname,
      "ID Moodle curso": course.courseId,
      "Fecha creacion": formatDate(course.createdAt),
      Docentes: course.teachers,
      Estudiantes: course.students,
      Matriculados: course.participants,
      Moodle: course.moodle,
    })),
    {},
  ]);
  const rows = [
    { Tipo: "Resumen por area" },
    ...summaryRows,
    {
      Tipo: "Gran total",
      Categoria: `${categories.length} categorias`,
      Curso: `${totals.courses} aulas`,
      Docentes: totals.teachers,
      Estudiantes: totals.students,
      Matriculados: totals.participants,
    },
    {},
    { Tipo: "Detalle de aulas" },
    ...courseRows,
  ];

  exportExcel(columns, rows, "reporte-aulas-creadas-resumen.xls", "Resumen");
}

function exportExcel(columns: string[], rows: Array<Record<string, unknown>>, filename: string, title: string) {
  const header = columns.map((column) => `<th>${htmlCell(column)}</th>`).join("");
  const body = rows
    .map((row) => {
      const color = areaExcelColor(String(row.Categoria ?? ""));
      const style = row.Tipo === "Resumen por area" ? ` style="background:${color};font-weight:700;"` : "";
      return `<tr${style}>${columns.map((column) => `<td>${htmlCell(formatExportValue(column, row[column]))}</td>`).join("")}</tr>`;
    })
    .join("");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #e2e8f0; font-weight: 700; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
  </style>
</head>
<body>
  <h2>${htmlCell(title)}</h2>
  <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
</body>
</html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatExportValue(column: string, value: unknown) {
  return column.includes("Fecha") || column.startsWith("Ultimo acceso") ? formatDate(String(value ?? "-")) : value;
}

function htmlCell(value: unknown) {
  return repairMojibake(String(value ?? ""))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function areaColor(area: string) {
  const key = areaKey(area);
  if (key === "DACTIC") return { dot: "bg-blue-700", header: "bg-blue-100 hover:bg-blue-200", panel: "border-blue-500", label: "Azul" };
  if (key === "DACIP") return { dot: "bg-emerald-700", header: "bg-emerald-100 hover:bg-emerald-200", panel: "border-emerald-500", label: "Verde" };
  if (key === "DACA") return { dot: "bg-amber-700", header: "bg-amber-100 hover:bg-amber-200", panel: "border-amber-500", label: "Amarillo" };
  if (key === "DACAC") return { dot: "bg-violet-700", header: "bg-violet-100 hover:bg-violet-200", panel: "border-violet-500", label: "Violeta" };
  if (key === "UNICAM") return { dot: "bg-rose-700", header: "bg-rose-100 hover:bg-rose-200", panel: "border-rose-500", label: "Rosa" };
  return { dot: "bg-slate-500", header: "bg-slate-50 hover:bg-slate-100", panel: "border-slate-300", label: "Neutral" };
}

function areaExcelColor(area: string) {
  const key = areaKey(area);
  if (key === "DACTIC") return "#dbeafe";
  if (key === "DACIP") return "#d1fae5";
  if (key === "DACA") return "#fef3c7";
  if (key === "DACAC") return "#ede9fe";
  if (key === "UNICAM") return "#ffe4e6";
  return "#f8fafc";
}

function areaKey(value: string) {
  return value
    .split("/")
    .map((part) => part.trim().toUpperCase())
    .find((part) => ["DACTIC", "DACIP", "DACA", "DACAC", "UNICAM"].includes(part));
}

function summaryPathForArea(path: string, area: string) {
  const parts = path.split("/").map((part) => part.trim()).filter(Boolean);
  const index = parts.findIndex((part) => part.toUpperCase() === area.toUpperCase());
  return index >= 0 ? parts.slice(0, index + 1).join(" / ") : path;
}

function repairMojibake(value: string) {
  return value
    .replaceAll("√°", "á")
    .replaceAll("√©", "é")
    .replaceAll("√≠", "í")
    .replaceAll("√≥", "ó")
    .replaceAll("√∫", "ú")
    .replaceAll("√Å", "Á")
    .replaceAll("√â", "É")
    .replaceAll("√ç", "Í")
    .replaceAll("√ì", "Ó")
    .replaceAll("√ö", "Ú")
    .replaceAll("√±", "ñ")
    .replaceAll("√ë", "Ñ")
    .replaceAll("¬†", " ");
}
