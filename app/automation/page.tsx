"use client";

import { AppShell } from "@/components/app-shell";
import { BulkDuplication } from "@/components/automation/bulk-duplication";
import {
  API_BASE_URL,
  apiFetch,
  type AcademicPlanningRow,
  type AutomationCategoryExecutionResult,
  type AutomationCourseJobStatus,
  type AutomationPreviewResult
} from "@/lib/api";
import { Clipboard, ClipboardCheck, Download, FolderPlus, Play, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";

const baseHeaders = ["period", "area", "career", "semester", "subject", "group"];
const templateHeaders = ["template_shortname"];
const teacherIdentityHeaders = ["teacher_email"];
const defaultTemplateShortname = "PBASE2025";

const sample = buildSample({
  directTeachers: true,
  includeTemplateColumn: false
});

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<"planning" | "duplication">("planning");
  const [raw, setRaw] = useState(sample);
  const [preview, setPreview] = useState<AutomationPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingCategories, setSyncingCategories] = useState(false);
  const [creatingCategories, setCreatingCategories] = useState(false);
  const [creatingCourses, setCreatingCourses] = useState(false);
  const [courseJob, setCourseJob] = useState<AutomationCourseJobStatus | null>(null);
  const [selectedCategoryPaths, setSelectedCategoryPaths] = useState<Set<string>>(new Set());
  const [selectedCourseKeys, setSelectedCourseKeys] = useState<Set<string>>(new Set());
  const [directTeachers, setDirectTeachers] = useState(true);
  const [studentSelfEnrolment, setStudentSelfEnrolment] = useState(true);
  const [teacherSelfEnrolment, setTeacherSelfEnrolment] = useState(false);
  const [includeTemplateColumn, setIncludeTemplateColumn] = useState(false);
  const [headersCopied, setHeadersCopied] = useState(false);
  const expectedHeaders = planningHeaders({
    directTeachers,
    includeTemplateColumn
  });

  function currentRows() {
    return parsePlanningRows(raw);
  }

  function applyPreview(nextPreview: AutomationPreviewResult) {
    setPreview(nextPreview);
    setSelectedCategoryPaths(
      new Set(nextPreview.proposed_categories.filter((item) => item.can_create).map((item) => pathKey(item.path)))
    );
    setSelectedCourseKeys(new Set(creatableCourseKeys(nextPreview)));
  }

  async function generatePreview() {
    setLoading(true);
    setError(null);
    try {
      applyPreview(
        await apiFetch<AutomationPreviewResult>("/automation/preview", {
          method: "POST",
          body: JSON.stringify({ rows: currentRows() })
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la vista previa");
    } finally {
      setLoading(false);
    }
  }

  async function createProposedCategories() {
    setCreatingCategories(true);
    setError(null);
    try {
      const result = await apiFetch<AutomationCategoryExecutionResult>("/automation/categories/execute", {
        method: "POST",
        body: JSON.stringify({
          rows: currentRows(),
          category_paths:
            preview?.proposed_categories
              .filter((item) => item.can_create && selectedCategoryPaths.has(pathKey(item.path)))
              .map((item) => item.path) ?? []
        })
      });
      applyPreview(result.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron crear las categorias propuestas");
    } finally {
      setCreatingCategories(false);
    }
  }

  async function syncCategoriesAndPreview() {
    setSyncingCategories(true);
    setError(null);
    try {
      await apiFetch("/categories/sync", { method: "POST" });
      applyPreview(
        await apiFetch<AutomationPreviewResult>("/automation/preview", {
          method: "POST",
          body: JSON.stringify({ rows: currentRows() })
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron actualizar las categorias desde Moodle");
    } finally {
      setSyncingCategories(false);
    }
  }

  async function createSelectedCourses() {
    const courseKeys = preview
      ? creatableCourseKeys(preview).filter((key) => selectedCourseKeys.has(key))
      : Array.from(selectedCourseKeys);
    setCreatingCourses(true);
    setCourseJob(null);
    setError(null);
    try {
      const job = await apiFetch<AutomationCourseJobStatus>("/automation/courses/jobs", {
        method: "POST",
        body: JSON.stringify({ rows: currentRows(), course_keys: courseKeys })
      });
      setCourseJob(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron crear los cursos seleccionados");
      setCreatingCourses(false);
    }
  }

  async function copyHeaders() {
    setError(null);
    try {
      await navigator.clipboard.writeText(expectedHeaders.join("\t"));
      setHeadersCopied(true);
      window.setTimeout(() => setHeadersCopied(false), 1800);
    } catch {
      setError("No se pudieron copiar los encabezados. Copialos manualmente desde la lista mostrada.");
    }
  }

  useEffect(() => {
    if (!courseJob || !["queued", "processing"].includes(courseJob.status)) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const nextJob = await apiFetch<AutomationCourseJobStatus>(`/automation/courses/jobs/${courseJob.id}`);
        if (cancelled) return;
        setCourseJob(nextJob);
        if (!["queued", "processing"].includes(nextJob.status)) {
          setCreatingCourses(false);
          window.clearInterval(timer);
          applyPreview(
            await apiFetch<AutomationPreviewResult>("/automation/preview", {
              method: "POST",
              body: JSON.stringify({ rows: currentRows() })
            })
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCreatingCourses(false);
          setError(err instanceof Error ? err.message : "No se pudo consultar el avance del lote");
        }
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [courseJob?.id, courseJob?.status]);

  return (
    <AppShell title="Automatizacion academica">
      <div className="space-y-5">
        <div className="flex gap-2 rounded border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("planning")}
            className={`h-10 cursor-pointer rounded px-4 text-sm font-semibold ${
              activeTab === "planning"
                ? "bg-institutional-primary text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Planificacion academica
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("duplication")}
            className={`h-10 cursor-pointer rounded px-4 text-sm font-semibold ${
              activeTab === "duplication"
                ? "bg-institutional-primary text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Duplicacion masiva
          </button>
        </div>
        {activeTab === "duplication" ? (
          <BulkDuplication />
        ) : (
          <>
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-institutional-primary text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Planificacion academica a Moodle</h2>
              <p className="mt-1 max-w-4xl text-sm text-slate-600">
                Pega filas institucionales. El sistema propone categorias, cursos, docentes y matriculas antes
                de tocar Moodle. Esta pantalla es la vista previa operativa; la ejecucion se habilita despues
                de revisar reglas y roles.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Datos de planificacion</h3>
            <p className="mt-1 text-sm text-slate-600">
              Marca que datos vendran desde Excel. REST crea aulas; las claves self se exportan como CSV Moodle.
            </p>
            <div className="mt-4 grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm lg:grid-cols-3">
              <label className="flex cursor-pointer items-start gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={includeTemplateColumn}
                  onChange={(event) => setIncludeTemplateColumn(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block font-semibold text-slate-950">Plantilla desde Excel</span>
                  Agrega template_shortname; si no viene, se usa PBASE2025.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={directTeachers}
                  onChange={(event) => setDirectTeachers(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block font-semibold text-slate-950">Docente directo</span>
                  Como funciona ahora: asignacion REST controlada.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={studentSelfEnrolment}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setStudentSelfEnrolment(checked);
                    if (checked) setTeacherSelfEnrolment(false);
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block font-semibold text-slate-950">CSV estudiante self</span>
                  Genera clave por aula; no requiere lista de estudiantes.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={teacherSelfEnrolment}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setTeacherSelfEnrolment(checked);
                    if (checked) setStudentSelfEnrolment(false);
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block font-semibold text-slate-950">CSV docente self</span>
                  Genera clave por aula con rol editingteacher.
                </span>
              </label>
            </div>
            <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-800">Columnas esperadas</p>
                  <p className="mt-1 break-words font-mono">{expectedHeaders.join(", ")}</p>
                </div>
                <button
                  type="button"
                  onClick={copyHeaders}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {headersCopied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {headersCopied ? "Copiado" : "Copiar encabezados"}
                </button>
              </div>
            </div>
            <textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              rows={12}
              className="mt-4 w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
            />
            {error && (
              <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setRaw(
                    buildSample({
                      directTeachers,
                      includeTemplateColumn
                    })
                  )
                }
                className="flex h-10 cursor-pointer items-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Usar formato seleccionado
              </button>
              <button
                type="button"
                onClick={generatePreview}
                disabled={loading}
                className="flex h-10 cursor-pointer items-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Search className="h-4 w-4" />
                {loading ? "Analizando..." : "Generar vista previa"}
              </button>
            </div>
          </div>

          <aside className="min-w-0 rounded border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-semibold text-slate-950">Resumen</h3>
            {!preview && <p className="mt-2 text-sm text-slate-600">Genera una vista previa para ver acciones.</p>}
            {preview && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 xl:grid-cols-2">
                <Summary label="Filas leidas" value={preview.total_rows} />
                <Summary label="Categorias" value={preview.categories.length} />
                <Summary label="Categorias no encontradas" value={preview.proposed_categories.length} />
                <Summary label="Cursos propuestos" value={preview.courses.length} />
                <Summary label="Docentes" value={preview.teachers.length} />
                <Summary label="Estudiantes" value={preview.students.length} />
                <Summary label="Asignaciones docentes" value={preview.teacher_assignments.length} />
                <Summary label="Matriculas" value={preview.student_enrolments.length} />
              </div>
            )}
          </aside>
        </section>

        {preview && (
          <section className="space-y-5">
            {preview.warnings.length > 0 && (
              <div className="flex min-w-0 flex-col justify-between gap-3 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 xl:flex-row xl:items-center">
                <div className="min-w-0">
                  {preview.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                  <p className="mt-1 text-amber-700">
                    Si esas categorias ya existen en Moodle, primero actualiza la sincronizacion. Solo usa crear
                    cuando confirmes que realmente no existen.
                  </p>
                </div>
                {preview.proposed_categories.length > 0 && (
                  <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-none xl:grid-flow-col">
                    <button
                      type="button"
                      onClick={syncCategoriesAndPreview}
                      disabled={syncingCategories || creatingCategories}
                      className="flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="truncate">{syncingCategories ? "Actualizando..." : "Actualizar desde Moodle"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={createProposedCategories}
                      disabled={creatingCategories || syncingCategories || selectedCategoryPaths.size === 0}
                      className="flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-3 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FolderPlus className="h-4 w-4" />
                      <span className="truncate">
                        {creatingCategories ? "Creando..." : `Crear ${selectedCategoryPaths.size} seleccionadas`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <PreviewTable
              title="Categorias"
              headers={["Ruta Moodle encontrada", "ID Moodle", "Pendiente por crear", "Visible", "Estado", "Ruta solicitada"]}
              rows={preview.categories.map((item) => [
                item.existing_path.length ? item.existing_path.join(" / ") : "-",
                item.existing_moodle_id ?? item.moodle_id ?? "-",
                item.pending_path.length ? item.pending_path.join(" / ") : "-",
                item.visible == null ? "-" : item.visible ? "Visible" : "Oculta",
                statusLabel(item.status),
                item.path.join(" / ")
              ])}
            />
            {preview.proposed_categories.length > 0 && (
              <SelectableCategories
                preview={preview}
                selected={selectedCategoryPaths}
                onChange={setSelectedCategoryPaths}
              />
            )}
            <CourseVerification
              preview={preview}
              creating={creatingCourses}
              selected={selectedCourseKeys}
              job={courseJob}
              directTeachers={directTeachers}
              studentSelfEnrolment={studentSelfEnrolment}
              teacherSelfEnrolment={teacherSelfEnrolment}
              onChange={setSelectedCourseKeys}
              onCreate={createSelectedCourses}
            />
          </section>
        )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function SelectableCategories({
  preview,
  selected,
  onChange
}: {
  preview: AutomationPreviewResult;
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}) {
  const allKeys = preview.proposed_categories.filter((item) => item.can_create).map((item) => pathKey(item.path));
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Categorias no encontradas en la sincronizacion local
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Marca solo las que confirmaste que se deben crear. Si ya existen en Moodle, actualiza desde Moodle primero.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onChange(allSelected ? new Set() : new Set(allKeys))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Seleccionar todo
        </label>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="w-12 py-3 pr-4 font-semibold">Crear</th>
              <th className="py-3 pr-4 font-semibold">Nombre</th>
              <th className="py-3 pr-4 font-semibold">Padre esperado</th>
              <th className="py-3 pr-4 font-semibold">Ruta esperada</th>
              <th className="py-3 pr-4 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {preview.proposed_categories.map((item) => {
              const key = pathKey(item.path);
              return (
                <tr key={key} className="border-b border-slate-100">
                  <td className="py-3 pr-4">
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      disabled={!item.can_create}
                      onChange={() => toggle(key)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Crear ${item.path.join(" / ")}`}
                    />
                  </td>
                  <td className="py-3 pr-4">{item.name}</td>
                  <td className="py-3 pr-4">
                    {item.parent_path.length ? item.parent_path.join(" / ") : "Raiz Moodle"}
                  </td>
                  <td className="py-3 pr-4">{item.path.join(" / ")}</td>
                  <td className="py-3 pr-4">
                    {statusLabel(item.status)}
                    {item.reason && <p className="mt-1 text-xs text-slate-500">{item.reason}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CourseVerification({
  preview,
  creating,
  selected,
  job,
  directTeachers,
  studentSelfEnrolment,
  teacherSelfEnrolment,
  onChange,
  onCreate
}: {
  preview: AutomationPreviewResult;
  creating: boolean;
  selected: Set<string>;
  job: AutomationCourseJobStatus | null;
  directTeachers: boolean;
  studentSelfEnrolment: boolean;
  teacherSelfEnrolment: boolean;
  onChange: (selected: Set<string>) => void;
  onCreate: () => void;
}) {
  const teacherByKey = new Map(preview.teachers.map((teacher) => [teacher.key, teacher]));
  const creatableKeys = creatableCourseKeys(preview);
  const selectedCreatableCount = creatableKeys.filter((key) => selected.has(key)).length;
  const allSelected = creatableKeys.length > 0 && creatableKeys.every((key) => selected.has(key));
  const selfCsvRows = moodleSelfEnrolRows(preview, { studentSelfEnrolment, teacherSelfEnrolment });

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Verificacion por curso</h3>
          <p className="text-sm text-slate-600">Marca los cursos que quieres crear despues de resolver categorias.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={creatableKeys.length === 0}
              onChange={() => onChange(allSelected ? new Set() : new Set(creatableKeys))}
              className="h-4 w-4 rounded border-slate-300 disabled:opacity-50"
            />
            Seleccionar todo
          </label>
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || selectedCreatableCount === 0}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Play className="h-4 w-4" />
            {creating ? "Creando..." : `Crear ${selectedCreatableCount} cursos`}
          </button>
          <button
            type="button"
            onClick={() => downloadMoodleSelfEnrolCsv(preview, { studentSelfEnrolment, teacherSelfEnrolment })}
            disabled={selfCsvRows.length === 0}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            CSV Moodle self ({selfCsvRows.length})
          </button>
        </div>
      </div>
      {creating && job && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Creando cursos seleccionados</span>
            <span>
              {job.processed}/{job.total} procesados
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-blue-100">
            <div className="h-full rounded bg-institutional-primary transition-all" style={{ width: `${job.percent}%` }} />
          </div>
        </div>
      )}
      {job && <CourseExecutionSummary job={job} />}
      {preview.courses.map((course) => {
        const teachers = preview.teacher_assignments
          .filter((assignment) => assignment.course_key === course.key)
          .map((assignment) => teacherByKey.get(assignment.person_key))
          .filter(Boolean);

        return (
          <article key={course.key} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(course.key)}
                  disabled={course.status !== "ready" || course.category_moodle_id == null}
                  onChange={() => toggle(course.key)}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Crear curso ${course.fullname}`}
                />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Fullname</p>
                  <h4 className="text-base font-semibold text-slate-950">{course.fullname}</h4>
                  <p className="mt-1 text-sm text-slate-600">{course.category_path.join(" / ")}</p>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    <p>
                      <span className="font-semibold text-slate-700">Shortname:</span> {course.shortname}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">IDNumber:</span> {course.idnumber}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Origen para crear el aula:</span>{" "}
                      {course.template_shortname}
                    </p>
                  </div>
                  {course.warnings.map((warning) => (
                    <p key={warning} className="mt-2 text-xs font-semibold text-amber-700">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                {statusLabel(course.status)}
              </span>
            </div>
            {course.existing_reason && (
              <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {course.existing_reason}
              </p>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {directTeachers && (
                <div>
                <p className="text-sm font-semibold text-slate-700">Docentes</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {teachers.map((teacher) => (
                    <li key={teacher?.key} className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                      {teacher?.email ?? teacher?.name ?? "-"}
                    </li>
                  ))}
                  {teachers.length === 0 && <li className="text-slate-500">Sin docentes en la planificacion.</li>}
                </ul>
              </div>
              )}
              {(studentSelfEnrolment || teacherSelfEnrolment) && (
                <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <p className="font-semibold text-slate-700">Autoinscripcion CSV Moodle</p>
                  <p className="mt-1">
                    Se generara desde el shortname del curso para{" "}
                    {[studentSelfEnrolment && "estudiantes", teacherSelfEnrolment && "docentes"]
                      .filter(Boolean)
                      .join("")}
                    .
                  </p>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function CourseExecutionSummary({ job }: { job: AutomationCourseJobStatus }) {
  const rows = job.items;
  const canDownload = !["queued", "processing"].includes(job.status) && rows.length > 0;
  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">Resultado de creacion</h4>
          <p className="text-sm text-slate-600">
            {job.created} creados · {job.failed} fallidos · {job.skipped} omitidos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDownload && (
            <a
              href={`${API_BASE_URL}/automation/courses/jobs/${job.id}/report`}
              className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Descargar reporte
            </a>
          )}
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {statusLabel(job.status)}
          </span>
        </div>
      </div>
      {job.error_message && <p className="mt-2 text-sm text-red-700">{job.error_message}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 pr-4 font-semibold">Curso</th>
              <th className="py-2 pr-4 font-semibold">Shortname</th>
              <th className="py-2 pr-4 font-semibold">Estado</th>
              <th className="py-2 pr-4 font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={`${item.key}:${item.status}`} className="border-b border-slate-100">
                <td className="py-2 pr-4">{item.fullname}</td>
                <td className="py-2 pr-4 font-mono text-xs">{item.shortname}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      item.status === "created"
                        ? "bg-green-100 text-green-800"
                        : item.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {statusLabel(item.status)}
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-600">{item.message ?? "Confirmado por Moodle"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="block truncate text-xs text-slate-600">{label}</span>
      <span className="mt-1 block text-lg font-semibold leading-none text-slate-950">{value}</span>
    </div>
  );
}

function PreviewTable({
  title,
  description,
  headers,
  rows
}: {
  title: string;
  description?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              {headers.map((header) => (
                <th key={header} className="py-3 pr-4 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="py-3 pr-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function parsePlanningRows(raw: string): AcademicPlanningRow[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Agrega encabezados y al menos una fila.");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((item) => item.trim());
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      period: record.period,
      area: record.area || null,
      career: record.career,
      semester: record.semester,
      subject: record.subject,
      group: record.group,
      teacher_name: record.teacher_name || null,
      teacher_email: record.teacher_email || null,
      teacher_enrolment_key: record.teacher_enrolment_key || null,
      student_name: record.student_name || null,
      student_email: record.student_email || null,
      student_username: record.student_username || null,
      student_idnumber: record.student_idnumber || null,
      student_enrolment_key: record.student_enrolment_key || null,
      template_shortname: record.template_shortname || null
    };
  });
}

function downloadMoodleSelfEnrolCsv(
  preview: AutomationPreviewResult,
  options: { studentSelfEnrolment: boolean; teacherSelfEnrolment: boolean }
) {
  const headers = ["shortname", "enrolment_1", "enrolment_1_password", "enrolment_1_role"];
  const rows = moodleSelfEnrolRows(preview, options);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "moodle-autoinscripcion-cursos.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function moodleSelfEnrolRows(
  preview: AutomationPreviewResult,
  options: { studentSelfEnrolment: boolean; teacherSelfEnrolment: boolean }
) {
  return preview.courses
    .map((course) => {
      const instances = [
        options.studentSelfEnrolment && {
          method: "self",
          password: generatedSelfKey(course.shortname, "EST"),
          role: "student"
        },
        options.teacherSelfEnrolment && {
          method: "self",
          password: generatedSelfKey(course.shortname, "DOC"),
          role: "editingteacher"
        }
      ].filter(Boolean) as Array<{ method: string; password: string; role: string }>;

      return [
        course.shortname,
        instances[0]?.method ?? "",
        instances[0]?.password ?? "",
        instances[0]?.role ?? ""
      ];
    })
    .filter((row) => row[2]);
}

function generatedSelfKey(shortname: string, rolePrefix: "EST" | "DOC") {
  return `${rolePrefix}-${shortname}`;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function planningHeaders(options: {
  directTeachers: boolean;
  includeTemplateColumn: boolean;
}) {
  return [
    ...baseHeaders,
    ...(options.includeTemplateColumn ? templateHeaders : []),
    ...(options.directTeachers ? teacherIdentityHeaders : [])
  ];
}

function buildSample(options: {
  directTeachers: boolean;
  includeTemplateColumn: boolean;
}) {
  const headers = planningHeaders(options);
  const rows = [
    sampleRecord({
      teacherEmail: "docente@uni.edu.ni"
    }),
    sampleRecord({
      teacherEmail: "docente@uni.edu.ni"
    }),
    sampleRecord({
      area: "DACA",
      career: "Administracion de Empresas",
      subject: "Gestion Empresarial",
      group: "3T1-ADM-S",
      teacherEmail: "docente2@uni.edu.ni"
    })
  ];
  return [headers.join("\t"), ...rows.map((row) => headers.map((header) => row[header] ?? "").join("\t"))].join("\n");
}

function sampleRecord(values: {
  area?: string;
  career?: string;
  subject?: string;
  group?: string;
  teacherEmail: string;
}): Record<string, string> {
  return {
    period: "I Semestre 2026",
    area: values.area ?? "DACIP",
    career: values.career ?? "Ingenieria en Sistemas",
    semester: "III Año",
    subject: values.subject ?? "Teoria de la Computacion",
    group: values.group ?? "3T6-COM-S",
    template_shortname: defaultTemplateShortname,
    teacher_email: values.teacherEmail
  };
}

function pathKey(path: string[]) {
  return JSON.stringify(path);
}

function creatableCourseKeys(preview: AutomationPreviewResult) {
  return preview.courses
    .filter((course) => course.status === "ready" && course.category_moodle_id != null)
    .map((course) => course.key);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    existing: "Existe",
    missing: "No encontrada",
    hidden: "Oculta",
    hidden_parent: "Padre oculto",
    ready: "Listo",
    blocked: "Bloqueado",
    pending_lookup: "Pendiente de validar",
    proposed: "Pendiente de decidir",
    created: "Creado",
    failed: "Fallido",
    duplicate: "Duplicado",
    skipped: "Omitido",
    completed: "Completado",
    partially_completed: "Parcial"
  };
  return labels[status] ?? status;
}
