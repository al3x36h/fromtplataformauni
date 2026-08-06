"use client";

import { AppShell } from "@/components/app-shell";
import { CategoryTreeCombobox } from "@/components/categories/category-tree-combobox";
import {
  apiFetch,
  type CategoryNode,
  type CourseCreateRequest,
  type CourseCreateResult,
  type CourseValidationResult
} from "@/lib/api";
import { CheckCircle2, Save, Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function NewCoursePage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [validation, setValidation] = useState<CourseValidationResult | null>(null);
  const [created, setCreated] = useState<CourseCreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<CategoryNode[]>("/categories/tree")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function payloadFromForm(form: HTMLFormElement): CourseCreateRequest {
    const data = new FormData(form);
    return {
      fullname: String(data.get("fullname") ?? "").trim(),
      shortname: String(data.get("shortname") ?? "").trim(),
      idnumber: String(data.get("idnumber") ?? "").trim() || null,
      category_moodle_id: category?.moodle_id ?? 0,
      summary: String(data.get("summary") ?? "").trim() || null,
      format: String(data.get("format") ?? "topics"),
      startdate: String(data.get("startdate") ?? "") || null,
      enddate: String(data.get("enddate") ?? "") || null,
      visible: data.get("visible") === "on",
      numsections: Number(data.get("numsections") ?? 10),
      template_shortname: String(data.get("template_shortname") ?? "").trim() || null,
      modality: String(data.get("modality") ?? "").trim() || null,
      activity_type: String(data.get("activity_type") ?? "").trim() || null,
      academic_period: String(data.get("academic_period") ?? "").trim() || null,
      cohort: String(data.get("cohort") ?? "").trim() || null,
      academic_load_code: String(data.get("academic_load_code") ?? "").trim() || null,
      observations: String(data.get("observations") ?? "").trim() || null
    };
  }

  async function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category?.moodle_id) {
      setError("Selecciona una categoria valida antes de validar.");
      return;
    }
    setValidating(true);
    setError(null);
    setCreated(null);
    try {
      setValidation(
        await apiFetch<CourseValidationResult>("/courses/validate", {
          method: "POST",
          body: JSON.stringify(payloadFromForm(event.currentTarget))
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar el curso");
    } finally {
      setValidating(false);
    }
  }

  async function create(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch<CourseCreateResult>("/courses", {
        method: "POST",
        body: JSON.stringify(payloadFromForm(form))
      });
      setCreated(result);
      setValidation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el curso");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Nuevo curso">
      <form onSubmit={validate} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-5 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Crear curso Moodle</h2>
            <p className="mt-1 text-sm text-slate-600">
              Selecciona una categoria del arbol, valida duplicados y confirma la creacion.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Nombre completo
              <input
                name="fullname"
                required
                maxLength={255}
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Nombre corto
              <input
                name="shortname"
                required
                maxLength={120}
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Idnumber
              <input
                name="idnumber"
                maxLength={120}
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Plantilla base
              <input
                name="template_shortname"
                maxLength={120}
                placeholder="PBASE2025"
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Formato
              <select name="format" defaultValue="topics" className="mt-1 h-10 w-full rounded border border-slate-300 px-3">
                <option value="topics">Temas</option>
                <option value="weeks">Semanas</option>
              </select>
            </label>
          </div>

          <CategoryTreeCombobox
            categories={categories}
            value={category?.moodle_id}
            onChange={setCategory}
            label="Categoria Moodle"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Fecha inicial
              <input name="startdate" type="date" className="mt-1 h-10 w-full rounded border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Fecha final
              <input name="enddate" type="date" className="mt-1 h-10 w-full rounded border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Secciones
              <input
                name="numsections"
                type="number"
                min={1}
                max={52}
                defaultValue={10}
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Modalidad
              <select name="modality" className="mt-1 h-10 w-full rounded border border-slate-300 px-3">
                <option value="">Sin definir</option>
                <option value="Presencial">Presencial</option>
                <option value="Virtual">Virtual</option>
                <option value="Hibrida">Hibrida</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Tipo de actividad
              <input name="activity_type" className="mt-1 h-10 w-full rounded border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Periodo academico
              <input name="academic_period" className="mt-1 h-10 w-full rounded border border-slate-300 px-3" />
            </label>
          </div>

          <label className="text-sm font-medium text-slate-700">
            Resumen
            <textarea name="summary" rows={4} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input name="visible" type="checkbox" defaultChecked className="h-4 w-4" />
            Visible en Moodle
          </label>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={validating}
              className="flex h-10 cursor-pointer items-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Search className="h-4 w-4" />
              {validating ? "Validando..." : "Validar"}
            </button>
            <button
              type="button"
              disabled={!validation?.can_create || saving}
              onClick={(event) => create(event.currentTarget.form as HTMLFormElement)}
              className="flex h-10 cursor-pointer items-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Creando..." : "Crear en Moodle"}
            </button>
            <Link
              href="/courses"
              className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver
            </Link>
          </div>
        </section>

        <aside className="space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Vista previa</h3>
          {category && (
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-950">Sera creado dentro de</p>
              <p className="mt-1 text-slate-700">{category.path.join(" / ")}</p>
            </div>
          )}

          {validation && (
            <div className="space-y-4">
              {validation.duplicates.length > 0 && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-semibold">Cursos existentes</p>
                  <ul className="mt-2 space-y-2">
                    {validation.duplicates.map((duplicate) => (
                      <li key={`${duplicate.reason}-${duplicate.moodle_id ?? duplicate.shortname}`}>
                        {duplicate.fullname} ({duplicate.reason})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.can_create && (
                <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  No se encontraron duplicados. Puedes crear el curso.
                </div>
              )}
            </div>
          )}

          {created && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Curso creado
              </div>
              <p className="mt-2">{created.course.fullname}</p>
              <p className="mt-1">ID Moodle: {created.course.moodle_id}</p>
            </div>
          )}
        </aside>
      </form>
    </AppShell>
  );
}
