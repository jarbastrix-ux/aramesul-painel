import { useEffect, useState } from "react";
import {
  Users,
  DollarSign,
  FileText,
  Loader2,
  AlertCircle,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { getList, getCount } from "../lib/erpnext";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SalesInvoice {
  name: string;
  customer_name: string;
  grand_total: number;
  outstanding_amount: number;
  due_date: string;
  posting_date: string;
  custom_nomus_id: string;
  custom_nfe_origem: string;
}

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ---------------------------------------------------------------------------
// KPI Card
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

function TableSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
      <div className="p-4 border-b border-border">
        <div className="h-5 w-40 bg-border rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <div className="h-4 w-1/4 bg-border rounded" />
            <div className="h-4 w-1/3 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vendas Page
// ---------------------------------------------------------------------------

type SortField = "customer_name" | "outstanding_amount" | "due_date";

export default function Vendas() {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [totalCustomers, invoiceList] = await Promise.all([
          getCount("Customer", [["disabled", "=", 0]]).catch(() => 0),
          getList<SalesInvoice>({
            doctype: "Sales Invoice",
            fields: [
              "name",
              "customer_name",
              "grand_total",
              "outstanding_amount",
              "due_date",
              "posting_date",
              "custom_nomus_id",
              "custom_nfe_origem",
            ],
            filters: [
              ["docstatus", "=", 1],
              ["outstanding_amount", ">", 0],
            ],
            orderBy: "due_date asc",
            limitPageLength: 0,
          }).catch(() => [] as SalesInvoice[]),
        ]);

        const totalOutstanding = invoiceList.reduce(
          (sum, inv) => sum + (inv.outstanding_amount || 0),
          0
        );

        const overdueCount = invoiceList.filter(
          (inv) => daysOverdue(inv.due_date) > 0
        ).length;

        const overdueAmount = invoiceList
          .filter((inv) => daysOverdue(inv.due_date) > 0)
          .reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0);

        setKpis([
          {
            label: "Clientes Ativos",
            value: new Intl.NumberFormat("pt-BR").format(totalCustomers),
            subtitle: "Cadastrados no ERPNext2",
            icon: <Users size={22} />,
            color: "#3B82F6",
          },
          {
            label: "Total a Receber",
            value: formatBRL(totalOutstanding),
            subtitle: `${invoiceList.length} títulos em aberto`,
            icon: <DollarSign size={22} />,
            color: "#10B981",
          },
          {
            label: "Vencidas",
            value: formatBRL(overdueAmount),
            subtitle: `${overdueCount} títulos vencidos`,
            icon: <FileText size={22} />,
            color: "#EF4444",
          },
        ]);

        setInvoices(invoiceList);
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

  const filtered = invoices.filter(
    (inv) =>
      inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.custom_nomus_id?.includes(search)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "outstanding_amount") {
      return sortAsc
        ? a.outstanding_amount - b.outstanding_amount
        : b.outstanding_amount - a.outstanding_amount;
    }
    const aVal = (a[sortField] ?? "").toString().toLowerCase();
    const bVal = (b[sortField] ?? "").toString().toLowerCase();
    return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Vendas</h1>
        <p className="text-sm text-text-secondary mt-1">
          Contas a receber e indicadores comerciais
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} data={kpi} />
          ))}
        </div>
      )}

      {/* Tabela de Sales Invoices */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Sales Invoices em Aberto ({sorted.length})
            </h3>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Buscar por cliente, fatura ou Nomus ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary w-72"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Fatura</th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("customer_name")}
                  >
                    <span className="flex items-center gap-1">
                      Cliente
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("outstanding_amount")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Valor em Aberto
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("due_date")}
                  >
                    <span className="flex items-center gap-1">
                      Vencimento
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.slice(0, 100).map((inv) => {
                  const days = daysOverdue(inv.due_date);
                  const isOverdue = days > 0;
                  return (
                    <tr
                      key={inv.name}
                      className="hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-text-primary font-mono text-xs font-medium">
                          {inv.name}
                        </div>
                        {inv.custom_nomus_id && (
                          <div className="text-text-secondary text-[10px] mt-0.5">
                            Nomus: {inv.custom_nomus_id}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-primary max-w-xs truncate">
                        {inv.customer_name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-primary">
                        {formatBRL(inv.outstanding_amount)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isOverdue
                              ? "bg-danger/10 text-danger"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {isOverdue ? `${days}d atraso` : "A vencer"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-text-secondary text-sm"
                    >
                      Nenhuma fatura encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sorted.length > 100 && (
            <div className="px-4 py-3 border-t border-border text-xs text-text-secondary text-center">
              Exibindo 100 de {sorted.length} faturas. Use a busca para filtrar.
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando dados do ERPNext2...</span>
        </div>
      )}
    </div>
  );
}
