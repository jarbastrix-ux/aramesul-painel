import { useEffect, useState } from "react";
import {
  Users,
  Package,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import { getList, getCount } from "../lib/erpnext";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Customer {
  name: string;
  customer_name: string;
  tax_id: string;
  customer_type: string;
  territory: string;
}

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

// ---------------------------------------------------------------------------
// KPI Card (mesmo padrão do Dashboard)
// ---------------------------------------------------------------------------

function KPICard({ data }: { data: KPIData }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">{data.label}</p>
          <p className="text-2xl font-bold text-text-primary">{data.value}</p>
          <span className="text-xs text-text-secondary">{data.subtitle}</span>
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
// Tabela Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
      <div className="p-4 border-b border-border">
        <div className="h-5 w-40 bg-border rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <div className="h-4 w-1/3 bg-border rounded" />
            <div className="h-4 w-1/4 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/12 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vendas Page
// ---------------------------------------------------------------------------

export default function Vendas() {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [totalCustomers, totalItems, customerList] = await Promise.all([
          getCount("Customer").catch(() => 0),
          getCount("Item").catch(() => 0),
          getList<Customer>({
            doctype: "Customer",
            fields: [
              "name",
              "customer_name",
              "tax_id",
              "customer_type",
              "territory",
            ],
            orderBy: "customer_name asc",
            limitPageLength: 20,
          }).catch(() => [] as Customer[]),
        ]);

        setKpis([
          {
            label: "Total de Clientes",
            value: String(totalCustomers),
            subtitle: "Cadastrados no ERPNext2",
            icon: <Users size={22} />,
            color: "#3B82F6",
          },
          {
            label: "Total de Itens",
            value: String(totalItems),
            subtitle: "Produtos cadastrados",
            icon: <Package size={22} />,
            color: "#10B981",
          },
        ]);

        setCustomers(customerList);
      } catch (err) {
        console.error("[Vendas] Erro ao buscar dados:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao conectar com ERPNext2"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.tax_id?.includes(search)
  );

  function formatCNPJ(value: string | null): string {
    if (!value) return "—";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 14) {
      return digits.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      );
    }
    if (digits.length === 11) {
      return digits.replace(
        /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
        "$1.$2.$3-$4"
      );
    }
    return value;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Vendas</h1>
        <p className="text-sm text-text-secondary mt-1">
          Clientes cadastrados e indicadores comerciais
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle size={18} />
          <div>
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} data={kpi} />
          ))}
        </div>
      )}

      {/* Tabela de Clientes */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Clientes ({filtered.length})
            </h3>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary w-56"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Razão Social</th>
                  <th className="text-left px-4 py-3 font-medium">CNPJ/CPF</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Território</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr
                    key={c.name}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">
                      {c.customer_name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {formatCNPJ(c.tax_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.customer_type === "Company"
                            ? "bg-info/10 text-info"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {c.customer_type === "Company" ? "PJ" : "PF"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {c.territory || "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-text-secondary text-sm"
                    >
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando clientes do ERPNext2...</span>
        </div>
      )}
    </div>
  );
}
