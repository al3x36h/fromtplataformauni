"use client";

import type { CategoryNode } from "@/lib/api";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  categories: CategoryNode[];
  value?: number | null;
  onChange: (category: CategoryNode | null) => void;
  label?: string;
  compact?: boolean;
};

export function CategoryTreeCombobox({
  categories,
  value,
  onChange,
  label = "Categoria padre",
  compact = false
}: Props) {
  const [search, setSearch] = useState("");
  const [showVisible, setShowVisible] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const selected = categories.find((category) => category.moodle_id === value) ?? null;
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      categories.filter((category) => {
        if (category.visible && !showVisible) return false;
        if (!category.visible && !showHidden) return false;
        if (!normalizedSearch) return true;
        return (
          category.name.toLowerCase().includes(normalizedSearch) ||
          category.path.join(" / ").toLowerCase().includes(normalizedSearch) ||
          (category.idnumber ?? "").toLowerCase().includes(normalizedSearch)
        );
      }),
    [categories, normalizedSearch, showHidden, showVisible]
  );

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-end justify-between gap-3">
        <label className="block flex-1 text-sm font-medium text-slate-700">
          {label}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, ruta o idnumber"
            className={`${compact ? "h-9" : "h-10"} mt-1 w-full rounded border border-slate-300 px-3 text-sm`}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            onChange(null);
          }}
          className={`flex ${compact ? "h-9 px-2" : "h-10 px-3"} cursor-pointer items-center gap-2 rounded border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100`}
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </button>
      </div>

      {selected && (
        <div className={`rounded border border-institutional-extralightblue bg-blue-50 px-3 ${compact ? "py-1.5" : "py-2"} text-sm text-institutional-darkblue`}>
          <p className="font-semibold">{compact ? "Seleccionada" : "Categoria seleccionada"}</p>
          <p className="mt-0.5 truncate">{selected.path.join(" / ")}</p>
          {!selected.visible && <p className="mt-1 text-xs font-semibold text-red-700">Categoria oculta</p>}
        </div>
      )}

      <div className={`flex flex-wrap gap-3 rounded border border-slate-200 bg-slate-50 px-3 ${compact ? "py-1.5 text-xs" : "py-2 text-sm"} text-slate-700`}>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showVisible}
            onChange={(event) => setShowVisible(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Visibles
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(event) => setShowHidden(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Ocultas
        </label>
      </div>

      <div className={`${compact ? "max-h-48" : "max-h-72"} overflow-auto rounded border border-slate-200 bg-white`}>
        {filtered.map((category) => {
          const active = category.moodle_id === value;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category)}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-3 ${compact ? "py-1.5" : "py-2"} text-left text-sm text-slate-800 transition-colors last:border-b-0 hover:bg-blue-50 ${
                active ? "border-l-4 border-l-institutional-primary bg-blue-50" : ""
              }`}
            >
              <span
                className="min-w-0"
                style={{ paddingLeft: `${Math.min(category.depth, 6) * 16}px` }}
              >
                <span className="block truncate font-medium">{category.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {category.path.join(" / ")}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs">
                {category.idnumber && <span className="block">{category.idnumber}</span>}
                <span className="text-slate-500">
                  {category.course_count} cursos
                </span>
                {!category.visible && <span className="block font-semibold text-red-700">Oculta</span>}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-sm text-slate-600">No hay categorias con ese criterio.</p>
        )}
      </div>
    </div>
  );
}
