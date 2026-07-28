"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { apiFetch, type CurrentUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch<CurrentUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded bg-institutional-primary text-white">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Acceso institucional</h1>
            <p className="text-sm text-slate-600">Plataforma de automatizacion Moodle</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 w-full rounded border border-slate-300 px-3 text-slate-950"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded border border-slate-300 px-3 text-slate-950"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full cursor-pointer rounded bg-institutional-primary px-4 font-semibold text-white transition-colors hover:bg-institutional-darkblue disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Validando..." : "Iniciar sesion"}
          </button>
        </form>
      </section>
    </main>
  );
}
