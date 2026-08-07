"use client";

import { AppShell } from "@/components/app-shell";
import { CategoryTreeCombobox } from "@/components/categories/category-tree-combobox";
import {
  apiFetch,
  moodleCourseUrl,
  type CategoryNode,
  type TeacherTrackingItem,
  type TeacherTrackingResult
} from "@/lib/api";
import { Download, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EXAMPLE = `hank.espinoza@uni.edu.ni
juan.pavon@uni.edu.ni
javier.vanega@uni.edu.ni`;

export default function TeacherTrackingPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [rawEmails, setRawEmails] = useState("");
  const [result, setResult] = useState<TeacherTrackingResult | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CategoryNode[]>("/categories/tree?refresh=true")
      .then(setCategories)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar categorias Moodle"))
      .finally(() => setLoadingCategories(false));
  }, []);

  const pastedRows = useMemo(() => sourceEmailRows(rawEmails), [rawEmails]);
  const pastedEmails = useMemo(() => pastedRows.map((row) => row.email), [pastedRows]);

  async function analyze() {
    if (!category?.moodle_id || pastedEmails.length === 0) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await apiFetch<TeacherTrackingResult>("/teacher-tracking/analyze", {
          method: "POST",
          body: JSON.stringify({
            category_moodle_id: category.moodle_id,
            emails: pastedEmails
          })
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar seguimiento docente");
    } finally {
      setAnalyzing(false);
    }
  }

  function exportCsv(onlyWithoutAccess: boolean) {
    if (!result) return;
    const itemsByEmail = new Map(result.items.map((item) => [item.email.toLowerCase(), item]));
    const rows = pastedRows.flatMap((sourceRow) =>
      teacherSourceCsvRows(sourceRow, itemsByEmail.get(sourceRow.email.toLowerCase()), onlyWithoutAccess)
    );
    downloadCsv(
      onlyWithoutAccess ? "seguimiento-docente-sin-acceso.csv" : "seguimiento-docente.csv",
      [
        "fila_origen",
        "correo_ingresado",
        "duplicado",
        "docente",
        "correo",
        "usuario",
        "curso",
        "shortname",
        "categoria",
        "rol",
        "ultimo_acceso_general",
        "ultimo_acceso_curso",
        "estado"
      ],
      rows
    );
  }

  return (
    <AppShell title="Seguimiento docente">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Analizar accesos por categoria</h2>
            <p className="mt-1 text-sm text-slate-600">
              Consulta Moodle en vivo: cursos dentro de la categoria, docentes matriculados y ultimo acceso por curso.
            </p>
          </div>

          {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {loadingCategories ? (
            <p className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Cargando categorias desde Moodle...</p>
          ) : (
            <CategoryTreeCombobox
              categories={categories}
              value={category?.moodle_id}
              onChange={setCategory}
              label="Categoria Moodle"
              compact
            />
          )}

          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Correos docentes</h3>
                <p className="mt-1 text-sm text-slate-600">Pega uno por linea. Los repetidos se ignoran automaticamente.</p>
              </div>
              <button
                type="button"
                onClick={() => setRawEmails(EXAMPLE)}
                className="h-9 cursor-pointer rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cargar ejemplo
              </button>
            </div>
            <textarea
              value={rawEmails}
              onChange={(event) => setRawEmails(event.target.value)}
              rows={9}
              placeholder={EXAMPLE}
              className="mt-3 w-full rounded border border-slate-300 p-3 font-mono text-sm outline-none focus:border-institutional-primary"
            />
          </div>

          <div className="flex flex-col justify-between gap-3 rounded border border-institutional-extralightblue bg-blue-50 p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-700">
              {pastedEmails.length} filas listas. Se consultara Moodle al ejecutar.
            </p>
            <button
              type="button"
              disabled={!category?.moodle_id || pastedEmails.length === 0 || analyzing}
              onClick={analyze}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {analyzing ? "Analizando..." : "Analizar"}
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Resumen</h2>
            {result ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Summary label="Unicos" value={result.summary.unique_emails} />
                <Summary label="Repetidos" value={result.summary.duplicates_ignored} />
                <Summary label="Encontrados" value={result.summary.found_teachers} />
                <Summary label="No encontrados" value={result.summary.not_found} />
                <Summary label="Cursos" value={result.summary.courses_analyzed} />
                <Summary label="Sin acceso" value={result.summary.without_course_access} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Ejecuta un analisis para ver resultados.</p>
            )}
          </section>

          {result && (
            <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Exportar</h2>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => exportCsv(false)}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                  CSV completo
                </button>
                <button
                  type="button"
                  onClick={() => exportCsv(true)}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-3 text-sm font-semibold text-white hover:bg-institutional-darkblue"
                >
                  <Download className="h-4 w-4" />
                  CSV sin acceso
                </button>
              </div>
            </section>
          )}
        </aside>

        {result && (
          <section className="rounded border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Resultados</h2>
                <p className="mt-1 text-sm text-slate-600">{result.category_path.join(" / ")}</p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-slate-200 rounded border border-slate-200">
              {result.items.map((item) => (
                <TeacherRow key={item.email} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function TeacherRow({ item }: { item: TeacherTrackingItem }) {
  return (
    <details className="group bg-white open:bg-slate-50">
      <summary className="grid cursor-pointer gap-3 px-4 py-3 text-sm hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_120px_170px_130px] md:items-center">
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">{item.fullname || item.email}</p>
          <p className="truncate text-xs text-slate-500">{item.email}</p>
        </div>
        <p className="text-slate-700">{item.status === "encontrado" ? `${item.courses_count} cursos` : "Sin cursos asignados"}</p>
        <p className="text-slate-700">{item.status === "encontrado" ? formatDate(item.last_site_access_at) : "No disponible"}</p>
        <StatusBadge status={item.status} withoutAccess={item.courses_without_access} />
      </summary>
      <div className="overflow-x-auto border-t border-slate-200">
        {item.courses.length ? (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Ultimo acceso al curso</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {item.courses.map((course) => (
                <tr key={`${item.email}-${course.course_id}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {moodleCourseUrl(course.course_id) ? (
                        <a href={moodleCourseUrl(course.course_id) ?? "#"} target="_blank" rel="noreferrer" className="hover:text-institutional-primary">
                          {course.course_fullname}
                        </a>
                      ) : (
                        course.course_fullname
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">{course.course_shortname}</p>
                    <p className="mt-1 text-xs text-slate-500">{course.category_path.join(" / ")}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{course.role}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(course.last_course_access_at)}</td>
                  <td className="px-4 py-3">
                    <CourseStatus status={course.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-5 text-sm text-slate-500">No aparece como docente dentro de la categoria seleccionada.</p>
        )}
      </div>
    </details>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status, withoutAccess }: { status: string; withoutAccess: number }) {
  if (status !== "encontrado") {
    return <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">No encontrado</span>;
  }
  if (withoutAccess > 0) {
    return <span className="w-fit rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{withoutAccess} sin acceso</span>;
  }
  return <span className="w-fit rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Con acceso</span>;
}

function CourseStatus({ status }: { status: string }) {
  return status === "sin_acceso" ? (
    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Sin acceso</span>
  ) : (
    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Con acceso</span>
  );
}

type SourceEmailRow = {
  line: number;
  email: string;
  duplicate: boolean;
};

function sourceEmailRows(rawEmails: string): SourceEmailRow[] {
  const seen = new Set<string>();
  return rawEmails
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, email: line.trim() }))
    .filter((row) => row.email.length > 0)
    .map((row) => {
      const key = row.email.toLowerCase();
      const duplicate = seen.has(key);
      seen.add(key);
      return { ...row, duplicate };
    });
}

function teacherSourceCsvRows(sourceRow: SourceEmailRow, item: TeacherTrackingItem | undefined, onlyWithoutAccess: boolean) {
  if (!item) return [teacherMissingCsvRow(sourceRow)];
  if (!item.courses.length) return [teacherNotFoundCsvRow(sourceRow, item)];
  const courses = item.courses.filter((course) => !onlyWithoutAccess || course.status === "sin_acceso");
  return courses.map((course) => teacherCourseCsvRow(sourceRow, item, course));
}

function teacherCourseCsvRow(sourceRow: SourceEmailRow, item: TeacherTrackingItem, course: TeacherTrackingItem["courses"][number]) {
  return [
    String(sourceRow.line),
    sourceRow.email,
    sourceRow.duplicate ? "Si" : "No",
    item.fullname || "",
    item.email,
    item.username || "",
    course.course_fullname,
    course.course_shortname,
    course.category_path.join(" / "),
    course.role,
    formatDate(course.last_site_access_at),
    formatDate(course.last_course_access_at),
    course.status === "sin_acceso" ? "Sin acceso al curso" : "Con acceso al curso"
  ];
}

function teacherNotFoundCsvRow(sourceRow: SourceEmailRow, item: TeacherTrackingItem) {
  return [
    String(sourceRow.line),
    sourceRow.email,
    sourceRow.duplicate ? "Si" : "No",
    item.fullname || "",
    item.email,
    item.username || "",
    "",
    "",
    "",
    "",
    "No disponible",
    "No disponible",
    "No encontrado en categoria"
  ];
}

function teacherMissingCsvRow(sourceRow: SourceEmailRow) {
  return [
    String(sourceRow.line),
    sourceRow.email,
    sourceRow.duplicate ? "Si" : "No",
    "",
    sourceRow.email,
    "",
    "",
    "",
    "",
    "",
    "No disponible",
    "No disponible",
    "No analizado"
  ];
}

function formatDate(value?: string | null) {
  if (!value) return "Sin acceso";
  return new Intl.DateTimeFormat("es-NI", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
