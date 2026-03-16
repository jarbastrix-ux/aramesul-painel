import { useEffect, useState } from "react";
import {
  Activity,
  Gauge,
  Zap,
  Clock,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

const OEE_API = "https://producao.mistralsteel.com.br/oee";

interface KPIs {
  disp_media: number;
  perf_media: number;
  oee_medio: number;
  dias_com_dados: number;
  recursos_unicos: number;
  producao_total: number;
}

interface DiaDados {
  data: string;
  recursos: number;
  disp_media: number;
  perf_media: number;
  oee_medio: number;
  producao_total: number;
  horas_total: number;
}

interface Recurso {
  recurso: string;
  centro_trabalho: string;
  dias_operados: number;
  disp_media: number;
  perf_media: number;
  oee_medio: number;
  producao_total: number;
  horas_total: number;
}

interface Parada {
  atividade: string;
  ocorrencias: number;
  minutos_total: number;
  horas_total: number;
  recursos_afetados: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function oeeColor(value: number): string {
  if (value >= 75) return "#10B981";
  if (value >= 50) return "#F59E0B";
  return "#EF4444";
}

function oeeLabel(value: number): string {
  if (value >= 75) return "Bom";
  if (value >= 50) return "Regular";
  if (value >= 25) return "Baixo";
  return "Crítico";
}

function oeeBg(value: number): string {
  if (value >= 75) return "bg-emerald-500/10 text-emerald-600";
  if (value >= 50) return "bg-amber-500/10 text-amber-600";
  return "bg-red-500/10 text-red-600";
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
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-secondary">{subtitle}</p>
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

function OEEGauge({ value }: { value: number }) {
  const color = oeeColor(value);
  const pct = Math.min(value, 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          className="transition-all duration-1000 ease-out"
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          className="fill-text-primary text-xl font-bold"
          fontSize="22"
        >
          {value.toFixed(1)}%
        </text>
        <text
          x="60"
          y="72"
          textAnchor="middle"
          fill={color}
          fontSize="11"
          fontWeight="600"
        >
          {oeeLabel(value)}
        </text>
      </svg>
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
// Página OEE
// ---------------------------------------------------------------------------

export default function OEE() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [porDia, setPorDia] = useState<DiaDados[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const [resumoRes, recursosRes, paradasRes] = await Promise.all([
        fetch(`${OEE_API}/resumo?dias=30`),
        fetch(`${OEE_API}/recursos?dias=30&top=10`),
        fetch(`${OEE_API}/paradas?dias=30&top=10`),
      ]);

      if (!resumoRes.ok || !recursosRes.ok || !paradasRes.ok) {
        throw new Error("Erro ao buscar dados da API OEE");
      }

      const resumoData = await resumoRes.json();
      const recursosData = await recursosRes.json();
      const paradasData = await paradasRes.json();

      setKpis(resumoData.kpis);
      setPorDia(resumoData.por_dia || []);
      setRecursos(recursosData.recursos || []);
      setParadas(paradasData.paradas || []);
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
      console.error("[OEE] Erro:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao conectar com API OEE"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            OEE Produção
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Overall Equipment Effectiveness — Eficiência Global dos Equipamentos
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

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <OEEGauge value={kpis.oee_medio} />
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-secondary">
                OEE Médio
              </p>
              <p className="text-xs text-text-secondary">
                {kpis.dias_com_dados} dias · {kpis.recursos_unicos} recursos
              </p>
            </div>
          </div>

          <KPICard
            label="Disponibilidade"
            value={`${kpis.disp_media}%`}
            subtitle="Tempo produtivo / turno"
            icon={<Clock size={22} />}
            color="#3B82F6"
          />
          <KPICard
            label="Performance"
            value={`${kpis.perf_media}%`}
            subtitle="Produzido / planejado"
            icon={<Zap size={22} />}
            color="#8B5CF6"
          />
          <KPICard
            label="Produção Total"
            value={formatNumber(kpis.producao_total)}
            subtitle="Unidades no período"
            icon={<Activity size={22} />}
            color="#10B981"
          />
        </div>
      ) : null}

      {/* Resumo por dia */}
      {!loading && porDia.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Gauge size={18} />
              OEE por Dia
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background">
                  <th className="text-left px-5 py-3 font-medium text-text-secondary">
                    Data
                  </th>
                  <th className="text-center px-3 py-3 font-medium text-text-secondary">
                    Recursos
                  </th>
                  <th className="text-center px-3 py-3 font-medium text-text-secondary">
                    Disponibilidade
                  </th>
                  <th className="text-center px-3 py-3 font-medium text-text-secondary">
                    Performance
                  </th>
                  <th className="text-center px-3 py-3 font-medium text-text-secondary">
                    OEE
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-text-secondary">
                    Produção
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-text-secondary">
                    Horas
                  </th>
                </tr>
              </thead>
              <tbody>
                {porDia.map((dia, idx) => (
                  <tr
                    key={dia.data}
                    className={`border-t border-border ${
                      idx % 2 === 0 ? "" : "bg-background/50"
                    } hover:bg-primary/5 transition-colors`}
                  >
                    <td className="px-5 py-3 font-medium text-text-primary">
                      {dia.data}
                    </td>
                    <td className="text-center px-3 py-3 text-text-secondary">
                      {dia.recursos}
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="font-medium">{dia.disp_media}%</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="font-medium">{dia.perf_media}%</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${oeeBg(
                          dia.oee_medio
                        )}`}
                      >
                        {dia.oee_medio}%
                      </span>
                    </td>
                    <td className="text-right px-5 py-3 text-text-secondary">
                      {formatNumber(dia.producao_total)}
                    </td>
                    <td className="text-right px-5 py-3 text-text-secondary">
                      {dia.horas_total}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Recursos + Paradas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top 10 Recursos */}
        {!loading && recursos.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Top 10 Recursos por OEE
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">
                      Recurso
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-text-secondary">
                      Centro
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">
                      Disp%
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">
                      Perf%
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">
                      OEE%
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recursos.map((r, idx) => (
                    <tr
                      key={r.recurso}
                      className={`border-t border-border ${
                        idx % 2 === 0 ? "" : "bg-background/50"
                      } hover:bg-primary/5 transition-colors`}
                    >
                      <td className="px-5 py-2.5 font-medium text-text-primary text-xs">
                        {r.recurso}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary text-xs">
                        {r.centro_trabalho}
                      </td>
                      <td className="text-center px-3 py-2.5 text-xs">
                        {r.disp_media}%
                      </td>
                      <td className="text-center px-3 py-2.5 text-xs">
                        {r.perf_media}%
                      </td>
                      <td className="text-center px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${oeeBg(
                            r.oee_medio
                          )}`}
                        >
                          {r.oee_medio}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top 10 Paradas */}
        {!loading && paradas.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <TrendingDown size={18} className="text-red-500" />
                Top 10 Causas de Parada
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background">
                    <th className="text-left px-5 py-3 font-medium text-text-secondary">
                      Causa
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">
                      Ocorrências
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">
                      Horas
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-text-secondary">
                      Recursos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paradas.map((p, idx) => (
                    <tr
                      key={p.atividade}
                      className={`border-t border-border ${
                        idx % 2 === 0 ? "" : "bg-background/50"
                      } hover:bg-primary/5 transition-colors`}
                    >
                      <td className="px-5 py-2.5 font-medium text-text-primary text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            size={14}
                            className={
                              idx < 3 ? "text-red-500" : "text-amber-500"
                            }
                          />
                          {p.atividade}
                        </div>
                      </td>
                      <td className="text-center px-3 py-2.5 text-text-secondary text-xs">
                        {p.ocorrencias}
                      </td>
                      <td className="text-center px-3 py-2.5 text-xs">
                        <span className="font-semibold text-text-primary">
                          {p.horas_total}h
                        </span>
                      </td>
                      <td className="text-center px-3 py-2.5 text-text-secondary text-xs">
                        {p.recursos_afetados}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-8">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando dados de OEE...</span>
        </div>
      )}
    </div>
  );
}
