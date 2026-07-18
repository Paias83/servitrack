import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, X, Wrench, ChevronLeft, Building2, Phone, Mail,
  MapPin, Package, ClipboardList, Loader2, AlertCircle, LogOut, Settings,
  Pencil, Trash2, Image as ImageIcon, Upload
} from "lucide-react";

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function App() {

  const [apiBase, setApiBase] = useState(
    import.meta.env.VITE_API_URL || "http://localhost:3333/api"
  );
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("servitrack_token"));
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem("servitrack_usuario");
    return raw ? JSON.parse(raw) : null;
  });

  const apiFetch = useCallback(
    async (path, options = {}) => {
      let res;
      try {
        res = await fetch(apiBase + path, {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
      } catch (e) {
        throw new Error(
          `Não foi possível conectar à API em ${apiBase}. Verifique se o backend está rodando e se o endereço está correto.`
        );
      }
      if (res.status === 204) return null;
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        /* resposta sem corpo */
      }
      if (!res.ok) {
        throw new Error((data && data.erro) || `Erro ${res.status} ao chamar a API.`);
      }
      return data;
    },
    [apiBase, token]
  );

  const uploadFoto = useCallback(
    async (file) => {
      const form = new FormData();
      form.append("foto", file);
      let res;
      try {
        res = await fetch(apiBase + "/uploads", {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: form,
        });
      } catch (e) {
        throw new Error(`Não foi possível conectar à API em ${apiBase} para enviar a foto.`);
      }
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        /* resposta sem corpo */
      }
      if (!res.ok) {
        throw new Error((data && data.erro) || `Erro ${res.status} ao enviar a foto.`);
      }
      return data.url;
    },
    [apiBase, token]
  );

  if (!token) {
    return (
      <AuthScreen
        apiBase={apiBase}
        setApiBase={setApiBase}
        showApiConfig={showApiConfig}
        setShowApiConfig={setShowApiConfig}
        apiFetch={apiFetch}
        onAuth={(t, u) => {
          localStorage.setItem("servitrack_token", t);
          localStorage.setItem("servitrack_usuario", JSON.stringify(u));
          setToken(t);
          setUsuario(u);
        }}
      />
    );
  }

  return (
    <MainApp
      apiFetch={apiFetch}
      uploadFoto={uploadFoto}
      usuario={usuario}
      onLogout={() => {
        localStorage.removeItem("servitrack_token");
        localStorage.removeItem("servitrack_usuario");
        setToken(null);
        setUsuario(null);
      }}
    />
  );
}

/* ---------- Auth ---------- */

function AuthScreen({ apiBase, setApiBase, showApiConfig, setShowApiConfig, apiFetch, onAuth }) {
  const [mode, setMode] = useState("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErro("");
    setBusy(true);
    try {
      const data = await apiFetch(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: mode === "login" ? { email, senha } : { nome, email, senha },
      });
      onAuth(data.token, data.usuario);
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gm-root">
      <style>{CSS}</style>
      <div className="gm-auth-wrap">
        <form className="gm-auth-card" onSubmit={submit}>
          <div className="gm-brand gm-auth-brand">
            <Wrench size={20} />
            <span>ServiTrack</span>
          </div>
          <div className="gm-auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "gm-tab active" : "gm-tab"}
              onClick={() => setMode("login")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={mode === "register" ? "gm-tab active" : "gm-tab"}
              onClick={() => setMode("register")}
            >
              Criar conta
            </button>
          </div>

          {mode === "register" && (
            <Field label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          )}
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />

          {erro && (
            <div className="gm-error">
              <AlertCircle size={13} /> {erro}
            </div>
          )}

          <button className="gm-btn-primary gm-auth-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 size={14} className="gm-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            className="gm-api-toggle"
            onClick={() => setShowApiConfig((s) => !s)}
          >
            <Settings size={12} /> Endereço da API
          </button>
          {showApiConfig && (
            <Field
              label="URL base da API"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="http://localhost:3333/api"
            />
          )}
        </form>
      </div>
    </div>
  );
}

/* ---------- Main app ---------- */

function MainApp({ apiFetch, uploadFoto, usuario, onLogout }) {
  const [view, setView] = useState("clientes");
  const [clienteId, setClienteId] = useState(null);
  const [equipamentoId, setEquipamentoId] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [search, setSearch] = useState("");

  const [cliente, setCliente] = useState(null);
  const [equipamentosDoCliente, setEquipamentosDoCliente] = useState([]);
  const [ultimaPorEquip, setUltimaPorEquip] = useState({});
  const [loadingEquip, setLoadingEquip] = useState(false);

  const [equipamento, setEquipamento] = useState(null);
  const [manutencoes, setManutencoes] = useState([]);
  const [loadingManut, setLoadingManut] = useState(false);

  const [modal, setModal] = useState(null); // { type: 'cliente'|'equipamento'|'manutencao', data: null|object }
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  function abrirModal(type, data = null) {
    setModal({ type, data });
  }

  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
    setErro("");
    try {
      const data = await apiFetch("/clientes");
      setClientes(data);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoadingClientes(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  async function abrirCliente(id) {
    setClienteId(id);
    setEquipamentosDoCliente([]);
    setUltimaPorEquip({});
    setView("cliente");
    setLoadingEquip(true);
    setErro("");
    try {
      const [clienteData, equipData] = await Promise.all([
        apiFetch(`/clientes/${id}`),
        apiFetch(`/clientes/${id}/equipamentos`),
      ]);
      setCliente(clienteData);
      setEquipamentosDoCliente(equipData);
      const entries = await Promise.all(
        equipData.map(async (eq) => {
          try {
            const ult = await apiFetch(`/equipamentos/${eq.id}/ultima-manutencao`);
            return [eq.id, ult];
          } catch {
            return [eq.id, null];
          }
        })
      );
      setUltimaPorEquip(Object.fromEntries(entries));
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoadingEquip(false);
    }
  }

  async function abrirEquipamento(id) {
    setEquipamentoId(id);
    setView("equipamento");
    setLoadingManut(true);
    setErro("");
    try {
      const [equipData, manutData] = await Promise.all([
        apiFetch(`/equipamentos/${id}`),
        apiFetch(`/equipamentos/${id}/manutencoes`),
      ]);
      setEquipamento(equipData);
      setManutencoes(manutData);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoadingManut(false);
    }
  }

  async function salvarCliente(data, editando) {
    setBusy(true);
    setErro("");
    try {
      if (editando) {
        await apiFetch(`/clientes/${editando.id}`, { method: "PUT", body: data });
        if (clienteId === editando.id) await abrirCliente(editando.id);
      } else {
        await apiFetch("/clientes", { method: "POST", body: data });
      }
      await loadClientes();
      setModal(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function excluirCliente(c) {
    if (!confirm(`Excluir o cliente "${c.nome}"? Isso também apaga seus equipamentos e o histórico de manutenções.`)) return;
    setErro("");
    try {
      await apiFetch(`/clientes/${c.id}`, { method: "DELETE" });
      if (clienteId === c.id) {
        setView("clientes");
        setClienteId(null);
      }
      await loadClientes();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvarEquipamento(data, editando) {
    setBusy(true);
    setErro("");
    try {
      if (editando) {
        await apiFetch(`/equipamentos/${editando.id}`, { method: "PUT", body: data });
      } else {
        await apiFetch(`/clientes/${clienteId}/equipamentos`, { method: "POST", body: data });
      }
      await abrirCliente(clienteId);
      setModal(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function excluirEquipamento(eq) {
    if (!confirm(`Excluir o equipamento "${eq.tipo}"? Isso também apaga seu histórico de manutenções.`)) return;
    setErro("");
    try {
      await apiFetch(`/equipamentos/${eq.id}`, { method: "DELETE" });
      if (equipamentoId === eq.id) setView("cliente");
      await abrirCliente(clienteId);
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvarManutencao(data, editando) {
    setBusy(true);
    setErro("");
    try {
      if (editando) {
        await apiFetch(`/manutencoes/${editando.id}`, { method: "PUT", body: data });
      } else {
        await apiFetch(`/equipamentos/${equipamentoId}/manutencoes`, { method: "POST", body: data });
      }
      await abrirEquipamento(equipamentoId);
      setModal(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function excluirManutencao(m) {
    if (!confirm("Excluir este registro de manutenção?")) return;
    setErro("");
    try {
      await apiFetch(`/manutencoes/${m.id}`, { method: "DELETE" });
      await abrirEquipamento(equipamentoId);
    } catch (e) {
      setErro(e.message);
    }
  }

  const clientesFiltrados = clientes.filter((c) => {
    const termo = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(termo) ||
      (c.apelido && c.apelido.toLowerCase().includes(termo))
    );
  });

  return (
    <div className="gm-root">
      <style>{CSS}</style>

      <header className="gm-header">
        <div className="gm-brand">
          <Wrench size={18} />
          <span>ServiTrack</span>
          <span className="gm-tagline">gestão de manutenções</span>
        </div>
        <div className="gm-header-right">
          {view !== "clientes" && (
            <button
              className="gm-back"
              onClick={() => {
                if (view === "equipamento") setView("cliente");
                else {
                  setView("clientes");
                  setClienteId(null);
                }
              }}
            >
              <ChevronLeft size={16} /> Voltar
            </button>
          )}
          <span className="gm-user">{usuario?.nome}</span>
          <button className="gm-icon-btn" onClick={onLogout} title="Sair">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {erro && (
        <div className="gm-banner-error">
          <AlertCircle size={14} /> {erro}
        </div>
      )}

      {view === "clientes" &&
        (loadingClientes ? (
          <LoadingBlock texto="Carregando clientes…" />
        ) : (
          <ClientesView
            clientes={clientesFiltrados}
            search={search}
            setSearch={setSearch}
            onOpen={abrirCliente}
            onAdd={() => abrirModal("cliente")}
            onEdit={(c) => abrirModal("cliente", c)}
            onDelete={excluirCliente}
          />
        ))}

      {view === "cliente" &&
        (loadingEquip ? (
          <LoadingBlock texto="Carregando equipamentos…" />
        ) : (
          cliente && (
            <ClienteView
              cliente={cliente}
              equipamentos={equipamentosDoCliente}
              ultimaPorEquip={ultimaPorEquip}
              onOpenEquip={abrirEquipamento}
              onAdd={() => abrirModal("equipamento")}
              onEditCliente={(c) => abrirModal("cliente", c)}
              onDeleteCliente={excluirCliente}
              onEditEquip={(eq) => abrirModal("equipamento", eq)}
              onDeleteEquip={excluirEquipamento}
            />
          )
        ))}

      {view === "equipamento" &&
        (loadingManut ? (
          <LoadingBlock texto="Carregando histórico…" />
        ) : (
          equipamento && (
            <EquipamentoView
              equipamento={equipamento}
              manutencoes={manutencoes}
              onAdd={() => abrirModal("manutencao")}
              onEditEquip={() => abrirModal("equipamento", equipamento)}
              onDeleteEquip={() => excluirEquipamento(equipamento)}
              onEditManut={(m) => abrirModal("manutencao", m)}
              onDeleteManut={excluirManutencao}
            />
          )
        ))}

      {modal?.type === "cliente" && (
        <ClienteModal
          busy={busy}
          initial={modal.data}
          onClose={() => setModal(null)}
          onSave={(data) => salvarCliente(data, modal.data)}
        />
      )}
      {modal?.type === "equipamento" && (
        <EquipamentoModal
          busy={busy}
          initial={modal.data}
          uploadFoto={uploadFoto}
          onClose={() => setModal(null)}
          onSave={(data) => salvarEquipamento(data, modal.data)}
        />
      )}
      {modal?.type === "manutencao" && (
        <ManutencaoModal
          busy={busy}
          initial={modal.data}
          uploadFoto={uploadFoto}
          onClose={() => setModal(null)}
          onSave={(data) => salvarManutencao(data, modal.data)}
        />
      )}
    </div>
  );
}

function LoadingBlock({ texto }) {
  return (
    <div className="gm-loading">
      <Loader2 size={20} className="gm-spin" />
      <span>{texto}</span>
    </div>
  );
}

/* ---------- Views ---------- */

function ClientesView({ clientes, search, setSearch, onOpen, onAdd, onEdit, onDelete }) {
  return (
    <main className="gm-main">
      <div className="gm-toolbar">
        <div className="gm-search">
          <Search size={15} />
          <input
            placeholder="Buscar por nome ou apelido…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="gm-btn-primary" onClick={onAdd}>
          <Plus size={15} /> Novo cliente
        </button>
      </div>

      {clientes.length === 0 ? (
        <EmptyState
          icon={<Building2 size={26} />}
          title="Nenhum cliente cadastrado"
          text="Cadastre o primeiro cliente para começar a registrar equipamentos."
        />
      ) : (
        <div className="gm-grid">
          {clientes.map((c) => (
            <div key={c.id} className="gm-card-wrap">
              <button className="gm-card" onClick={() => onOpen(c.id)}>
                <div className="gm-card-top">
                  <div className="gm-avatar">{c.nome.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <div className="gm-card-title">{c.nome}</div>
                    {c.apelido && <div className="gm-card-nickname">"{c.apelido}"</div>}
                    <div className="gm-card-sub">
                      {c._count?.equipamentos ?? 0} equipamento
                      {c._count?.equipamentos === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                {c.telefone && (
                  <div className="gm-card-row">
                    <Phone size={12} /> {c.telefone}
                  </div>
                )}
                {c.endereco && (
                  <div className="gm-card-row">
                    <MapPin size={12} /> {c.endereco}
                  </div>
                )}
              </button>
              <CardActions onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function ClienteView({
  cliente,
  equipamentos,
  ultimaPorEquip,
  onOpenEquip,
  onAdd,
  onEditCliente,
  onDeleteCliente,
  onEditEquip,
  onDeleteEquip,
}) {
  return (
    <main className="gm-main">
      <div className="gm-client-header">
        <div className="gm-avatar gm-avatar-lg">{cliente.nome.slice(0, 1).toUpperCase()}</div>
        <div className="gm-client-info">
          <h1>{cliente.nome}</h1>
          {cliente.apelido && <div className="gm-client-nickname">"{cliente.apelido}"</div>}
          <div className="gm-client-meta">
            {cliente.telefone && (
              <span>
                <Phone size={12} /> {cliente.telefone}
              </span>
            )}
            {cliente.email && (
              <span>
                <Mail size={12} /> {cliente.email}
              </span>
            )}
            {cliente.endereco && (
              <span>
                <MapPin size={12} /> {cliente.endereco}
              </span>
            )}
          </div>
        </div>
        <CardActions onEdit={() => onEditCliente(cliente)} onDelete={() => onDeleteCliente(cliente)} />
      </div>

      <div className="gm-toolbar">
        <div className="gm-section-label">
          <Package size={14} /> Equipamentos
        </div>
        <button className="gm-btn-primary" onClick={onAdd}>
          <Plus size={15} /> Novo equipamento
        </button>
      </div>

      {equipamentos.length === 0 ? (
        <EmptyState
          icon={<Package size={26} />}
          title="Nenhum equipamento cadastrado"
          text="Adicione um equipamento para começar a registrar manutenções."
        />
      ) : (
        <div className="gm-grid">
          {equipamentos.map((eq) => {
            const ult = ultimaPorEquip[eq.id];
            return (
              <div key={eq.id} className="gm-card-wrap">
                <button className="gm-card gm-plate-card" onClick={() => onOpenEquip(eq.id)}>
                  <div className="gm-plate-corner tl" />
                  <div className="gm-plate-corner tr" />
                  <div className="gm-plate-corner bl" />
                  <div className="gm-plate-corner br" />
                  {eq.fotoUrl && (
                    <img src={eq.fotoUrl} alt="" className="gm-equip-thumb" />
                  )}
                  <div className="gm-card-title">{eq.tipo}</div>
                  <div className="gm-mono gm-card-sub">
                    {eq.marca} {eq.modelo && `· ${eq.modelo}`}
                  </div>
                  <div className="gm-mono gm-serial">S/N {eq.numeroSerie || "—"}</div>
                  <div className="gm-divider" />
                  {ult ? (
                    <div className="gm-last-int">
                      <span className="gm-tag">{fmtDate(ult.data)}</span>
                      <span className="gm-last-desc">{ult.tipoServico}</span>
                    </div>
                  ) : (
                    <div className="gm-last-int gm-muted">Sem manutenções registradas</div>
                  )}
                </button>
                <CardActions onEdit={() => onEditEquip(eq)} onDelete={() => onDeleteEquip(eq)} />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function EquipamentoView({ equipamento, manutencoes, onAdd, onEditEquip, onDeleteEquip, onEditManut, onDeleteManut }) {
  const ultima = manutencoes[0];
  return (
    <main className="gm-main">
      <div className="gm-nameplate">
        <div className="gm-plate-corner tl" />
        <div className="gm-plate-corner tr" />
        <div className="gm-plate-corner bl" />
        <div className="gm-plate-corner br" />
        <div className="gm-nameplate-top">
          <div className="gm-nameplate-eyebrow">Ficha do equipamento</div>
          <CardActions onEdit={onEditEquip} onDelete={onDeleteEquip} />
        </div>
        <div className="gm-nameplate-head">
          {equipamento.fotoUrl && (
            <a href={equipamento.fotoUrl} target="_blank" rel="noreferrer">
              <img src={equipamento.fotoUrl} alt="" className="gm-nameplate-foto" />
            </a>
          )}
          <h1>{equipamento.tipo}</h1>
        </div>
        <div className="gm-nameplate-grid">
          <div>
            <span className="gm-label">Marca</span>
            <span className="gm-mono">{equipamento.marca || "—"}</span>
          </div>
          <div>
            <span className="gm-label">Modelo</span>
            <span className="gm-mono">{equipamento.modelo || "—"}</span>
          </div>
          <div>
            <span className="gm-label">Nº de série</span>
            <span className="gm-mono">{equipamento.numeroSerie || "—"}</span>
          </div>
          <div>
            <span className="gm-label">Instalado em</span>
            <span className="gm-mono">{fmtDate(equipamento.dataInstalacao)}</span>
          </div>
          <div>
            <span className="gm-label">Cliente</span>
            <span className="gm-mono">{equipamento.cliente?.nome || "—"}</span>
          </div>
        </div>
        {equipamento.observacoes && (
          <p className="gm-nameplate-obs">{equipamento.observacoes}</p>
        )}
      </div>

      <div className="gm-highlight">
        <div className="gm-section-label">
          <Wrench size={14} /> Última intervenção
        </div>
        {ultima ? (
          <div className="gm-highlight-body">
            <span className="gm-tag">{fmtDate(ultima.data)}</span>
            <div>
              <div className="gm-card-title">{ultima.tipoServico}</div>
              <div className="gm-card-sub">{ultima.descricao}</div>
              {ultima.pecas?.length > 0 && (
                <div className="gm-pecas">Peças: {ultima.pecas.join(", ")}</div>
              )}
              {ultima.tecnico && <div className="gm-card-sub">Técnico: {ultima.tecnico}</div>}
              <FotoGaleria fotos={ultima.fotos} />
            </div>
          </div>
        ) : (
          <div className="gm-muted">Nenhuma intervenção registrada ainda.</div>
        )}
      </div>

      <div className="gm-toolbar">
        <div className="gm-section-label">
          <ClipboardList size={14} /> Histórico completo
        </div>
        <button className="gm-btn-primary" onClick={onAdd}>
          <Plus size={15} /> Registrar manutenção
        </button>
      </div>

      {manutencoes.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={26} />}
          title="Sem histórico"
          text="Registre a primeira manutenção deste equipamento."
        />
      ) : (
        <div className="gm-timeline">
          {manutencoes.map((m) => (
            <div key={m.id} className="gm-timeline-item">
              <div className="gm-timeline-date gm-mono">{fmtDate(m.data)}</div>
              <div className="gm-timeline-dot" />
              <div className="gm-timeline-content">
                <div className="gm-timeline-content-top">
                  <div className="gm-card-title">{m.tipoServico}</div>
                  <CardActions onEdit={() => onEditManut(m)} onDelete={() => onDeleteManut(m)} />
                </div>
                <div className="gm-card-sub">{m.descricao}</div>
                {m.pecas?.length > 0 && (
                  <div className="gm-pecas">Peças substituídas: {m.pecas.join(", ")}</div>
                )}
                {m.tecnico && <div className="gm-card-sub">Técnico: {m.tecnico}</div>}
                <FotoGaleria fotos={m.fotos} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function CardActions({ onEdit, onDelete }) {
  return (
    <div className="gm-card-actions">
      <button
        type="button"
        className="gm-icon-btn"
        title="Editar"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        className="gm-icon-btn gm-icon-btn-danger"
        title="Excluir"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function FotoGaleria({ fotos }) {
  if (!fotos || fotos.length === 0) return null;
  return (
    <div className="gm-galeria">
      {fotos.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="" className="gm-galeria-thumb" />
        </a>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="gm-empty">
      <div className="gm-empty-icon">{icon}</div>
      <div className="gm-empty-title">{title}</div>
      <div className="gm-empty-text">{text}</div>
    </div>
  );
}

/* ---------- Modals ---------- */

function ModalShell({ title, onClose, children, onSubmit, busy }) {
  return (
    <div className="gm-overlay" onClick={onClose}>
      <form className="gm-modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="gm-modal-header">
          <span>{title}</span>
          <button type="button" className="gm-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="gm-modal-body">{children}</div>
        <div className="gm-modal-footer">
          <button type="button" className="gm-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="gm-btn-primary" disabled={busy}>
            {busy ? <Loader2 size={14} className="gm-spin" /> : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="gm-field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function FotoField({ label, url, enviando, onChange, onRemove }) {
  return (
    <div className="gm-field">
      <span>{label}</span>
      {url ? (
        <div className="gm-foto-preview-wrap">
          <img src={url} alt="" className="gm-foto-preview" />
          <button type="button" className="gm-foto-remove" onClick={onRemove}>
            <X size={12} /> Remover
          </button>
        </div>
      ) : (
        <label className="gm-upload-btn">
          {enviando ? <Loader2 size={14} className="gm-spin" /> : <Upload size={14} />}
          <span>{enviando ? "Enviando…" : "Escolher foto"}</span>
          <input type="file" accept="image/*" onChange={onChange} disabled={enviando} hidden />
        </label>
      )}
    </div>
  );
}

function FotosField({ label, urls, enviando, onChange, onRemove }) {
  return (
    <div className="gm-field">
      <span>{label}</span>
      {urls.length > 0 && (
        <div className="gm-fotos-grid">
          {urls.map((url) => (
            <div key={url} className="gm-foto-thumb-wrap">
              <img src={url} alt="" className="gm-foto-thumb" />
              <button type="button" className="gm-foto-thumb-remove" onClick={() => onRemove(url)}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="gm-upload-btn">
        {enviando ? <Loader2 size={14} className="gm-spin" /> : <Upload size={14} />}
        <span>{enviando ? "Enviando…" : "Adicionar fotos"}</span>
        <input type="file" accept="image/*" multiple onChange={onChange} disabled={enviando} hidden />
      </label>
    </div>
  );
}

function ClienteModal({ onClose, onSave, busy, initial }) {
  const [nome, setNome] = useState(initial?.nome || "");
  const [apelido, setApelido] = useState(initial?.apelido || "");
  const [telefone, setTelefone] = useState(initial?.telefone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [endereco, setEndereco] = useState(initial?.endereco || "");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!nome.trim()) return setErr("Informe o nome do cliente.");
    onSave({ nome: nome.trim(), apelido, telefone, email, endereco });
  }

  return (
    <ModalShell title={initial ? "Editar cliente" : "Novo cliente"} onClose={onClose} onSubmit={submit} busy={busy}>
      <Field label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      <Field
        label="Apelido / nome comercial"
        value={apelido}
        onChange={(e) => setApelido(e.target.value)}
        placeholder="Ex: nome pelo qual o cliente é conhecido"
      />
      <Field label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      <Field label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      <Field label="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      {err && (
        <div className="gm-error">
          <AlertCircle size={13} /> {err}
        </div>
      )}
    </ModalShell>
  );
}

function EquipamentoModal({ onClose, onSave, busy, initial, uploadFoto }) {
  const [tipo, setTipo] = useState(initial?.tipo || "");
  const [marca, setMarca] = useState(initial?.marca || "");
  const [modelo, setModelo] = useState(initial?.modelo || "");
  const [numeroSerie, setNumeroSerie] = useState(initial?.numeroSerie || "");
  const [dataInstalacao, setDataInstalacao] = useState(initial?.dataInstalacao?.slice(0, 10) || "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes || "");
  const [fotoUrl, setFotoUrl] = useState(initial?.fotoUrl || "");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [err, setErr] = useState("");

  async function handleFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setEnviandoFoto(true);
    try {
      const url = await uploadFoto(file);
      setFotoUrl(url);
    } catch (err) {
      setErr(err.message);
    } finally {
      setEnviandoFoto(false);
      e.target.value = "";
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!tipo.trim()) return setErr("Informe o tipo/nome do equipamento.");
    onSave({
      tipo: tipo.trim(),
      marca,
      modelo,
      numeroSerie,
      dataInstalacao: dataInstalacao || null,
      observacoes,
      fotoUrl: fotoUrl || null,
    });
  }

  return (
    <ModalShell
      title={initial ? "Editar equipamento" : "Novo equipamento"}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <FotoField
        label="Foto do equipamento"
        url={fotoUrl}
        enviando={enviandoFoto}
        onChange={handleFoto}
        onRemove={() => setFotoUrl("")}
      />
      <Field
        label="Tipo / nome *"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        autoFocus
        placeholder="Ex: Ar-condicionado split"
      />
      <Field label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
      <Field label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
      <Field label="Número de série" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
      <Field
        label="Data de instalação"
        type="date"
        value={dataInstalacao}
        onChange={(e) => setDataInstalacao(e.target.value)}
      />
      <label className="gm-field">
        <span>Observações</span>
        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
      </label>
      {err && (
        <div className="gm-error">
          <AlertCircle size={13} /> {err}
        </div>
      )}
    </ModalShell>
  );
}

function ManutencaoModal({ onClose, onSave, busy, initial, uploadFoto }) {
  const [data, setData] = useState(
    initial?.data?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  );
  const [tipoServico, setTipoServico] = useState(initial?.tipoServico || "");
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [pecasText, setPecasText] = useState((initial?.pecas || []).join(", "));
  const [tecnico, setTecnico] = useState(initial?.tecnico || "");
  const [fotos, setFotos] = useState(initial?.fotos || []);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [err, setErr] = useState("");

  async function handleFotos(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setErr("");
    setEnviandoFoto(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadFoto(f)));
      setFotos((prev) => [...prev, ...urls]);
    } catch (err) {
      setErr(err.message);
    } finally {
      setEnviandoFoto(false);
      e.target.value = "";
    }
  }

  function removerFoto(url) {
    setFotos((prev) => prev.filter((f) => f !== url));
  }

  function submit(e) {
    e.preventDefault();
    if (!tipoServico.trim()) return setErr("Informe o tipo de serviço.");
    if (!data) return setErr("Informe a data da intervenção.");
    const pecas = pecasText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    onSave({ data, tipoServico: tipoServico.trim(), descricao, pecas, fotos, tecnico });
  }

  return (
    <ModalShell
      title={initial ? "Editar manutenção" : "Registrar manutenção"}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <Field label="Data *" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      <Field
        label="Tipo de serviço *"
        value={tipoServico}
        onChange={(e) => setTipoServico(e.target.value)}
        placeholder="Ex: Manutenção preventiva, Troca de peça, Reparo…"
        autoFocus
      />
      <label className="gm-field">
        <span>Descrição / observações</span>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
      </label>
      <Field
        label="Peças substituídas (separadas por vírgula)"
        value={pecasText}
        onChange={(e) => setPecasText(e.target.value)}
        placeholder="Ex: Filtro, Capacitor, Correia"
      />
      <Field label="Técnico responsável" value={tecnico} onChange={(e) => setTecnico(e.target.value)} />
      <FotosField
        label="Fotos (peça trocada, antes/depois…)"
        urls={fotos}
        enviando={enviandoFoto}
        onChange={handleFotos}
        onRemove={removerFoto}
      />
      {err && (
        <div className="gm-error">
          <AlertCircle size={13} /> {err}
        </div>
      )}
    </ModalShell>
  );
}

/* ---------- CSS ---------- */

const CSS = `
.gm-root {
  --bg: #0E2A3A;
  --surface: #123246;
  --surface-raised: #1B4A63;
  --border: rgba(237,234,224,0.12);
  --grid-line: rgba(237,234,224,0.05);
  --text: #EDEAE0;
  --text-muted: #9FB4BF;
  --brass: #C08552;
  --brass-soft: rgba(192,133,82,0.16);
  --teal: #4FA8A0;
  --amber: #E0A458;
  --danger: #C97A66;
  font-family: 'Inter', sans-serif;
  color: var(--text);
  background:
    linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0/100% 28px,
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0/28px 100%,
    var(--bg);
  min-height: 100%;
  border-radius: 12px;
  overflow: hidden;
}
.gm-root * { box-sizing: border-box; }
.gm-spin { animation: gm-spin 0.9s linear infinite; }
@keyframes gm-spin { to { transform: rotate(360deg); } }

.gm-loading {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 80px 20px; color: var(--text-muted); font-size: 14px;
}

.gm-banner-error {
  display: flex; align-items: center; gap: 8px; margin: 16px 24px 0;
  background: rgba(201,122,102,0.15); border: 1px solid rgba(201,122,102,0.4);
  color: var(--danger); padding: 10px 14px; border-radius: 8px; font-size: 13px;
}

.gm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--border);
  background: rgba(14,42,58,0.6); backdrop-filter: blur(4px);
}
.gm-header-right { display: flex; align-items: center; gap: 14px; }
.gm-user { font-size: 12px; color: var(--text-muted); }
.gm-brand {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px;
  letter-spacing: 0.02em; color: var(--brass);
}
.gm-back {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; color: var(--text-muted);
  font-size: 13px; cursor: pointer; padding: 6px 8px; border-radius: 6px;
  font-family: 'Inter', sans-serif;
}
.gm-back:hover { color: var(--text); background: var(--surface); }

.gm-main { padding: 24px; max-width: 920px; margin: 0 auto; }

.gm-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin: 24px 0 16px;
}
.gm-section-label {
  display: flex; align-items: center; gap: 6px;
  font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px;
  color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
}
.gm-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 12px; flex: 1; max-width: 320px;
  color: var(--text-muted);
}
.gm-search input {
  background: none; border: none; outline: none; color: var(--text);
  font-family: 'Inter', sans-serif; font-size: 13px; width: 100%;
}

.gm-btn-primary {
  display: flex; align-items: center; gap: 6px;
  background: var(--brass); color: #12222B; border: none;
  padding: 9px 14px; border-radius: 8px; font-weight: 600; font-size: 13px;
  cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap;
}
.gm-btn-primary:hover { filter: brightness(1.08); }
.gm-btn-primary:disabled { opacity: 0.6; cursor: default; }
.gm-btn-ghost {
  background: none; border: 1px solid var(--border); color: var(--text-muted);
  padding: 9px 14px; border-radius: 8px; font-size: 13px; cursor: pointer;
  font-family: 'Inter', sans-serif;
}
.gm-icon-btn {
  background: none; border: none; color: var(--text-muted); cursor: pointer;
  padding: 4px; display: flex;
}
.gm-icon-btn:hover { color: var(--text); }
.gm-icon-btn-danger:hover { color: var(--danger); }

.gm-card-wrap { position: relative; }
.gm-card-actions {
  position: absolute; top: 10px; right: 10px; display: flex; gap: 2px;
  background: var(--surface); border-radius: 6px; padding: 2px;
  opacity: 0; transition: opacity 0.15s;
}
.gm-card-wrap:hover .gm-card-actions,
.gm-nameplate-top .gm-card-actions,
.gm-timeline-content-top .gm-card-actions { opacity: 1; }
.gm-nameplate-top .gm-card-actions,
.gm-timeline-content-top .gm-card-actions { position: static; background: none; padding: 0; }

.gm-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.gm-card {
  position: relative; text-align: left; background: var(--surface);
  border: 1px solid var(--border); border-radius: 10px; padding: 16px;
  cursor: pointer; color: var(--text); font-family: 'Inter', sans-serif;
  display: flex; flex-direction: column; gap: 6px; transition: border-color 0.15s, transform 0.15s;
}
.gm-card:hover { border-color: var(--brass); transform: translateY(-1px); }
.gm-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.gm-card-title { font-weight: 600; font-size: 14px; }
.gm-card-nickname { font-size: 11px; color: var(--brass); font-style: italic; margin-top: 1px; }
.gm-card-sub { font-size: 12px; color: var(--text-muted); }
.gm-card-row {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);
}

.gm-avatar {
  width: 36px; height: 36px; border-radius: 8px; background: var(--brass-soft);
  color: var(--brass); display: flex; align-items: center; justify-content: center;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; flex-shrink: 0;
}
.gm-avatar-lg { width: 52px; height: 52px; font-size: 20px; border-radius: 10px; }

.gm-client-header {
  display: flex; align-items: center; gap: 16px; padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}
.gm-client-info { flex: 1; }
.gm-client-header h1 {
  font-family: 'Space Grotesk', sans-serif; font-size: 22px; margin: 0 0 6px;
}
.gm-client-nickname {
  font-size: 12px; color: var(--brass); font-style: italic; margin: -4px 0 8px;
}
.gm-client-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--text-muted); }
.gm-client-meta span { display: flex; align-items: center; gap: 5px; }

.gm-mono { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--text-muted); }
.gm-serial { margin-top: 2px; }
.gm-divider { height: 1px; background: var(--border); margin: 6px 0; }

.gm-plate-card { padding: 18px; }
.gm-plate-corner {
  position: absolute; width: 5px; height: 5px; border-radius: 50%;
  background: var(--brass); opacity: 0.55;
}
.gm-plate-corner.tl { top: 8px; left: 8px; }
.gm-plate-corner.tr { top: 8px; right: 8px; }
.gm-plate-corner.bl { bottom: 8px; left: 8px; }
.gm-plate-corner.br { bottom: 8px; right: 8px; }

.gm-last-int { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.gm-last-desc { color: var(--text); }
.gm-tag {
  font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--brass);
  background: var(--brass-soft); padding: 2px 7px; border-radius: 4px; flex-shrink: 0;
}
.gm-muted { color: var(--text-muted); font-size: 12px; }

.gm-nameplate {
  position: relative; background: linear-gradient(160deg, var(--surface-raised), var(--surface));
  border: 1px solid var(--border); border-radius: 12px; padding: 22px 26px; margin-top: 8px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.gm-nameplate-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.gm-nameplate-eyebrow {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
  color: var(--brass); text-transform: uppercase;
}
.gm-nameplate h1 { font-family: 'Space Grotesk', sans-serif; font-size: 24px; margin: 0 0 16px; }
.gm-nameplate-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px;
}
.gm-nameplate-grid > div { display: flex; flex-direction: column; gap: 3px; }
.gm-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted);
}
.gm-nameplate-obs {
  margin: 16px 0 0; padding-top: 14px; border-top: 1px solid var(--border);
  font-size: 13px; color: var(--text-muted); line-height: 1.5;
}

.gm-highlight {
  margin-top: 22px; background: var(--brass-soft); border: 1px solid rgba(192,133,82,0.3);
  border-radius: 10px; padding: 16px 18px;
}
.gm-highlight .gm-section-label { color: var(--brass); margin-bottom: 10px; }
.gm-highlight-body { display: flex; gap: 12px; align-items: flex-start; }
.gm-pecas { font-size: 12px; color: var(--teal); margin-top: 4px; }

.gm-timeline { position: relative; padding-left: 12px; }
.gm-timeline-item {
  position: relative; display: grid; grid-template-columns: 78px 16px 1fr;
  gap: 4px; padding-bottom: 22px;
}
.gm-timeline-item:not(:last-child)::before {
  content: ""; position: absolute; left: 84px; top: 16px; bottom: -6px; width: 1px;
  background: var(--border);
}
.gm-timeline-date { font-size: 11px; color: var(--text-muted); padding-top: 2px; }
.gm-timeline-dot {
  width: 9px; height: 9px; border-radius: 50%; background: var(--teal);
  margin-top: 3px; box-shadow: 0 0 0 3px var(--bg);
}
.gm-timeline-content { padding-bottom: 2px; }
.gm-timeline-content-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

.gm-empty {
  text-align: center; padding: 48px 20px; border: 1px dashed var(--border);
  border-radius: 10px; color: var(--text-muted);
}
.gm-empty-icon { color: var(--brass); margin-bottom: 10px; display: flex; justify-content: center; }
.gm-empty-title { font-weight: 600; color: var(--text); margin-bottom: 4px; font-size: 14px; }
.gm-empty-text { font-size: 12px; }

.gm-equip-thumb {
  width: 100%; height: 110px; object-fit: cover; border-radius: 7px; margin-bottom: 8px;
}
.gm-nameplate-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.gm-nameplate-head h1 { margin: 0; }
.gm-nameplate-foto {
  width: 56px; height: 56px; object-fit: cover; border-radius: 8px;
  border: 1px solid var(--border); flex-shrink: 0;
}
.gm-galeria { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.gm-galeria-thumb {
  width: 52px; height: 52px; object-fit: cover; border-radius: 6px;
  border: 1px solid var(--border); cursor: pointer;
}

.gm-upload-btn {
  display: flex; align-items: center; gap: 6px; width: fit-content;
  background: var(--bg); border: 1px dashed var(--border); border-radius: 7px;
  padding: 8px 12px; font-size: 12px; color: var(--text-muted); cursor: pointer;
}
.gm-upload-btn:hover { border-color: var(--brass); color: var(--text); }
.gm-foto-preview-wrap { display: flex; align-items: center; gap: 10px; }
.gm-foto-preview {
  width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border);
}
.gm-foto-remove {
  display: flex; align-items: center; gap: 4px; background: none;
  border: 1px solid var(--border); color: var(--danger); font-size: 11px;
  padding: 6px 10px; border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif;
}
.gm-fotos-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.gm-foto-thumb-wrap { position: relative; }
.gm-foto-thumb {
  width: 56px; height: 56px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);
}
.gm-foto-thumb-remove {
  position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--danger); color: #fff; border: none; display: flex; align-items: center;
  justify-content: center; cursor: pointer; padding: 0;
}

.gm-overlay {
  position: fixed; inset: 0; background: rgba(6,16,22,0.65);
  display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
}
.gm-modal {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  width: 100%; max-width: 420px; max-height: 88vh; display: flex; flex-direction: column;
  font-family: 'Inter', sans-serif;
}
.gm-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid var(--border);
  font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px;
}
.gm-modal-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
.gm-modal-footer {
  display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px;
  border-top: 1px solid var(--border);
}
.gm-field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--text-muted); }
.gm-field input, .gm-field textarea {
  background: var(--bg); border: 1px solid var(--border); border-radius: 7px;
  padding: 9px 10px; color: var(--text); font-family: 'Inter', sans-serif; font-size: 13px;
  outline: none; resize: vertical;
}
.gm-field input:focus, .gm-field textarea:focus { border-color: var(--brass); }
.gm-error {
  display: flex; align-items: center; gap: 6px; color: var(--danger); font-size: 12px;
}

.gm-auth-wrap {
  display: flex; align-items: center; justify-content: center; min-height: 480px; padding: 24px;
}
.gm-auth-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  padding: 28px; width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 14px;
}
.gm-auth-brand { justify-content: center; font-size: 18px; margin-bottom: 4px; }
.gm-auth-tabs { display: flex; background: var(--bg); border-radius: 8px; padding: 3px; gap: 3px; }
.gm-tab {
  flex: 1; background: none; border: none; color: var(--text-muted); padding: 8px;
  border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
}
.gm-tab.active { background: var(--brass); color: #12222B; }
.gm-auth-submit { justify-content: center; margin-top: 4px; }
.gm-api-toggle {
  display: flex; align-items: center; gap: 5px; justify-content: center;
  background: none; border: none; color: var(--text-muted); font-size: 11px;
  cursor: pointer; font-family: 'Inter', sans-serif; padding: 4px;
}
`;
