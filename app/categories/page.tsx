"use client";

import { AppShell } from "@/components/app-shell";
import { DataSourceBadge } from "@/components/analytics/data-source-badge";
import { apiFetch, type CategoryNode } from "@/lib/api";
import { ChevronDown, ChevronRight, Plus, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const childMap = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const category of categories) {
      if (!category.parent_moodle_id) continue;
      const parentId = String(category.parent_moodle_id);
      result.set(parentId, [...(result.get(parentId) ?? []), category.id]);
    }
    return result;
  }, [categories]);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleCategories = useMemo(
    () =>
      categories.filter((category) => {
        const matches =
          !normalizedSearch ||
          category.name.toLowerCase().includes(normalizedSearch) ||
          category.path.join(" / ").toLowerCase().includes(normalizedSearch) ||
          (category.idnumber ?? "").toLowerCase().includes(normalizedSearch);
        return matches && isCategoryVisible(category, categories, collapsedIds);
      }),
    [categories, collapsedIds, normalizedSearch]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCategories(await apiFetch<CategoryNode[]>("/categories/tree"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar categorias");
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setError(null);
    try {
      await apiFetch("/categories/sync", { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo sincronizar categorias");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell title="Categorias">
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Administracion de categorias</h2>
            <p className="mt-1 text-sm text-slate-600">
              Arbol sincronizado desde Moodle con rutas completas y conteos por rama.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/categories/new"
              className="flex h-10 items-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue"
            >
              <Plus className="h-4 w-4" />
              Crear categoria
            </Link>
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="flex h-10 cursor-pointer items-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>
        </div>

        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <label className="relative block w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, ruta o idnumber"
                className="h-10 w-full rounded border border-slate-300 pl-9 pr-3 text-sm"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCollapsedIds(new Set(childMap.keys()))}
                className="h-10 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Plegar
              </button>
              <button
                type="button"
                onClick={() => setCollapsedIds(new Set())}
                className="h-10 rounded border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Expandir
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading && <p className="mt-4 text-sm text-slate-600">Cargando categorias...</p>}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-3 pr-4 font-semibold">Categoria</th>
                  <th className="py-3 pr-4 font-semibold">ID Moodle</th>
                  <th className="py-3 pr-4 font-semibold">Idnumber</th>
                  <th className="py-3 pr-4 font-semibold">Cursos</th>
                  <th className="py-3 pr-4 font-semibold">Acumulado</th>
                  <th className="py-3 pr-4 font-semibold">Estado</th>
                  <th className="py-3 pr-4 font-semibold">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {visibleCategories.map((category) => {
                  const hasChildren = childMap.has(category.id);
                  const collapsed = collapsedIds.has(category.id);
                  return (
                    <tr key={category.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-950">
                        <div
                          className="flex items-start gap-2"
                          style={{ paddingLeft: `${Math.min(category.depth, 6) * 16}px` }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(category.id)) next.delete(category.id);
                                  else next.add(category.id);
                                  return next;
                                })
                              }
                              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                              aria-label={collapsed ? "Expandir categoria" : "Plegar categoria"}
                            >
                              {collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <span className="h-6 w-6 shrink-0" />
                          )}
                          <div>
                            <span>{category.name}</span>
                            <p className="mt-1 max-w-[520px] truncate text-xs font-normal text-slate-500">
                              {category.path.join(" / ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{category.moodle_id ?? "-"}</td>
                      <td className="py-3 pr-4">{category.idnumber ?? "-"}</td>
                      <td className="py-3 pr-4">{category.course_count}</td>
                      <td className="py-3 pr-4">{category.cumulative_course_count}</td>
                      <td className="py-3 pr-4">
                        {category.visible ? (
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            Visible
                          </span>
                        ) : (
                          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                            Oculta
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <DataSourceBadge
                          source={category.source === "moodle_rest" ? "moodle_rest" : "local_snapshot"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function isCategoryVisible(
  category: CategoryNode,
  categories: CategoryNode[],
  collapsedIds: Set<string>
) {
  const byId = new Map(categories.map((item) => [item.id, item]));
  let parentId = category.parent_moodle_id ? String(category.parent_moodle_id) : null;
  while (parentId) {
    if (collapsedIds.has(parentId)) return false;
    parentId = byId.get(parentId)?.parent_moodle_id
      ? String(byId.get(parentId)?.parent_moodle_id)
      : null;
  }
  return true;
}
