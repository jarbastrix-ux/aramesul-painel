import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Search,
  ArrowUpDown,
  RefreshCw,
  Building2,
} from "lucide-react";

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
  vencimento: string; // "YYYY-MM-DD"
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
}

interface ResumoResponse {
  cr_aberto_total: number;
  cr_aberto_aramesul: number;
  cr_aberto_arametrix: number;
  cr_titulos: number;
  [key: string]: unknown;
}

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

type SortField = "cliente" | "vencimento" | "saldo" | "empresa";
type SortDir = "asc" | "desc";
type Empresa = "Todos" | "ARAMESUL" | "ARAMETRIX";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const API_BASE = "https://financeiro.mistralsteel.com.br/financeiro";
const PAGE_SIZE = 200;

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
  return Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getStatusBadge(dueDate: string) {
  const overdue = daysOverdue(dueDate);
  if (overdue > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-danger">
        <AlertTriangle size={12} /> {overdue}d atraso
      </span>
    );
  }
  if (overdue === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
        <Clock size={12} /> Vence hoje
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
      <CheckCircle size={12} /> A vencer
    </span>
  );
}

function formatCNPJ(cnpj: string | null): string {
  if (!cnpj) return "—";
  return cnpj;
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
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/4 bg-border rounded" />
            <div className="h-4 w-1/8 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/8 bg-border rounded" />
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

function AgingBar({ titulos }: { titulos: Titulo[] }) {
  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

  titulos.forEach((t) => {
    const days = daysOverdue(t.vencimento);
    if (days <= 0) buckets.current += t.saldo;
    else if (days <= 30) buckets["1-30"] += t.saldo;
    else if (days <= 60) buckets["31-60"] += t.saldo;
    else if (days <= 90) buckets["61-90"] += t.saldo;
    else buckets["90+"] += t.saldo;
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
        Análise de Vencimentos
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
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [totalTitulos, setTotalTitulos] = useState(0);
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("vencimento");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [empresa, setEmpresa] = useState<Empresa>("Todos");
  const [offset, setOffset] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const empresaParam =
        empresa === "Todos" ? "Todos" : empresa;

      const [crRes, resumoRes] = await Promise.all([
        fetch(
          `${API_BASE}/cr?empresa=${empresaParam}&limit=${PAGE_SIZE}&offset=${offset}`
        ).then((r) => {
          if (!r.ok) throw new Error(`API retornou ${r.status}`);
          return r.json() as Promise<CRResponse>;
        }),
        fetch(`${API_BASE}/resumo`).then((r) => {
          if (!r.ok) throw new Error(`API resumo retornou ${r.status}`);
          return r.json() as Promise<ResumoResponse>;
        }),
      ]);

      setTitulos(crRes.titulos);
      setTotalTitulos(crRes.total);
      setResumo(resumoRes);
    } catch (err) {
      console.error("[ContasReceber] Erro ao buscar dados:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao conectar com a API"
      );
    } finally {
      setLoading(false);
    }
  }, [empresa, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset offset when empresa changes
  useEffect(() => {
    setOffset(0);
  }, [empresa]);

  // Compute KPIs from loaded titulos
  const kpis: KPIData[] = (() => {
    if (!resumo) return [];

    let totalAberto: number;
    let subtitleTotal: string;

    if (empresa === "ARAMESUL") {
      totalAberto = resumo.cr_aberto_aramesul;
      subtitleTotal = `${totalTitulos} títulos em aberto`;
    } else if (empresa === "ARAMETRIX") {
      totalAberto = resumo.cr_aberto_arametrix;
      subtitleTotal = `${totalTitulos} títulos em aberto`;
    } else {
      totalAberto = resumo.cr_aberto_total;
      subtitleTotal = `${totalTitulos} títulos em aberto`;
    }

    const overdueItems = titulos.filter((t) => daysOverdue(t.vencimento) > 0);
    const overdueTotal = overdueItems.reduce((s, t) => s + t.saldo, 0);
    const toExpireItems = titulos.filter((t) => daysOverdue(t.vencimento) <= 0);
    const toExpireTotal = toExpireItems.reduce((s, t) => s + t.saldo, 0);

    return [
      {
        label: "Total em Aberto",
        value: formatBRL(totalAberto),
        subtitle: subtitleTotal,
        icon: <DollarSign size={22} />,
        color: "#3B82F6",
      },
      {
        label: "Vencidas",
        value: formatBRL(overdueTotal),
        subtitle: `${overdueItems.length} títulos em atraso`,
        icon: <AlertTriangle size={22} />,
        color: "#EF4444",
      },
      {
        label: "A Vencer",
        value: formatBRL(toExpireTotal),
        subtitle: `${toExpireItems.length} títulos a vencer`,
        icon: <Clock size={22} />,
        color: "#10B981",
      },
    ];
  })();

  // Filter and sort
  const filtered = titulos
    .filter(
      (t) =>
        t.cliente?.toLowerCase().includes(search.toLowerCase()) ||
        t.cnpj?.toLowerCase().includes(search.toLowerCase()) ||
        t.descricao?.toLowerCase().includes(search.toLowerCase()) ||
        t.nf_origem?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "cliente") {
        cmp = (a.cliente || "").localeCompare(b.cliente || "");
      } else if (sortField === "vencimento") {
        cmp = (a.vencimento || "").localeCompare(b.vencimento || "");
      } else if (sortField === "saldo") {
        cmp = a.saldo - b.saldo;
      } else if (sortField === "empresa") {
        cmp = (a.empresa || "").localeCompare(b.empresa || "");
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

  const totalPages = Math.ceil(totalTitulos / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Contas a Receber
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Títulos em aberto e análise de vencimentos — Fonte: Nomus
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro Empresa */}
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-text-secondary" />
            <select
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value as Empresa)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Todos">Consolidado</option>
              <option value="ARAMESUL">ARAMESUL</option>
              <option value="ARAMETRIX">ARAMETRIX</option>
            </select>
          </div>

          {/* Atualizar */}
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:bg-card hover:text-text-primary transition-colors disabled:opacity-50"
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
      {loading && !resumo ? (
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
      {!loading && titulos.length > 0 && <AgingBar titulos={titulos} />}

      {/* Tabela de Títulos */}
      {loading && titulos.length === 0 ? (
        <TableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Títulos em Aberto ({filtered.length}
              {totalTitulos > PAGE_SIZE
                ? ` de ${totalTitulos}`
                : ""}
              )
            </h3>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Buscar por cliente, CNPJ, NF..."
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
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary"
                    onClick={() => toggleSort("empresa")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Empresa <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary"
                    onClick={() => toggleSort("cliente")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Cliente <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">CNPJ</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Descrição
                  </th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary"
                    onClick={() => toggleSort("saldo")}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Saldo <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary"
                    onClick={() => toggleSort("vencimento")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Vencimento <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          t.empresa === "ARAMESUL"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {t.empresa === "ARAMESUL" ? "ARA" : "ATX"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium max-w-[200px] truncate">
                      {t.cliente}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs font-mono">
                      {formatCNPJ(t.cnpj)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs max-w-[180px] truncate">
                      {t.descricao}
                      {t.nf_origem && (
                        <span className="ml-1 text-primary/70">
                          NF {t.nf_origem}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary font-medium">
                      {formatBRL(t.saldo)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {formatDate(t.vencimento)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(t.vencimento)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-text-secondary text-sm"
                    >
                      Nenhum título encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with pagination */}
          <div className="flex items-center justify-between p-4 border-t border-border bg-surface/50">
            <span className="text-xs text-text-secondary">
              Mostrando {filtered.length} de {totalTitulos} títulos
              {empresa !== "Todos" && ` (${empresa})`}
            </span>

            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <>
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    className="text-xs px-3 py-1 rounded border border-border bg-surface text-text-secondary hover:bg-card disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-text-secondary">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setOffset(
                        Math.min(
                          (totalPages - 1) * PAGE_SIZE,
                          offset + PAGE_SIZE
                        )
                      )
                    }
                    disabled={currentPage >= totalPages}
                    className="text-xs px-3 py-1 rounded border border-border bg-surface text-text-secondary hover:bg-card disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </>
              )}

              <span className="text-sm font-semibold text-text-primary ml-4">
                Total página:{" "}
                {formatBRL(filtered.reduce((s, t) => s + t.saldo, 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando títulos do Nomus...</span>
        </div>
      )}
    </div>
  );
}
