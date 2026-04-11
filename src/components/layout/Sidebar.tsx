import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Gauge,
  TrendingUp,
  Map,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Executivo",
    path: "/executivo",
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: "Dashboard",
    path: "/",
    icon: <BarChart3 size={20} />,
  },
  {
    label: "Vendas",
    path: "/vendas",
    icon: <ShoppingCart size={20} />,
  },
  {
    label: "Compras",
    path: "/compras",
    icon: <Package size={20} />,
  },
  {
    label: "Contas a Receber",
    path: "/contas-receber",
    icon: <Receipt size={20} />,
  },
  {
    label: "OEE Produção",
    path: "/oee",
    icon: <Gauge size={20} />,
  },
  {
    label: "DRE",
    path: "/dre",
    icon: <TrendingUp size={20} />,
  },
  {
    label: "Inadimplência",
    path: "/inadimplencia",
    icon: <AlertTriangle size={20} />,
  },
  {
    label: "Mapa",
    path: "/mapa",
    icon: <Map size={20} />,
  },
  {
    label: "Relatórios",
    path: "/relatorios",
    icon: <BarChart3 size={20} />,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isMapaActive = location.pathname === "/mapa";

  // Ocultar sidebar automaticamente quando Mapa estiver ativo
  useEffect(() => {
    if (isMapaActive) {
      setCollapsed(true);
    }
  }, [isMapaActive]);

  // Quando Mapa está ativo, esconder completamente a sidebar
  if (isMapaActive) {
    return null;
  }

  return (
    <aside
      className={`
        flex flex-col bg-sidebar text-white transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-64"}
        min-h-screen
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary font-bold text-white text-sm shrink-0">
          A
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-semibold tracking-tight text-white leading-tight">
              Aramesul
            </h1>
            <p className="text-[11px] text-white/50 leading-tight">
              Painel Gerencial
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
              ${
                isActive
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-sidebar-hover hover:text-white"
              }
              ${collapsed ? "justify-center" : ""}
              `
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
