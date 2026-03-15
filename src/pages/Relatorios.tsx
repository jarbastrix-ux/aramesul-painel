import { useEffect, useState } from "react";
import {
  Package,
  Loader2,
  AlertCircle,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { getList, getCount } from "../lib/erpnext";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Item {
  name: string;
  item_code: string;
  item_name: string;
  stock_uom: string;
  customs_tariff_number: string;
  item_group: string;
  disabled: number;
}

interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
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
            <div className="h-4 w-1/3 bg-border rounded" />
            <div className="h-4 w-1/12 bg-border rounded" />
            <div className="h-4 w-1/6 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relatórios Page
// ---------------------------------------------------------------------------

type SortField = "item_code" | "item_name" | "stock_uom" | "customs_tariff_number";

export default function Relatorios() {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("item_code");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [totalItems, totalActive, itemList] = await Promise.all([
          getCount("Item").catch(() => 0),
          getCount("Item", [["disabled", "=", 0]]).catch(() => 0),
          getList<Item>({
            doctype: "Item",
            fields: [
              "name",
              "item_code",
              "item_name",
              "stock_uom",
              "customs_tariff_number",
              "item_group",
              "disabled",
            ],
            orderBy: "item_code asc",
            limitPageLength: 50,
          }).catch(() => [] as Item[]),
        ]);

        setKpis([
          {
            label: "Total de Itens",
            value: String(totalItems),
            subtitle: "Cadastrados no ERPNext2",
            icon: <Package size={22} />,
            color: "#10B981",
          },
          {
            label: "Itens Ativos",
            value: String(totalActive),
            subtitle: `${totalItems - totalActive} inativos`,
            icon: <Package size={22} />,
            color: "#3B82F6",
          },
        ]);

        setItems(itemList);
      } catch (err) {
        console.error("[Relatórios] Erro ao buscar dados:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao conectar com ERPNext2"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filtered = items.filter(
    (item) =>
      item.item_code?.toLowerCase().includes(search.toLowerCase()) ||
      item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.customs_tariff_number?.includes(search)
  );

  const sorted = [...filtered].sort((a, b) => {
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

  function formatNCM(value: string | null): string {
    if (!value) return "—";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 8) {
      return digits.replace(
        /^(\d{4})(\d{2})(\d{2})$/,
        "$1.$2.$3"
      );
    }
    return value;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Relatórios</h1>
        <p className="text-sm text-text-secondary mt-1">
          Catálogo de itens e produtos cadastrados
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} data={kpi} />
          ))}
        </div>
      )}

      {/* Tabela de Itens */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">
              Itens Cadastrados ({sorted.length})
            </h3>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Buscar por código, nome ou NCM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider">
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("item_code")}
                  >
                    <span className="flex items-center gap-1">
                      Código
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("item_name")}
                  >
                    <span className="flex items-center gap-1">
                      Nome
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("stock_uom")}
                  >
                    <span className="flex items-center gap-1">
                      UOM
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                    onClick={() => handleSort("customs_tariff_number")}
                  >
                    <span className="flex items-center gap-1">
                      NCM
                      <ArrowUpDown size={12} className="opacity-50" />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((item) => (
                  <tr
                    key={item.name}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-primary font-mono text-xs font-medium">
                      {item.item_code}
                    </td>
                    <td className="px-4 py-3 text-text-primary max-w-sm truncate">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {item.stock_uom}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {formatNCM(item.customs_tariff_number)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.disabled === 0
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {item.disabled === 0 ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-text-secondary text-sm"
                    >
                      Nenhum item encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-text-secondary text-sm py-4">
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando itens do ERPNext2...</span>
        </div>
      )}
    </div>
  );
}
