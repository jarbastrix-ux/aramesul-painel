import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Gauge,
  Wrench,
  AlertTriangle,
  Truck,
  Users,
  MapPin,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  Factory,
  FileWarning,
} from "lucide-react";
import { getList, getCount } from "../lib/erpnext";
import type { ERPFilter } from "../lib/erpnext";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const OEE_API = "https://producao.mistralsteel.com.br/oee";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface FinanceiroKPIs {
  faturamentoMes: number;
  aReceber: number;
  aPagar: number;
  pedidosAbertos: number;
}

interface ProducaoKPIs {
  oeeMedio: number;
  melhorMaquina: string;
  melhorOEE: number;
  principalParada: string;
  principalParadaHoras: number;
}

interface FrotaKPIs {
  totalCaminhoes: number;
  totalMotoristas: number;
  deliveryTripsHoje: number;
}

interface WorkOrderRow {
  name: string;
  production_item: string;
  item_name: string;
  qty: number;
  status: string;
  planned_start_date: string;
}

interface Alerta {
  tipo: "danger" | "warning" | "info";
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
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

function oeeColor(value: number): string {
  if (value >= 75) return "#10B981";
  if (value >= 50) return "#F59E0B";
  return "#EF4444";
}

function statusColor(status: string): string {
  switch (status) {
    case "Not Started":
      return "bg-slate-500/10 text-slate-600";
    case "In Process":
      return "bg-blue-500/10 text-blue-600";
    case "Completed":
      return "bg-emerald-500/10 text-emerald-600";
    case "Stopped":
      return "bg-red-500/10 text-red-600";
    default:
      return "bg-slate-500/10 text-slate-600";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "Not Started":
      return "Não iniciada";
    case "In Process":
      return "Em processo";
    case "Completed":
      return "Concluída";
    case "Stopped":
      return "Parada";
    case "Draft":
      return "Rascunho";
    default:
      return status;
  }
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

function KPICard({
  label,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <div className="flex items-center gap-1.5">
            {trend === "up" && (
              <TrendingUp size={14} className="text-success" />
            )}
            {trend === "down" && (
              <TrendingDown size={14} className="text-danger" />
            )}
            <span className="text-xs text-text-secondary">{subtitle}</span>
          </div>
        </div>
        <div
          className="flex items-center justify-center w-11 h-11 rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
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

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-text-secondary">{icon}</span>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function AlertCard({ alerta }: { alerta: Alerta }) {
  const bgMap = {
    danger: "bg-red-500/10 border-red-500/20",
    warning: "bg-amber-500/10 border-amber-500/20",
    info: "bg-blue-500/10 border-blue-500/20",
  };
  const textMap = {
    danger: "text-red-600",
    warning: "text-amber-600",
    info: "text-blue-600",
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${bgMap[alerta.tipo]}`}
    >
      <span className={`mt-0.5 shrink-0 ${textMap[alerta.tipo]}`}>
        {alerta.icon}
      </span>
      <div>
        <p className={`text-sm font-medium ${textMap[alerta.tipo]}`}>
          {alerta.titulo}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          {alerta.descricao}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OEE Mini Gauge
// ---------------------------------------------------------------------------

function OEEMiniGauge({ value }: { value: number }) {
  const color = oeeColor(value);
  const pct = Math.min(value, 100);
  const circumference = 2 * Math.PI * 35;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle
        cx="45"
        cy="45"
        r="35"
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth="8"
      />
      <circle
        cx="45"
        cy="45"
        r="35"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        className="transition-all duration-1000 ease-out"
      />
      <text
        x="45"
        y="42"
        textAnchor="middle"
        className="fill-text-primary font-bold"
        fontSize="16"
      >
        {value.toFixed(1)}%
      </text>
      <text
        x="45"
        y="56"
        textAnchor="middle"
        fill={color}
        fontSize="9"
        fontWeight="600"
      >
        OEE
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Página Dashboard Executivo
// ---------------------------------------------------------------------------

export default function DashboardExecutivo() {
  const [financeiro, setFinanceiro] = useState<FinanceiroKPIs | null>(null);
  const [producao, setProducao] = useState<ProducaoKPIs | null>(null);
  const [frota, setFrota] = useState<FrotaKPIs | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // ---- Financeiro (ERPNext2) ----
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const openSIFilters: ERPFilter[] = [
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
      ];

      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const openPIFilters: ERPFilter[] = [
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
        ["due_date", ">=", oneYearAgo],
      ];

      const [
        faturamentoList,
        aReceberList,
        aPagarList,
        pedidosAbertos,
      ] = await Promise.all([
        getList<{ grand_total: number }>({
          doctype: "Sales Invoice",
          fields: ["grand_total"],
          filters: [
            ["docstatus", "=", 1],
            ["posting_date", ">=", firstOfMonth],
          ],
          limitPageLength: 0,
        }).catch(() => [] as { grand_total: number }[]),
        getList<{ outstanding_amount: number }>({
          doctype: "Sales Invoice",
          fields: ["outstanding_amount"],
          filters: openSIFilters,
          limitPageLength: 0,
        }).catch(() => [] as { outstanding_amount: number }[]),
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

      const faturamentoMes = faturamentoList.reduce(
        (sum, inv) => sum + (inv.grand_total || 0),
        0
      );
      const aReceber = aReceberList.reduce(
        (sum, inv) => sum + (inv.outstanding_amount || 0),
        0
      );
      const aPagar = aPagarList.reduce(
        (sum, inv) => sum + (inv.outstanding_amount || 0),
        0
      );

      setFinanceiro({ faturamentoMes, aReceber, aPagar, pedidosAbertos });

      // ---- Produção (OEE API) ----
      let producaoData: ProducaoKPIs | null = null;
      try {
        const [resumoRes, recursosRes, paradasRes] = await Promise.all([
          fetch(`${OEE_API}/resumo?dias=7`),
          fetch(`${OEE_API}/recursos?dias=7&top=1`),
          fetch(`${OEE_API}/paradas?dias=7&top=1`),
        ]);

        if (resumoRes.ok && recursosRes.ok && paradasRes.ok) {
          const resumo = await resumoRes.json();
          const recursosData = await recursosRes.json();
          const paradasData = await paradasRes.json();

          const melhorRec = recursosData.recursos?.[0];
          const principalPar = paradasData.paradas?.[0];

          producaoData = {
            oeeMedio: resumo.kpis?.oee_medio ?? 0,
            melhorMaquina: melhorRec?.recurso ?? "N/A",
            melhorOEE: melhorRec?.oee_medio ?? 0,
            principalParada: principalPar?.atividade ?? "N/A",
            principalParadaHoras: principalPar?.horas_total ?? 0,
          };
        }
      } catch {
        // OEE API pode estar offline — não bloquear
      }
      setProducao(producaoData);

      // ---- Frota (ERPNext2) ----
      const today = now.toISOString().split("T")[0];
      const [totalVehicles, totalDrivers, tripsToday] = await Promise.all([
        getCount("Vehicle", []).catch(() => 0),
        getCount("Driver", [["status", "=", "Active"]]).catch(() => 0),
        getCount("Delivery Trip", [
          ["docstatus", "=", 1],
          ["departure_time", ">=", today],
        ]).catch(() => 0),
      ]);

      setFrota({
        totalCaminhoes: totalVehicles,
        totalMotoristas: totalDrivers,
        deliveryTripsHoje: tripsToday,
      });

      // ---- Work Orders ativas (ERPNext2) ----
      const wos = await getList<WorkOrderRow>({
        doctype: "Work Order",
        fields: [
          "name",
          "production_item",
          "item_name",
          "qty",
          "status",
          "planned_start_date",
        ],
        filters: [
          ["status", "not in", "Completed,Cancelled,Closed,Stopped"],
        ],
        orderBy: "planned_start_date desc",
        limitPageLength: 10,
      }).catch(() => [] as WorkOrderRow[]);

      setWorkOrders(wos);

      // ---- Alertas ----
      const newAlertas: Alerta[] = [];

      // CR vencidas > 90 dias (limitado a 365 dias para nao mostrar historico antigo)
      const ninetyDaysAgo = new Date(
        now.getTime() - 90 * 24 * 60 * 60 * 1000
      );
      const crVencidas = await getCount("Sales Invoice", [
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
        ["due_date", "<", ninetyDaysAgo.toISOString().split("T")[0]],
        ["due_date", ">=", oneYearAgo],
      ]).catch(() => 0);

      if (crVencidas > 0) {
        newAlertas.push({
          tipo: "danger",
          titulo: `${crVencidas} título${crVencidas > 1 ? "s" : ""} a receber vencido${crVencidas > 1 ? "s" : ""} há mais de 90 dias`,
          descricao: "Ação urgente necessária para cobrança",
          icon: <FileWarning size={18} />,
        });
      }

      // WOs atrasadas (planned_start_date < hoje e status Not Started)
      const wosAtrasadas = await getCount("Work Order", [
        ["status", "=", "Not Started"],
        ["planned_start_date", "<", today],
        ["docstatus", "in", "0,1"],
      ]).catch(() => 0);

      if (wosAtrasadas > 0) {
        newAlertas.push({
          tipo: "warning",
          titulo: `${wosAtrasadas} Work Order${wosAtrasadas > 1 ? "s" : ""} atrasada${wosAtrasadas > 1 ? "s" : ""}`,
          descricao: "Ordens com data planejada anterior a hoje e não iniciadas",
          icon: <Clock size={18} />,
        });
      }

      // OEE abaixo de 30%
      if (producaoData && producaoData.oeeMedio < 30 && producaoData.oeeMedio > 0) {
        newAlertas.push({
          tipo: "warning",
          titulo: `OEE médio em ${producaoData.oeeMedio.toFixed(1)}% — abaixo de 30%`,
          descricao: "Eficiência de produção em nível crítico nos últimos 7 dias",
          icon: <Gauge size={18} />,
        });
      }

      if (newAlertas.length === 0) {
        newAlertas.push({
          tipo: "info",
          titulo: "Nenhum alerta ativo",
          descricao: "Todos os indicadores dentro dos limites esperados",
          icon: <TrendingUp size={18} />,
        });
      }

      setAlertas(newAlertas);

      setLastUpdate(
        new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (err) {
      console.error("[Executivo] Erro:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar dados"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Dashboard Executivo
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Visão consolidada — Financeiro, Produção e Frota
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-text-secondary">
              Atualizado: {lastUpdate}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
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

      {/* ================================================================ */}
      {/* SEÇÃO 1 — KPIs Financeiros */}
      {/* ================================================================ */}
      <section>
        <SectionTitle
          icon={<DollarSign size={20} />}
          title="Financeiro"
        />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>
        ) : financeiro ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Faturamento Mês"
              value={formatBRL(financeiro.faturamentoMes)}
              subtitle="Notas emitidas no mês atual"
              icon={<TrendingUp size={22} />}
              color="#10B981"
              trend="up"
            />
            <KPICard
              label="A Receber"
              value={formatBRL(financeiro.aReceber)}
              subtitle="Títulos em aberto"
              icon={<DollarSign size={22} />}
              color="#3B82F6"
              trend="neutral"
            />
            <KPICard
              label="A Pagar"
              value={formatBRL(financeiro.aPagar)}
              subtitle="Títulos em aberto"
              icon={<CreditCard size={22} />}
              color="#EF4444"
              trend="down"
            />
            <KPICard
              label="Pedidos Abertos"
              value={formatNumber(financeiro.pedidosAbertos)}
              subtitle="Aguardando processamento"
              icon={<ShoppingBag size={22} />}
              color="#F59E0B"
              trend={financeiro.pedidosAbertos > 10 ? "down" : "neutral"}
            />
          </div>
        ) : null}
      </section>

      {/* ================================================================ */}
      {/* SEÇÃO 2 — KPIs Produção */}
      {/* ================================================================ */}
      <section>
        <SectionTitle icon={<Factory size={20} />} title="Produção (OEE 7 dias)" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>
        ) : producao ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <OEEMiniGauge value={producao.oeeMedio} />
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-secondary">
                  OEE Médio
                </p>
                <p className="text-xs text-text-secondary">
                  Últimos 7 dias
                </p>
              </div>
            </div>
            <KPICard
              label="Melhor Máquina"
              value={producao.melhorMaquina}
              subtitle={`OEE: ${producao.melhorOEE.toFixed(1)}%`}
              icon={<Gauge size={22} />}
              color="#10B981"
              trend="up"
            />
            <KPICard
              label="Principal Parada"
              value={producao.principalParada}
              subtitle={`${producao.principalParadaHoras.toFixed(1)}h no período`}
              icon={<Wrench size={22} />}
              color="#EF4444"
              trend="down"
            />
            <KPICard
              label="Status Geral"
              value={
                producao.oeeMedio >= 50
                  ? "Normal"
                  : producao.oeeMedio >= 30
                    ? "Atenção"
                    : "Crítico"
              }
              subtitle={
                producao.oeeMedio >= 50
                  ? "Produção dentro do esperado"
                  : "Eficiência abaixo do ideal"
              }
              icon={<AlertTriangle size={22} />}
              color={oeeColor(producao.oeeMedio)}
              trend={producao.oeeMedio >= 50 ? "up" : "down"}
            />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-6 text-center text-text-secondary text-sm">
            API OEE indisponível — dados de produção não carregados
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* SEÇÃO 3 — KPIs Frota */}
      {/* ================================================================ */}
      <section>
        <SectionTitle icon={<Truck size={20} />} title="Frota" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>
        ) : frota ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard
              label="Veículos"
              value={formatNumber(frota.totalCaminhoes)}
              subtitle="Ativos no ERPNext2"
              icon={<Truck size={22} />}
              color="#3B82F6"
              trend="neutral"
            />
            <KPICard
              label="Motoristas"
              value={formatNumber(frota.totalMotoristas)}
              subtitle="Ativos no ERPNext2"
              icon={<Users size={22} />}
              color="#8B5CF6"
              trend="neutral"
            />
            <KPICard
              label="Entregas Hoje"
              value={formatNumber(frota.deliveryTripsHoje)}
              subtitle="Delivery Trips do dia"
              icon={<MapPin size={22} />}
              color="#10B981"
              trend={frota.deliveryTripsHoje > 0 ? "up" : "neutral"}
            />
          </div>
        ) : null}
      </section>

      {/* ================================================================ */}
      {/* SEÇÃO 4 — Work Orders Ativas */}
      {/* ================================================================ */}
      <section>
        <SectionTitle
          icon={<Factory size={20} />}
          title="Work Orders Ativas (Top 10)"
        />
        {loading ? (
          <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-border rounded" />
              ))}
            </div>
          </div>
        ) : workOrders.length > 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Ordem
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Produto
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">
                      Qtde
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Data Planejada
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr
                      key={wo.name}
                      className="border-b border-border last:border-0 hover:bg-background/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">
                        {wo.name}
                      </td>
                      <td className="px-4 py-3 text-text-primary">
                        <div className="font-medium">{wo.item_name || wo.production_item}</div>
                        <div className="text-xs text-text-secondary">{wo.production_item}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary">
                        {formatNumber(wo.qty)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(wo.status)}`}
                        >
                          {statusLabel(wo.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {wo.planned_start_date
                          ? new Date(wo.planned_start_date).toLocaleDateString(
                              "pt-BR"
                            )
                          : "—"}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-6 text-center text-text-secondary text-sm">
            Nenhuma Work Order ativa encontrada
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* SEÇÃO 5 — Alertas */}
      {/* ================================================================ */}
      <section>
        <SectionTitle
          icon={<AlertTriangle size={20} />}
          title="Alertas"
        />
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-card border border-border rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((alerta, i) => (
              <AlertCard key={i} alerta={alerta} />
            ))}
          </div>
        )}
      </section>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          <span>Carregando dados...</span>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {!loading && (
        <div className="text-center text-xs text-text-secondary pb-4">
          Atualização automática a cada 5 minutos
        </div>
      )}
    </div>
  );
}
