import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Shell from "./components/layout/Shell";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import Compras from "./pages/Compras";
import Relatorios from "./pages/Relatorios";
import ContasReceber from "./pages/ContasReceber";
import OEE from "./pages/OEE";
import DashboardExecutivo from "./pages/DashboardExecutivo";
import DRE from "./pages/DRE";
import MapaDistribuicao from "./pages/MapaDistribuicao";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

/**
 * Redireciona gestao.mistralsteel.com.br para /executivo como página inicial.
 * Para outros domínios, mantém o Dashboard padrão.
 */
function HomeRedirect() {
  const isGestao = window.location.hostname === "gestao.mistralsteel.com.br";
  if (isGestao) {
    return <Navigate to="/executivo" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/executivo" element={<DashboardExecutivo />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/contas-receber" element={<ContasReceber />} />
            <Route path="/oee" element={<OEE />} />
            <Route path="/dre" element={<DRE />} />
            <Route path="/mapa" element={<MapaDistribuicao />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
