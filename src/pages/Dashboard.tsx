import { useEffect, useState } from "react";
import {
  Users,
  Truck,
  FileText,
  DollarSign,
  CreditCard,
  ShoppingBag,
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
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
        const openSIFilters: ERPFilter[] = [
          ["docstatus", "=", 1],
          ["outstanding_amount", ">", 0],
        ];

        const openPIFilters: ERPFilter[] = [
          ["docstatus", "=", 1],
          ["outstanding_amount", ">", 0],
        ];

        const [
          activeCustomers,
          activeSuppliers,
          openSICount,
          openSIList,
          openPICount,
          openPIList,
          openOrders,
        ] = await Promise.all([
          getCount("Customer", [["disabled", "=", 0]]).catch(() => 0),
          getCount("Supplier", [["disabled", "=", 0]]).catch(() => 0),
          getCount("Sales Invoice", openSIFilters).catch(() => 0),
          getList<{ outstanding_amount: number }>({
            doctype: "Sales Invoice",
            fields: ["outstanding_amount"],
            filters: openSIFilters,
            limitPageLength: 0,
          }).catch(() => [] as { outstanding_amount: number }[]),
          getCount("Purchase Invoice", openPIFilters).catch(() => 0),
          getList<{ outstanding_amount: number }>({
            doctype: "Purchase Invoice",
            fields: ["outstanding_amount"],
            filters: openPIFilters,
            limitPageLength: 0,
          }).catch(() => [] as { outstanding_amount: number }[]),
          getCount("Sales Order", [
            ["docstatus", "=", 1],
            ["status", "not in", "Completed,Cancelled,Closed"],
          ]).catch(() => 0),
        ]);

        const totalAReceber = openSIList.reduce(
          (sum, inv) => sum + (inv.outstanding_amount || 0),
          0
        );

        const totalAPagar = openPIList.reduce(
          (sum, inv) => sum + (inv.outstanding_amount || 0),
          0
        );

        setKpis([
          {
            label: "Clientes Ativos",
            value: formatNumber(activeCustomers),
            subtitle: "Cadastrados no ERPNext2",
            icon: <Users size={22} />,
            trend: "up",
            color: "#3B82F6",
          },
          {
            label: "Fornecedores Ativos",
            value: formatNumber(activeSuppliers),
            subtitle: "Cadastrados no ERPNext2",
            icon: <Truck size={22} />,
            trend: "neutral",
            color: "#8B5CF6",
          },
          {
            label: "Pedidos Abertos",
            value: formatNumber(openOrders),
            subtitle: "Aguardando processamento",
            icon: <ShoppingBag size={22} />,
            trend: openOrders > 10 ? "down" : "neutral",
            color: "#F59E0B",
          },
          {
            label: "Títulos a Receber",
            value: formatNumber(openSICount),
            subtitle: formatBRL(totalAReceber),
            icon: <DollarSign size={22} />,
            trend: "up",
            color: "#10B981",
          },
          {
            label: "Títulos a Pagar",
            value: formatNumber(openPICount),
            subtitle: formatBRL(totalAPagar),
            icon: <CreditCard size={22} />,
            trend: "down",
            color: "#EF4444",
          },
          {
            label: "Saldo Líquido",
            value: formatBRL(totalAReceber - totalAPagar),
            subtitle: `Receber - Pagar`,
            icon: <FileText size={22} />,
            trend: totalAReceber > totalAPagar ? "up" : "down",
            color: totalAReceber > totalAPagar ? "#10B981" : "#EF4444",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
