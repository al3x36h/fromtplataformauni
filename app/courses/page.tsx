"use client";

import { AppShell } from "@/components/app-shell";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function CoursesPage() {
  return (
    <AppShell title="Cursos">
      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Administracion de cursos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Crea cursos reales en Moodle seleccionando una categoria sincronizada.
            </p>
          </div>
          <Link
            href="/courses/new"
            className="flex h-10 items-center gap-2 rounded bg-institutional-primary px-4 text-sm font-semibold text-white hover:bg-institutional-darkblue"
          >
            <Plus className="h-4 w-4" />
            Crear curso
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
