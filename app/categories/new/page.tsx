"use client";

import { AppShell } from "@/components/app-shell";
import { CategoryTreeCombobox } from "@/components/categories/category-tree-combobox";
import {
  apiFetch,
  type CategoryCreateRequest,
  type CategoryCreateResult,
  type CategoryNode,
  type CategoryValidationResult
} from "@/lib/api";
import { CheckCircle2, Save, Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function NewCategoryPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [parent, setParent] = useState<CategoryNode | null>(null);
  const [validation, setValidation] = useState<CategoryValidationResult | null>(null);
  const [created, setCreated] = useState<CategoryCreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<CategoryNode[]>("/categories/tree")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function payloadFromForm(form: HTMLFormElement): CategoryCreateRequest {
    const data = new FormData(form);
    return {
      name: String(data.get("name") ?? "").trim(),
      idnumber: String(data.get("idnumber") ?? "").trim() || null,
      parent_moodle_id: parent?.moodle_id ?? null,
      description: String(data.get("description") ?? "").trim() || null,
      visible: data.get("visible") === "on"
    };
  }

  async function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidating(true);
    setError(null);
    setCreated(null);
    try {
      setValidation(
        await apiFetch<CategoryValidationResult>("/categories/validate", {
          method: "POST",
          body: JSON.stringify(payloadFromForm(event.currentTarget))
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar la categoria");
    } finally {
      setValidating(false);
    }
  }

  async function create(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch<CategoryCreateResult>("/categories", {
        method: "POST",
        body: JSON.stringify(payloadFromForm(form))
      });
      setCreated(result);
      setValidation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoria");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Nueva categoria">
      <form onSubmit={validate} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-5 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Crear categoria Moodle</h2>
            <p className="mt-1 text-sm text-slate-600">
              Primero valida la ubicacion y posibles duplicados. La categoria se crea en Moodle solo al confirmar.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Nombre
              <input
                name="name"
                required
                maxLength={255}
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
          </div>

          <CategoryTreeCombobox
            categories={categories}
            value={parent?.moodle_id}
            onChange={setParent}
            label="Categoria padre"
          />

          <label className="text-sm font-medium text-slate-700">
            Descripcion
            <textarea
              name="description"
              rows={4}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input name="visible" type="checkbox" defaultChecked className="h-4 w-4" />
            Visible localmente
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
              href="/categories"
              className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver
            </Link>
          </div>
        </section>

        <aside className="space-y-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">Vista previa</h3>
          {!validation && !created && (
            <p className="text-sm text-slate-600">Completa el formulario y presiona Validar.</p>
          )}

          {validation && (
            <div className="space-y-4">
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-950">Ruta resultante</p>
                <p className="mt-1 text-slate-700">{validation.path.join(" / ")}</p>
              </div>

              {validation.duplicates.length > 0 && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-semibold">Coincidencias encontradas</p>
                  <ul className="mt-2 space-y-2">
                    {validation.duplicates.map((duplicate) => (
                      <li key={`${duplicate.reason}-${duplicate.moodle_id ?? duplicate.name}`}>
                        {duplicate.path.join(" / ")} ({duplicate.reason})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {validation.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              )}

              {validation.can_create && (
                <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  No se encontraron duplicados. Puedes crear la categoria.
                </div>
              )}
            </div>
          )}

          {created && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Categoria creada
              </div>
              <p className="mt-2">{created.category.path.join(" / ")}</p>
              <p className="mt-1">ID Moodle: {created.category.moodle_id}</p>
            </div>
          )}
        </aside>
      </form>
    </AppShell>
  );
}
