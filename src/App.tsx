import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Shell from "./components/layout/Shell";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 rounded-xl border border-border bg-card">
      <p className="text-text-secondary text-sm">
        Página <span className="font-semibold text-text-primary">{title}</span>{" "}
        em construção
      </p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/vendas"
              element={<PlaceholderPage title="Vendas" />}
            />
            <Route
              path="/compras"
              element={<PlaceholderPage title="Compras" />}
            />
            <Route
              path="/relatorios"
              element={<PlaceholderPage title="Relatórios" />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
