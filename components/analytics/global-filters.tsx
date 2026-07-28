"use client";

import { apiFetch, type CategoryAnalytics, type CourseFilterOption } from "@/lib/api";
import { Filter, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function GlobalFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [categories, setCategories] = useState<CategoryAnalytics[]>([]);
  const [courses, setCourses] = useState<CourseFilterOption[]>([]);

  useEffect(() => {
    apiFetch<CategoryAnalytics[]>("/analytics/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
    apiFetch<CourseFilterOption[]>("/analytics/courses")
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value)) next.set(key, String(value));
    }
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4"
    >
      <label className="text-sm font-medium text-slate-700">
        Desde
        <input
          name="date_from"
          type="date"
          defaultValue={params.get("date_from") ?? ""}
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Hasta
        <input
          name="date_to"
          type="date"
          defaultValue={params.get("date_to") ?? ""}
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Categoria
        <select
          name="category_id"
          defaultValue={params.get("category_id") ?? ""}
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.path.length ? category.path.join(" / ") : category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Modalidad
        <select
          name="modality"
          defaultValue={params.get("modality") ?? ""}
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        >
          <option value="">Todas</option>
          <option value="Presencial">Presencial</option>
          <option value="Virtual">Virtual</option>
          <option value="Hibrida">Hibrida</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Curso
        <input
          name="course_id"
          defaultValue={params.get("course_id") ?? ""}
          list="analytics-course-options"
          inputMode="numeric"
          placeholder="Buscar por nombre o ID"
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        />
        <datalist id="analytics-course-options">
          {courses.map((course) => (
            <option
              key={course.id}
              value={course.id}
              label={`${course.fullname} · ${course.shortname}${course.category_path.length ? ` · ${course.category_path.join(" / ")}` : ""}`}
            />
          ))}
        </datalist>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Docente ID
        <input
          name="teacher_id"
          defaultValue={params.get("teacher_id") ?? ""}
          inputMode="numeric"
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Estado del curso
        <select
          name="course_status"
          defaultValue={params.get("course_status") ?? ""}
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        >
          <option value="">Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Visibilidad
        <select
          name="visibility"
          defaultValue={params.get("visibility") ?? ""}
          className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
        >
          <option value="">Todas</option>
          <option value="visible">Visible</option>
          <option value="hidden">Oculto</option>
        </select>
      </label>
      <label className="mt-6 flex h-10 items-center gap-2 text-sm font-medium text-slate-700">
        <input
          name="compare_previous"
          value="true"
          type="checkbox"
          defaultChecked={params.get("compare_previous") === "true"}
          className="h-4 w-4 rounded border-slate-300"
        />
        Comparar periodo anterior
      </label>
      <button
        type="submit"
        className="mt-6 flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-institutional-darkblue"
      >
        <Filter className="h-4 w-4" />
        Filtrar
      </button>
      <button
        type="button"
        onClick={() => router.push(pathname)}
        className="mt-6 flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
      >
        <RotateCcw className="h-4 w-4" />
        Limpiar
      </button>
    </form>
  );
}
