import type { DataSource } from "@/lib/api";

const labels: Record<DataSource, string> = {
  moodle_rest: "Moodle REST",
  local_snapshot: "Snapshot local",
  not_available: "No disponible"
};

export function DataSourceBadge({ source }: { source: DataSource }) {
  return (
    <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
      {labels[source]}
    </span>
  );
}
