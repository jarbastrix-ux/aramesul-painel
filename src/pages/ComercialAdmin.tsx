import { useEffect, useState } from "react";
import QRCode from "qrcode";

// ── Types ──────────────────────────────────────────────────────────────────

interface Vendedor {
  id: number;
  codigo: string;
  nome: string;
  email?: string;
  telefone?: string;
  ativo: number;
  criado_em: string;
}

interface VeiculoComercial {
  id: number;
  placa: string;
  modelo: string;
  marca: string;
  ano?: number;
  ativo: number;
  criado_em: string;
}

interface KPI {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: string;
}

interface Jornada {
  id: number;
  vendedor_nome: string;
  veiculo_placa: string;
  km_inicial: number;
  km_final?: number;
  km_rodados?: number;
  status: string;
  iniciada_em: string;
  finalizada_em?: string;
}

interface Visita {
  id: number;
  vendedor_nome?: string;
  vendedor_codigo: string;
  nome_fantasia: string;
  cnpj: string;
  visitada_em: string;
  latitude?: number;
  longitude?: number;
}

interface Despesa {
  id: number;
  vendedor_codigo: string;
  tipo: string;
  valor: number;
  descricao?: string;
  registrada_em: string;
}

type Tab = "dashboard" | "vendedores" | "veiculos" | "jornadas" | "visitas" | "despesas";

// ── QR Modal ──────────────────────────────────────────────────────────────

function QRModal({ nome, codigo, tipo, onClose }: {
  nome: string; codigo: string; tipo: "vendedor" | "veiculo"; onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    const content = tipo === "vendedor" ? `VENDEDOR:${codigo}` : `VEICULO:${codigo}`;
    QRCode.toDataURL(content, { width: 280, margin: 2, color: { dark: "#000", light: "#fff" } })
      .then(setQrUrl);
  }, [codigo, tipo]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>QR Code</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {qrUrl
          ? <img src={qrUrl} alt="QR" style={{ width: 220, height: 220, borderRadius: 8, display: "block", margin: "0 auto 16px" }} />
          : <div style={{ width: 220, height: 220, background: "#1a1a2e", borderRadius: 8, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#666" }}>Gerando...</span>
            </div>
        }
        <p style={{ textAlign: "center", color: "#e2e8f0", fontWeight: 700, margin: "0 0 4px" }}>{nome}</p>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, margin: "0 0 16px", fontFamily: "monospace" }}>{codigo}</p>
        <button
          onClick={() => {
            const w = window.open("", "_blank");
            if (!w) return;
            w.document.write(`<html><head><title>QR - ${nome}</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui}img{width:240px}h2{margin:16px 0 4px}p{color:#666;margin:0}@media print{button{display:none}}</style></head><body><img src="${qrUrl}"/><h2>${nome}</h2><p>${codigo}</p><br/><button onclick="window.print()">🖨️ Imprimir</button></body></html>`);
            w.document.close();
          }}
          style={styles.btnPrimary}
        >
          🖨️ Imprimir QR Code
        </button>
      </div>
    </div>
  );
}

// ── Modais de Cadastro ────────────────────────────────────────────────────

function ModalVendedor({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!nome.trim()) { setErro("Nome é obrigatório"); return; }
    setLoading(true); setErro("");
    try {
      const r = await fetch("/api/comercial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "vendedor", nome, email, telefone }),
      });
      if (!r.ok) throw new Error();
      onSalvo(); onClose();
    } catch { setErro("Erro ao salvar. Verifique a conexão."); }
    finally { setLoading(false); }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Novo Vendedor</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={styles.label}>Nome completo *</label>
          <input style={styles.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do vendedor" autoFocus />
          <label style={styles.label}>E-mail</label>
          <input style={styles.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@aramesul.com.br" type="email" />
          <label style={styles.label}>Telefone</label>
          <input style={styles.input} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(41) 99999-9999" />
          {erro && <p style={{ color: "#ef4444", fontSize: 13 }}>⚠️ {erro}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            <button style={styles.btnPrimary} onClick={salvar} disabled={loading}>
              {loading ? "Salvando..." : "✅ Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalVeiculo({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [ano, setAno] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!placa || !modelo || !marca) { setErro("Placa, modelo e marca são obrigatórios"); return; }
    setLoading(true); setErro("");
    try {
      const r = await fetch("/api/comercial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "veiculo", placa, modelo, marca, ano: ano || null }),
      });
      if (!r.ok) throw new Error();
      onSalvo(); onClose();
    } catch { setErro("Erro ao salvar."); }
    finally { setLoading(false); }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Novo Veículo Comercial</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={styles.label}>Placa *</label>
          <input style={styles.input} value={placa} onChange={e => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABC1D23" maxLength={7} autoFocus />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={styles.label}>Marca *</label>
              <input style={styles.input} value={marca} onChange={e => setMarca(e.target.value)} placeholder="Volkswagen" />
            </div>
            <div>
              <label style={styles.label}>Modelo *</label>
              <input style={styles.input} value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Polo" />
            </div>
          </div>
          <label style={styles.label}>Ano</label>
          <input style={styles.input} value={ano} onChange={e => setAno(e.target.value)} placeholder="2024" type="number" />
          {erro && <p style={{ color: "#ef4444", fontSize: 13 }}>⚠️ {erro}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            <button style={styles.btnPrimary} onClick={salvar} disabled={loading}>
              {loading ? "Salvando..." : "✅ Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ComercialAdmin() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoComercial[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ nome: string; codigo: string; tipo: "vendedor" | "veiculo" } | null>(null);
  const [modalVendedor, setModalVendedor] = useState(false);
  const [modalVeiculo, setModalVeiculo] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [rv, rve, rj, rvis, rd] = await Promise.all([
        fetch("/api/comercial?tipo=vendedores").then(r => r.json()).catch(() => ({ dados: [] })),
        fetch("/api/comercial?tipo=veiculos").then(r => r.json()).catch(() => ({ dados: [] })),
        fetch("/api/relatorios-comercial?tipo=jornadas").then(r => r.json()).catch(() => ({ dados: [] })),
        fetch("/api/relatorios-comercial?tipo=visitas").then(r => r.json()).catch(() => ({ dados: [] })),
        fetch("/api/relatorios-comercial?tipo=despesas").then(r => r.json()).catch(() => ({ dados: [] })),
      ]);
      setVendedores(rv.dados || []);
      setVeiculos(rve.dados || []);
      setJornadas(rj.dados || []);
      setVisitas(rvis.dados || []);
      setDespesas(rd.dados || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function desativar(id: number, tipo: "vendedor" | "veiculo") {
    if (!confirm("Desativar este cadastro?")) return;
    await fetch(`/api/comercial?id=${id}&tipo=${tipo}`, {
      method: "DELETE",
    });
    carregar();
  }

  // KPIs
  const jornadasHoje = jornadas.filter(j => {
    const d = new Date(j.iniciada_em);
    const hoje = new Date();
    return d.toDateString() === hoje.toDateString();
  });
  const totalKm = jornadas.reduce((s, j) => s + (j.km_rodados || 0), 0);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const visitasHoje = visitas.filter(v => {
    const d = new Date(v.visitada_em);
    return d.toDateString() === new Date().toDateString();
  });

  const kpis: KPI[] = [
    { label: "Vendedores Ativos", value: String(vendedores.length), sub: "cadastrados", color: "#3b82f6", icon: "👥" },
    { label: "Veículos Comerciais", value: String(veiculos.length), sub: "disponíveis", color: "#8b5cf6", icon: "🚗" },
    { label: "Jornadas Hoje", value: String(jornadasHoje.length), sub: "em andamento ou finalizadas", color: "#10b981", icon: "📋" },
    { label: "Visitas Hoje", value: String(visitasHoje.length), sub: "clientes visitados", color: "#f59e0b", icon: "🤝" },
    { label: "KM Total", value: totalKm.toLocaleString("pt-BR"), sub: "km rodados (histórico)", color: "#06b6d4", icon: "🛣️" },
    { label: "Total Despesas", value: `R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, sub: "histórico", color: "#ef4444", icon: "💳" },
  ];

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "vendedores", label: "Vendedores", icon: "👥" },
    { id: "veiculos", label: "Veículos", icon: "🚗" },
    { id: "jornadas", label: "Jornadas", icon: "📋" },
    { id: "visitas", label: "Visitas", icon: "🤝" },
    { id: "despesas", label: "Despesas", icon: "💳" },
  ];

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <nav style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span style={styles.logoIcon}>🏭</span>
          <div>
            <div style={styles.logoTitle}>Comercial</div>
            <div style={styles.logoSub}>Aramesul</div>
          </div>
        </div>
        <div style={styles.navList}>
          {navItems.map(n => (
            <button
              key={n.id}
              style={{ ...styles.navItem, ...(tab === n.id ? styles.navItemActive : {}) }}
              onClick={() => setTab(n.id)}
            >
              <span style={styles.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
              {n.id === "vendedores" && <span style={styles.badge}>{vendedores.length}</span>}
              {n.id === "veiculos" && <span style={styles.badge}>{veiculos.length}</span>}
            </button>
          ))}
        </div>
        <div style={styles.sidebarFooter}>
          <button style={styles.refreshBtn} onClick={carregar}>🔄 Atualizar</button>
        </div>
      </nav>

      {/* Main */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>
              {navItems.find(n => n.id === tab)?.icon} {navItems.find(n => n.id === tab)?.label}
            </h1>
            <p style={styles.pageDate}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          {tab === "vendedores" && (
            <button style={styles.btnPrimary} onClick={() => setModalVendedor(true)}>+ Novo Vendedor</button>
          )}
          {tab === "veiculos" && (
            <button style={styles.btnPrimary} onClick={() => setModalVeiculo(true)}>+ Novo Veículo</button>
          )}
        </header>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingWrap}>
              <div style={styles.spinner} />
              <p style={{ color: "#64748b", marginTop: 12 }}>Carregando dados...</p>
            </div>
          ) : (

            <>
              {/* DASHBOARD */}
              {tab === "dashboard" && (
                <div>
                  <div style={styles.kpiGrid}>
                    {kpis.map(k => (
                      <div key={k.label} style={styles.kpiCard}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div>
                            <p style={styles.kpiLabel}>{k.label}</p>
                            <p style={{ ...styles.kpiValue, color: k.color }}>{k.value}</p>
                            <p style={styles.kpiSub}>{k.sub}</p>
                          </div>
                          <div style={{ ...styles.kpiIcon, background: k.color + "20" }}>
                            <span style={{ fontSize: 22 }}>{k.icon}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tabelas resumo */}
                  <div style={styles.gridTwo}>
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>Últimas Jornadas</h3>
                      {jornadas.length === 0
                        ? <p style={styles.empty}>Nenhuma jornada registrada</p>
                        : jornadas.slice(0, 5).map(j => (
                          <div key={j.id} style={styles.listRow}>
                            <div>
                              <p style={styles.listPrimary}>{j.vendedor_nome}</p>
                              <p style={styles.listSec}>{j.veiculo_placa} · {j.km_rodados ? j.km_rodados + " km" : "Em andamento"}</p>
                            </div>
                            <span style={{ ...styles.statusBadge, background: j.status === "ativa" ? "#10b98120" : "#64748b20", color: j.status === "ativa" ? "#10b981" : "#94a3b8" }}>
                              {j.status === "ativa" ? "🟢 Ativa" : "✅ Finalizada"}
                            </span>
                          </div>
                        ))
                      }
                    </div>

                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>Últimas Visitas</h3>
                      {visitas.length === 0
                        ? <p style={styles.empty}>Nenhuma visita registrada</p>
                        : visitas.slice(0, 5).map(v => (
                          <div key={v.id} style={styles.listRow}>
                            <div>
                              <p style={styles.listPrimary}>{v.nome_fantasia}</p>
                              <p style={styles.listSec}>{v.cnpj} · {v.vendedor_codigo}</p>
                            </div>
                            <span style={styles.listSec}>
                              {new Date(v.visitada_em).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Despesas por tipo */}
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Despesas por Tipo</h3>
                    {despesas.length === 0
                      ? <p style={styles.empty}>Nenhuma despesa registrada</p>
                      : (() => {
                        const porTipo = despesas.reduce((acc, d) => {
                          acc[d.tipo] = (acc[d.tipo] || 0) + d.valor;
                          return acc;
                        }, {} as Record<string, number>);
                        const max = Math.max(...Object.values(porTipo));
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                            {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, val]) => (
                              <div key={tipo}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ color: "#cbd5e1", fontSize: 14 }}>{tipo}</span>
                                  <span style={{ color: "#f59e0b", fontSize: 14, fontWeight: 600 }}>
                                    R$ {val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: "#f59e0b", borderRadius: 3, transition: "width 0.5s" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    }
                  </div>
                </div>
              )}

              {/* VENDEDORES */}
              {tab === "vendedores" && (
                <div style={styles.card}>
                  {vendedores.length === 0
                    ? <div style={styles.emptyState}><span style={{ fontSize: 48 }}>👥</span><p style={styles.emptyText}>Nenhum vendedor cadastrado</p><button style={styles.btnPrimary} onClick={() => setModalVendedor(true)}>+ Cadastrar Primeiro Vendedor</button></div>
                    : vendedores.map(v => (
                      <div key={v.id} style={styles.tableRow}>
                        <div style={styles.avatarCircle}>{v.nome[0]}</div>
                        <div style={{ flex: 1 }}>
                          <p style={styles.listPrimary}>{v.nome}</p>
                          <p style={styles.listSec}>Código: <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{v.codigo}</span>{v.email && ` · ${v.email}`}</p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={styles.btnQR} onClick={() => setQrModal({ nome: v.nome, codigo: String(v.id), tipo: "vendedor" })}>
                            📱 QR Code
                          </button>
                          <button style={styles.btnDelete} onClick={() => desativar(v.id, "vendedor")}>🗑️</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* VEÍCULOS */}
              {tab === "veiculos" && (
                <div style={styles.card}>
                  {veiculos.length === 0
                    ? <div style={styles.emptyState}><span style={{ fontSize: 48 }}>🚗</span><p style={styles.emptyText}>Nenhum veículo cadastrado</p><button style={styles.btnPrimary} onClick={() => setModalVeiculo(true)}>+ Cadastrar Primeiro Veículo</button></div>
                    : veiculos.map(v => (
                      <div key={v.id} style={styles.tableRow}>
                        <div style={{ ...styles.avatarCircle, background: "#8b5cf620", color: "#8b5cf6" }}>🚗</div>
                        <div style={{ flex: 1 }}>
                          <p style={styles.listPrimary}>{v.marca} {v.modelo}{v.ano ? ` · ${v.ano}` : ""}</p>
                          <p style={styles.listSec}>Placa: <span style={{ fontFamily: "monospace", color: "#8b5cf6", fontWeight: 700 }}>{v.placa}</span></p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={styles.btnQR} onClick={() => setQrModal({ nome: `${v.marca} ${v.modelo}`, codigo: v.placa, tipo: "veiculo" })}>
                            📱 QR Code
                          </button>
                          <button style={styles.btnDelete} onClick={() => desativar(v.id, "veiculo")}>🗑️</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* JORNADAS */}
              {tab === "jornadas" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Histórico de Jornadas ({jornadas.length})</h3>
                  {jornadas.length === 0
                    ? <p style={styles.empty}>Nenhuma jornada registrada ainda</p>
                    : jornadas.map(j => (
                      <div key={j.id} style={styles.tableRow}>
                        <div>
                          <p style={styles.listPrimary}>{j.vendedor_nome}</p>
                          <p style={styles.listSec}>{j.veiculo_placa} · KM {j.km_inicial}{j.km_final ? ` → ${j.km_final}` : ""}{j.km_rodados ? ` (${j.km_rodados} km)` : ""}</p>
                          <p style={styles.listSec}>{new Date(j.iniciada_em).toLocaleString("pt-BR")}</p>
                        </div>
                        <span style={{ ...styles.statusBadge, background: j.status === "ativa" ? "#10b98120" : "#64748b20", color: j.status === "ativa" ? "#10b981" : "#94a3b8" }}>
                          {j.status === "ativa" ? "🟢 Ativa" : "✅ Finalizada"}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* VISITAS */}
              {tab === "visitas" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Visitas Realizadas ({visitas.length})</h3>
                  {visitas.length === 0
                    ? <p style={styles.empty}>Nenhuma visita registrada ainda</p>
                    : visitas.map(v => (
                      <div key={v.id} style={styles.tableRow}>
                        <div style={{ ...styles.avatarCircle, background: "#f59e0b20", color: "#f59e0b" }}>🤝</div>
                        <div style={{ flex: 1 }}>
                          <p style={styles.listPrimary}>{v.nome_fantasia}</p>
                          <p style={styles.listSec}>CNPJ: {v.cnpj} · Vendedor: {v.vendedor_codigo}</p>
                          <p style={styles.listSec}>{new Date(v.visitada_em).toLocaleString("pt-BR")}</p>
                        </div>
                        {v.latitude && (
                          <a href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`} target="_blank" rel="noreferrer"
                            style={{ color: "#3b82f6", fontSize: 13, textDecoration: "none" }}>
                            📍 Ver mapa
                          </a>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}

              {/* DESPESAS */}
              {tab === "despesas" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Despesas ({despesas.length})</h3>
                  {despesas.length === 0
                    ? <p style={styles.empty}>Nenhuma despesa registrada ainda</p>
                    : despesas.map(d => (
                      <div key={d.id} style={styles.tableRow}>
                        <div style={{ ...styles.avatarCircle, background: "#ef444420", color: "#ef4444" }}>💳</div>
                        <div style={{ flex: 1 }}>
                          <p style={styles.listPrimary}>{d.tipo}{d.descricao ? ` — ${d.descricao}` : ""}</p>
                          <p style={styles.listSec}>Vendedor: {d.vendedor_codigo} · {new Date(d.registrada_em).toLocaleString("pt-BR")}</p>
                        </div>
                        <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 15 }}>
                          R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modais */}
      {qrModal && <QRModal {...qrModal} onClose={() => setQrModal(null)} />}
      {modalVendedor && <ModalVendedor onClose={() => setModalVendedor(false)} onSalvo={carregar} />}
      {modalVeiculo && <ModalVeiculo onClose={() => setModalVeiculo(false)} onSalvo={carregar} />}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", background: "#0a0f1a", color: "#e2e8f0", fontFamily: "'DM Sans', system-ui, sans-serif" },
  sidebar: { width: 220, background: "#0d1424", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarLogo: { padding: "24px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #1e293b" },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontWeight: 700, fontSize: 16, color: "#f1f5f9" },
  logoSub: { fontSize: 11, color: "#475569" },
  navList: { flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" },
  navItemActive: { background: "#1e3a5f", color: "#60a5fa" },
  navIcon: { fontSize: 16 },
  badge: { marginLeft: "auto", background: "#1e293b", color: "#94a3b8", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20 },
  sidebarFooter: { padding: 16, borderTop: "1px solid #1e293b" },
  refreshBtn: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "auto" },
  header: { padding: "24px 28px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 },
  pageDate: { fontSize: 13, color: "#475569", marginTop: 4 },
  content: { padding: 24, flex: 1 },
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300 },
  spinner: { width: 36, height: 36, border: "3px solid #1e293b", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 },
  kpiCard: { background: "#0d1424", border: "1px solid #1e293b", borderRadius: 12, padding: 20 },
  kpiLabel: { fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  kpiValue: { fontSize: 28, fontWeight: 700, margin: "8px 0 4px", lineHeight: 1 },
  kpiSub: { fontSize: 12, color: "#475569", margin: 0 },
  kpiIcon: { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  gridTwo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  card: { background: "#0d1424", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#cbd5e1", margin: "0 0 16px" },
  listRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1e293b" },
  listPrimary: { fontSize: 14, fontWeight: 600, color: "#e2e8f0", margin: 0 },
  listSec: { fontSize: 12, color: "#475569", margin: "2px 0 0" },
  statusBadge: { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 },
  tableRow: { display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #0f1a2e" },
  avatarCircle: { width: 40, height: 40, borderRadius: "50%", background: "#1e3a5f", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", textAlign: "center" },
  emptyText: { color: "#475569", fontSize: 15 },
  empty: { color: "#475569", fontSize: 14, textAlign: "center", padding: "24px 0" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  modal: { background: "#0d1424", border: "1px solid #1e293b", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#f1f5f9" },
  closeBtn: { background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" },
  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #1e293b", background: "#0a0f1a", color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
  btnPrimary: { padding: "10px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 4 },
  btnSecondary: { padding: "10px 20px", borderRadius: 8, border: "1px solid #1e293b", background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 1 },
  btnQR: { padding: "6px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" },
  btnDelete: { padding: "6px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#64748b", fontSize: 16, cursor: "pointer" },
};
