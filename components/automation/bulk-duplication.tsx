"use client";

import { CategoryTreeCombobox } from "@/components/categories/category-tree-combobox";
import {
  apiFetch,
  type BulkDuplicateJobStatus,
  type BulkDuplicatePreviewRequest,
  type BulkDuplicatePreviewResult,
  type CategoryNode,
  type DuplicateCourseOption
} from "@/lib/api";
import { Copy, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function BulkDuplication() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [sourceCategory, setSourceCategory] = useState<CategoryNode | null>(null);
  const [targetCategory, setTargetCategory] = useState<CategoryNode | null>(null);
  const [courses, setCourses] = useState<DuplicateCourseOption[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("-COPIA");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [preview, setPreview] = useState<BulkDuplicatePreviewResult | null>(null);
  const [job, setJob] = useState<BulkDuplicateJobStatus | null>(null);
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
  }, []);

  useEffect(() => {
    if (!sourceCategory?.moodle_id) {
      setCourses([]);
      setSelectedCourseIds(new Set());
      return;
    }
    setPreview(null);
    setJob(null);
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
        if (!["queued", "processing"].includes(nextJob.status)) window.clearInterval(timer);
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
      await apiFetch("/categories/sync", { method: "POST" });
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron sincronizar categorias");
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
      new_subcategory_name: newSubcategoryName.trim() || null
    };
  }

  async function generatePreview() {
    setLoading(true);
    setError(null);
    setPreview(null);
    setJob(null);
    try {
      if (selectedCourseIds.size === 0) throw new Error("Selecciona al menos un curso.");
      setPreview(
        await apiFetch<BulkDuplicatePreviewResult>("/automation/duplicates/preview", {
          method: "POST",
          body: JSON.stringify(requestPayload())
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la vista previa");
    } finally {
      setLoading(false);
    }
  }

  async function startJob() {
    if (!preview?.can_execute) return;
    const confirmed = window.confirm(`Duplicar ${preview.items.length} cursos en ${preview.destination_path.join(" / ")}?`);
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      setJob(
        await apiFetch<BulkDuplicateJobStatus>("/automation/duplicates/jobs", {
          method: "POST",
          body: JSON.stringify(requestPayload())
        })
      );
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron reintentar fallidos");
    }
  }

  function toggleCourse(courseId: number) {
    const next = new Set(selectedCourseIds);
    if (next.has(courseId)) next.delete(courseId);
    else next.add(courseId);
    setSelectedCourseIds(next);
  }

  return (
    <div className="space-y-5">
      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Duplicacion masiva</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Duplica varios cursos existentes hacia otra categoria usando Moodle REST. No copia usuarios,
              docentes, estudiantes, intentos ni datos de usuario.
            </p>
          </div>
          <button
            type="button"
            onClick={syncCategories}
            disabled={syncing}
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {syncing ? "Sincronizando..." : "Actualizar categorias"}
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <CategoryTreeCombobox
            categories={categories}
            value={sourceCategory?.moodle_id}
            onChange={setSourceCategory}
            label="Categoria de origen"
          />
        </div>
        <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <CategoryTreeCombobox
            categories={categories}
            value={targetCategory?.moodle_id}
            onChange={setTargetCategory}
            label="Categoria de destino"
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
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Cursos de origen</h3>
            <p className="text-sm text-slate-600">{courses.length} cursos encontrados.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
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
        <div className="mt-3 max-h-80 overflow-auto rounded border border-slate-200">
          {courses.map((course) => (
            <label
              key={course.id}
              className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedCourseIds.has(course.id)}
                onChange={() => toggleCourse(course.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block font-semibold text-slate-900">{course.fullname}</span>
                <span className="block font-mono text-xs text-slate-500">{course.shortname}</span>
              </span>
            </label>
          ))}
          {sourceCategory && courses.length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-600">No hay cursos directos en esta categoria.</p>
          )}
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-950">Nombre corto de las copias</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
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
          {loading ? "Validando..." : "Generar vista previa"}
        </button>
      </section>

      {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {preview && <PreviewPanel preview={preview} loading={loading} onConfirm={startJob} />}
      {job && <JobPanel job={job} onRetry={retryFailed} />}
    </div>
  );
}

function PreviewPanel({
  preview,
  loading,
  onConfirm
}: {
  preview: BulkDuplicatePreviewResult;
  loading: boolean;
  onConfirm: () => void;
}) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Vista previa</h3>
          <p className="text-sm text-slate-600">Destino: {preview.destination_path.join(" / ")}</p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || !preview.can_execute}
          className="flex h-10 cursor-pointer items-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Copy className="h-4 w-4" />
          Confirmar duplicacion
        </button>
      </div>
      {preview.warnings.map((warning) => (
        <p key={warning} className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      ))}
      <DuplicateItems items={preview.items} />
    </section>
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
        <button
          type="button"
          onClick={onRetry}
          disabled={running || failed.length === 0}
          className="flex h-10 cursor-pointer items-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reintentar fallidos
        </button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
        <div className="h-full rounded bg-institutional-primary transition-all" style={{ width: `${job.percent}%` }} />
      </div>
      {job.error_message && <p className="mt-2 text-sm text-red-700">{job.error_message}</p>}
      <DuplicateItems items={job.items} />
    </section>
  );
}

function DuplicateItems({ items }: { items: Array<{ original_fullname: string; original_shortname: string; copy_fullname: string; copy_shortname: string; destination_path: string[]; status: string; message?: string | null }> }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th className="py-2 pr-4 font-semibold">Curso original</th>
            <th className="py-2 pr-4 font-semibold">Copia</th>
            <th className="py-2 pr-4 font-semibold">Shortname nuevo</th>
            <th className="py-2 pr-4 font-semibold">Destino</th>
            <th className="py-2 pr-4 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.original_shortname}:${item.copy_shortname}`} className="border-b border-slate-100">
              <td className="py-2 pr-4">
                <span className="block font-semibold text-slate-900">{item.original_fullname}</span>
                <span className="font-mono text-xs text-slate-500">{item.original_shortname}</span>
              </td>
              <td className="py-2 pr-4">{item.copy_fullname}</td>
              <td className="py-2 pr-4 font-mono text-xs">{item.copy_shortname}</td>
              <td className="py-2 pr-4 text-slate-600">{item.destination_path.join(" / ")}</td>
              <td className="py-2 pr-4">
                <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                {item.message && <p className="mt-1 text-xs text-red-700">{item.message}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "completed") return "rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800";
  if (status === "error") return "rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800";
  if (status === "processing") return "rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800";
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
