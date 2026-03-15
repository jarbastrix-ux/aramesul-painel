import { useEffect, useState } from "react";
import {
  DollarSign,
  FileText,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getList, getCount } from "../lib/erpnext";
import type { ERPFilter } from "../lib/erpnext";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${lastDay}`,
  };
}

// ---------------------------------------------------------------------------
// Componente KPI Card
// ---------------------------------------------------------------------------

function KPICard({ data }: { data: KPIData }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">{data.label}</p>
          <p className="text-2xl font-bold text-text-primary">{data.value}</p>
          <div className="flex items-center gap-1.5">
            {data.trend === "up" && (
              <TrendingUp size={14} className="text-success" />
            )}
            {data.trend === "down" && (
              <TrendingDown size={14} className="text-danger" />
            )}
            <span className="text-xs text-text-secondary">{data.subtitle}</span>
          </div>
        </div>
        <div
          className="flex items-center justify-center w-11 h-11 rounded-lg"
          style={{ backgroundColor: `${data.color}15`, color: data.color }}
        >
          {data.icon}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente Skeleton
// ---------------------------------------------------------------------------

function KPICardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-24 bg-border rounded" />
          <div className="h-7 w-32 bg-border rounded" />
          <div className="h-3 w-20 bg-border rounded" />
        </div>
        <div className="w-11 h-11 bg-border rounded-lg" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKPIs() {
      setLoading(true);
      setError(null);

      try {
        const { start, end } = getMonthRange();

        const dateFilter: ERPFilter[] = [
          ["posting_date", ">=", start],
          ["posting_date", "<=", end],
          ["docstatus", "=", 1],
        ];

        // Buscar dados em paralelo
        const [invoices, nfCount, openOrders, receivables] = await Promise.all([
          // 1. Faturamento do mês — soma de Sales Invoice
          getList<{ grand_total: number }>({
            doctype: "Sales Invoice",
            fields: ["grand_total"],
            filters: dateFilter,
            limitPageLength: 0,
          }).catch(() => [] as { grand_total: number }[]),

          // 2. NFs emitidas no mês
          getCount("Sales Invoice", dateFilter).catch(() => 0),

          // 3. Pedidos abertos (Sales Order com status != Completed/Cancelled)
          getCount("Sales Order", [
            ["docstatus", "=", 1],
            ["status", "not in", "Completed,Cancelled,Closed"],
          ]).catch(() => 0),

          // 4. A Receber — Sales Invoice não paga
          getList<{ outstanding_amount: number }>({
            doctype: "Sales Invoice",
            fields: ["outstanding_amount"],
            filters: [
              ["docstatus", "=", 1],
              ["outstanding_amount", ">", 0],
            ],
            limitPageLength: 0,
          }).catch(() => [] as { outstanding_amount: number }[]),
        ]);

        const totalFaturamento = invoices.reduce(
          (sum, inv) => sum + (inv.grand_total || 0),
          0
        );

        const totalAReceber = receivables.reduce(
          (sum, inv) => sum + (inv.outstanding_amount || 0),
          0
        );

        setKpis([
          {
            label: "Faturamento Mês",
            value: formatBRL(totalFaturamento),
            subtitle: `${start.slice(0, 7)} — ${invoices.length} notas`,
            icon: <DollarSign size={22} />,
            trend: totalFaturamento > 0 ? "up" : "neutral",
            color: "#10B981",
          },
          {
            label: "NFs Emitidas",
            value: String(nfCount),
            subtitle: "Mês corrente",
            icon: <FileText size={22} />,
            trend: "neutral",
            color: "#3B82F6",
          },
          {
            label: "Pedidos Abertos",
            value: String(openOrders),
            subtitle: "Aguardando processamento",
            icon: <ShoppingBag size={22} />,
            trend: openOrders > 10 ? "down" : "neutral",
            color: "#F59E0B",
          },
          {
            label: "A Receber",
            value: formatBRL(totalAReceber),
            subtitle: `${receivables.length} títulos em aberto`,
            icon: <CreditCard size={22} />,
            trend: totalAReceber > 0 ? "down" : "up",
            color: "#EF4444",
          },
        ]);
      } catch (err) {
        console.error("[Dashboard] Erro ao buscar KPIs:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao conectar com ERPNext2"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchKPIs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Bom dia, Jarbas
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Visão geral da operação Aramesul Metalúrgica
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle size={18} />
          <div>
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} data={kpi} />
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-8">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando dados do ERPNext2...</span>
        </div>
      )}
    </div>
  );
}
