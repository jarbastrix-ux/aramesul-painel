import { useEffect, useState } from "react";
import {
  BarChart3,
  DollarSign,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { erpnext1 } from "../lib/erpnext";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Invoice {
  name: string;
  outstanding_amount: number;
  due_date: string;
}

interface AgingBucket {
  label: string;
  count: number;
  amount: number;
  color: string;
  bgColor: string;
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

function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function computeAging(invoices: Invoice[]): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: "A vencer", count: 0, amount: 0, color: "#10B981", bgColor: "bg-emerald-500" },
    { label: "1-30 dias", count: 0, amount: 0, color: "#F59E0B", bgColor: "bg-amber-500" },
    { label: "31-60 dias", count: 0, amount: 0, color: "#F97316", bgColor: "bg-orange-500" },
    { label: "61-90 dias", count: 0, amount: 0, color: "#EF4444", bgColor: "bg-red-500" },
    { label: "90+ dias", count: 0, amount: 0, color: "#991B1B", bgColor: "bg-red-800" },
  ];

  for (const inv of invoices) {
    const days = daysOverdue(inv.due_date);
    let idx = 0;
    if (days <= 0) idx = 0;
    else if (days <= 30) idx = 1;
    else if (days <= 60) idx = 2;
    else if (days <= 90) idx = 3;
    else idx = 4;

    buckets[idx].count += 1;
    buckets[idx].amount += inv.outstanding_amount || 0;
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Aging Bar
// ---------------------------------------------------------------------------

function AgingBar({ buckets, total }: { buckets: AgingBucket[]; total: number }) {
  if (total === 0) return null;

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {buckets.map((b) => {
          const pct = total > 0 ? (b.amount / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={b.label}
              className={`${b.bgColor} relative group transition-all`}
              style={{ width: `${pct}%`, minWidth: pct > 0 ? "2px" : "0" }}
              title={`${b.label}: ${formatBRL(b.amount)} (${pct.toFixed(1)}%)`}
            >
              {pct > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-semibold">
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: b.color }}
            />
            <div className="text-xs">
              <span className="text-text-secondary">{b.label}:</span>{" "}
              <span className="text-text-primary font-medium">
                {b.count} ({formatBRL(b.amount)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aging Table
// ---------------------------------------------------------------------------

function AgingTable({ buckets, total, title }: { buckets: AgingBucket[]; total: number; title: string }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Faixa</th>
              <th className="text-right px-4 py-3 font-medium">Títulos</th>
              <th className="text-right px-4 py-3 font-medium">Valor</th>
              <th className="text-right px-4 py-3 font-medium">% do Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {buckets.map((b) => (
              <tr key={b.label} className="hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="text-text-primary font-medium">{b.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-text-primary font-mono">
                  {b.count}
                </td>
                <td className="px-4 py-3 text-right text-text-primary font-mono">
                  {formatBRL(b.amount)}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary font-mono">
                  {total > 0 ? ((b.amount / total) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-surface font-semibold">
              <td className="px-4 py-3 text-text-primary">Total</td>
              <td className="px-4 py-3 text-right text-text-primary font-mono">
                {buckets.reduce((s, b) => s + b.count, 0)}
              </td>
              <td className="px-4 py-3 text-right text-text-primary font-mono">
                {formatBRL(total)}
              </td>
              <td className="px-4 py-3 text-right text-text-primary font-mono">
                100%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

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
// Relatórios Page
// ---------------------------------------------------------------------------

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crBuckets, setCrBuckets] = useState<AgingBucket[]>([]);
  const [cpBuckets, setCpBuckets] = useState<AgingBucket[]>([]);
  const [crTotal, setCrTotal] = useState(0);
  const [cpTotal, setCpTotal] = useState(0);
  const [kpis, setKpis] = useState<KPIData[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const oneYearAgo = new Date(
          Date.now() - 365 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0];

        const [siList, piList] = await Promise.all([
          erpnext1.getList<Invoice>({
            doctype: "Sales Invoice",
            fields: ["name", "outstanding_amount", "due_date"],
            filters: [
              ["docstatus", "=", 1],
              ["outstanding_amount", ">", 0],
              ["due_date", ">=", oneYearAgo],
            ],
            limitPageLength: 0,
          }).catch(() => [] as Invoice[]),
          erpnext1.getList<Invoice>({
            doctype: "Purchase Invoice",
            fields: ["name", "outstanding_amount", "due_date"],
            filters: [
              ["docstatus", "=", 1],
              ["outstanding_amount", ">", 0],
              ["due_date", ">=", oneYearAgo],
            ],
            limitPageLength: 0,
          }).catch(() => [] as Invoice[]),
        ]);

        const crAging = computeAging(siList);
        const cpAging = computeAging(piList);

        const crTotalAmt = crAging.reduce((s, b) => s + b.amount, 0);
        const cpTotalAmt = cpAging.reduce((s, b) => s + b.amount, 0);

        setCrBuckets(crAging);
        setCpBuckets(cpAging);
        setCrTotal(crTotalAmt);
        setCpTotal(cpTotalAmt);

        const crOverdue = crAging.slice(1).reduce((s, b) => s + b.amount, 0);
        const cpOverdue = cpAging.slice(1).reduce((s, b) => s + b.amount, 0);

        setKpis([
          {
            label: "Total a Receber",
            value: formatBRL(crTotalAmt),
            subtitle: `${siList.length} títulos em aberto`,
            icon: <DollarSign size={22} />,
            color: "#10B981",
          },
          {
            label: "CR Vencidas",
            value: formatBRL(crOverdue),
            subtitle: `${crAging.slice(1).reduce((s, b) => s + b.count, 0)} títulos`,
            icon: <BarChart3 size={22} />,
            color: "#EF4444",
          },
          {
            label: "Total a Pagar",
            value: formatBRL(cpTotalAmt),
            subtitle: `${piList.length} títulos em aberto`,
            icon: <CreditCard size={22} />,
            color: "#F59E0B",
          },
          {
            label: "CP Vencidas",
            value: formatBRL(cpOverdue),
            subtitle: `${cpAging.slice(1).reduce((s, b) => s + b.count, 0)} títulos`,
            icon: <BarChart3 size={22} />,
            color: "#991B1B",
          },
        ]);
      } catch (err) {
        console.error("[Relatórios] Erro ao buscar dados:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao conectar com ERPNext"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Relatórios</h1>
        <p className="text-sm text-text-secondary mt-1">
          Aging Analysis — Contas a Receber e Contas a Pagar (últimos 12 meses)
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-8">
          <Loader2 size={16} className="animate-spin" />
          <span>Calculando aging analysis...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Contas a Receber */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-500" />
              Contas a Receber — Aging Analysis
            </h2>
            <AgingBar buckets={crBuckets} total={crTotal} />
            <AgingTable
              buckets={crBuckets}
              total={crTotal}
              title="Detalhamento por Faixa de Atraso — Contas a Receber"
            />
          </div>

          {/* Contas a Pagar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <CreditCard size={20} className="text-amber-500" />
              Contas a Pagar — Aging Analysis
            </h2>
            <AgingBar buckets={cpBuckets} total={cpTotal} />
            <AgingTable
              buckets={cpBuckets}
              total={cpTotal}
              title="Detalhamento por Faixa de Atraso — Contas a Pagar"
            />
          </div>
        </div>
      )}
    </div>
  );
}
