import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  DollarSign,
  Clock,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
  Search,
  ArrowUpDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface Titulo {
  id: number;
  empresa: string;
  cliente: string;
  cnpj: string;
  valor: number;
  saldo: number;
  vencimento: string;
  classificacao: string;
  forma_pagamento: string;
  descricao: string;
  nf_origem: string | null;
}

interface CRResponse {
  total: number;
  limit: number;
  offset: number;
  titulos: Titulo[];
  _cache: boolean;
  atualizado_em: string;
}

interface ResumoResponse {
  cr_aberto_total: number;
  cr_aberto_aramesul: number;
  cr_aberto_arametrix: number;
  cr_titulos: number;
  [key: string]: unknown;
}

type SortField = "cliente" | "vencimento" | "saldo" | "empresa" | "dias_atraso";
type SortDir = "asc" | "desc";
type Empresa = "Todos" | "ARAMESUL" | "ARAMETRIX";
type FaixaFiltro = "Todos" | "1-30" | "31-60" | "61-90" | "91-180" | ">180";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const API_BASE = "https://financeiro.mistralsteel.com.br/financeiro";
const REFRESH_INTERVAL = 5 * 60 * 1000;
const PAGE_SIZE = 50;

const FAIXAS_CONFIG = [
  { label: "1-30 dias", min: 1, max: 30, color: "#f59e0b" },
  { label: "31-60 dias", min: 31, max: 60, color: "#f97316" },
  { label: "61-90 dias", min: 61, max: 90, color: "#ef4444" },
  { label: "91-180 dias", min: 91, max: 180, color: "#dc2626" },
  { label: ">180 dias", min: 181, max: Infinity, color: "#991b1b" },
];

const PIE_COLORS = ["#3b82f6", "#a855f7"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function calcDiasAtraso(vencimento: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento + "T00:00:00");
  const diff = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getFaixaLabel(dias: number): string {
  if (dias <= 30) return "1-30 dias";
  if (dias <= 60) return "31-60 dias";
  if (dias <= 90) return "61-90 dias";
  if (dias <= 180) return "91-180 dias";
  return ">180 dias";
}

function getFaixaColor(dias: number): string {
  if (dias <= 30) return "text-yellow-400 bg-yellow-400/10";
  if (dias <= 60) return "text-orange-400 bg-orange-400/10";
  if (dias <= 90) return "text-red-400 bg-red-400/10";
  if (dias <= 180) return "text-red-600 bg-red-600/10";
  return "text-red-800 bg-red-800/20";
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------
export default function Inadimplencia() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Filtros
  const [empresa, setEmpresa] = useState<Empresa>("Todos");
  const [faixaFiltro, setFaixaFiltro] = useState<FaixaFiltro>("Todos");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("saldo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar todos os títulos vencidos (inadimplentes)
      const params = new URLSearchParams({
        limit: "500",
        offset: "0",
        ...(empresa !== "Todos" && { empresa }),
      });

      const [crResp, resumoResp] = await Promise.all([
        fetch(`${API_BASE}/cr?${params}`),
        fetch(`${API_BASE}/resumo`),
      ]);

      if (!crResp.ok) throw new Error(`Erro CR: ${crResp.status}`);
      if (!resumoResp.ok) throw new Error(`Erro Resumo: ${resumoResp.status}`);

      const crData: CRResponse = await crResp.json();
      const resumoData: ResumoResponse = await resumoResp.json();

      // Filtrar apenas inadimplentes (vencidos)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inadimplentes = crData.titulos.filter((t) => {
        const venc = new Date(t.vencimento + "T00:00:00");
        return venc < hoje;
      });

      setTitulos(inadimplentes);
      setResumo(resumoData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Filtros e ordenação ────────────────────────────────────────────────────
  const filtrados = titulos
    .filter((t) => {
      if (search) {
        const s = search.toLowerCase();
        if (!t.cliente.toLowerCase().includes(s) && !t.cnpj.includes(s)) return false;
      }
      if (faixaFiltro !== "Todos") {
        const dias = calcDiasAtraso(t.vencimento);
        const faixa = getFaixaLabel(dias);
        const faixaMap: Record<FaixaFiltro, string> = {
          "1-30": "1-30 dias",
          "31-60": "31-60 dias",
          "61-90": "61-90 dias",
          "91-180": "91-180 dias",
          ">180": ">180 dias",
          Todos: "",
        };
        if (faixa !== faixaMap[faixaFiltro]) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortField === "cliente") { va = a.cliente; vb = b.cliente; }
      else if (sortField === "empresa") { va = a.empresa; vb = b.empresa; }
      else if (sortField === "vencimento") { va = a.vencimento; vb = b.vencimento; }
      else if (sortField === "saldo") { va = a.saldo; vb = b.saldo; }
      else if (sortField === "dias_atraso") {
        va = calcDiasAtraso(a.vencimento);
        vb = calcDiasAtraso(b.vencimento);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginados = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalInadimplente = titulos.reduce((s, t) => s + t.saldo, 0);
  const totalAramesul = titulos.filter((t) => t.empresa === "ARAMESUL").reduce((s, t) => s + t.saldo, 0);
  const totalArametrix = titulos.filter((t) => t.empresa === "ARAMETRIX").reduce((s, t) => s + t.saldo, 0);
  const crTotal = resumo?.cr_aberto_total ?? 0;
  const taxaInadimplencia = crTotal > 0 ? (totalInadimplente / crTotal) * 100 : 0;

  // ── Dados para gráficos ────────────────────────────────────────────────────
  const faixasData = FAIXAS_CONFIG.map((f) => {
    const titsFaixa = titulos.filter((t) => {
      const dias = calcDiasAtraso(t.vencimento);
      return dias >= f.min && dias <= f.max;
    });
    return {
      label: f.label,
      valor: titsFaixa.reduce((s, t) => s + t.saldo, 0),
      qtd: titsFaixa.length,
      color: f.color,
    };
  }).filter((f) => f.qtd > 0);

  const empresaData = [
    { name: "Aramesul", value: totalAramesul },
    { name: "Arametrix", value: totalArametrix },
  ].filter((e) => e.value > 0);

  // ── Toggle sort ───────────────────────────────────────────────────────────
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading && titulos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-muted">
        <Loader2 className="animate-spin" size={24} />
        <span>Carregando dados de inadimplência…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={24} />
            Inadimplência
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Títulos a receber vencidos — Aramesul + Arametrix
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-text-muted text-xs">
              Atualizado: {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface2 border border-border text-sm hover:bg-border transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wide mb-2">
            <DollarSign size={14} className="text-red-400" />
            Total Inadimplente
          </div>
          <div className="text-2xl font-bold text-red-400">{formatBRL(totalInadimplente)}</div>
          <div className="text-text-muted text-xs mt-1">{titulos.length} títulos vencidos</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wide mb-2">
            <TrendingDown size={14} className="text-orange-400" />
            Taxa de Inadimplência
          </div>
          <div className="text-2xl font-bold text-orange-400">{taxaInadimplencia.toFixed(1)}%</div>
          <div className="text-text-muted text-xs mt-1">sobre CR total aberto</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wide mb-2">
            <Building2 size={14} className="text-blue-400" />
            Aramesul
          </div>
          <div className="text-2xl font-bold text-blue-400">{formatBRL(totalAramesul)}</div>
          <div className="text-text-muted text-xs mt-1">
            {titulos.filter((t) => t.empresa === "ARAMESUL").length} títulos
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wide mb-2">
            <Building2 size={14} className="text-purple-400" />
            Arametrix
          </div>
          <div className="text-2xl font-bold text-purple-400">{formatBRL(totalArametrix)}</div>
          <div className="text-text-muted text-xs mt-1">
            {titulos.filter((t) => t.empresa === "ARAMETRIX").length} títulos
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Faixas de Atraso */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
            <Clock size={14} className="text-yellow-400" />
            Inadimplência por Faixa de Atraso
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faixasData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3347" />
              <XAxis dataKey="label" tick={{ fill: "#8892a4", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "#8892a4", fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : `R$ ${(v / 1e3).toFixed(0)}k`
                }
              />
              <Tooltip
                contentStyle={{ background: "#1a1d27", border: "1px solid #2e3347", borderRadius: 8 }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value) => [formatBRL(Number(value ?? 0)), "Valor"]}
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {faixasData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por Empresa */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
            <Building2 size={14} className="text-blue-400" />
            Distribuição por Empresa
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={empresaData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {empresaData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1a1d27", border: "1px solid #2e3347", borderRadius: 8 }}
                formatter={(value) => [formatBRL(Number(value ?? 0)), "Valor"]}
              />
              <Legend
                formatter={(value) => <span style={{ color: "#8892a4", fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar cliente ou CNPJ…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Empresa */}
          <select
            value={empresa}
            onChange={(e) => { setEmpresa(e.target.value as Empresa); setPage(0); }}
            className="px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent"
          >
            <option value="Todos">Todas as empresas</option>
            <option value="ARAMESUL">Aramesul</option>
            <option value="ARAMETRIX">Arametrix</option>
          </select>

          {/* Faixa */}
          <select
            value={faixaFiltro}
            onChange={(e) => { setFaixaFiltro(e.target.value as FaixaFiltro); setPage(0); }}
            className="px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent"
          >
            <option value="Todos">Todas as faixas</option>
            <option value="1-30">1-30 dias</option>
            <option value="31-60">31-60 dias</option>
            <option value="61-90">61-90 dias</option>
            <option value="91-180">91-180 dias</option>
            <option value=">180">&gt;180 dias</option>
          </select>

          <span className="text-text-muted text-sm ml-auto">
            {filtrados.length} título{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: "Cliente", field: "cliente" as SortField },
                  { label: "Empresa", field: "empresa" as SortField },
                  { label: "Vencimento", field: "vencimento" as SortField },
                  { label: "Dias em Atraso", field: "dias_atraso" as SortField },
                  { label: "Saldo", field: "saldo" as SortField },
                ].map((col) => (
                  <th
                    key={col.field}
                    className="text-left px-4 py-3 text-text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-text select-none"
                    onClick={() => toggleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown size={12} className={sortField === col.field ? "text-accent" : ""} />
                    </span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-text-muted text-xs uppercase tracking-wide">
                  Forma Pgto
                </th>
              </tr>
            </thead>
            <tbody>
              {paginados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted">
                    Nenhum título encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginados.map((t) => {
                  const dias = calcDiasAtraso(t.vencimento);
                  const faixaClass = getFaixaColor(dias);
                  const nomeClean = t.cliente.replace(/\*+/g, "").trim();
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text truncate max-w-[250px]" title={nomeClean}>
                          {nomeClean}
                        </div>
                        {t.cnpj && (
                          <div className="text-text-muted text-xs mt-0.5">{t.cnpj}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            t.empresa === "ARAMESUL"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {t.empresa}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {new Date(t.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${faixaClass}`}>
                          {dias} dias
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-400">
                        {formatBRL(t.saldo)}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {t.forma_pagamento || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-text-muted text-sm">
              Página {page + 1} de {totalPages} ({filtrados.length} títulos)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-surface2 border border-border text-sm disabled:opacity-40 hover:bg-border transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg bg-surface2 border border-border text-sm disabled:opacity-40 hover:bg-border transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
