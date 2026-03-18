import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  FileText,
  Loader2,
  AlertCircle,
  Search,
  ArrowUpDown,
  Building2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const FINANCEIRO_API = "https://financeiro.mistralsteel.com.br/financeiro";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CPTitulo {
  id: number;
  empresa: string;
  fornecedor: string;
  valor: number;
  saldo: number;
  vencimento: string;
  classificacao: string;
  forma_pagamento: string | null;
  descricao: string;
  nf_origem: string | null;
}

interface CPResponse {
  total: number;
  limit: number;
  offset: number;
  titulos: CPTitulo[];
}

interface ResumoResponse {
  cp_aberto_total: number;
  cp_aberto_aramesul: number;
  cp_aberto_arametrix: number;
  cp_titulos: number;
  [key: string]: number;
}

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

type EmpresaFilter = "TODAS" | "ARAMESUL" | "ARAMETRIX";

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
  const diff = Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
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
// Empresa Selector
// ---------------------------------------------------------------------------

function EmpresaSelector({
  selected,
  onChange,
}: {
  selected: EmpresaFilter;
  onChange: (key: EmpresaFilter) => void;
}) {
  const options: { key: EmpresaFilter; label: string }[] = [
    { key: "TODAS", label: "Todas" },
    { key: "ARAMESUL", label: "Aramesul" },
    { key: "ARAMETRIX", label: "Arametrix" },
  ];

  return (
    <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
      <Building2 size={14} className="text-text-secondary ml-2 mr-1" />
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            selected === opt.key
              ? "bg-primary text-white shadow-sm"
              : "text-text-secondary hover:text-text-primary hover:bg-border/50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compras Page
// ---------------------------------------------------------------------------

type SortField = "fornecedor" | "saldo" | "vencimento";

export default function Compras() {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [titulos, setTitulos] = useState<CPTitulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("vencimento");
  const [sortAsc, setSortAsc] = useState(true);
  const [empresa, setEmpresa] = useState<EmpresaFilter>("TODAS");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const empresaParam =
        empresa !== "TODAS" ? `&empresa=${empresa}` : "";

      const [resumoRes, cpRes] = await Promise.all([
        fetch(`${FINANCEIRO_API}/resumo`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null) as Promise<ResumoResponse | null>,
        fetch(`${FINANCEIRO_API}/cp?limit=200${empresaParam}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null) as Promise<CPResponse | null>,
      ]);

      const titulosList = cpRes?.titulos ?? [];

      // KPIs do resumo (total real do banco, não apenas os 200 exibidos)
      const totalPagar =
        empresa === "ARAMESUL"
          ? resumoRes?.cp_aberto_aramesul ?? 0
          : empresa === "ARAMETRIX"
            ? resumoRes?.cp_aberto_arametrix ?? 0
            : resumoRes?.cp_aberto_total ?? 0;

      const totalTitulos = cpRes?.total ?? resumoRes?.cp_titulos ?? 0;

      // Vencidas — calculadas a partir dos títulos carregados
      const overdueList = titulosList.filter(
        (t) => daysOverdue(t.vencimento) > 0
      );
      const overdueAmount = overdueList.reduce(
        (sum, t) => sum + (t.saldo || 0),
        0
      );

      setKpis([
        {
          label: "Total a Pagar",
          value: formatBRL(totalPagar),
          subtitle: `${totalTitulos} títulos em aberto (excl. 47%)`,
          icon: <DollarSign size={22} />,
          color: "#F59E0B",
        },
        {
          label: "Vencidas",
          value: formatBRL(overdueAmount),
          subtitle: `${overdueList.length} títulos vencidos`,
          icon: <FileText size={22} />,
          color: "#EF4444",
        },
        {
          label: "A Vencer",
          value: formatBRL(
            titulosList
              .filter((t) => daysOverdue(t.vencimento) <= 0)
              .reduce((sum, t) => sum + (t.saldo || 0), 0)
          ),
          subtitle: `${titulosList.filter((t) => daysOverdue(t.vencimento) <= 0).length} títulos`,
          icon: <DollarSign size={22} />,
          color: "#3B82F6",
        },
      ]);

      setTitulos(titulosList);
    } catch (err) {
      console.error("[Compras] Erro ao buscar dados:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao conectar com API Financeira"
      );
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = titulos.filter(
    (t) =>
      t.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
      t.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      t.nf_origem?.toLowerCase().includes(search.toLowerCase()) ||
      t.classificacao?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "saldo") {
      return sortAsc ? a.saldo - b.saldo : b.saldo - a.saldo;
    }
    if (sortField === "vencimento") {
      return sortAsc
        ? a.vencimento.localeCompare(b.vencimento)
        : b.vencimento.localeCompare(a.vencimento);
    }
    const aVal = (a.fornecedor ?? "").toLowerCase();
    const bVal = (b.fornecedor ?? "").toLowerCase();
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Compras</h1>
          <p className="text-sm text-text-secondary mt-1">
            Contas a pagar — dados do Nomus (nomus_mirror)
          </p>
        </div>
        <EmpresaSelector selected={empresa} onChange={setEmpresa} />
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

      {/* Tabela de Títulos a Pagar */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Títulos a Pagar em Aberto ({sorted.length})
            </h3>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Buscar por fornecedor, NF ou classificação..."
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
                  <th className="text-left px-4 py-3 font-medium">Empresa</th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("fornecedor")}
                  >
                    <span className="flex items-center gap-1">
                      Fornecedor
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Descrição</th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("saldo")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Saldo
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("vencimento")}
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
                {sorted.slice(0, 100).map((t) => {
                  const days = daysOverdue(t.vencimento);
                  const isOverdue = days > 0;
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.empresa === "ARAMESUL"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-purple-500/10 text-purple-600"
                          }`}
                        >
                          {t.empresa}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-primary max-w-xs">
                        <div className="font-medium truncate">{t.fornecedor}</div>
                        <div className="text-xs text-text-secondary">
                          {t.classificacao} | {t.forma_pagamento ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs max-w-xs truncate">
                        {t.descricao}
                        {t.nf_origem && (
                          <span className="ml-1 text-text-secondary/70">
                            (NF {t.nf_origem})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-primary">
                        {formatBRL(t.saldo)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {formatDate(t.vencimento)}
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
                      colSpan={6}
                      className="px-4 py-8 text-center text-text-secondary text-sm"
                    >
                      Nenhum título encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sorted.length > 100 && (
            <div className="px-4 py-3 border-t border-border text-xs text-text-secondary text-center">
              Exibindo 100 de {sorted.length} títulos. Use a busca para filtrar.
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando dados do Nomus...</span>
        </div>
      )}
    </div>
  );
}
