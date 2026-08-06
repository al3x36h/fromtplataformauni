"use client";

import { AppShell } from "@/components/app-shell";
import {
  apiFetch,
  moodleCourseUrl,
  type CourseEnrolmentPerson,
  type CourseEnrolmentPreviewResult,
  type CourseEnrolmentResult,
  type CourseListItem,
  type EmailTestResult
} from "@/lib/api";
import { CheckCircle2, ExternalLink, Loader2, MailCheck, Search, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EXAMPLE = `Victoria de los Angeles Gonzalez Gutierrez\tvictoria.gonzalez@example.edu.ni
Natalia Azucena Gutierrez Robleto\tnatalia.gutierrez@example.edu.ni`;

export default function CourseEnrolmentPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CourseListItem | null>(null);
  const [rawPeople, setRawPeople] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [createMissingUsers, setCreateMissingUsers] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [validating, setValidating] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<EmailTestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<CourseEnrolmentPreviewResult | null>(null);
  const [result, setResult] = useState<CourseEnrolmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      setLoadingCourses(true);
      setError(null);
      try {
        setCourses(await apiFetch<CourseListItem[]>("/courses"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los cursos");
      } finally {
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  useEffect(() => {
    setPreview(null);
    setResult(null);
  }, [selectedCourse?.moodle_id, rawPeople, createMissingUsers]);

  const courseOptions = useMemo(() => {
    const term = courseSearch.trim().toLowerCase();
    if (!term) return courses.slice(0, 20);
    return courses
      .filter((course) =>
        [course.fullname, course.shortname, course.idnumber ?? "", course.category_path.join(" / "), course.teacher_names.join("; ")]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 20);
  }, [courses, courseSearch]);

  const people = useMemo(() => parsePeople(rawPeople), [rawPeople]);
  const canValidate = Boolean(selectedCourse && people.length && !validating);
  const canSubmit = Boolean(selectedCourse && preview?.can_execute && !submitting);

  async function validate() {
    if (!selectedCourse || !people.length) return;
    setValidating(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(
        await apiFetch<CourseEnrolmentPreviewResult>("/enrolments/course/validate", {
          method: "POST",
          body: JSON.stringify({
            course_id: selectedCourse.moodle_id,
            people,
            send_email: sendEmail,
            create_missing_users: createMissingUsers
          })
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar la matricula");
    } finally {
      setValidating(false);
    }
  }

  async function submit() {
    if (!selectedCourse || !preview?.can_execute) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await apiFetch<CourseEnrolmentResult>("/enrolments/course", {
          method: "POST",
          body: JSON.stringify({
            course_id: selectedCourse.moodle_id,
            people,
            send_email: sendEmail,
            create_missing_users: createMissingUsers
          })
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ejecutar la matricula");
    } finally {
      setSubmitting(false);
    }
  }

  async function testEmail() {
    const recipient = testRecipient.trim() || people[0]?.email;
    if (!recipient) return;
    setTestingEmail(true);
    setError(null);
    setEmailTestResult(null);
    try {
      setEmailTestResult(
        await apiFetch<EmailTestResult>("/enrolments/email-test", {
          method: "POST",
          body: JSON.stringify({ recipient })
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar el correo");
    } finally {
      setTestingEmail(false);
    }
  }

  return (
    <AppShell title="Matricular a curso">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Curso destino</h2>
            <p className="mt-1 text-sm text-slate-600">
              Busca un curso sincronizado, crea cuentas manuales si no existen y matricula estudiantes.
            </p>
          </div>

          {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <label className="flex h-10 items-center gap-2 rounded border border-slate-300 px-3 text-sm text-slate-600">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
              placeholder="Buscar curso por nombre, docente, categoria o shortname"
              className="min-w-0 flex-1 outline-none"
            />
          </label>

          <div className="max-h-72 overflow-y-auto rounded border border-slate-200">
            {loadingCourses && <p className="px-4 py-6 text-center text-sm text-slate-500">Cargando cursos...</p>}
            {!loadingCourses &&
              courseOptions.map((course) => (
                <button
                  type="button"
                  key={course.moodle_id}
                  onClick={() => setSelectedCourse(course)}
                  className={`flex w-full cursor-pointer items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                    selectedCourse?.moodle_id === course.moodle_id ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-950">{course.fullname}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{course.category_path.join(" / ")}</span>
                    <span className="mt-1 block font-mono text-xs text-slate-500">{course.shortname}</span>
                  </span>
                  {selectedCourse?.moodle_id === course.moodle_id && <CheckCircle2 className="h-5 w-5 shrink-0 text-institutional-primary" />}
                </button>
              ))}
            {!loadingCourses && courseOptions.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No hay cursos con esa busqueda.</p>
            )}
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Estudiantes</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Pega una fila por estudiante: nombre completo y correo, separados por tab, coma o punto y coma.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRawPeople(EXAMPLE)}
                className="h-9 cursor-pointer rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cargar ejemplo
              </button>
            </div>
            <textarea
              value={rawPeople}
              onChange={(event) => setRawPeople(event.target.value)}
              rows={8}
              placeholder={EXAMPLE}
              className="mt-3 w-full rounded border border-slate-300 p-3 font-mono text-sm outline-none focus:border-institutional-primary"
            />
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="h-4 w-4" />
              Enviar credenciales por correo a usuarios creados
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={createMissingUsers}
                onChange={(event) => setCreateMissingUsers(event.target.checked)}
                className="h-4 w-4"
              />
              Crear cuenta manual si el estudiante no existe en Moodle
            </label>
          </div>

          <div className="rounded border border-institutional-extralightblue bg-blue-50 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Ejecucion</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {preview
                    ? `${preview.ready} procesables · ${preview.will_create} se crearan · ${preview.openid} OpenID · ${preview.already_enrolled} ya estaban`
                    : `${people.length} estudiantes listos para validar.`}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={!canValidate}
                  onClick={validate}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-institutional-primary bg-white px-4 text-sm font-semibold text-institutional-primary hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {validating ? "Validando..." : "Validar"}
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submit}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Procesando..." : "Crear y matricular"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                Correo de prueba
                <input
                  value={testRecipient}
                  onChange={(event) => setTestRecipient(event.target.value)}
                  placeholder={people[0]?.email || "correo@uni.edu.ni"}
                  className="mt-2 h-10 w-full rounded border border-slate-300 px-3 text-sm font-normal outline-none focus:border-institutional-primary"
                />
              </label>
              <button
                type="button"
                disabled={testingEmail || (!testRecipient.trim() && !people[0]?.email)}
                onClick={testEmail}
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-institutional-primary px-4 text-sm font-semibold text-institutional-primary hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {testingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                {testingEmail ? "Probando..." : "Probar correo"}
              </button>
            </div>
            {emailTestResult && (
              <p className="mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                {emailTestResult.message}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Esta prueba solo envia un correo. No crea usuarios ni matricula estudiantes.
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Seleccion</h2>
            {selectedCourse ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="font-semibold text-slate-950">{selectedCourse.fullname}</p>
                <p className="text-slate-600">{selectedCourse.category_path.join(" / ")}</p>
                <p className="font-mono text-xs text-slate-500">{selectedCourse.shortname}</p>
                {moodleCourseUrl(selectedCourse.moodle_id) && (
                  <a
                    href={moodleCourseUrl(selectedCourse.moodle_id) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir curso
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Selecciona un curso para continuar.</p>
            )}
          </section>

          <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Vista previa</h2>
            {preview && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <PreviewStat label="Procesables" value={preview.ready} />
                <PreviewStat label="Crear" value={preview.will_create} />
                <PreviewStat label="OpenID" value={preview.openid} />
                <PreviewStat label="Pendientes" value={preview.pending_identity} />
              </div>
            )}
            <div className="mt-3 max-h-80 overflow-y-auto rounded border border-slate-200">
              {preview
                ? preview.items.map((person) => (
                    <div key={`${person.fullname}-${person.email}`} className="border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{person.fullname}</p>
                          <p className="truncate text-xs text-slate-500">{person.email}</p>
                        </div>
                        <ActionBadge action={person.action} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{person.message}</p>
                    </div>
                  ))
                : people.map((person) => (
                    <div key={`${person.fullname}-${person.email}`} className="border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                      <p className="font-semibold text-slate-900">{person.fullname}</p>
                      <p className="truncate text-xs text-slate-500">{person.email}</p>
                    </div>
                  ))}
              {people.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-500">Sin filas validas.</p>}
            </div>
          </section>
        </aside>

        {result && (
          <section className="rounded border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Resultado</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {result.enrolled} matriculados · {result.created} creados · {result.already_enrolled} ya estaban · {result.failed} fallidos
                  {result.skipped ? ` · ${result.skipped} pendientes` : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Identidad</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {result.items.map((item) => (
                    <tr key={`${item.email}-${item.fullname}`}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.fullname}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <AuthBadge authMethod={item.auth_method} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.email}</td>
                      <td className="px-4 py-3 text-slate-600">{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function parsePeople(value: string): CourseEnrolmentPerson[] {
  const seen = new Set<string>();
  return value
    .split(/\r?\n/)
    .map((line) => parsePersonLine(line))
    .filter((person): person is CourseEnrolmentPerson => {
      if (!person || seen.has(person.email.toLowerCase())) return false;
      seen.add(person.email.toLowerCase());
      return true;
    });
}

function parsePersonLine(line: string): CourseEnrolmentPerson | null {
  const value = line.trim();
  if (!value) return null;
  const email = value.match(/[^\s,;]+@[^\s,;]+/)?.[0]?.trim();
  if (!email) return null;
  const fullname = value
    .replace(email, "")
    .replace(/^[,;\t ]+|[,;\t ]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return fullname ? { fullname, email } : null;
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "failed"
      ? "bg-red-100 text-red-800"
      : status === "email_failed"
        ? "bg-amber-100 text-amber-800"
        : status === "pending_identity"
          ? "bg-slate-100 text-slate-700"
        : "bg-green-100 text-green-800";
  const label =
    status === "created_enrolled"
      ? "Creado y matriculado"
      : status === "enrolled"
        ? "Matriculado"
        : status === "already_enrolled"
          ? "Ya estaba"
          : status === "email_failed"
            ? "Correo fallo"
            : status === "pending_identity"
              ? "Pendiente"
              : "Fallido";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function ActionBadge({ action }: { action: string }) {
  const styles =
    action === "invalid"
      ? "bg-red-100 text-red-800"
      : action === "pending_identity" || action === "already_enrolled"
        ? "bg-slate-100 text-slate-700"
        : action === "create_manual_and_enrol"
          ? "bg-amber-100 text-amber-800"
          : "bg-green-100 text-green-800";
  const label =
    action === "create_manual_and_enrol"
      ? "Crear"
      : action === "enrol_existing"
        ? "Matricular"
        : action === "already_enrolled"
          ? "Ya estaba"
          : action === "pending_identity"
            ? "Pendiente"
            : "Revisar";
  return <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function AuthBadge({ authMethod }: { authMethod?: string | null }) {
  const value = authMethod?.toLowerCase() ?? "";
  const isOpenId = value.includes("oidc") || value.includes("openid");
  const label = isOpenId ? "OpenID" : authMethod || "Manual";
  const styles = isOpenId ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}
