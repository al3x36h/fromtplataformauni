"use client";

import { AppShell } from "@/components/app-shell";
import { apiFetch, moodleCourseUrl, type CourseListItem } from "@/lib/api";
import { CheckCircle2, Copy, ExternalLink, Eye, Plus, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [query, setQuery] = useState("");
  const [showVisible, setShowVisible] = useState(true);
  const [showHidden, setShowHidden] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copiedCourseId, setCopiedCourseId] = useState<number | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      setCourses(await apiFetch<CourseListItem[]>("/courses"));
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el listado de cursos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function syncFromMoodle() {
    setSyncing(true);
    setError(null);
    try {
      await apiFetch("/analytics/sync/participants", { method: "POST" });
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo sincronizar desde Moodle");
    } finally {
      setSyncing(false);
    }
  }

  async function copyCourseTeacher(course: CourseListItem) {
    const teachers = course.teacher_names.length ? course.teacher_names.join("; ") : "Sin docente sincronizado";
    await navigator.clipboard.writeText(`${course.fullname} - ${teachers}`);
    setCopiedCourseId(course.moodle_id);
    setCopyNotice("Curso y docente copiados al portapapeles");
    window.setTimeout(() => setCopiedCourseId(null), 1600);
    window.setTimeout(() => setCopyNotice(null), 2600);
  }

  async function copyTeacherEmails(course: CourseListItem) {
    const emails = course.teacher_emails ?? [];
    if (!emails.length) return;
    await navigator.clipboard.writeText(emails.join("; "));
    setCopyNotice(emails.length === 1 ? "Correo del docente copiado" : "Correos de docentes copiados");
    window.setTimeout(() => setCopyNotice(null), 2600);
  }

  const filteredCourses = useMemo(() => {
    const term = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesVisibility = (course.visible && showVisible) || (!course.visible && showHidden);
      if (!matchesVisibility) return false;
      if (!term) return true;
      return [
        course.fullname,
        course.shortname,
        course.idnumber ?? "",
        course.category_path.join(" / "),
        course.teacher_names.join("; "),
        (course.teacher_emails ?? []).join("; ")
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [courses, query, showVisible, showHidden]);
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const visibleCourses = useMemo(
    () => filteredCourses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredCourses, page]
  );

  return (
    <AppShell title="Cursos">
      <section className="space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Cursos cargados</h2>
            <p className="mt-1 text-sm text-slate-600">
              Consulta los cursos sincronizados y el docente identificado en Moodle.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm text-slate-600">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar curso, docente o shortname"
                className="min-w-0 flex-1 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={loadCourses}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCcw className="h-4 w-4" />
              Recargar listado
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={syncFromMoodle}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-institutional-primary px-3 text-sm font-semibold text-institutional-primary hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar Moodle"}
            </button>
            <Link
              href="/courses/new"
              className="flex h-10 items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue"
            >
              <Plus className="h-4 w-4" />
              Crear curso
            </Link>
          </div>
        </div>

        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold">Mostrar</span>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showVisible}
              onChange={(event) => {
                setShowVisible(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4"
            />
            Visibles
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(event) => {
                setShowHidden(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4"
            />
            Ocultos
          </label>
        </div>

        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Docente</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Participantes</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleCourses.map((course) => (
                <tr key={course.moodle_id} className="hover:bg-slate-50">
                  <td className="max-w-[320px] px-4 py-3">
                    <Link href={`/courses/${course.moodle_id}`} className="font-semibold text-slate-950 hover:text-institutional-primary">
                      {course.fullname}
                    </Link>
                    <p className="mt-1 truncate font-mono text-xs text-slate-500">{course.shortname}</p>
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-slate-700">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="min-w-0 flex-1">
                        {course.teacher_names.length ? course.teacher_names.join("; ") : "Sin docente sincronizado"}
                      </span>
                      {(course.teacher_emails ?? []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => copyTeacherEmails(course)}
                          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-institutional-primary focus:outline-none focus:ring-2 focus:ring-institutional-lightblue"
                          aria-label={`Copiar correo docente de ${course.fullname}`}
                          title="Copiar correo docente"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-slate-600">
                    {course.category_path.length ? course.category_path.join(" / ") : `Categoria ${course.category_moodle_id ?? "-"}`}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-semibold">{course.student_count}</span> estudiantes
                    <span className="block text-xs text-slate-500">{course.teacher_count} docentes</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${course.visible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {course.visible ? "Visible" : "Oculto"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copyCourseTeacher(course)}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                        aria-label={`Copiar curso y docente de ${course.fullname}`}
                        title={copiedCourseId === course.moodle_id ? "Copiado" : "Copiar curso y docente"}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/courses/${course.moodle_id}`}
                        className="flex h-9 w-9 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                        aria-label={`Ver detalle de ${course.fullname}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {moodleCourseUrl(course.moodle_id) && (
                        <a
                          href={moodleCourseUrl(course.moodle_id) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          aria-label={`Abrir curso ${course.fullname} en Moodle`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Abrir curso
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && visibleCourses.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No hay cursos cargados con esos filtros.</p>
          )}
          {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">Cargando cursos...</p>}
        </div>

        <div className="flex flex-col justify-between gap-2 text-sm text-slate-600 sm:flex-row sm:items-center">
          <span>
            {filteredCourses.length} de {courses.length} cursos · pagina {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="h-9 rounded border border-slate-300 px-3 font-semibold hover:bg-slate-100 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="h-9 rounded border border-slate-300 px-3 font-semibold hover:bg-slate-100 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
      {copyNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span>{copyNotice}</span>
        </div>
      )}
    </AppShell>
  );
}
