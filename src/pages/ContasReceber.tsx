import { useEffect, useState } from "react";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { erpnext1 } from "../lib/erpnext";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SalesInvoice {
  name: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
}

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

type SortField = "customer_name" | "due_date" | "outstanding_amount";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getStatusBadge(status: string, dueDate: string) {
  const overdue = daysOverdue(dueDate);
  if (status === "Paid" || status === "Return") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
        <CheckCircle size={12} /> Pago
      </span>
    );
  }
  if (overdue > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-danger">
        <AlertTriangle size={12} /> {overdue}d atraso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
      <Clock size={12} /> A vencer
    </span>
  );
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
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <div className="h-4 w-1/4 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/8 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aging Bar
// ---------------------------------------------------------------------------

function AgingBar({ invoices }: { invoices: SalesInvoice[] }) {
  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  
  invoices.forEach((inv) => {
    const days = daysOverdue(inv.due_date);
    if (days <= 0) buckets.current += inv.outstanding_amount;
    else if (days <= 30) buckets["1-30"] += inv.outstanding_amount;
    else if (days <= 60) buckets["31-60"] += inv.outstanding_amount;
    else if (days <= 90) buckets["61-90"] += inv.outstanding_amount;
    else buckets["90+"] += inv.outstanding_amount;
  });

  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const colors = {
    current: "#10B981",
    "1-30": "#F59E0B",
    "31-60": "#F97316",
    "61-90": "#EF4444",
    "90+": "#991B1B",
  };

  const labels = {
    current: "A vencer",
    "1-30": "1-30 dias",
    "31-60": "31-60 dias",
    "61-90": "61-90 dias",
    "90+": "90+ dias",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Aging Analysis
      </h3>
      
      {/* Bar */}
      <div className="flex h-4 rounded-full overflow-hidden mb-4">
        {(Object.keys(buckets) as Array<keyof typeof buckets>).map((key) => {
          const pct = (buckets[key] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: colors[key] }}
              className="transition-all duration-300"
              title={`${labels[key]}: ${formatBRL(buckets[key])} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(Object.keys(buckets) as Array<keyof typeof buckets>).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[key] }}
            />
            <div>
              <span className="text-xs text-text-secondary">{labels[key]}</span>
              <p className="text-xs font-semibold text-text-primary">
                {formatBRL(buckets[key])}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contas a Receber Page
// ---------------------------------------------------------------------------

export default function ContasReceber() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [totalInvoices, invoiceList] = await Promise.all([
          erpnext1.getCount("Sales Invoice", [["docstatus", "=", 1]]).catch(() => 0),
          erpnext1.getList<SalesInvoice>({
            doctype: "Sales Invoice",
            fields: [
              "name",
              "customer_name",
              "posting_date",
              "due_date",
              "grand_total",
              "outstanding_amount",
              "status",
            ],
            filters: [
              ["docstatus", "=", 1],
              ["outstanding_amount", ">", 0],
            ],
            orderBy: "due_date asc",
            limitPageLength: 100,
          }).catch(() => [] as SalesInvoice[]),
        ]);

        const totalOutstanding = invoiceList.reduce(
          (sum, inv) => sum + inv.outstanding_amount,
          0
        );
        const overdueInvoices = invoiceList.filter(
          (inv) => daysOverdue(inv.due_date) > 0
        );
        const overdueTotal = overdueInvoices.reduce(
          (sum, inv) => sum + inv.outstanding_amount,
          0
        );

        setKpis([
          {
            label: "Total em Aberto",
            value: formatBRL(totalOutstanding),
            subtitle: `${totalInvoices} faturas submetidas`,
            icon: <DollarSign size={22} />,
            color: "#3B82F6",
          },
          {
            label: "Vencidas",
            value: formatBRL(overdueTotal),
            subtitle: `${overdueInvoices.length} faturas em atraso`,
            icon: <AlertTriangle size={22} />,
            color: "#EF4444",
          },
          {
            label: "A Vencer",
            value: formatBRL(totalOutstanding - overdueTotal),
            subtitle: `${invoiceList.length - overdueInvoices.length} faturas`,
            icon: <Clock size={22} />,
            color: "#10B981",
          },
        ]);

        setInvoices(invoiceList);
      } catch (err) {
        console.error("[ContasReceber] Erro ao buscar dados:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao conectar com ERPNext"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter and sort
  const filtered = invoices
    .filter(
      (inv) =>
        inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "customer_name") {
        cmp = (a.customer_name || "").localeCompare(b.customer_name || "");
      } else if (sortField === "due_date") {
        cmp = (a.due_date || "").localeCompare(b.due_date || "");
      } else if (sortField === "outstanding_amount") {
        cmp = a.outstanding_amount - b.outstanding_amount;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Contas a Receber</h1>
        <p className="text-sm text-text-secondary mt-1">
          Faturas em aberto e aging analysis
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

      {/* Aging Bar */}
      {!loading && invoices.length > 0 && <AgingBar invoices={invoices} />}

      {/* Tabela de Faturas */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Faturas em Aberto ({filtered.length})
            </h3>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Buscar por cliente ou fatura..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary w-72"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Fatura</th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary"
                    onClick={() => toggleSort("customer_name")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Cliente <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Emissao</th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary"
                    onClick={() => toggleSort("due_date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Vencimento <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary"
                    onClick={() => toggleSort("outstanding_amount")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Valor <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>

                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => (
                  <tr
                    key={inv.name}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-primary font-mono text-xs">
                      {inv.name}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">
                      {inv.customer_name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {formatDate(inv.posting_date)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary font-medium">
                      {formatBRL(inv.outstanding_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(inv.status, inv.due_date)}
                    </td>

                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-text-secondary text-sm"
                    >
                      Nenhuma fatura encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border bg-surface/50">
            <span className="text-xs text-text-secondary">
              Mostrando {filtered.length} de {invoices.length} faturas
            </span>
            <span className="text-sm font-semibold text-text-primary">
              Total: {formatBRL(filtered.reduce((s, i) => s + i.outstanding_amount, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando faturas do ERPNext...</span>
        </div>
      )}
    </div>
  );
}
