"use client";

import type { AnalyticsIndicator } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataQualityBadge } from "./data-quality-badge";

export function MetricCard({ indicator }: { indicator: AnalyticsIndicator }) {
  const params = useSearchParams();
  const queryString = params.toString();
  const detailHref = indicator.detail_href
    ? `${indicator.detail_href}${queryString ? `?${queryString}` : ""}`
    : null;
  const value =
    indicator.value == null
      ? "No calculable"
      : `${new Intl.NumberFormat("es-NI", { maximumFractionDigits: 2 }).format(indicator.value)}${
          indicator.unit === "%" ? "%" : ""
        }`;

  return (
    <section className="rounded border border-slate-200 bg-white p-4 shadow-sm" title={indicator.formula ?? undefined}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{indicator.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <DataQualityBadge quality={indicator.quality} />
      </div>
      <div className="mt-3 grid gap-1 text-xs text-slate-600">
        <span>Periodo: {indicator.period}</span>
        {indicator.numerator != null && indicator.denominator != null && (
          <span>
            Base: {indicator.numerator}/{indicator.denominator}
          </span>
        )}
        {indicator.coverage != null && <span>Cobertura: {Math.round(indicator.coverage * 100)}%</span>}
      </div>
      <p className="mt-3 min-h-10 text-sm text-slate-600">{indicator.unavailable_reason ?? indicator.explanation}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{statusLabel(indicator.status)}</span>
        {detailHref && (
          <Link href={detailHref} className="text-sm font-semibold text-institutional-primary hover:underline">
            Ver detalle
          </Link>
        )}
      </div>
    </section>
  );
}

function statusLabel(status: AnalyticsIndicator["status"]) {
  const labels = {
    exact: "Exacto",
    derived: "Derivado",
    estimated: "Estimado",
    not_available: "No disponible"
  };
  return labels[status];
}
