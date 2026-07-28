"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  KeyRound,
  LogOut,
  Settings
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useState } from "react";

const nav = [
  { href: "/automation", label: "Automatizacion", icon: ClipboardList },
  { href: "/analytics", label: "Analitica", icon: BarChart3 },
  { href: "/categories", label: "Categorias", icon: FolderTree },
  { href: "/courses", label: "Cursos", icon: BookOpen },
  { href: "/settings/moodle", label: "Moodle", icon: Settings }
];

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-20 border-r border-slate-200 bg-white transition-all duration-200 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-institutional-primary text-sm font-bold text-white">
            UNI
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-slate-950">Plataforma Moodle</p>
              <p className="text-xs text-slate-600">Administracion institucional</p>
            </div>
          )}
        </div>

        <nav className="space-y-1 p-3" aria-label="Navegacion principal">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-11 items-center gap-3 rounded px-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-institutional-primary text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-3 left-3 right-3 space-y-2">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-10 w-full cursor-pointer items-center justify-center rounded border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100"
            aria-label={collapsed ? "Expandir menu" : "Contraer menu"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded border border-slate-200 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      <div className={collapsed ? "pl-20" : "pl-72"}>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Inicio</p>
            <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
          </div>
          <div className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <KeyRound className="h-4 w-4 text-institutional-primary" />
            Sesion segura
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
