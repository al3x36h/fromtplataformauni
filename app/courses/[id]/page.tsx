"use client";

import { AppShell } from "@/components/app-shell";
import {
  apiFetch,
  moodleCourseUrl,
  type CourseDetail,
  type CourseParticipant,
  type CoursePasswordResetResult
} from "@/lib/api";
import { ArrowLeft, Copy, Download, ExternalLink, KeyRound, RefreshCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type ResetCopyKind = "username" | "password" | "all";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [view, setView] = useState<"students" | "teachers" | "all">("students");
  const [studentSearch, setStudentSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [resetResult, setResetResult] = useState<CoursePasswordResetResult | null>(null);
  const [copiedResetField, setCopiedResetField] = useState<ResetCopyKind | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCourse() {
    setLoading(true);
    setError(null);
    try {
      setCourse(await apiFetch<CourseDetail>(`/courses/${params.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el curso");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourse();
  }, [params.id]);

  async function resetPassword(participant: CourseParticipant) {
    setResettingUserId(participant.moodle_id);
    setError(null);
    setCopiedResetField(null);
    try {
      setResetResult(
        await apiFetch<CoursePasswordResetResult>(
          `/courses/participants/${participant.moodle_id}/reset-password?course_id=${course?.moodle_id ?? params.id}`,
          {
            method: "POST"
          }
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la clave");
    } finally {
      setResettingUserId(null);
    }
  }

  async function copyResetValue(kind: ResetCopyKind, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedResetField(kind);
    window.setTimeout(() => setCopiedResetField(null), 2200);
  }

  async function copyTeacherEmail(email: string) {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    window.setTimeout(() => setCopiedEmail(null), 2400);
  }

  const teachers = useMemo(
    () => course?.participants.filter((participant) => participant.roles.some((role) => ["editingteacher", "teacher"].includes(role))) ?? [],
    [course]
  );
  const students = useMemo(
    () => course?.participants.filter((participant) => participant.roles.includes("student")) ?? [],
    [course]
  );
  const withoutAccess = useMemo(
    () => course?.participants.filter((participant) => !participant.has_access).length ?? 0,
    [course]
  );
  const filteredParticipants = useMemo(() => {
    if (!course) return [];
    const base = view === "students" ? students : view === "teachers" ? teachers : course.participants;
    const term = studentSearch.trim().toLowerCase();
    if (!term) return base;
    return base.filter((participant) =>
      [
        participant.fullname,
        participant.email ?? "",
        participant.username ?? "",
        roleLabel(participant.roles),
        participant.auth_method ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [course, students, teachers, view, studentSearch]);
  const filteredWithoutAccess = useMemo(
    () => filteredParticipants.filter((participant) => !participant.has_access),
    [filteredParticipants]
  );

  function exportWithoutAccessCsv() {
    if (!course || filteredWithoutAccess.length === 0) return;
    const rows = filteredWithoutAccess.map((participant) => [
      course.fullname,
      course.shortname,
      course.category_path.join(" / "),
      participant.fullname,
      participant.email ?? "",
      participant.username ?? "",
      roleLabel(participant.roles),
      participant.auth_method ? moodleAuthLabel(participant.auth_method) : "No disponible",
      participant.last_course_access_at ? formatDate(participant.last_course_access_at) : "",
      participant.last_site_access_at ? formatDate(participant.last_site_access_at) : "",
      "Sin acceso"
    ]);
    downloadCsv(
      `sin-acceso-${course.shortname || course.moodle_id}.csv`,
      [
        "curso",
        "shortname",
        "categoria",
        "nombre",
        "correo",
        "usuario",
        "rol",
        "identidad",
        "ultimo_acceso_curso",
        "ultimo_acceso_general",
        "estado"
      ],
      rows
    );
  }

  return (
    <AppShell title="Detalle del curso">
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Link href="/courses" className="flex h-10 items-center gap-2 text-sm font-semibold text-slate-700 hover:text-institutional-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver a cursos
          </Link>
          <button
            type="button"
            onClick={loadCourse}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar detalle
          </button>
        </div>

        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-500">Cargando curso...</p>}

        {course && (
          <>
            <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-slate-950">{course.fullname}</h2>
                  <p className="mt-2 text-sm text-slate-600">{course.category_path.join(" / ") || `Categoria ${course.category_moodle_id ?? "-"}`}</p>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold">Docentes</span>{" "}
                    {course.teacher_names.length ? course.teacher_names.join("; ") : "Sin docente sincronizado"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-700">{course.shortname}</span>
                    {course.idnumber && <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">IDNumber: {course.idnumber}</span>}
                    <span className={`rounded-full px-2 py-1 font-semibold ${course.visible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {course.visible ? "Visible" : "Oculto"}
                    </span>
                  </div>
                </div>
                {moodleCourseUrl(course.moodle_id) && (
                  <a
                    href={moodleCourseUrl(course.moodle_id) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 shrink-0 items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue"
                    aria-label={`Abrir curso ${course.fullname} en Moodle`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir curso
                  </a>
                )}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Summary label="Docentes" value={teachers.length || course.teacher_count} />
              <Summary label="Estudiantes" value={students.length || course.student_count} />
              <Summary label="Sin acceso registrado" value={withoutAccess} />
              <Summary label="Actualizado" value={formatDate(course.captured_at)} />
            </section>

            <section className="space-y-3 rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Ingreso y participantes</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Ultimo acceso general, acceso al curso e identidad disponible en Moodle.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{filteredParticipants.length} registros en esta vista.</p>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-start lg:justify-end">
                    <div className="inline-flex rounded border border-slate-300 bg-white p-1 text-sm font-semibold">
                      <FilterButton active={view === "students"} onClick={() => setView("students")}>
                        Estudiantes ({students.length})
                      </FilterButton>
                      <FilterButton active={view === "teachers"} onClick={() => setView("teachers")}>
                        Docentes ({teachers.length})
                      </FilterButton>
                      <FilterButton active={view === "all"} onClick={() => setView("all")}>
                        Todos ({course.participants.length})
                      </FilterButton>
                    </div>
                    <button
                      type="button"
                      disabled={filteredWithoutAccess.length === 0}
                      onClick={exportWithoutAccessCsv}
                      className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      CSV sin acceso ({filteredWithoutAccess.length})
                    </button>
                  </div>
                  <label className="flex h-10 min-w-0 items-center gap-2 rounded border border-slate-300 px-3 text-sm text-slate-600 lg:w-80">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder="Buscar estudiante"
                      className="min-w-0 flex-1 outline-none"
                    />
                  </label>
                </div>
              </div>

              {course.access_message && (
                <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{course.access_message}</p>
              )}

              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Identidad</th>
                      <th className="px-4 py-3">Ultimo acceso al curso</th>
                      <th className="px-4 py-3">Ultimo acceso general</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Clave</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredParticipants.map((participant) => (
                      <ParticipantRow
                        key={participant.moodle_id}
                        participant={participant}
                        resetting={resettingUserId === participant.moodle_id}
                        onReset={() => resetPassword(participant)}
                        onCopyEmail={copyTeacherEmail}
                      />
                    ))}
                  </tbody>
                </table>
                {filteredParticipants.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No hay datos disponibles para esta vista.</p>
                )}
              </div>
            </section>

            {resetResult && (
              <PasswordModal
                result={resetResult}
                copied={copiedResetField}
                onCopy={copyResetValue}
                onClose={() => setResetResult(null)}
              />
            )}
            {copiedEmail && (
              <div className="fixed bottom-5 right-5 z-50 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 shadow-lg">
                Correo del docente copiado
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 whitespace-nowrap rounded px-3 transition-colors ${active ? "bg-institutional-primary text-white" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ParticipantRow({
  participant,
  resetting,
  onReset,
  onCopyEmail
}: {
  participant: CourseParticipant;
  resetting: boolean;
  onReset: () => void;
  onCopyEmail: (email: string) => void;
}) {
  const canReset = Boolean(participant.auth_method && !isOpenId(participant.auth_method));
  const isTeacher = participant.roles.some((role) => ["editingteacher", "teacher"].includes(role));
  return (
    <tr className="hover:bg-slate-50">
      <td className="max-w-[280px] px-4 py-3">
        <p className="font-semibold text-slate-900">{participant.fullname}</p>
        {participant.email && (
          <div className="mt-1 flex min-w-0 items-center gap-1">
            <p className="truncate text-xs text-slate-500">{participant.email}</p>
            {isTeacher && (
              <button
                type="button"
                onClick={() => onCopyEmail(participant.email ?? "")}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-institutional-primary"
                aria-label={`Copiar correo de ${participant.fullname}`}
                title="Copiar correo"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {participant.username && participant.username !== participant.email && (
          <p className="truncate font-mono text-xs text-slate-500">{participant.username}</p>
        )}
      </td>
      <td className="px-4 py-3 text-slate-700">{roleLabel(participant.roles)}</td>
      <td className="px-4 py-3"><IdentityBadge authMethod={participant.auth_method} /></td>
      <td className="px-4 py-3 text-slate-700"><AccessTime value={participant.last_course_access_at} /></td>
      <td className="px-4 py-3 text-slate-700"><AccessTime value={participant.last_site_access_at} /></td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${participant.has_access ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {participant.has_access ? "Con acceso" : "Sin acceso"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {canReset ? (
          <button
            type="button"
            disabled={resetting}
            onClick={onReset}
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {resetting ? "Cambiando..." : "Cambiar"}
          </button>
        ) : (
          <span className="text-xs text-slate-400">No aplica</span>
        )}
      </td>
    </tr>
  );
}

function PasswordModal({
  result,
  copied,
  onCopy,
  onClose
}: {
  result: CoursePasswordResetResult;
  copied: ResetCopyKind | null;
  onCopy: (kind: ResetCopyKind, value: string) => void;
  onClose: () => void;
}) {
  const username = result.username ?? "";
  const fullAccess = [username ? `Usuario: ${username}` : null, `Clave: ${result.temporary_password}`]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Clave generada</h3>
            <p className="mt-1 text-sm text-slate-600">{result.fullname}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 break-all font-mono text-sm font-semibold text-slate-950">{username || "No disponible"}</p>
              <button
                type="button"
                disabled={!username}
                onClick={() => onCopy("username", username)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Copiar usuario"
                title={copied === "username" ? "Copiado" : "Copiar usuario"}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nueva clave</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 break-all font-mono text-lg font-semibold text-slate-950">{result.temporary_password}</p>
              <button
                type="button"
                onClick={() => onCopy("password", result.temporary_password)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                aria-label="Copiar clave"
                title={copied === "password" ? "Copiada" : "Copiar clave"}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-amber-800">
          Comparte esta clave por un canal institucional seguro. No se guarda en la aplicacion.
        </p>
        {result.email_message && (
          <p
            className={`mt-3 rounded border px-3 py-2 text-sm ${
              result.email_sent
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {result.email_message}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => onCopy("all", fullAccess)}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue"
          >
            <Copy className="h-4 w-4" />
            {copied === "all" ? "Copiado" : "Copiar todo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessTime({ value }: { value?: string | null }) {
  if (!value) return <span>-</span>;
  return (
    <span>
      <span className="block">{formatDate(value)}</span>
      <span className="block text-xs text-slate-500">{relativeTime(value)}</span>
    </span>
  );
}

function IdentityBadge({ authMethod }: { authMethod?: string | null }) {
  const auth = (authMethod ?? "").trim();
  if (!auth) {
    return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">No disponible</span>;
  }
  if (isOpenId(auth)) {
    return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">OpenID</span>;
  }
  return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">{moodleAuthLabel(auth)}</span>;
}

function isOpenId(authMethod: string) {
  const value = authMethod.toLowerCase();
  return value.includes("oidc") || value.includes("openid");
}

function moodleAuthLabel(authMethod: string) {
  const value = authMethod.toLowerCase();
  if (value === "manual") return "Cuenta manual";
  if (value === "email") return "Cuenta Moodle";
  return `Cuenta Moodle (${authMethod})`;
}

function roleLabel(roles: string[]) {
  if (roles.includes("editingteacher")) return "Docente con edicion";
  if (roles.includes("teacher")) return "Docente";
  if (roles.includes("student")) return "Estudiante";
  return roles.length ? roles.join(", ") : "Sin rol";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-NI", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Reciente";
  const totalHours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `Hace ${days} dias ${hours} h`;
  if (hours > 0) return `Hace ${hours} h`;
  const minutes = Math.max(1, Math.floor(diffMs / 60_000));
  return `Hace ${minutes} min`;
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
