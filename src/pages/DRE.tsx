import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface DRELinha {
  ordem: number;
  codigo: string;
  descricao: string;
  tipo: "receita" | "despesa" | "subtotal";
  mes_atual: number;
  mes_anterior: number;
  acumulado_ano: number;
  variacao_pct: number;
  classificacoes: string[];
}

interface DREResponse {
  periodo: string;
  periodo_anterior: string;
  acumulado_ate: string;
  empresa: string;
  linhas: DRELinha[];
  fonte: Record<string, string>;
  atualizado_em: string;
  _cache: boolean;
}

type Empresa = "Todos" | "ARAMESUL" | "ARAMETRIX";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const API_BASE = "https://financeiro.mistralsteel.com.br/financeiro/dre";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  const abs = Math.abs(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
}

function formatPct(value: number): string {
  if (value === 0) return "0,0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}

function getMesAno(): { mes: number; ano: number } {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

function getMesLabel(periodo: string): string {
  const [ano, mes] = periodo.split("-");
  const mesIdx = parseInt(mes, 10) - 1;
  return `${MESES[mesIdx]} ${ano}`;
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function FilterBar({
  empresa,
  setEmpresa,
  mes,
  setMes,
  ano,
  setAno,
  onRefresh,
  loading,
}: {
  empresa: Empresa;
  setEmpresa: (e: Empresa) => void;
  mes: number;
  setMes: (m: number) => void;
  ano: number;
  setAno: (a: number) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Empresa */}
      <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-1">
        {(["Todos", "ARAMESUL", "ARAMETRIX"] as Empresa[]).map((e) => (
          <button
            key={e}
            onClick={() => setEmpresa(e)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              empresa === e
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-surface"
            }`}
          >
            {e === "Todos" ? "Consolidado" : e}
          </button>
        ))}
      </div>

      {/* Mês */}
      <select
        value={mes}
        onChange={(e) => setMes(Number(e.target.value))}
        className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {MESES.map((label, idx) => (
          <option key={idx} value={idx + 1}>
            {label}
          </option>
        ))}
      </select>

      {/* Ano */}
      <select
        value={ano}
        onChange={(e) => setAno(Number(e.target.value))}
        className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
        title="Atualizar dados"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        Atualizar
      </button>
    </div>
  );
}

function ValueCell({
  value,
  isSubtotal,
}: {
  value: number;
  tipo?: string;
  isSubtotal: boolean;
}) {
  const isNegative = value < 0;
  const isZero = value === 0;

  let colorClass = "text-text-primary";
  if (!isZero && !isSubtotal) {
    colorClass = isNegative ? "text-danger" : "text-success";
  }
  if (isSubtotal) {
    colorClass = isNegative ? "text-danger" : "text-success";
  }

  return (
    <td
      className={`px-4 py-3 text-right font-mono text-sm whitespace-nowrap ${colorClass} ${
        isSubtotal ? "font-bold" : "font-medium"
      }`}
    >
      {isNegative && !isSubtotal ? "(" : ""}
      {formatBRL(value)}
      {isNegative && !isSubtotal ? ")" : ""}
    </td>
  );
}

function VariacaoCell({ value }: { value: number }) {
  if (value === 0) {
    return (
      <td className="px-4 py-3 text-right text-sm text-text-secondary">
        —
      </td>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-success" : "text-danger";

  return (
    <td className={`px-4 py-3 text-right text-sm font-medium ${colorClass}`}>
      <span className="inline-flex items-center gap-1">
        <Icon size={13} />
        {formatPct(value)}
      </span>
    </td>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
      <div className="p-4 border-b border-border">
        <div className="h-5 w-48 bg-border rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <div className="h-4 w-2/5 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
            <div className="h-4 w-1/8 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function DRE() {
  const { mes: defaultMes, ano: defaultAno } = getMesAno();

  const [empresa, setEmpresa] = useState<Empresa>("Todos");
  const [mes, setMes] = useState(defaultMes);
  const [ano, setAno] = useState(defaultAno);
  const [data, setData] = useState<DREResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDRE = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}?empresa=${encodeURIComponent(empresa)}&mes=${mes}&ano=${ano}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status}: ${res.statusText}`);
      }

      const json: DREResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("[DRE] Erro ao buscar dados:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao conectar com a API"
      );
    } finally {
      setLoading(false);
    }
  }, [empresa, mes, ano]);

  useEffect(() => {
    fetchDRE();
  }, [fetchDRE]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            DRE Gerencial
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Demonstração do Resultado do Exercício
            {data && !loading && (
              <span className="ml-2 text-xs text-text-secondary/70">
                Atualizado em{" "}
                {new Date(data.atualizado_em).toLocaleString("pt-BR")}
                {data._cache && " (cache)"}
              </span>
            )}
          </p>
        </div>

        <FilterBar
          empresa={empresa}
          setEmpresa={setEmpresa}
          mes={mes}
          setMes={setMes}
          ano={ano}
          setAno={setAno}
          onRefresh={fetchDRE}
          loading={loading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
          <AlertCircle size={20} className="text-danger shrink-0" />
          <div>
            <p className="text-sm font-medium text-danger">
              Erro ao carregar DRE
            </p>
            <p className="text-xs text-danger/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !data && <TableSkeleton />}

      {/* Table */}
      {data && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Table header info */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-text-primary">
                {data.empresa === "Todos"
                  ? "Consolidado"
                  : data.empresa}
              </h2>
              <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                Ref. data de vencimento
              </span>
            </div>
            {loading && (
              <Loader2 size={16} className="animate-spin text-text-secondary" />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[40%]">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {data.periodo ? getMesLabel(data.periodo) : "Mês Atual"}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {data.periodo_anterior
                      ? getMesLabel(data.periodo_anterior)
                      : "Mês Anterior"}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Var %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Acum. {ano}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.linhas.map((linha) => {
                  const isSubtotal = linha.tipo === "subtotal";
                  const isResultadoFinal = linha.codigo === "RF";
                  const isResultadoOp = linha.codigo === "RO";
                  const isMargemBruta = linha.codigo === "MB";
                  const isReceitaLiquida = linha.codigo === "RL";

                  const isHighlight =
                    isResultadoFinal ||
                    isResultadoOp ||
                    isMargemBruta ||
                    isReceitaLiquida;

                  let rowBg = "";
                  if (isResultadoFinal) {
                    rowBg = "bg-sidebar/5 border-t-2 border-sidebar/20";
                  } else if (isHighlight) {
                    rowBg = "bg-primary/5";
                  }

                  const descPrefix = isSubtotal ? (
                    <ArrowRight
                      size={14}
                      className="inline mr-1.5 text-primary"
                    />
                  ) : linha.tipo === "receita" ? (
                    <span className="inline-block w-4 text-center text-success font-bold mr-1">
                      +
                    </span>
                  ) : (
                    <span className="inline-block w-4 text-center text-danger font-bold mr-1">
                      −
                    </span>
                  );

                  return (
                    <tr
                      key={linha.ordem}
                      className={`${rowBg} hover:bg-surface/40 transition-colors`}
                    >
                      {/* Descrição */}
                      <td
                        className={`px-5 py-3 text-sm ${
                          isSubtotal
                            ? "font-bold text-text-primary"
                            : "text-text-primary"
                        } ${isHighlight ? "pl-5" : "pl-8"}`}
                      >
                        {descPrefix}
                        {linha.descricao}
                        {!isSubtotal && linha.classificacoes.length > 0 && (
                          <span className="ml-2 text-[10px] text-text-secondary/50 font-mono">
                            {linha.classificacoes.join(", ")}.xx
                          </span>
                        )}
                      </td>

                      {/* Mês Atual */}
                      <ValueCell
                        value={linha.mes_atual}
                        tipo={linha.tipo}
                        isSubtotal={isSubtotal}
                      />

                      {/* Mês Anterior */}
                      <ValueCell
                        value={linha.mes_anterior}
                        tipo={linha.tipo}
                        isSubtotal={isSubtotal}
                      />

                      {/* Variação */}
                      <VariacaoCell value={linha.variacao_pct} />

                      {/* Acumulado Ano */}
                      <ValueCell
                        value={linha.acumulado_ano}
                        tipo={linha.tipo}
                        isSubtotal={isSubtotal}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-surface/30 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-text-secondary/60 space-x-4">
              <span>
                Receitas: {data.fonte?.receitas || "rest_contas_receber"}
              </span>
              <span>
                Despesas: {data.fonte?.despesas || "rest_contas_pagar"}
              </span>
            </div>
            <div className="text-[11px] text-text-secondary/60">
              Excluído: classificação 47.xx (transferências intercompany)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
