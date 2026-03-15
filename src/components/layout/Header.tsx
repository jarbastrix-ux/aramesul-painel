import { useLocation } from "react-router-dom";
import { Bell, Circle, User } from "lucide-react";
import { useEffect, useState } from "react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/vendas": "Vendas",
  "/compras": "Compras",
  "/relatorios": "Relatórios",
};

export default function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Painel";
  const [erpStatus, setErpStatus] = useState<"online" | "offline" | "checking">(
    "checking"
  );

  useEffect(() => {
    const checkErp = async () => {
      try {
        const url = import.meta.env.VITE_ERPNEXT_URL;
        const key = import.meta.env.VITE_API_KEY;
        const secret = import.meta.env.VITE_API_SECRET;
        const res = await fetch(
          `${url}/api/method/frappe.auth.get_logged_user`,
          {
            headers: { Authorization: `token ${key}:${secret}` },
          }
        );
        setErpStatus(res.ok ? "online" : "offline");
      } catch {
        setErpStatus("offline");
      }
    };
    checkErp();
    const interval = setInterval(checkErp, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-card border-b border-border">
      {/* Left: Page title */}
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>

      {/* Right: Status + Notifications + Avatar */}
      <div className="flex items-center gap-4">
        {/* ERPNext2 status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface text-xs font-medium">
          <Circle
            size={8}
            className={
              erpStatus === "online"
                ? "fill-success text-success"
                : erpStatus === "offline"
                ? "fill-danger text-danger"
                : "fill-warning text-warning"
            }
          />
          <span className="text-text-secondary">
            ERPNext2{" "}
            <span
              className={
                erpStatus === "online"
                  ? "text-success"
                  : erpStatus === "offline"
                  ? "text-danger"
                  : "text-warning"
              }
            >
              {erpStatus === "online"
                ? "Online"
                : erpStatus === "offline"
                ? "Offline"
                : "..."}
            </span>
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-primary cursor-pointer">
          <Bell size={18} />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white">
            <User size={16} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-text-primary leading-tight">
              Jarbas
            </p>
            <p className="text-[11px] text-text-secondary leading-tight">
              Administrador
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
