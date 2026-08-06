"use client";

import { CategoryTreeCombobox } from "@/components/categories/category-tree-combobox";
import {
  API_BASE_URL,
  apiFetch,
  moodleCourseUrl,
  type BulkDuplicateJobStatus,
  type BulkDuplicatePreviewRequest,
  type BulkDuplicatePreviewResult,
  type CategoryNode,
  type DuplicateCourseOption
} from "@/lib/api";
import { Copy, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function BulkDuplication() {
  const [activeStep, setActiveStep] = useState<"selection" | "preview" | "executions">("selection");
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [sourceCategory, setSourceCategory] = useState<CategoryNode | null>(null);
  const [targetCategory, setTargetCategory] = useState<CategoryNode | null>(null);
  const [courses, setCourses] = useState<DuplicateCourseOption[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("-COPIA");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [preview, setPreview] = useState<BulkDuplicatePreviewResult | null>(null);
  const [copyFullnames, setCopyFullnames] = useState<Record<number, string>>({});
  const [job, setJob] = useState<BulkDuplicateJobStatus | null>(null);
  const [jobHistory, setJobHistory] = useState<BulkDuplicateJobStatus[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourses = useMemo(
    () => courses.filter((course) => selectedCourseIds.has(course.id)),
    [courses, selectedCourseIds]
  );
  const allSelected = courses.length > 0 && courses.every((course) => selectedCourseIds.has(course.id));

  useEffect(() => {
    loadCategories();
    loadJobHistory();
  }, []);

  useEffect(() => {
    if (!sourceCategory?.moodle_id) {
      setCourses([]);
      setSelectedCourseIds(new Set());
      return;
    }
    setPreview(null);
    setJob(null);
    setCopyFullnames({});
    setSelectedCourseIds(new Set());
    apiFetch<DuplicateCourseOption[]>(`/automation/duplicates/categories/${sourceCategory.moodle_id}/courses`)
      .then(setCourses)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron cargar cursos"));
  }, [sourceCategory?.moodle_id]);

  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const nextJob = await apiFetch<BulkDuplicateJobStatus>(`/automation/duplicates/jobs/${job.id}`);
        if (cancelled) return;
        setJob(nextJob);
        if (!["queued", "processing"].includes(nextJob.status)) {
          window.clearInterval(timer);
          loadJobHistory();
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo consultar el lote");
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [job?.id, job?.status]);

  async function loadCategories() {
    setError(null);
    try {
      setCategories(await apiFetch<CategoryNode[]>("/categories/tree"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar categorias");
    }
  }

  async function syncCategories() {
    setSyncing(true);
    setError(null);
    try {
      setCategories(await apiFetch<CategoryNode[]>("/categories/tree?refresh=true"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron refrescar categorias");
    } finally {
      setSyncing(false);
    }
  }

  function requestPayload(): BulkDuplicatePreviewRequest {
    if (!sourceCategory?.moodle_id || !targetCategory?.moodle_id) {
      throw new Error("Selecciona categoria de origen y destino.");
    }
    return {
      source_category_id: sourceCategory.moodle_id,
      target_category_id: targetCategory.moodle_id,
      course_ids: Array.from(selectedCourseIds),
      shortname_prefix: prefix,
      shortname_suffix: suffix,
      new_subcategory_name: newSubcategoryName.trim() || null,
      copy_fullnames: copyFullnames
    };
  }

  async function generatePreview() {
    setLoading(true);
    setError(null);
    setPreview(null);
    setJob(null);
    try {
      if (selectedCourseIds.size === 0) throw new Error("Selecciona al menos un curso.");
      const nextPreview = await apiFetch<BulkDuplicatePreviewResult>("/automation/duplicates/preview", {
        method: "POST",
        body: JSON.stringify(requestPayload())
      });
      setPreview(nextPreview);
      setCopyFullnames(Object.fromEntries(nextPreview.items.map((item) => [item.course_id, item.copy_fullname])));
      setActiveStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la vista previa");
    } finally {
      setLoading(false);
    }
  }

  async function startJob() {
    if (!preview?.can_execute) return;
    setConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      setJob(
        await apiFetch<BulkDuplicateJobStatus>("/automation/duplicates/jobs", {
          method: "POST",
          body: JSON.stringify(requestPayload())
        })
      );
      await loadJobHistory();
      setActiveStep("executions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la duplicacion");
    } finally {
      setLoading(false);
    }
  }

  async function retryFailed() {
    if (!job) return;
    setError(null);
    try {
      setJob(await apiFetch<BulkDuplicateJobStatus>(`/automation/duplicates/jobs/${job.id}/retry`, { method: "POST" }));
      await loadJobHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron reintentar fallidos");
    }
  }

  async function loadJobHistory() {
    setLoadingHistory(true);
    try {
      setJobHistory(await apiFetch<BulkDuplicateJobStatus[]>("/automation/duplicates/jobs"));
    } catch {
      setJobHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function openJob(jobId: string) {
    setLoadingHistory(true);
    setError(null);
    try {
      setJob(await apiFetch<BulkDuplicateJobStatus>(`/automation/duplicates/jobs/${jobId}`));
      setActiveStep("executions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la ejecucion");
    } finally {
      setLoadingHistory(false);
    }
  }

  function toggleCourse(courseId: number) {
    const next = new Set(selectedCourseIds);
    if (next.has(courseId)) next.delete(courseId);
    else next.add(courseId);
    setSelectedCourseIds(next);
  }

  function updateCopyFullname(courseId: number, value: string) {
    setCopyFullnames((current) => ({ ...current, [courseId]: value }));
    setPreview((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.course_id === courseId ? { ...item, copy_fullname: value } : item
            )
          }
        : current
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 rounded border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">Duplicar cursos / aulas virtuales</h2>
          <p className="truncate text-xs text-slate-600">
            Copia contenidos y tareas; no copia estudiantes, docentes, calificaciones ni intentos.
          </p>
        </div>
        <button
          type="button"
          onClick={syncCategories}
          disabled={syncing}
          className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          {syncing ? "Actualizando..." : "Refrescar categorias"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-1 shadow-sm">
        {[
          ["selection", "Seleccion"] as const,
          ["preview", "Vista previa"] as const,
          ["executions", "Ejecuciones"] as const
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveStep(value)}
            className={`h-9 cursor-pointer rounded px-3 text-sm font-semibold ${
              activeStep === value ? "bg-institutional-primary text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeStep === "selection" && (
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <CategoryTreeCombobox
            categories={categories}
            value={sourceCategory?.moodle_id}
            onChange={setSourceCategory}
            label="Buscar cursos en categoria"
            compact
          />
          <p className="mt-2 text-xs text-slate-500">
            Se listan los cursos de esta categoria y sus subcategorias.
          </p>
          <div className="mt-4 rounded border border-slate-200">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Cursos / aulas a duplicar</h3>
                <p className="text-xs text-slate-600">{courses.length} encontrados · {selectedCourses.length} seleccionados</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={courses.length === 0}
                  onChange={() => setSelectedCourseIds(allSelected ? new Set() : new Set(courses.map((course) => course.id)))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Seleccionar todos
              </label>
            </div>
            <div className="max-h-[360px] overflow-auto">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCourseIds.has(course.id)}
                    onChange={() => toggleCourse(course.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{course.fullname}</span>
                    <span className="block truncate font-mono text-xs text-slate-500">{course.shortname}</span>
                    <span className="block truncate text-xs text-slate-500">Docente: {teacherLabel(course.teacher_names)}</span>
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      course.visible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {course.visible ? "Visible" : "Oculto"}
                  </span>
                </label>
              ))}
              {sourceCategory && courses.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-600">No hay cursos en esta categoria ni en sus subcategorias.</p>
              )}
              {!sourceCategory && (
                <p className="px-3 py-4 text-sm text-slate-600">Selecciona una categoria para listar sus cursos.</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <CategoryTreeCombobox
            categories={categories}
            value={targetCategory?.moodle_id}
            onChange={setTargetCategory}
            label="Categoria de destino"
            compact
          />
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Nueva subcategoria opcional
            <input
              value={newSubcategoryName}
              onChange={(event) => setNewSubcategoryName(event.target.value)}
              placeholder="Ej. ISEM2026"
              className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm"
            />
          </label>
        </div>
      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-950">Identificacion de las copias</h3>
        <p className="mt-1 text-sm text-slate-600">
          El nombre completo se conserva. El shortname se genera con prefijo/sufijo para evitar duplicados.
        </p>
        <div className="mt-3 grid gap-3">
          <label className="text-sm font-medium text-slate-700">
            Prefijo comun
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              placeholder="Ej. 2026-"
              className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Sufijo comun
            <input
              value={suffix}
              onChange={(event) => setSuffix(event.target.value)}
              placeholder="Ej. -COPIA"
              className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={generatePreview}
          disabled={loading || selectedCourses.length === 0 || !targetCategory}
          className="mt-4 flex h-10 cursor-pointer items-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Search className="h-4 w-4" />
          {loading ? "Validando..." : "Revisar copias"}
        </button>
      </section>
        </div>
      </section>
      )}

      {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {activeStep === "preview" && (
        preview ? (
          <PreviewPanel
            preview={preview}
            loading={loading}
            onConfirm={() => setConfirmOpen(true)}
            onCopyFullnameChange={updateCopyFullname}
          />
        ) : (
          <EmptyPanel message="Selecciona cursos y genera una vista previa para revisar las copias." />
        )
      )}
      {activeStep === "executions" && (
        <DuplicateExecutions
          job={job}
          history={jobHistory}
          loading={loadingHistory}
          onOpenJob={openJob}
          onRefresh={loadJobHistory}
          onRetry={retryFailed}
        />
      )}
      {confirmOpen && preview && (
        <ConfirmDuplicateModal
          preview={preview}
          loading={loading}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={startJob}
        />
      )}
    </div>
  );
}

function PreviewPanel({
  preview,
  loading,
  onConfirm,
  onCopyFullnameChange
}: {
  preview: BulkDuplicatePreviewResult;
  loading: boolean;
  onConfirm: () => void;
  onCopyFullnameChange: (courseId: number, value: string) => void;
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Vista previa de copias</h3>
          <p className="text-sm text-slate-600">Destino: {preview.destination_path.join(" / ")}</p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || !preview.can_execute}
          className="flex h-10 cursor-pointer items-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Copy className="h-4 w-4" />
          Duplicar cursos seleccionados
        </button>
      </div>
      {preview.warnings.map((warning) => (
        <p key={warning} className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      ))}
      <DuplicateItems items={preview.items} editable onCopyFullnameChange={onCopyFullnameChange} />
    </section>
  );
}

function ConfirmDuplicateModal({
  preview,
  loading,
  onCancel,
  onConfirm
}: {
  preview: BulkDuplicatePreviewResult;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-slate-950">Confirmar duplicacion</h3>
        <p className="mt-2 text-sm text-slate-600">
          Se duplicaran {preview.items.length} curso(s) en:
        </p>
        <p className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
          {preview.destination_path.join(" / ")}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Se copiaran contenidos, actividades y tareas. No se copiaran estudiantes, docentes, calificaciones ni intentos.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 cursor-pointer rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 cursor-pointer rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:opacity-70"
          >
            {loading ? "Iniciando..." : "Duplicar ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobPanel({ job, onRetry }: { job: BulkDuplicateJobStatus; onRetry: () => void }) {
  const running = ["queued", "processing"].includes(job.status);
  const failed = job.items.filter((item) => item.status === "error");
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Progreso del lote</h3>
          <p className="text-sm text-slate-600">
            {job.completed} completados · {job.failed} errores · {job.processed}/{job.total} procesados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={running || failed.length === 0}
            className="flex h-10 cursor-pointer items-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reintentar fallidos
          </button>
          {!running && job.items.length > 0 && (
            <a
              href={`${API_BASE_URL}/automation/duplicates/jobs/${job.id}/report`}
              className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Descargar reporte
            </a>
          )}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
        <div className="h-full rounded bg-institutional-primary transition-all" style={{ width: `${job.percent}%` }} />
      </div>
      {job.error_message && <p className="mt-2 text-sm text-red-700">{job.error_message}</p>}
      <DuplicateItems items={job.items} />
    </section>
  );
}

function DuplicateExecutions({
  job,
  history,
  loading,
  onOpenJob,
  onRefresh,
  onRetry
}: {
  job: BulkDuplicateJobStatus | null;
  history: BulkDuplicateJobStatus[];
  loading: boolean;
  onOpenJob: (jobId: string) => void;
  onRefresh: () => void;
  onRetry: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Historial</h3>
            <p className="text-xs text-slate-500">{history.length} lotes</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex h-8 cursor-pointer items-center gap-2 rounded border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
        <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenJob(item.id)}
              className={`w-full cursor-pointer rounded border p-2 text-left ${
                job?.id === item.id ? "border-institutional-primary bg-blue-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-slate-900">Lote {item.id.slice(0, 8)}</span>
                <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.started_at)}</p>
              <p className="mt-1 text-xs text-slate-600">
                {item.completed} completados · {item.failed} errores
              </p>
            </button>
          ))}
          {history.length === 0 && <p className="rounded border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600">Sin duplicaciones guardadas.</p>}
        </div>
      </div>
      {job ? <JobPanel job={job} onRetry={onRetry} /> : <EmptyPanel message="Selecciona un lote para ver el resultado." />}
    </section>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <section className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
      {message}
    </section>
  );
}

function DuplicateItems({
  items,
  editable = false,
  onCopyFullnameChange
}: {
  items: Array<{ course_id: number; moodle_id?: number | null; original_fullname: string; original_shortname: string; teacher_names?: string[] | null; copy_fullname: string; copy_shortname: string; destination_path: string[]; status: string; message?: string | null }>;
  editable?: boolean;
  onCopyFullnameChange?: (courseId: number, value: string) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th className="py-2 pr-4 font-semibold">Curso origen</th>
            <th className="py-2 pr-4 font-semibold">Nueva aula</th>
            <th className="py-2 pr-4 font-semibold">Shortname nuevo</th>
            <th className="py-2 pr-4 font-semibold">Destino</th>
            <th className="py-2 pr-4 font-semibold">Estado</th>
            <th className="py-2 pr-4 font-semibold">Accion</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const courseUrl = moodleCourseUrl(item.moodle_id);
            return (
            <tr key={`${item.original_shortname}:${item.copy_shortname}`} className="border-b border-slate-100">
              <td className="py-2 pr-4">
                <span className="block font-semibold text-slate-900">{item.original_fullname}</span>
                <span className="font-mono text-xs text-slate-500">{item.original_shortname}</span>
                <span className="block max-w-[320px] truncate text-xs text-slate-500">
                  Docente: {teacherLabel(item.teacher_names)}
                </span>
              </td>
              <td className="py-2 pr-4">
                {editable ? (
                  <input
                    value={item.copy_fullname}
                    onChange={(event) => onCopyFullnameChange?.(item.course_id, event.target.value)}
                    className="h-9 w-full min-w-[260px] rounded border border-slate-300 px-2 text-sm text-slate-900"
                    aria-label={`Nombre completo para ${item.original_shortname}`}
                  />
                ) : (
                  item.copy_fullname
                )}
              </td>
              <td className="py-2 pr-4 font-mono text-xs">{item.copy_shortname}</td>
              <td className="py-2 pr-4 text-slate-600">{item.destination_path.join(" / ")}</td>
              <td className="py-2 pr-4">
                <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                {item.moodle_id && <p className="mt-1 text-xs text-slate-500">ID {item.moodle_id}</p>}
                {item.message && <p className="mt-1 text-xs text-red-700">{item.message}</p>}
              </td>
              <td className="py-2 pr-4">
                {courseUrl && item.status === "completed" ? (
                  <a
                    href={courseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded border border-slate-300 px-3 text-xs font-semibold text-institutional-primary hover:bg-slate-50"
                  >
                    Abrir curso
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">-</span>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "completed") return "rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800";
  if (status === "error") return "rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800";
  if (status === "processing") return "rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800";
  if (status === "partially_completed") return "rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800";
  return "rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completado",
    error: "Error",
    queued: "En cola",
    partially_completed: "Parcial"
  };
  return labels[status] ?? status;
}

function teacherLabel(names?: string[] | null) {
  const cleanNames = (names ?? []).filter(Boolean);
  if (cleanNames.length === 0) return "Sin dato";
  if (cleanNames.length <= 2) return cleanNames.join("; ");
  return `${cleanNames.slice(0, 2).join("; ")} +${cleanNames.length - 2}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
