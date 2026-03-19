import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  DollarSign,
  CreditCard,
  Loader2,
  AlertCircle,
  TrendingUp,
  Building2,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = "https://financeiro.mistralsteel.com.br/financeiro";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Titulo {
  id: number;
  empresa: string;
  saldo: number;
  vencimento: string;
}

interface ResumoData {
  cr_aberto_total: number;
  cr_aberto_aramesul: number;
  cr_aberto_arametrix: number;
  cr_titulos: number;
  cp_aberto_total: number;
  cp_aberto_aramesul: number;
  cp_aberto_arametrix: number;
  cp_titulos: number;
  faturamento_mes_total: number;
  faturamento_mes_total_aramesul: number;
  faturamento_mes_total_arametrix: number;
  periodo_faturamento: string;
}

interface FaturamentoMes {
  mes: string;
  aramesul: number;
  arametrix: number;
  total: number;
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

function formatBRLFull(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function computeAging(titulos: Titulo[]): AgingBucket[] {
  const buckets: AgingBucket[] = [
    {
      label: "A vencer",
      count: 0,
      amount: 0,
      color: "#10B981",
      bgColor: "bg-emerald-500",
    },
    {
      label: "1-30 dias",
      count: 0,
      amount: 0,
      color: "#F59E0B",
      bgColor: "bg-amber-500",
    },
    {
      label: "31-60 dias",
      count: 0,
      amount: 0,
      color: "#F97316",
      bgColor: "bg-orange-500",
    },
    {
      label: "61-90 dias",
      count: 0,
      amount: 0,
      color: "#EF4444",
      bgColor: "bg-red-500",
    },
    {
      label: "90+ dias",
      count: 0,
      amount: 0,
      color: "#991B1B",
      bgColor: "bg-red-800",
    },
  ];

  for (const t of titulos) {
    const days = daysOverdue(t.vencimento);
    let idx = 0;
    if (days <= 0) idx = 0;
    else if (days <= 30) idx = 1;
    else if (days <= 60) idx = 2;
    else if (days <= 90) idx = 3;
    else idx = 4;

    buckets[idx].count += 1;
    buckets[idx].amount += t.saldo || 0;
  }

  return buckets;
}

function formatMesLabel(mes: string): string {
  const [ano, m] = mes.split("-");
  const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${meses[parseInt(m) - 1]}/${ano.slice(2)}`;
}

// ---------------------------------------------------------------------------
// AgingBar component
// ---------------------------------------------------------------------------

function AgingBar({
  buckets,
  total,
}: {
  buckets: AgingBucket[];
  total: number;
}) {
  if (total === 0) return null;

  return (
    <div className="space-y-3">
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
// AgingTable component
// ---------------------------------------------------------------------------

function AgingTable({
  buckets,
  total,
  title,
}: {
  buckets: AgingBucket[];
  total: number;
  title: string;
}) {
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
              <tr
                key={b.label}
                className="hover:bg-surface/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="text-text-primary font-medium">
                      {b.label}
                    </span>
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
          <p className="text-sm font-medium text-text-secondary">
            {data.label}
          </p>
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
// Comparativo Card
// ---------------------------------------------------------------------------

function ComparativoCard({
  titulo,
  aramesul,
  arametrix,
  total,
  icon,
}: {
  titulo: string;
  aramesul: number;
  arametrix: number;
  total: number;
  icon: React.ReactNode;
}) {
  const pctAra = total > 0 ? (aramesul / total) * 100 : 0;
  const pctAtx = total > 0 ? (arametrix / total) * 100 : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold text-text-primary">{titulo}</h3>
      </div>

      <div className="space-y-4">
        {/* ARAMESUL */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">ARAMESUL</span>
            <span className="text-text-primary font-mono font-medium">
              {formatBRL(aramesul)}
            </span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${pctAra}%` }}
            />
          </div>
          <span className="text-[10px] text-text-secondary">
            {pctAra.toFixed(1)}%
          </span>
        </div>

        {/* ARAMETRIX */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">ARAMETRIX</span>
            <span className="text-text-primary font-mono font-medium">
              {formatBRL(arametrix)}
            </span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${pctAtx}%` }}
            />
          </div>
          <span className="text-[10px] text-text-secondary">
            {pctAtx.toFixed(1)}%
          </span>
        </div>

        {/* Total */}
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary font-medium">
              Consolidado
            </span>
            <span className="text-text-primary font-mono font-bold">
              {formatBRL(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for chart
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-text-primary mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="text-text-primary font-mono font-medium">
            {formatBRLFull(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Relatorios() {
  const [empresa, setEmpresa] = useState<string>("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resumo, setResumo] = useState<ResumoData | null>(null);
  const [crTitulos, setCrTitulos] = useState<Titulo[]>([]);
  const [cpTitulos, setCpTitulos] = useState<Titulo[]>([]);
  const [faturamentoHist, setFaturamentoHist] = useState<FaturamentoMes[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const empresaParam =
        empresa === "Todos" ? "" : `&empresa=${empresa}`;

      const [resumoRes, crRes, cpRes, fatRes] = await Promise.all([
        fetch(`${API_BASE}/resumo`).then((r) => r.json()),
        fetch(`${API_BASE}/cr?limit=500${empresaParam}`).then((r) =>
          r.json()
        ),
        fetch(`${API_BASE}/cp?limit=500${empresaParam}`).then((r) =>
          r.json()
        ),
        fetch(`${API_BASE}/faturamento/historico`).then((r) => r.json()),
      ]);

      setResumo(resumoRes);
      setCrTitulos(crRes.titulos || []);
      setCpTitulos(cpRes.titulos || []);
      setFaturamentoHist(fatRes.meses || []);
    } catch (err) {
      console.error("[Relatórios] Erro ao buscar dados:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao conectar com a API"
      );
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed aging
  const crAging = useMemo(() => computeAging(crTitulos), [crTitulos]);
  const cpAging = useMemo(() => computeAging(cpTitulos), [cpTitulos]);
  const crTotal = useMemo(
    () => crAging.reduce((s, b) => s + b.amount, 0),
    [crAging]
  );
  const cpTotal = useMemo(
    () => cpAging.reduce((s, b) => s + b.amount, 0),
    [cpAging]
  );
  const crOverdue = useMemo(
    () => crAging.slice(1).reduce((s, b) => s + b.amount, 0),
    [crAging]
  );
  const cpOverdue = useMemo(
    () => cpAging.slice(1).reduce((s, b) => s + b.amount, 0),
    [cpAging]
  );
  const crOverdueCount = useMemo(
    () => crAging.slice(1).reduce((s, b) => s + b.count, 0),
    [crAging]
  );
  const cpOverdueCount = useMemo(
    () => cpAging.slice(1).reduce((s, b) => s + b.count, 0),
    [cpAging]
  );

  // Chart data
  const chartData = useMemo(
    () =>
      faturamentoHist.map((m) => ({
        mes: formatMesLabel(m.mes),
        ARAMESUL: m.aramesul,
        ARAMETRIX: m.arametrix,
        Total: m.total,
      })),
    [faturamentoHist]
  );

  // KPIs
  const kpis: KPIData[] = useMemo(() => {
    if (!resumo) return [];
    return [
      {
        label: "Total a Receber",
        value: formatBRL(
          empresa === "ARAMESUL"
            ? resumo.cr_aberto_aramesul
            : empresa === "ARAMETRIX"
              ? resumo.cr_aberto_arametrix
              : resumo.cr_aberto_total
        ),
        subtitle: `${crTitulos.length} títulos em aberto`,
        icon: <DollarSign size={22} />,
        color: "#10B981",
      },
      {
        label: "CR Vencidas",
        value: formatBRL(crOverdue),
        subtitle: `${crOverdueCount} títulos vencidos`,
        icon: <BarChart3 size={22} />,
        color: "#EF4444",
      },
      {
        label: "Total a Pagar",
        value: formatBRL(
          empresa === "ARAMESUL"
            ? resumo.cp_aberto_aramesul
            : empresa === "ARAMETRIX"
              ? resumo.cp_aberto_arametrix
              : resumo.cp_aberto_total
        ),
        subtitle: `${cpTitulos.length} títulos em aberto`,
        icon: <CreditCard size={22} />,
        color: "#F59E0B",
      },
      {
        label: "CP Vencidas",
        value: formatBRL(cpOverdue),
        subtitle: `${cpOverdueCount} títulos vencidos`,
        icon: <BarChart3 size={22} />,
        color: "#991B1B",
      },
    ];
  }, [
    resumo,
    empresa,
    crTitulos.length,
    cpTitulos.length,
    crOverdue,
    cpOverdue,
    crOverdueCount,
    cpOverdueCount,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Relatório Financeiro
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Visão consolidada — Contas a Receber, Contas a Pagar, Faturamento e
            Aging — Fonte: Nomus
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro empresa */}
          <select
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="Todos">Consolidado</option>
            <option value="ARAMESUL">ARAMESUL</option>
            <option value="ARAMETRIX">ARAMETRIX</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-accent/10 text-accent rounded-lg text-sm font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
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

      {/* Evolução Mensal do Faturamento */}
      {!loading && chartData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Evolução Mensal do Faturamento
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={{ stroke: "#334155" }}
                />
                <YAxis
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={{ stroke: "#334155" }}
                  tickFormatter={(v) =>
                    `${(v / 1_000_000).toFixed(1)}M`
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
                />
                <Line
                  type="monotone"
                  dataKey="ARAMESUL"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#F59E0B" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="ARAMETRIX"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#06B6D4" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-8">
          <Loader2 size={16} className="animate-spin" />
          <span>Carregando dados financeiros...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Aging CR */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <DollarSign size={20} className="text-emerald-500" />
              Contas a Receber — Análise de Vencimentos
            </h2>
            <AgingBar buckets={crAging} total={crTotal} />
            <AgingTable
              buckets={crAging}
              total={crTotal}
              title="Detalhamento por Faixa de Atraso — Contas a Receber"
            />
          </div>

          {/* Aging CP */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <CreditCard size={20} className="text-amber-500" />
              Contas a Pagar — Análise de Vencimentos
            </h2>
            <AgingBar buckets={cpAging} total={cpTotal} />
            <AgingTable
              buckets={cpAging}
              total={cpTotal}
              title="Detalhamento por Faixa de Atraso — Contas a Pagar"
            />
          </div>

          {/* Comparativo ARAMESUL vs ARAMETRIX */}
          {resumo && empresa === "Todos" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Building2 size={20} className="text-accent" />
                Comparativo ARAMESUL vs ARAMETRIX
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ComparativoCard
                  titulo="Contas a Receber"
                  aramesul={resumo.cr_aberto_aramesul}
                  arametrix={resumo.cr_aberto_arametrix}
                  total={resumo.cr_aberto_total}
                  icon={<DollarSign size={18} className="text-emerald-500" />}
                />
                <ComparativoCard
                  titulo="Contas a Pagar"
                  aramesul={resumo.cp_aberto_aramesul}
                  arametrix={resumo.cp_aberto_arametrix}
                  total={resumo.cp_aberto_total}
                  icon={<CreditCard size={18} className="text-amber-500" />}
                />
                <ComparativoCard
                  titulo={`Faturamento ${resumo.periodo_faturamento}`}
                  aramesul={resumo.faturamento_mes_total_aramesul}
                  arametrix={resumo.faturamento_mes_total_arametrix}
                  total={resumo.faturamento_mes_total}
                  icon={<TrendingUp size={18} className="text-accent" />}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-text-secondary pt-4 border-t border-border">
        Dados atualizados do Nomus via nomus_mirror — Exclui classificação 47.xx
        (transferências intercompany)
      </div>
    </div>
  );
}
