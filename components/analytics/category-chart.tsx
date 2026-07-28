"use client";

import type { CategoryAnalytics } from "@/lib/api";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CategoryChart({ data }: { data: CategoryAnalytics[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-600">Sin datos sincronizados para el periodo.</p>;
  }

  return (
    <div className="h-80 w-full" aria-label="Cursos por categoria">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="course_count" name="Cursos" fill="#003891" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
