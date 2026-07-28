import type { DataQuality } from "@/lib/api";

const labels: Record<DataQuality, string> = {
  complete: "Completo",
  partial: "Datos basicos",
  estimated: "Estimado",
  stale: "Desactualizado",
  not_available: "No disponible"
};

const styles: Record<DataQuality, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-amber-200 bg-amber-50 text-amber-800",
  estimated: "border-institutional-extralightblue bg-blue-50 text-institutional-darkblue",
  stale: "border-orange-200 bg-orange-50 text-orange-800",
  not_available: "border-slate-200 bg-slate-100 text-slate-600"
};

export function DataQualityBadge({ quality }: { quality: DataQuality }) {
  return (
    <span className={`rounded border px-2 py-1 text-xs font-medium ${styles[quality]}`}>
      {labels[quality]}
    </span>
  );
}
