"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart, Area,
  BarChart, Bar,
  ComposedChart, Line,
  PieChart, Pie, Cell,
  Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Periodo {
  ANO_DEL_PERIODO: number;
  NUMERO_DEL_PERIODO: number;
  FECHA_INICIO: string;
  FECHA_FIN: string;
}
interface TipoInventario {
  CODIGO_TIPO_INVENTARIO: string;
  DESCRIPCION: string;
  ABREVIATURA: string;
}
interface ResumenFinanciero {
  TOTAL_FACTURAS: number;
  TOTAL_VENTAS: number;
  TOTAL_VENTAS_NETAS: number;
  TOTAL_IMPUESTO: number;
  TOTAL_DESCUENTO: number;
  TICKET_PROMEDIO: number;
  VENTA_MAXIMA: number;
  VENTA_MINIMA: number;
}
interface TendenciaDia {
  FECHA: string;
  TOTAL_FACTURAS: number;
  TOTAL_VENTAS: number;
  TICKET_PROMEDIO: number;
}
interface VentaVendedor {
  VENDEDOR_CODIGO_BIC: string;
  VENDEDOR: string;
  TOTAL_FACTURAS: number;
  TOTAL_VENTAS: number;
  TICKET_PROMEDIO: number;
}
interface VentaBodega {
  CODIGO_DE_BODEGA: string;
  NOMBRE_DE_BODEGA: string;
  TOTAL_FACTURAS: number;
  TOTAL_VENTAS: number;
}
interface VentaPV {
  PUNTO_DE_VENTA_CODIGO_BIC: string;
  DESCRIPCION_PUNTO_VENTA: string;
  TOTAL_FACTURAS: number;
  TOTAL_VENTAS: number;
  TOTAL_IMPUESTO: number;
  TOTAL_DESCUENTO: number;
  TICKET_PROMEDIO: number;
}
interface ArticuloVendido {
  CODIGO_DE_ARTICULO: string;
  NOMBRE_DEL_ARTICULO: string;
  CANTIDAD_TOTAL: number;
  TOTAL_VENTAS: number;
}
interface ArticuloRotacion {
  CODIGO_DE_ARTICULO: string;
  NOMBRE_DEL_ARTICULO: string;
  FRECUENCIA_VENTAS: number;
  UNIDADES_VENDIDAS: number;
}
interface ArticuloSinMovimiento {
  CODIGO_DE_ARTICULO: string;
  NOMBRE_DEL_ARTICULO: string;
  NOMBRE_DE_BODEGA: string;
  SALDO_ACTUAL: number;
}
interface StockBajoItem {
  CODIGO_DE_ARTICULO: string;
  NOMBRE_DEL_ARTICULO: string;
  NOMBRE_DE_BODEGA: string;
  SALDO_ACTUAL: number;
}
interface TopCliente {
  CODIGO_BIC: string;
  CLIENTE: string;
  TOTAL_COMPRADO: number;
  TOTAL_NETO: number;
  TICKET_PROMEDIO: number;
  TOTAL_FACTURAS: number;
}
interface FacturaCliente {
  NUMFACTURA: number;
  FECHA_DE_FACTURA: string;
  CODIGO_BIC: string;
  CLIENTE: string;
  TOTAL_DE_FACTURA: number;
}
interface FrecuenciaCliente {
  CODIGO_BIC: string;
  CLIENTE: string;
  TOTAL_FACTURAS: number;
  TOTAL_COMPRADO: number;
  TICKET_PROMEDIO: number;
  PRIMERA_COMPRA: string;
  ULTIMA_COMPRA: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function periodoLabel(p: Periodo) {
  if (p.NUMERO_DEL_PERIODO === 13) return `Cierre ${p.ANO_DEL_PERIODO}`;
  const mes = MESES[p.NUMERO_DEL_PERIODO - 1];
  return mes ? `${mes} ${p.ANO_DEL_PERIODO}` : `Período ${p.NUMERO_DEL_PERIODO} - ${p.ANO_DEL_PERIODO}`;
}

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("es-HN");
}
function shortName(name: string | undefined | null, max = 22) {
  if (!name) return "";
  return name.length > max ? name.slice(0, max) + "…" : name;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
}
function toArr<T>(r: unknown): T[] {
  if (!r || typeof r !== "object") return [];
  if (Array.isArray(r)) return r as T[];
  const obj = r as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as T[];
  return ((obj.value ?? []) as T[]);
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex gap-2">
          <span>{p.name}:</span>
          <span className="font-mono font-semibold">{typeof p.value === "number" ? fmt(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Widget hook — each widget fetches independently ─────────────────────────

function useStatWidget<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [ms, setMs] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const start = performance.now();
    fetch(url, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(d => {
        setMs(Math.round(performance.now() - start));
        setData(d);
      })
      .catch(e => {
        if (e.name === "AbortError") return;
        setMs(Math.round(performance.now() - start));
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url]);

  return { data, loading, ms, error };
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

function MsBadge({ loading, ms, error }: { loading: boolean; ms: number | null; error: boolean }) {
  if (loading) {
    return (
      <svg className="animate-spin h-3.5 w-3.5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    );
  }
  if (error) return <span className="text-[10px] text-red-500 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded-full">Error</span>;
  if (ms === null) return null;
  const cls = ms > 3000
    ? "bg-red-50 text-red-600 border-red-200"
    : ms > 1000
    ? "bg-yellow-50 text-yellow-600 border-yellow-200"
    : "bg-green-50 text-green-600 border-green-200";
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${cls}`}>{ms}ms</span>;
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500 cursor-help transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-gray-800 text-white text-[11px] leading-snug px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 text-left">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
  );
}

function WidgetCard({
  title, loading, ms, error, children, className, controls, info,
}: {
  title: string;
  loading: boolean;
  ms: number | null;
  error: boolean;
  children: React.ReactNode;
  className?: string;
  controls?: React.ReactNode;
  info?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{title}</h2>
          {info && <InfoTooltip text={info} />}
          <MsBadge loading={loading} ms={ms} error={error} />
        </div>
        {controls && <div className="flex items-center gap-2 flex-wrap">{controls}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyOrSkeleton({ loading, height = "h-60" }: { loading: boolean; height?: string }) {
  if (loading) return <Skeleton className={height} />;
  return <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, number, prefix, bar, iconBg, iconFg, numColor, icon,
}: {
  label: string;
  number: string;
  prefix?: string;
  bar: string;
  iconBg: string;
  iconFg: string;
  numColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[108px]">
      <div className="flex items-start justify-between px-4 pt-3.5 pb-0 gap-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-snug">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconFg}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1 px-4 pb-3.5 mt-auto">
        {prefix && <span className={`text-xs font-bold ${numColor} opacity-50 tracking-tight`}>{prefix}</span>}
        <span className={`text-[22px] font-extrabold font-mono ${numColor} leading-none tracking-tight`}>{number}</span>
      </div>
      <div className={`h-[3px] ${bar} flex-shrink-0`} />
    </div>
  );
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

function ResumenWidget({ slug, query }: { slug: string; query: string | null }) {
  const url = query !== null ? `/api/stats/${slug}/resumen-financiero?${query}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<ResumenFinanciero>(url);

  const iconFacturas = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
  const iconVentas = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>;
  const iconTag = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;
  const iconDiscount = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a2 2 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 001.414 1.414l3-3zm.586 6a1 1 0 10-1.414 1.414l3-3a1 1 0 10-1.414-1.414l-3 3z" clipRule="evenodd" /></svg>;
  const iconBar = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>;
  const iconUp = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
  const iconDown = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
  const iconNet = <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Resumen financiero</h2>
        <MsBadge loading={loading} ms={ms} error={error} />
      </div>
      {raw ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total facturas"  number={fmtInt(raw.TOTAL_FACTURAS)}              bar="bg-blue-500"    iconBg="bg-blue-50"    iconFg="text-blue-500"    numColor="text-blue-700"    icon={iconFacturas} />
            <KpiCard label="Ventas brutas"   number={fmt(raw.TOTAL_VENTAS)}    prefix="L"    bar="bg-green-500"   iconBg="bg-green-50"   iconFg="text-green-600"   numColor="text-green-700"   icon={iconVentas} />
            <KpiCard label="Ventas netas"    number={fmt(raw.TOTAL_VENTAS_NETAS)} prefix="L" bar="bg-teal-500"    iconBg="bg-teal-50"    iconFg="text-teal-600"    numColor="text-teal-700"    icon={iconNet} />
            <KpiCard label="Descuentos"      number={fmt(raw.TOTAL_DESCUENTO)} prefix="L"    bar="bg-purple-500"  iconBg="bg-purple-50"  iconFg="text-purple-500"  numColor="text-purple-600"  icon={iconDiscount} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Impuestos (ISV)" number={fmt(raw.TOTAL_IMPUESTO)}  prefix="L"   bar="bg-orange-500"  iconBg="bg-orange-50"  iconFg="text-orange-500"  numColor="text-orange-600"  icon={iconTag} />
            <KpiCard label="Factura promedio" number={fmt(raw.TICKET_PROMEDIO)} prefix="L"  bar="bg-sky-500"     iconBg="bg-sky-50"     iconFg="text-sky-500"     numColor="text-sky-700"     icon={iconBar} />
            <KpiCard label="Factura máxima"  number={fmt(raw.VENTA_MAXIMA)}    prefix="L"   bar="bg-emerald-500" iconBg="bg-emerald-50" iconFg="text-emerald-600" numColor="text-emerald-700" icon={iconUp} />
            <KpiCard label="Factura mínima"  number={fmt(raw.VENTA_MINIMA)}    prefix="L"   bar="bg-gray-400"    iconBg="bg-gray-100"   iconFg="text-gray-500"   numColor="text-gray-600"    icon={iconDown} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px]" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px]" />)}
          </div>
        </div>
      )}
    </section>
  );
}

function TendenciaWidget({ slug, query }: { slug: string; query: string | null }) {
  const url = query !== null ? `/api/stats/${slug}/tendencia-diaria?${query}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const chartData = toArr<TendenciaDia>(raw).map(d => ({
    fecha: fmtDate(d.FECHA),
    Ventas: d.TOTAL_VENTAS,
    Facturas: d.TOTAL_FACTURAS,
  }));
  return (
    <WidgetCard title="Tendencia diaria" loading={loading} ms={ms} error={error} info="Evolución día a día del monto total de ventas y número de facturas emitidas en el período seleccionado.">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `L${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Ventas" stroke="#3b82f6" fill="url(#gradVentas)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : <EmptyOrSkeleton loading={loading} />}
    </WidgetCard>
  );
}

function VendedoresWidget({ slug, query }: { slug: string; query: string | null }) {
  const url = query !== null ? `/api/stats/${slug}/ventas-por-vendedor?${query}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const rows = toArr<VentaVendedor>(raw);
  const maxVentas = rows.reduce((m, v) => Math.max(m, v.TOTAL_VENTAS), 0);
  const totalVentas = rows.reduce((s, v) => s + v.TOTAL_VENTAS, 0);
  return (
    <WidgetCard title="Ventas por vendedor" loading={loading} ms={ms} error={error} info="Comparativa del monto facturado y factura promedio por cada vendedor. Permite identificar el rendimiento individual del equipo de ventas.">
      {rows.length > 0 ? (
        <div className="overflow-auto max-h-72">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-500">Vendedor</th>
                <th className="py-2 w-[30%]"></th>
                <th className="text-right py-2 font-semibold text-gray-500 pr-3">Ventas</th>
                <th className="text-right py-2 font-semibold text-gray-500">Fact. prom.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v, i) => {
                const pct = maxVentas > 0 ? (v.TOTAL_VENTAS / maxVentas) * 100 : 0;
                const share = totalVentas > 0 ? (v.TOTAL_VENTAS / totalVentas) * 100 : 0;
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 text-gray-700 pr-3 truncate max-w-0" title={v.VENDEDOR}>
                      <span className="block truncate">{v.VENDEDOR}</span>
                      <span className="text-gray-400 tabular-nums">{share.toFixed(1)}%</span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-blue-700 whitespace-nowrap pr-3">L {fmt(v.TOTAL_VENTAS)}</td>
                    <td className="py-2 text-right font-mono text-gray-500 whitespace-nowrap">L {fmt(v.TICKET_PROMEDIO)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyOrSkeleton loading={loading} />}
    </WidgetCard>
  );
}

function BodegasWidget({ slug, query }: { slug: string; query: string | null }) {
  const url = query !== null ? `/api/stats/${slug}/ventas-por-bodega?${query}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const rows = toArr<VentaBodega>(raw);
  const max = rows.reduce((m, b) => Math.max(m, b.TOTAL_VENTAS), 0);
  return (
    <WidgetCard title="Ventas por bodega" loading={loading} ms={ms} error={error} className="xl:col-span-2" info="Distribución del total facturado por bodega o punto de despacho. Ayuda a identificar qué bodegas concentran más volumen de ventas.">
      {rows.length > 0 ? (
        <div className="overflow-auto max-h-72">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-500 w-[38%]">Bodega</th>
                <th className="py-2 w-[42%]"></th>
                <th className="text-right py-2 font-semibold text-gray-500 pr-1">Ventas</th>
                <th className="text-right py-2 font-semibold text-gray-500">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => {
                const pct = max > 0 ? (b.TOTAL_VENTAS / max) * 100 : 0;
                const totalPct = rows.reduce((s, r) => s + r.TOTAL_VENTAS, 0);
                const sharePct = totalPct > 0 ? (b.TOTAL_VENTAS / totalPct) * 100 : 0;
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 text-gray-700 pr-3 truncate max-w-0" title={b.NOMBRE_DE_BODEGA}>
                      {b.NOMBRE_DE_BODEGA}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono text-gray-700 whitespace-nowrap pr-3">L {fmt(b.TOTAL_VENTAS)}</td>
                    <td className="py-2 text-right font-mono text-gray-400 whitespace-nowrap">{sharePct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyOrSkeleton loading={loading} height="h-52" />}
    </WidgetCard>
  );
}

function PuntoVentaWidget({ slug, query }: { slug: string; query: string | null }) {
  const url = query !== null ? `/api/stats/${slug}/ventas-por-punto-de-venta?${query}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const chartData = toArr<VentaPV>(raw).map((pv, i) => ({
    name: shortName(pv.DESCRIPCION_PUNTO_VENTA ?? pv.PUNTO_DE_VENTA_CODIGO_BIC, 24),
    fullName: pv.DESCRIPCION_PUNTO_VENTA ?? pv.PUNTO_DE_VENTA_CODIGO_BIC,
    value: pv.TOTAL_VENTAS,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  return (
    <WidgetCard title="Punto de venta" loading={loading} ms={ms} error={error} info="Comparativa de ventas, impuesto y descuento por cada punto de venta. Útil para evaluar el desempeño por canal o sucursal.">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
              dataKey="value" nameKey="name">
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              formatter={(v, _name, props) =>
                [`L ${fmt(Number(v))}`, (props.payload as { fullName?: string } | undefined)?.fullName ?? String(_name)]
              }
            />
            <Legend
              formatter={(_value, entry: { payload?: { name?: string } }) =>
                <span style={{ fontSize: 11 }}>{entry.payload?.name ?? _value}</span>
              }
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : <EmptyOrSkeleton loading={loading} height="h-52" />}
    </WidgetCard>
  );
}

function TreemapCell(props: {
  x?: number; y?: number; width?: number; height?: number;
  size?: number; fill?: string; depth?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, size, fill = "#8b5cf6", depth } = props;
  if (!depth || width < 4 || height < 4) return <g />;
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={fill} rx={4} stroke="#fff" strokeWidth={2} />
      {width > 32 && height > 24 && (
        <text
          x={x + width / 2} y={y + height / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.95)" fontSize={Math.min(13, Math.max(9, width / 6))} fontWeight={700}
        >
          {size}
        </text>
      )}
    </g>
  );
}

function TreemapTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: { name: string; fullName: string; size: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{d.fullName ?? d.name}</p>
      <p className="text-purple-600 font-mono font-semibold">{d.size} unidades</p>
    </div>
  );
}

function MasVendidosWidget({ slug, query }: { slug: string; query: string | null }) {
  const [topN, setTopN] = useState(10);
  const url = query !== null ? `/api/stats/${slug}/articulos-mas-vendidos?${query}&limit=${topN}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const chartData = toArr<ArticuloVendido>(raw).map((a, i) => ({
    name: shortName(a.NOMBRE_DEL_ARTICULO, 32),
    fullName: a.NOMBRE_DEL_ARTICULO,
    size: a.CANTIDAD_TOTAL,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));
  const topNControls = (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400">Top:</span>
      {[5, 10, 20].map(n => (
        <button key={n} onClick={() => setTopN(n)}
          className={`w-7 h-6 rounded text-xs font-semibold transition-colors ${topN === n ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {n}
        </button>
      ))}
    </div>
  );
  return (
    <WidgetCard title={`Top ${topN} más vendidos`} loading={loading} ms={ms} error={error} info="Artículos con mayor monto total facturado en el período. El tamaño de cada bloque es proporcional al ingreso generado por ese artículo." controls={topNControls}>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <Treemap
            data={chartData}
            dataKey="size"
            aspectRatio={4 / 3}
            content={<TreemapCell />}
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      ) : <EmptyOrSkeleton loading={loading} height="h-64" />}
    </WidgetCard>
  );
}

function RotacionWidget({ slug, query }: { slug: string; query: string | null }) {
  const [topN, setTopN] = useState(10);
  const url = query !== null ? `/api/stats/${slug}/rotacion?${query}&limit=${topN}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const chartData = toArr<ArticuloRotacion>(raw).map(a => ({
    name: shortName(a.NOMBRE_DEL_ARTICULO, 28),
    Frecuencia: a.FRECUENCIA_VENTAS,
  }));
  const topNControls = (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400">Top:</span>
      {[5, 10, 20].map(n => (
        <button key={n} onClick={() => setTopN(n)}
          className={`w-7 h-6 rounded text-xs font-semibold transition-colors ${topN === n ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {n}
        </button>
      ))}
    </div>
  );
  return (
    <WidgetCard title={`Top ${topN} rotación`} loading={loading} ms={ms} error={error} info="Artículos que aparecen en más facturas distintas. Mide la frecuencia de venta independientemente del monto, indicando qué productos se piden con más regularidad." controls={topNControls}>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(200, topN * 32)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={185} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Frecuencia" fill="#ec4899" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyOrSkeleton loading={loading} height="h-64" />}
    </WidgetCard>
  );
}

function StockBajoWidget({ slug, ano }: { slug: string; ano: number | null }) {
  const [umbral, setUmbral] = useState(5);
  const [umbralInput, setUmbralInput] = useState("5");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = ano !== null ? `/api/stats/${slug}/stock-bajo?umbral=${umbral}&ano=${ano}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const items = toArr<StockBajoItem>(raw);

  return (
    <WidgetCard
      title="Stock bajo"
      loading={loading}
      ms={ms}
      error={error}
      info="Artículos cuyo saldo de inventario está en o por debajo del umbral configurado. Permite detectar riesgos de quiebre de stock."
      controls={
        <>
          <label className="text-xs text-gray-500">Umbral ≤</label>
          <input
            type="number"
            min={0}
            value={umbralInput}
            onChange={(e) => {
              setUmbralInput(e.target.value);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 0) setUmbral(v);
              }, 600);
            }}
            className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
          />
          <span className="text-xs text-gray-400">uds.</span>
        </>
      }
    >
      <div className="overflow-auto max-h-72">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-500">Código</th>
              <th className="text-left py-2 font-semibold text-gray-500">Artículo</th>
              <th className="text-left py-2 font-semibold text-gray-500">Bodega</th>
              <th className="text-right py-2 font-semibold text-gray-500">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-1.5 font-mono text-gray-500">{s.CODIGO_DE_ARTICULO}</td>
                <td className="py-1.5 text-gray-700 max-w-[160px] truncate">{s.NOMBRE_DEL_ARTICULO}</td>
                <td className="py-1.5 text-gray-500 max-w-[120px] truncate">{s.NOMBRE_DE_BODEGA}</td>
                <td className={`py-1.5 text-right font-mono font-semibold ${s.SALDO_ACTUAL <= 0 ? "text-red-600" : s.SALDO_ACTUAL <= 2 ? "text-orange-500" : "text-yellow-600"}`}>
                  {s.SALDO_ACTUAL}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-400">Sin artículos bajo el umbral</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}

function TopClientesWidget({ slug, query }: { slug: string; query: string | null }) {
  const url = query !== null ? `/api/stats/${slug}/top-clientes?${query}&limit=5` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const rows = toArr<TopCliente>(raw);
  const maxComprado = rows.reduce((m, c) => Math.max(m, c.TOTAL_COMPRADO), 0);
  const totalComprado = rows.reduce((s, c) => s + c.TOTAL_COMPRADO, 0);
  return (
    <WidgetCard
      title="Top 5 clientes por monto"
      loading={loading} ms={ms} error={error}
      info="Los 5 clientes que más dinero han aportado en el período. La barra muestra su peso relativo respecto al cliente con mayor compra."
    >
      {rows.length > 0 ? (
        <div className="overflow-auto max-h-72">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-500">Cliente</th>
                <th className="py-2 w-[28%]"></th>
                <th className="text-right py-2 font-semibold text-gray-500 pr-3">Total</th>
                <th className="text-right py-2 font-semibold text-gray-500">Fact. prom.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const pct = maxComprado > 0 ? (c.TOTAL_COMPRADO / maxComprado) * 100 : 0;
                const share = totalComprado > 0 ? (c.TOTAL_COMPRADO / totalComprado) * 100 : 0;
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 text-gray-700 pr-3 truncate max-w-0" title={c.CLIENTE}>
                      <span className="block truncate">{c.CLIENTE}</span>
                      <span className="text-gray-400 tabular-nums">{c.TOTAL_FACTURAS} fact. · {share.toFixed(1)}%</span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-indigo-700 whitespace-nowrap pr-3">L {fmt(c.TOTAL_COMPRADO)}</td>
                    <td className="py-2 text-right font-mono text-gray-500 whitespace-nowrap">L {fmt(c.TICKET_PROMEDIO)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyOrSkeleton loading={loading} height="h-52" />}
    </WidgetCard>
  );
}

function FrecuenciaClientesWidget({ slug, query }: { slug: string; query: string | null }) {
  const url = query !== null ? `/api/stats/${slug}/facturas-por-cliente?${query}` : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);

  // Aggregate raw invoices → top 5 clients by frequency
  const rows: FrecuenciaCliente[] = useMemo(() => {
    const facturas = toArr<FacturaCliente>(raw);
    const map = new Map<string, FrecuenciaCliente>();
    for (const f of facturas) {
      const key = f.CODIGO_BIC;
      const existing = map.get(key);
      if (existing) {
        existing.TOTAL_FACTURAS += 1;
        existing.TOTAL_COMPRADO += f.TOTAL_DE_FACTURA;
        if (f.FECHA_DE_FACTURA < existing.PRIMERA_COMPRA) existing.PRIMERA_COMPRA = f.FECHA_DE_FACTURA;
        if (f.FECHA_DE_FACTURA > existing.ULTIMA_COMPRA) existing.ULTIMA_COMPRA = f.FECHA_DE_FACTURA;
        existing.TICKET_PROMEDIO = existing.TOTAL_COMPRADO / existing.TOTAL_FACTURAS;
      } else {
        map.set(key, {
          CODIGO_BIC: f.CODIGO_BIC,
          CLIENTE: f.CLIENTE,
          TOTAL_FACTURAS: 1,
          TOTAL_COMPRADO: f.TOTAL_DE_FACTURA,
          TICKET_PROMEDIO: f.TOTAL_DE_FACTURA,
          PRIMERA_COMPRA: f.FECHA_DE_FACTURA,
          ULTIMA_COMPRA: f.FECHA_DE_FACTURA,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.TOTAL_FACTURAS - a.TOTAL_FACTURAS)
      .slice(0, 5);
  }, [raw]);

  const maxFacturas = rows.reduce((m, c) => Math.max(m, c.TOTAL_FACTURAS), 0);
  function fmtCompact(iso: string) {
    const d = new Date(iso);
    return `${d.getUTCDate().toString().padStart(2,"0")}/${(d.getUTCMonth()+1).toString().padStart(2,"0")}/${d.getUTCFullYear()}`;
  }
  return (
    <WidgetCard
      title="Top 5 clientes por frecuencia"
      loading={loading} ms={ms} error={error}
      info="Los 5 clientes que más facturas generaron en el período. Indica fidelidad y recurrencia de compra independientemente del monto."
    >
      {rows.length > 0 ? (
        <div className="overflow-auto max-h-72">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-500">Cliente</th>
                <th className="py-2 w-[24%]"></th>
                <th className="text-right py-2 font-semibold text-gray-500 pr-3">Facturas</th>
                <th className="text-right py-2 font-semibold text-gray-500">Última compra</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const pct = maxFacturas > 0 ? (c.TOTAL_FACTURAS / maxFacturas) * 100 : 0;
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 text-gray-700 pr-3 truncate max-w-0" title={c.CLIENTE}>
                      <span className="block truncate">{c.CLIENTE}</span>
                      <span className="text-gray-400">L {fmt(c.TOTAL_COMPRADO)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-pink-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-pink-700 whitespace-nowrap pr-3">{fmtInt(c.TOTAL_FACTURAS)}</td>
                    <td className="py-2 text-right font-mono text-gray-500 whitespace-nowrap">{fmtCompact(c.ULTIMA_COMPRA)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyOrSkeleton loading={loading} height="h-52" />}
    </WidgetCard>
  );
}

function SinMovimientoWidget({ slug, query, tiposInventario }: { slug: string; query: string | null; tiposInventario: TipoInventario[] }) {
  const [tipoInv, setTipoInv] = useState("");
  const [limit, setLimit] = useState(100);

  const url = query !== null
    ? `/api/stats/${slug}/articulos-sin-movimiento?${query}&limit=${limit}${tipoInv ? `&tipoInventario=${tipoInv}` : ""}`
    : null;
  const { data: raw, loading, ms, error } = useStatWidget<unknown>(url);
  const items = toArr<ArticuloSinMovimiento>(raw);
  const total = (raw as { Count?: number; count?: number; data?: unknown[] } | null)?.Count
    ?? (raw as { Count?: number; count?: number; data?: unknown[] } | null)?.count
    ?? items.length;

  return (
    <WidgetCard
      title="Sin movimiento"
      loading={loading}
      ms={ms}
      error={error}
      info="Artículos que no registraron ninguna venta durante el período seleccionado. Útil para detectar inventario inactivo o productos estancados."
      controls={
        <>
          {total > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              {fmtInt(total)}
            </span>
          )}
          <select
            value={tipoInv}
            onChange={(e) => setTipoInv(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los tipos</option>
            {tiposInventario.map(t => (
              <option key={t.CODIGO_TIPO_INVENTARIO} value={t.CODIGO_TIPO_INVENTARIO}>
                {t.ABREVIATURA} — {t.DESCRIPCION}
              </option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {[50, 100, 200, 500].map(n => <option key={n} value={n}>Mostrar {n}</option>)}
          </select>
        </>
      }
    >
      <div className="overflow-auto max-h-72">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-500">Código</th>
              <th className="text-left py-2 font-semibold text-gray-500">Artículo</th>
              <th className="text-left py-2 font-semibold text-gray-500">Bodega</th>
              <th className="text-right py-2 font-semibold text-gray-500">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-1.5 font-mono text-gray-500">{s.CODIGO_DE_ARTICULO}</td>
                <td className="py-1.5 text-gray-700 max-w-[160px] truncate">{s.NOMBRE_DEL_ARTICULO}</td>
                <td className="py-1.5 text-gray-500 max-w-[120px] truncate">{s.NOMBRE_DE_BODEGA}</td>
                <td className="py-1.5 text-right font-mono text-gray-600">{fmtInt(s.SALDO_ACTUAL)}</td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={4} className="py-6 text-center text-gray-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  type FilterMode = "periodo" | "custom";
  const [filterMode, setFilterMode] = useState<FilterMode>("periodo");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<Periodo | null>(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tiposInventario, setTiposInventario] = useState<TipoInventario[]>([]);
  const [mounted, setMounted] = useState(false);

  // Session info (from readable cookie)
  const [companyName, setCompanyName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [multipleCompanies, setMultipleCompanies] = useState(false);

  type StatTab = "resumen" | "ventas" | "articulos" | "clientes" | "inventario";
  const ALL_TABS: { id: StatTab; label: string }[] = [
    { id: "resumen",    label: "Resumen" },
    { id: "ventas",     label: "Ventas" },
    { id: "articulos",  label: "Artículos" },
    { id: "clientes",   label: "Clientes" },
    { id: "inventario", label: "Inventario" },
  ];
  const [allowedTabs, setAllowedTabs] = useState<StatTab[] | null>(null);
  const [statTab, setStatTab] = useState<StatTab>("resumen");

  const query: string | null =
    filterMode === "periodo"
      ? selectedPeriodo
        ? `ano=${selectedPeriodo.ANO_DEL_PERIODO}&periodo=${selectedPeriodo.NUMERO_DEL_PERIODO}`
        : null
      : [
          fechaDesde && `fechaDesde=${fechaDesde}`,
          fechaHasta && `fechaHasta=${fechaHasta}`,
        ]
          .filter(Boolean)
          .join("&") || "";

  // Read session cookie on mount
  useEffect(() => {
    setMounted(true);
    try {
      const match = document.cookie.match(/(?:^|;\s*)portal_session=([^;]+)/);
      if (match) {
        const decoded = JSON.parse(atob(decodeURIComponent(match[1])));
        const companies = decoded.companies as { slug: string; name: string }[] | undefined;
        const company = companies?.find(c => c.slug === slug);
        setCompanyName(company?.name ?? slug);
        setUserName(decoded.user?.name ?? "");
        setMultipleCompanies((companies?.length ?? 0) > 1);
      }
    } catch {
      // unable to read session; middleware will handle re-auth
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/stats/${slug}/periodos-contables`).then(r => r.json()),
      fetch(`/api/stats/${slug}/articulos/filtros`).then(r => r.json()),
      fetch(`/api/stats/${slug}/tabs`).then(r => r.ok ? r.json() : null),
    ]).then(([periodoData, filtrosData, tabsData]) => {
      const arr: Periodo[] = Array.isArray(periodoData) ? periodoData : periodoData.value ?? [];
      setPeriodos(arr);
      if (arr.length > 0) setSelectedPeriodo(arr[0]);
      setTiposInventario(filtrosData.tiposInventario ?? []);

      const tabs: StatTab[] = Array.isArray(tabsData) && tabsData.length > 0
        ? tabsData as StatTab[]
        : ["resumen", "ventas", "articulos", "clientes", "inventario"];
      setAllowedTabs(tabs);
      if (!tabs.includes("resumen")) setStatTab(tabs[0]);
    }).catch(() => {
      setAllowedTabs(["resumen", "ventas", "articulos", "clientes", "inventario"]);
    });
  }, [slug]);

  const periodosByYear = periodos.reduce<Record<number, Periodo[]>>((acc, p) => {
    (acc[p.ANO_DEL_PERIODO] ||= []).push(p);
    return acc;
  }, {});
  const years = Object.keys(periodosByYear).map(Number).sort((a, b) => b - a);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!mounted) return <div className="min-h-screen bg-gray-100" />;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        {/* Brand */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-700 hidden sm:block">SODISA Portal</span>
        </div>

        {/* Company breadcrumb */}
        {multipleCompanies && (
          <Link href="/companies" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Empresas
          </Link>
        )}

        <h1 className="text-base font-bold text-blue-700 flex-1 truncate">
          {companyName || slug}
        </h1>

        {/* User + logout */}
        <div className="flex items-center gap-3 ml-auto">
          {userName && (
            <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[140px]">{userName}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* ── Global filter bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-5">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setFilterMode("periodo")}
            className={`px-3 py-1.5 transition-colors ${filterMode === "periodo" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            Período contable
          </button>
          <button
            onClick={() => setFilterMode("custom")}
            className={`px-3 py-1.5 border-l border-gray-300 transition-colors ${filterMode === "custom" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            Personalizado
          </button>
        </div>

        {filterMode === "periodo" && (
          <select
            value={selectedPeriodo ? `${selectedPeriodo.ANO_DEL_PERIODO}-${selectedPeriodo.NUMERO_DEL_PERIODO}` : ""}
            onChange={(e) => {
              const found = periodos.find(p => `${p.ANO_DEL_PERIODO}-${p.NUMERO_DEL_PERIODO}` === e.target.value);
              if (found) setSelectedPeriodo(found);
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
          >
            {years.map(year => (
              <optgroup key={year} label={String(year)}>
                {periodosByYear[year].map(p => (
                  <option key={`${p.ANO_DEL_PERIODO}-${p.NUMERO_DEL_PERIODO}`} value={`${p.ANO_DEL_PERIODO}-${p.NUMERO_DEL_PERIODO}`}>
                    {periodoLabel(p)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {filterMode === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        )}
      </div>

      {/* ── Stat Tabs ── */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 overflow-x-auto">
        {ALL_TABS.filter(t => !allowedTabs || allowedTabs.includes(t.id)).map(t => (
          <button
            key={t.id}
            onClick={() => setStatTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              statTab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <main className="p-6 space-y-6">
        {statTab === "resumen" && (
          <>
            <ResumenWidget slug={slug} query={query} />
            <TendenciaWidget slug={slug} query={query} />
          </>
        )}

        {statTab === "ventas" && (
          <>
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <VendedoresWidget slug={slug} query={query} />
              <PuntoVentaWidget slug={slug} query={query} />
            </section>
            <BodegasWidget slug={slug} query={query} />
          </>
        )}

        {statTab === "articulos" && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MasVendidosWidget slug={slug} query={query} />
            <RotacionWidget slug={slug} query={query} />
          </section>
        )}

        {statTab === "clientes" && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TopClientesWidget slug={slug} query={query} />
            <FrecuenciaClientesWidget slug={slug} query={query} />
          </section>
        )}

        {statTab === "inventario" && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <StockBajoWidget slug={slug} ano={selectedPeriodo?.ANO_DEL_PERIODO ?? null} />
            <SinMovimientoWidget slug={slug} query={query} tiposInventario={tiposInventario} />
          </section>
        )}
      </main>
    </div>
  );
}
