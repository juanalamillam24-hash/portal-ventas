import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Bell, Plus, X, Phone, Calendar, DollarSign, Video, LogOut, Wallet, TrendingUp,
  GraduationCap, ShoppingCart, Check, RefreshCw, AlertTriangle, Settings, Trash2, Clock, ChevronRight,
} from "lucide-react";
import storage from "./storage";

// Un cliente sin ningún movimiento en este tiempo se considera estancado.
const HORAS_ESTANCADO = 48;

const AGENTS = [
  "Maria Lamilla","Sara Carolina Escorcia","Jose Leonardo Angarita Lara","Olga Lucia Sanchez Plazas",
  "Luis Alfredo Muñoz Trujillo","Danna Sofia Osorio","Miguel Antonio Bustos Capera","Seleny Stefany Quintero Mosquera",
  "Laura Daniela Duarte Adamez","Juan Pablo Bermudez Polania","Ana Gonzalez","Juan Guillermo Oviedo Gutierrez",
  "Maria Camila Perdomo Puentes","Geraldine Rojas Gutierrez","Dana Valentina Perez Vega","Yerly Yamileth Cardoso Arce",
  "Yeisman Rojas Palomares Rojas","Katherin Vanessa Esquibel Falla","Adrian Eduardo Cubillos Franco","Mariana Rujana"
];
const DIRECTOR = "Juana Lamilla (Directora)";

const STAGES = [
  { key: "beca", label: "Beca" },
  { key: "servicios", label: "Usa Servicios" },
  { key: "zoom_masivo", label: "Zoom Masivo" },
  { key: "zoom_1a1", label: "Zoom 1 a 1" },
  { key: "abono", label: "Abono" },
  { key: "fecha_pago", label: "Fecha de Pago" },
  { key: "pago_completo", label: "Pago Completo" },
];

// Seguimiento de membresía: clases y zooms a los que asistió el cliente.
const CLASES = [1, 2, 3, 4, 5, 6];
const ZOOMS = [
  { key: "masivo_1", label: "Masivo 1" },
  { key: "masivo_2", label: "Masivo 2" },
  { key: "uno_a_uno", label: "1 a 1" },
  { key: "cierre", label: "Cierre" },
];

// Catálogo por defecto (la directora lo puede editar desde Configuración).
const PRODUCTOS_DEFAULT = [
  { id: "p_oro",             nombre: "Oro",                    precio: 789, comision: 0, tipo: "membresia", activo: true, orden: 10 },
  { id: "p_platino",         nombre: "Platino",                precio: 439, comision: 0, tipo: "membresia", activo: true, orden: 20 },
  { id: "p_vip",             nombre: "VIP",                    precio: 220, comision: 0, tipo: "membresia", activo: true, orden: 30 },
  { id: "p_bots",            nombre: "Bots",                   precio: 370, comision: 0, tipo: "membresia", activo: true, orden: 40 },
  { id: "p_botia",           nombre: "Bot IA",                 precio: 29,  comision: 0, tipo: "membresia", activo: true, orden: 50 },
  { id: "p_up_vip_platino",  nombre: "Upgrade VIP → Platino",  precio: 220, comision: 0, tipo: "upgrade",   activo: true, orden: 60 },
  { id: "p_up_vip_oro",      nombre: "Upgrade VIP → Oro",      precio: 580, comision: 0, tipo: "upgrade",   activo: true, orden: 70 },
  { id: "p_up_platino_oro",  nombre: "Upgrade Platino → Oro",  precio: 370, comision: 0, tipo: "upgrade",   activo: true, orden: 80 },
];

// Si un producto no tiene comisión fija definida, se usa este porcentaje del monto.
const COMISION_PCT = 0.25;

const GOLD = "#C9A227";
const STORE = {
  clients: "nexus-embudo-clientes",
  ventas: "nexus-embudo-ventas",
  productos: "nexus-embudo-productos",
  migrado: "nexus-embudo-migrado",
};

/* ---------------- utilidades ---------------- */

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Días desde hoy hasta dateStr. Negativo = vencido. null = sin fecha o fecha inválida.
function daysBetween(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const [ty, tm, td] = todayISO().split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

function fmtMoney(n) {
  return "$" + (Number(n) || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function fmtDias(d) {
  if (d === null) return "sin fecha";
  if (d === 0) return "HOY";
  if (d < 0) return `${Math.abs(d)}d atrasado`;
  return `en ${d}d`;
}

function num(v) { return Number(v) || 0; }

/* ---------------- persistencia ---------------- */

// Marca de "esta clave no existe todavía", distinta de cualquier valor guardado.
const AUSENTE = Symbol("ausente");

// Devuelve el valor guardado, o AUSENTE si la clave nunca se escribió.
// Si el dato existe pero está dañado, LANZA: un error de lectura jamás debe
// parecerse a "no hay nada guardado", porque eso dispararía la migración y
// sobrescribiría datos buenos.
async function loadKey(key) {
  const res = await storage.get(key);
  if (!res || res.value == null) return AUSENTE;
  try {
    return JSON.parse(res.value);
  } catch {
    throw new Error(`El dato guardado en "${key}" está dañado y no se pudo leer.`);
  }
}
async function saveKey(key, value) {
  await storage.set(key, JSON.stringify(value));
}

/* ---------------- modelos ---------------- */

function emptyClient(agent) {
  return {
    id: uid(),
    _nuevo: true,
    nombre: "",
    telefono: "",
    agente: agent,
    etapa: "beca",
    zoomDate: "",
    clases: [],
    zooms: [],
    notas: "",
    createdAt: new Date().toISOString(),
  };
}

function emptyVenta(agent) {
  return {
    id: uid(),
    agente: agent,
    clienteId: "",
    cliente: "",
    productoId: "",       // vínculo estable con el catálogo
    producto: "",         // copia del nombre, por si el producto se borra
    monto: "",
    abono: "",
    tipo: "agendado",       // agendado | posible
    estado: "pendiente",    // pendiente | pagado
    fecha: "",              // fecha de pago comprometida
    notas: "",
    createdAt: new Date().toISOString(),
  };
}

function saldoDe(v) {
  if (v.estado === "pagado") return 0;
  return Math.max(0, num(v.monto) - num(v.abono));
}
function cobradoDe(v) {
  return v.estado === "pagado" ? num(v.monto) : num(v.abono);
}
// Busca por id (estable frente a renombres); cae al nombre solo para las ventas
// viejas que se guardaron antes de que existiera productoId.
function productoDe(v, productos) {
  if (v.productoId) {
    const p = productos.find((x) => x.id === v.productoId);
    if (p) return p;
  }
  return productos.find((x) => x.nombre === v.producto) || null;
}

function comisionDe(v, productos) {
  const p = productoDe(v, productos);
  if (p && num(p.comision) > 0) return num(p.comision);
  return num(v.monto) * COMISION_PCT;
}

// Nombre a mostrar: si el producto sigue en el catálogo se usa su nombre actual,
// así un renombre se refleja en todas partes. Si ya no está, queda la copia.
function nombreProducto(v, productos) {
  const p = productoDe(v, productos);
  return (p && p.nombre) || v.producto || "";
}

// Horas desde el último movimiento del cliente.
function horasSinMover(c) {
  const t = c.updatedAt || c.createdAt;
  if (!t) return null;
  const h = (Date.now() - Date.parse(t)) / 3600000;
  return isNaN(h) ? null : h;
}
function fmtHoras(h) {
  if (h === null) return "—";
  if (h < 24) return Math.floor(h) + "h";
  const d = Math.floor(h / 24);
  return d + (d === 1 ? " día" : " días");
}
function ventasDeCliente(c, ventas) {
  return ventas.filter((v) => {
    if (v.clienteId) return v.clienteId === c.id;
    if (!c.nombre) return false;
    return (v.cliente || "").toLowerCase() === c.nombre.toLowerCase();
  });
}

/* ================= APP ================= */

export default function App() {
  const [session, setSession] = useState(null);
  const [clients, setClients] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState(PRODUCTOS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [cargaFallida, setCargaFallida] = useState(false);
  const [tab, setTab] = useState("tablero");
  const [viewAgent, setViewAgent] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editVenta, setEditVenta] = useState(null);
  const [confirm, setConfirm] = useState(null); // {tipo:'cliente'|'venta'|'producto', id, texto}
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, err) => {
    setToast({ msg, err: !!err });
    setTimeout(() => setToast(null), err ? 4000 : 1800);
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [csRaw, vsRaw, psRaw, migRaw] = await Promise.all([
        loadKey(STORE.clients),
        loadKey(STORE.ventas),
        loadKey(STORE.productos),
        loadKey(STORE.migrado),
      ]);

      const cs = Array.isArray(csRaw) ? csRaw : [];
      const cl = cs.map((c) => ({ ...c, clases: c.clases || [], zooms: c.zooms || [] }));
      let vt = Array.isArray(vsRaw) ? vsRaw : [];

      // Migración: los montos que vivían en la ficha del cliente pasan a ser ventas.
      // Solo corre en una instalación virgen (sin bandera y sin ventas guardadas),
      // y deja la bandera puesta para no repetirse nunca.
      if (migRaw === AUSENTE) {
        if (vsRaw === AUSENTE) {
          vt = cl
            .filter((c) => num(c.montoTotal) > 0 || num(c.abonoMonto) > 0)
            .map((c) => ({
              ...emptyVenta(c.agente),
              id: uid(),
              clienteId: c.id,
              cliente: c.nombre,
              producto: "",
              monto: num(c.montoTotal),
              abono: num(c.abonoMonto),
              fecha: c.fechaPago || c.abonoDate || "",
              estado: c.etapa === "pago_completo" ? "pagado" : "pendiente",
              notas: "Migrado desde la ficha del cliente",
            }));
          if (vt.length) await saveKey(STORE.ventas, vt);
        }
        await saveKey(STORE.migrado, true);
      }

      setClients(cl);
      setVentas(vt);
      setProductos(Array.isArray(psRaw) && psRaw.length ? psRaw : PRODUCTOS_DEFAULT);
      setCargaFallida(false);
    } catch (e) {
      // Sin datos buenos en memoria, cualquier guardado posterior escribiría
      // encima de lo que sí está en la base. Mejor bloquear la app.
      setCargaFallida(true);
      notify("No se pudieron cargar los datos: " + e.message, true);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => { cargar(); }, [cargar]);

  // Guarda y avisa si falla (nunca en silencio); revierte el estado si no pudo guardar.
  const persist = useCallback(async (key, next, setter, prev) => {
    setter(next);
    try {
      await saveKey(key, next);
    } catch (e) {
      setter(prev);
      notify("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.", true);
    }
  }, [notify]);

  const isDirector = session?.isDirector;
  const activeAgent = isDirector ? viewAgent : session?.name;
  const consolidado = isDirector && !viewAgent;

  const misClientes = useMemo(
    () => (consolidado ? clients : clients.filter((c) => c.agente === activeAgent)),
    [clients, consolidado, activeAgent]
  );
  const misVentas = useMemo(
    () => (consolidado ? ventas : ventas.filter((v) => v.agente === activeAgent)),
    [ventas, consolidado, activeAgent]
  );

  /* ----- alertas: zoom 1a1, y cartera (vencido / hoy / mañana / 2 días) ----- */
  const alerts = useMemo(() => {
    const out = [];
    misClientes.forEach((c) => {
      if (c.etapa === "zoom_1a1" && daysBetween(c.zoomDate) === 0) {
        out.push({ id: c.id + "-zoom", tipo: "zoom", titulo: "Zoom 1 a 1 hoy", nombre: c.nombre, agente: c.agente, telefono: c.telefono });
      }
    });
    misVentas.forEach((v) => {
      if (v.estado === "pagado") return;
      const d = daysBetween(v.fecha);
      if (d === null || d > 2) return;
      const titulo =
        d < 0 ? `Pago vencido hace ${Math.abs(d)}d` :
        d === 0 ? "Pago comprometido hoy" :
        d === 1 ? "Pago mañana" : "Pago en 2 días";
      out.push({
        id: v.id + "-pago", tipo: "pago", titulo, nombre: v.cliente, agente: v.agente,
        telefono: telefonoDeVenta(v, clients), monto: saldoDe(v), urgente: d <= 0,
      });
    });
    return out.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0));
  }, [misClientes, misVentas, clients]);

  /* ----- finanzas: ahora salen del módulo de ventas ----- */
  const finance = useMemo(() => {
    const facturado = misVentas.reduce((s, v) => s + num(v.monto), 0);
    const cobrado = misVentas.reduce((s, v) => s + cobradoDe(v), 0);
    const saldo = misVentas.reduce((s, v) => s + saldoDe(v), 0);
    const comCausada = misVentas.filter((v) => v.estado === "pagado").reduce((s, v) => s + comisionDe(v, productos), 0);
    const comProyectada = misVentas.reduce((s, v) => s + comisionDe(v, productos), 0);
    return { facturado, cobrado, saldo, comCausada, comProyectada };
  }, [misVentas, productos]);

  /* ----- agenda: qué hay que hacer hoy, por cliente ----- */
  const agenda = useMemo(() => {
    const filas = misClientes.map((c) => {
      const vs = ventasDeCliente(c, ventas);
      const pendientes = vs.filter((v) => v.estado !== "pagado");
      const saldo = pendientes.reduce((s, v) => s + saldoDe(v), 0);
      const motivos = [];
      let urgencia = null; // menor = más urgente

      pendientes.forEach((v) => {
        const d = daysBetween(v.fecha);
        if (d === null) return;
        if (d < 0) {
          motivos.push({ txt: `Pago vencido hace ${Math.abs(d)}d`, tono: "bad" });
          urgencia = Math.min(urgencia ?? 99, d);
        } else if (d === 0) {
          motivos.push({ txt: "Pago comprometido hoy", tono: "gold" });
          urgencia = Math.min(urgencia ?? 99, 0);
        } else if (d <= 7) {
          motivos.push({ txt: d === 1 ? "Pago mañana" : `Pago en ${d} días`, tono: "mut" });
          urgencia = Math.min(urgencia ?? 99, d);
        }
      });

      if (c.etapa === "zoom_1a1" && daysBetween(c.zoomDate) === 0) {
        motivos.push({ txt: "Zoom 1 a 1 hoy", tono: "gold" });
        urgencia = Math.min(urgencia ?? 99, 0);
      }

      const horas = horasSinMover(c);
      const sinAvance = !(c.clases || []).length && !(c.zooms || []).length && !vs.length;
      const estancado = sinAvance && horas !== null && horas >= HORAS_ESTANCADO;

      return { cliente: c, motivos, saldo, urgencia, horas, estancado };
    });

    const hoy = filas.filter((f) => f.urgencia !== null && f.urgencia <= 0)
      .sort((a, b) => a.urgencia - b.urgencia || b.saldo - a.saldo);
    const estancados = filas.filter((f) => !(f.urgencia !== null && f.urgencia <= 0) && f.estancado)
      .sort((a, b) => (b.horas || 0) - (a.horas || 0));
    const proximos = filas.filter((f) => f.urgencia !== null && f.urgencia > 0)
      .sort((a, b) => a.urgencia - b.urgencia);
    const usados = new Set([...hoy, ...estancados, ...proximos].map((f) => f.cliente.id));
    const alDia = filas.filter((f) => !usados.has(f.cliente.id));

    return { hoy, estancados, proximos, alDia };
  }, [misClientes, ventas]);

  /* ----- cartera: pendientes ordenados por vencimiento ----- */
  const cartera = useMemo(() => {
    return misVentas
      .filter((v) => v.estado !== "pagado")
      .map((v) => ({ ...v, dias: daysBetween(v.fecha), saldo: saldoDe(v) }))
      .sort((a, b) => {
        if (a.dias === null && b.dias === null) return 0;
        if (a.dias === null) return 1;
        if (b.dias === null) return -1;
        return a.dias - b.dias;
      });
  }, [misVentas]);

  /* ----- acciones ----- */
  function login(name, director) {
    setSession({ name, isDirector: director });
    setTab("tablero");
    setViewAgent(null);
  }

  function updateClient(id, patch) {
    const prev = clients;
    const stamped = { ...patch, updatedAt: new Date().toISOString() };
    persist(STORE.clients, clients.map((c) => (c.id === id ? { ...c, ...stamped } : c)), setClients, prev);
  }

  function saveClient(data) {
    const limpio = { ...data, updatedAt: new Date().toISOString() };
    delete limpio._nuevo;
    const exists = clients.some((c) => c.id === data.id);
    const prev = clients;
    const next = exists ? clients.map((c) => (c.id === data.id ? limpio : c)) : [...clients, limpio];
    persist(STORE.clients, next, setClients, prev);
    setEditing(null);
    notify("Cliente guardado");
  }

  function deleteClient(id) {
    persist(STORE.clients, clients.filter((c) => c.id !== id), setClients, clients);
    setConfirm(null);
    notify("Cliente eliminado");
  }

  function saveVenta(data) {
    const exists = ventas.some((v) => v.id === data.id);
    const prev = ventas;
    const next = exists ? ventas.map((v) => (v.id === data.id ? data : v)) : [...ventas, data];
    persist(STORE.ventas, next, setVentas, prev);
    setEditVenta(null);
    notify(exists ? "Venta actualizada" : "Venta registrada");
  }

  function updateVenta(id, patch) {
    const prev = ventas;
    persist(STORE.ventas, ventas.map((v) => (v.id === id ? { ...v, ...patch } : v)), setVentas, prev);
  }

  function deleteVenta(id) {
    persist(STORE.ventas, ventas.filter((v) => v.id !== id), setVentas, ventas);
    setConfirm(null);
    notify("Venta eliminada");
  }

  function saveProductos(next) {
    persist(STORE.productos, next, setProductos, productos);
  }

  function nuevoCliente() {
    if (consolidado) { notify("Elige un agente en el selector de arriba para crear el cliente a su nombre.", true); return; }
    setEditing(emptyClient(activeAgent));
  }

  function nuevaVenta() {
    if (consolidado) { notify("Elige un agente en el selector de arriba para registrar la venta a su nombre.", true); return; }
    setEditVenta(emptyVenta(activeAgent));
  }

  if (!session) return <LoginScreen onLogin={login} />;

  const TABS = [
    { k: "tablero", label: "Prioridad" },
    { k: "membresia", label: "Membresía" },
    { k: "ventas", label: "Ventas" },
    { k: "cartera", label: "Cartera" },
    ...(isDirector ? [{ k: "config", label: "Configuración" }] : []),
  ];

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <GlobalStyle />
      <Header
        session={session}
        isDirector={isDirector}
        viewAgent={viewAgent}
        setViewAgent={setViewAgent}
        onLogout={() => setSession(null)}
        onReload={cargar}
        alertCount={alerts.length}
      />

      <div className="max-w-6xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="text-white/40 text-sm py-16 text-center">Cargando…</div>
        ) : cargaFallida ? (
          <div className="mt-10 rounded border px-5 py-6 text-center"
               style={{ borderColor: "rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.07)" }}>
            <AlertTriangle size={22} className="mx-auto mb-2" style={{ color: "#f87171" }} />
            <div className="text-sm font-medium mb-1">No se pudieron leer los datos</div>
            <div className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
              La app se bloqueó a propósito: si te dejara trabajar ahora, el primer
              guardado escribiría encima de la información que sí está en la base.
              Revisa tu conexión y vuelve a intentarlo.
            </div>
            <button onClick={cargar} className="mt-4 text-sm px-4 py-2 rounded font-medium"
                    style={{ background: GOLD, color: "black" }}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <FinancePanel finance={finance} />
            {alerts.length > 0 && <AlertsBar alerts={alerts} />}

            <div className="flex gap-1 mt-6 mb-4 border-b border-white/10 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`px-4 py-2 text-sm tracking-wide uppercase whitespace-nowrap transition ${
                    tab === t.k ? "border-b-2" : "text-white/40 hover:text-white/70"
                  }`}
                  style={tab === t.k ? { borderColor: GOLD, color: GOLD } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "tablero" && (
              <Prioridad
                agenda={agenda}
                clients={misClientes}
                onEdit={setEditing}
                onAdd={nuevoCliente}
                onEtapa={(id, etapa) => updateClient(id, { etapa })}
                mostrarAgente={consolidado}
              />
            )}

            {tab === "membresia" && (
              <Membresia
                clients={misClientes}
                mostrarAgente={consolidado}
                onUpdate={updateClient}
                onAdd={nuevoCliente}
              />
            )}

            {tab === "ventas" && (
              <Ventas
                ventas={misVentas}
                productos={productos}
                mostrarAgente={consolidado}
                onAdd={nuevaVenta}
                onEdit={setEditVenta}
                onUpdate={updateVenta}
                onDelete={(id, nombre) => setConfirm({ tipo: "venta", id, texto: `¿Eliminar la venta de ${nombre || "este cliente"}?` })}
              />
            )}

            {tab === "cartera" && (
              <Cartera
                items={cartera}
                clients={clients}
                productos={productos}
                mostrarAgente={consolidado}
                onUpdate={updateVenta}
                onAdd={nuevaVenta}
              />
            )}

            {tab === "config" && (
              <Config
                productos={productos}
                onSave={saveProductos}
                onDelete={(id, nombre) => setConfirm({ tipo: "producto", id, texto: `¿Eliminar "${nombre}" del catálogo? Las ventas ya registradas no se modifican.` })}
              />
            )}
          </>
        )}
      </div>

      {editing && (
        <ClientModal
          client={editing}
          agents={AGENTS}
          isDirector={isDirector}
          onClose={() => setEditing(null)}
          onSave={saveClient}
          onDelete={(id, nombre) => setConfirm({ tipo: "cliente", id, texto: `¿Eliminar a ${nombre || "este cliente"}? También quedarán huérfanas sus ventas.` })}
        />
      )}

      {editVenta && (
        <VentaModal
          venta={editVenta}
          productos={productos}
          clientes={consolidado ? clients : clients.filter((c) => c.agente === editVenta.agente)}
          agents={AGENTS}
          isDirector={isDirector}
          onClose={() => setEditVenta(null)}
          onSave={saveVenta}
        />
      )}

      {confirm && (
        <ConfirmModal
          texto={confirm.texto}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.tipo === "cliente") deleteClient(confirm.id);
            else if (confirm.tipo === "venta") deleteVenta(confirm.id);
            else {
              saveProductos(productos.filter((p) => p.id !== confirm.id));
              setConfirm(null);
            }
            setEditing(null);
          }}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-5 right-5 px-4 py-3 rounded text-sm font-medium z-40 max-w-sm"
          style={{ background: toast.err ? "#ef4444" : GOLD, color: toast.err ? "white" : "black" }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function telefonoDeVenta(v, clients) {
  if (v.clienteId) {
    const c = clients.find((x) => x.id === v.clienteId);
    if (c?.telefono) return c.telefono;
  }
  const c = clients.find((x) => x.nombre && x.nombre.toLowerCase() === (v.cliente || "").toLowerCase());
  return c?.telefono || "";
}

function whatsappLink(telefono, msg) {
  const phone = (telefono || "").replace(/[^0-9]/g, "");
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

/* ================= PANTALLAS ================= */

function GlobalStyle() {
  return (
    <style>{`
      .input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:white;font-size:14px}
      .input:focus{outline:none;border-color:${GOLD}}
      .cellin{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:5px;padding:5px 8px;color:white;font-size:13px;width:100%}
      .cellin:focus{outline:none;border-color:${GOLD}}
    `}</style>
  );
}

function LoginScreen({ onLogin }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold tracking-widest" style={{ color: GOLD }}>NEXUS</div>
          <div className="text-white/50 text-xs tracking-[0.3em] mt-1">OFICINA ELITE — TORRE DE CONTROL</div>
        </div>
        <button
          onClick={() => onLogin(DIRECTOR, true)}
          className="w-full mb-4 py-3 rounded border text-sm tracking-wide uppercase font-semibold"
          style={{ borderColor: GOLD, color: GOLD }}
        >
          Entrar como Directora
        </button>
        <div className="text-white/40 text-xs uppercase tracking-widest mb-2 mt-6">Agentes</div>
        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {AGENTS.map((a) => (
            <button
              key={a}
              onClick={() => onLogin(a, false)}
              className="w-full text-left px-4 py-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header({ session, isDirector, viewAgent, setViewAgent, onLogout, onReload, alertCount }) {
  return (
    <div className="border-b border-white/10 sticky top-0 bg-black z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-widest" style={{ color: GOLD }}>NEXUS</span>
          <span className="text-white/30 text-sm">{session.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {isDirector && (
            <select
              value={viewAgent || ""}
              onChange={(e) => setViewAgent(e.target.value || null)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
            >
              <option value="">Vista consolidada (todos)</option>
              {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <button onClick={onReload} title="Recargar datos" className="text-white/50 hover:text-white">
            <RefreshCw size={15} />
          </button>
          <div className="flex items-center gap-1 text-sm text-white/60">
            <Bell size={16} style={alertCount > 0 ? { color: GOLD } : {}} />
            {alertCount > 0 && <span style={{ color: GOLD }}>{alertCount}</span>}
          </div>
          <button onClick={onLogout} className="text-white/50 hover:text-white flex items-center gap-1 text-sm">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}

function FinancePanel({ finance }) {
  const items = [
    { label: "Facturado", value: finance.facturado, icon: TrendingUp },
    { label: "Cobrado (abonos + pagos)", value: finance.cobrado, icon: Wallet },
    { label: "Saldo en cartera", value: finance.saldo, icon: AlertTriangle },
    { label: "Comisión causada", value: finance.comCausada, icon: DollarSign, highlight: true, sub: `Proyectada: ${fmtMoney(finance.comProyectada)}` },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border p-4"
          style={{
            borderColor: it.highlight ? GOLD : "rgba(255,255,255,0.1)",
            background: it.highlight ? "rgba(201,162,39,0.08)" : "rgba(255,255,255,0.03)",
          }}
        >
          <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-1">
            <it.icon size={14} /> {it.label}
          </div>
          <div className="text-2xl font-semibold" style={{ color: it.highlight ? GOLD : "white" }}>
            {fmtMoney(it.value)}
          </div>
          {it.sub && <div className="text-[11px] text-white/40 mt-1">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function AlertsBar({ alerts }) {
  return (
    <div className="mt-6 space-y-2">
      {alerts.map((a) => {
        const msg = a.tipo === "zoom"
          ? `Hola ${a.nombre}, te confirmo nuestro Zoom 1 a 1 de hoy.`
          : `Hola ${a.nombre}, te escribo por el pago pendiente de ${fmtMoney(a.monto)}.`;
        const link = whatsappLink(a.telefono, msg);
        return (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded border px-4 py-2.5 flex-wrap"
            style={{
              borderColor: a.urgente ? "#ef4444" : GOLD,
              background: a.urgente ? "rgba(239,68,68,0.08)" : "rgba(201,162,39,0.08)",
            }}
          >
            <div className="flex items-center gap-2 text-sm">
              {a.tipo === "zoom"
                ? <Video size={15} style={{ color: GOLD }} />
                : <Calendar size={15} style={{ color: a.urgente ? "#ef4444" : GOLD }} />}
              <span className="font-medium">{a.titulo}</span>
              <span className="text-white/60">— {a.nombre || "Sin nombre"} ({a.agente})</span>
              {a.monto > 0 && <span className="text-white/40">· {fmtMoney(a.monto)}</span>}
            </div>
            {link ? (
              <a href={link} target="_blank" rel="noreferrer"
                 className="text-xs px-3 py-1 rounded whitespace-nowrap"
                 style={{ background: GOLD, color: "black" }}>
                WhatsApp
              </a>
            ) : (
              <span className="text-[11px] text-white/30">Sin teléfono registrado</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- PRIORIDAD DEL DÍA ---------------- */

const TONOS = {
  bad:  { color: "#f87171", border: "rgba(239,68,68,0.45)",  bg: "rgba(239,68,68,0.07)" },
  warn: { color: "#facc15", border: "rgba(234,179,8,0.4)",   bg: "rgba(234,179,8,0.06)" },
  gold: { color: GOLD,      border: "rgba(201,162,39,0.35)", bg: "rgba(201,162,39,0.05)" },
  mut:  { color: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.1)", bg: "transparent" },
};

function Prioridad({ agenda, clients, onEdit, onAdd, onEtapa, mostrarAgente }) {
  const grupos = [
    { k: "hoy", titulo: "Hoy", filas: agenda.hoy, tono: "bad",
      desc: "Pagos vencidos, pagos comprometidos para hoy y zooms de hoy." },
    { k: "estancados", titulo: `Estancados +${HORAS_ESTANCADO}h`, filas: agenda.estancados, tono: "warn",
      desc: "Sin ninguna clase, zoom ni venta registrada." },
    { k: "proximos", titulo: "Próximos 7 días", filas: agenda.proximos, tono: "gold",
      desc: "Pagos comprometidos que vienen." },
    { k: "alDia", titulo: "Al día", filas: agenda.alDia, tono: "mut",
      desc: "Nada urgente por ahora." },
  ];

  return (
    <div>
      {/* Foto del embudo: la única cosa que el kanban hacía bien */}
      <div className="flex gap-1 mb-5 overflow-x-auto">
        {STAGES.map((s) => {
          const n = clients.filter((c) => c.etapa === s.key).length;
          return (
            <div key={s.key} className="flex-1 min-w-[92px] rounded border px-3 py-2"
                 style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[9px] uppercase tracking-wider text-white/35 leading-tight">{s.label}</div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: n ? "white" : "rgba(255,255,255,0.2)" }}>{n}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-white/40">{clients.length} cliente(s)</span>
        <button onClick={onAdd} className="flex items-center gap-1 text-sm px-3 py-2 rounded ml-auto"
                style={{ background: GOLD, color: "black" }}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {clients.length === 0 && (
        <div className="text-white/40 text-sm py-12 text-center border border-dashed border-white/10 rounded">
          Aún no tienes clientes. Crea el primero con “Nuevo cliente”.
        </div>
      )}

      <div className="space-y-6">
        {grupos.map((g) => {
          if (!g.filas.length) return null;
          const t = TONOS[g.tono];
          return (
            <div key={g.k}>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                <span className="text-xs uppercase tracking-[0.15em] font-semibold" style={{ color: t.color }}>
                  {g.titulo}
                </span>
                <span className="text-xs text-white/30 tabular-nums">{g.filas.length}</span>
                <span className="text-[11px] text-white/25 hidden sm:inline">— {g.desc}</span>
              </div>

              <div className="space-y-1.5">
                {g.filas.map((f) => (
                  <FilaPrioridad
                    key={f.cliente.id}
                    fila={f}
                    tono={t}
                    mostrarAgente={mostrarAgente}
                    onEdit={onEdit}
                    onEtapa={onEtapa}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilaPrioridad({ fila, tono, mostrarAgente, onEdit, onEtapa }) {
  const c = fila.cliente;
  const msg = fila.saldo > 0
    ? `Hola ${c.nombre}, te escribo por el pago pendiente de ${fmtMoney(fila.saldo)}.`
    : `Hola ${c.nombre}, ¿cómo vas? Te escribo para acompañarte en el proceso.`;
  const link = whatsappLink(c.telefono, msg);

  return (
    <div className="rounded border px-3 py-2.5 flex items-center gap-3 flex-wrap"
         style={{ borderColor: tono.border, background: tono.bg, borderLeftWidth: 3, borderLeftColor: tono.color }}>

      <div className="min-w-[150px] flex-1">
        <button onClick={() => onEdit(c)} className="text-sm font-medium hover:underline text-left flex items-center gap-1">
          {c.nombre || "Sin nombre"}
          <ChevronRight size={13} className="text-white/25" />
        </button>
        <div className="flex items-center gap-2.5 text-[11px] text-white/35 mt-0.5 flex-wrap">
          {mostrarAgente && <span>{c.agente}</span>}
          <span className="flex items-center gap-1"><Phone size={10} /> {c.telefono || "—"}</span>
          <span className="flex items-center gap-1">
            <GraduationCap size={10} /> {(c.clases || []).length}/{CLASES.length} · {(c.zooms || []).length}/{ZOOMS.length}
          </span>
          {fila.horas !== null && (
            <span className="flex items-center gap-1"><Clock size={10} /> {fmtHoras(fila.horas)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {fila.motivos.map((m, i) => (
          <span key={i} className="text-[11px] px-2 py-0.5 rounded whitespace-nowrap"
                style={{ background: TONOS[m.tono].bg === "transparent" ? "rgba(255,255,255,0.06)" : TONOS[m.tono].bg,
                         color: TONOS[m.tono].color, border: `1px solid ${TONOS[m.tono].border}` }}>
            {m.txt}
          </span>
        ))}
        {fila.estancado && !fila.motivos.length && (
          <span className="text-[11px] px-2 py-0.5 rounded whitespace-nowrap"
                style={{ background: TONOS.warn.bg, color: TONOS.warn.color, border: `1px solid ${TONOS.warn.border}` }}>
            Sin avance
          </span>
        )}
      </div>

      {fila.saldo > 0 && (
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-white/30">Saldo</div>
          <div className="text-sm font-semibold tabular-nums" style={{ color: tono.color }}>{fmtMoney(fila.saldo)}</div>
        </div>
      )}

      <select
        value={c.etapa}
        onChange={(e) => onEtapa(c.id, e.target.value)}
        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white/70"
        title="Cambiar etapa del embudo"
      >
        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>

      {link ? (
        <a href={link} target="_blank" rel="noreferrer"
           className="text-[11px] px-3 py-1.5 rounded font-semibold whitespace-nowrap"
           style={{ background: GOLD, color: "black" }}>
          WhatsApp
        </a>
      ) : (
        <span className="text-[10px] text-white/25 whitespace-nowrap">Sin teléfono</span>
      )}
    </div>
  );
}

/* ---------------- MÓDULO: SEGUIMIENTO DE MEMBRESÍA ---------------- */

function Membresia({ clients, mostrarAgente, onUpdate, onAdd }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const lista = useMemo(() => {
    return clients.filter((c) => {
      if (q && !(c.nombre || "").toLowerCase().includes(q.toLowerCase())) return false;
      const nCl = (c.clases || []).length, nZo = (c.zooms || []).length;
      if (filtro === "sin_avance" && (nCl > 0 || nZo > 0)) return false;
      if (filtro === "completo" && !(nCl === CLASES.length && nZo === ZOOMS.length)) return false;
      if (filtro === "en_curso" && !(nCl > 0 && nCl < CLASES.length)) return false;
      return true;
    });
  }, [clients, q, filtro]);

  const tot = clients.length || 1;
  const resumen = {
    clases: clients.reduce((s, c) => s + (c.clases || []).length, 0),
    zooms: clients.reduce((s, c) => s + (c.zooms || []).length, 0),
    sinAvance: clients.filter((c) => !(c.clases || []).length && !(c.zooms || []).length).length,
    completos: clients.filter((c) => (c.clases || []).length === CLASES.length).length,
  };

  function toggle(c, campo, valor) {
    const actual = c[campo] || [];
    const next = actual.includes(valor) ? actual.filter((x) => x !== valor) : [...actual, valor];
    onUpdate(c.id, { [campo]: next });
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Clases asistidas" value={resumen.clases} />
        <MiniStat label="Zooms asistidos" value={resumen.zooms} />
        <MiniStat label="Sin ningún avance" value={resumen.sinAvance} alerta={resumen.sinAvance > 0} />
        <MiniStat label="Completaron clases" value={`${resumen.completos} (${Math.round(resumen.completos / tot * 100)}%)`} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input className="input max-w-xs" placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[200px]" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="sin_avance">Sin ningún avance</option>
          <option value="en_curso">Clases en curso</option>
          <option value="completo">Clases y zooms completos</option>
        </select>
        <button onClick={onAdd} className="flex items-center gap-1 text-sm px-3 py-2 rounded ml-auto" style={{ background: GOLD, color: "black" }}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="text-white/40 text-sm py-10 text-center">Ningún cliente coincide con el filtro.</div>
      ) : (
        <div className="space-y-2">
          {lista.map((c) => (
            <div key={c.id} className="rounded border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="text-sm font-medium">
                    {c.nombre || "Sin nombre"}
                    {mostrarAgente && <span className="text-white/40 text-xs"> ({c.agente})</span>}
                  </div>
                  <div className="text-[11px] text-white/40">
                    {STAGES.find((s) => s.key === c.etapa)?.label || "—"}
                  </div>
                </div>
                <div className="text-[11px] text-white/40">
                  {(c.clases || []).length}/{CLASES.length} clases · {(c.zooms || []).length}/{ZOOMS.length} zooms
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-white/40 w-14">Clases</span>
                {CLASES.map((n) => {
                  const on = (c.clases || []).includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() => toggle(c, "clases", n)}
                      className="w-8 h-8 rounded-full text-xs font-semibold border transition"
                      style={on
                        ? { background: GOLD, borderColor: GOLD, color: "black" }
                        : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)" }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-white/40 w-14">Zooms</span>
                {ZOOMS.map((z) => {
                  const on = (c.zooms || []).includes(z.key);
                  return (
                    <button
                      key={z.key}
                      onClick={() => toggle(c, "zooms", z.key)}
                      className="px-3 h-8 rounded-full text-xs font-semibold border transition flex items-center gap-1.5"
                      style={on
                        ? { background: "rgba(201,162,39,0.18)", borderColor: GOLD, color: GOLD }
                        : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)" }}
                    >
                      {on && <Check size={12} />} {z.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, alerta }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: alerta ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <div className="text-xl font-semibold" style={{ color: alerta ? "#f87171" : "white" }}>{value}</div>
    </div>
  );
}

/* ---------------- MÓDULO: REPORTE DE VENTAS ---------------- */

function Ventas({ ventas, productos, mostrarAgente, onAdd, onEdit, onUpdate, onDelete }) {
  const [filtro, setFiltro] = useState("todas");

  const lista = useMemo(() => {
    return ventas
      .filter((v) => {
        if (filtro === "pendientes") return v.estado !== "pagado";
        if (filtro === "pagadas") return v.estado === "pagado";
        if (filtro === "posibles") return v.tipo === "posible";
        return true;
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [ventas, filtro]);

  // Desglose por producto
  const porProducto = useMemo(() => {
    const map = {};
    ventas.forEach((v) => {
      const k = nombreProducto(v, productos) || "Sin producto";
      if (!map[k]) map[k] = { producto: k, unidades: 0, monto: 0, cobrado: 0 };
      map[k].unidades += 1;
      map[k].monto += num(v.monto);
      map[k].cobrado += cobradoDe(v);
    });
    return Object.values(map).sort((a, b) => b.monto - a.monto);
  }, [ventas, productos]);

  // Ranking por agente (solo tiene sentido en vista consolidada)
  const porAgente = useMemo(() => {
    const map = {};
    ventas.forEach((v) => {
      if (!map[v.agente]) map[v.agente] = { agente: v.agente, n: 0, monto: 0, cobrado: 0, comision: 0 };
      map[v.agente].n += 1;
      map[v.agente].monto += num(v.monto);
      map[v.agente].cobrado += cobradoDe(v);
      if (v.estado === "pagado") map[v.agente].comision += comisionDe(v, productos);
    });
    return Object.values(map).sort((a, b) => b.monto - a.monto);
  }, [ventas, productos]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select className="input max-w-[200px]" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todas">Todas las ventas</option>
          <option value="pendientes">Con saldo pendiente</option>
          <option value="pagadas">Pagadas</option>
          <option value="posibles">Posibles</option>
        </select>
        <button onClick={onAdd} className="flex items-center gap-1 text-sm px-3 py-2 rounded ml-auto" style={{ background: GOLD, color: "black" }}>
          <ShoppingCart size={15} /> Reportar venta
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="text-white/40 text-sm py-10 text-center">
          Aún no hay ventas reportadas. Usa “Reportar venta” para registrar el servicio vendido.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/10">
                <th className="text-left px-3 py-2">Cliente</th>
                {mostrarAgente && <th className="text-left px-3 py-2">Agente</th>}
                <th className="text-left px-3 py-2">Servicio</th>
                <th className="text-right px-3 py-2">Monto</th>
                <th className="text-right px-3 py-2">Abono</th>
                <th className="text-right px-3 py-2">Saldo</th>
                <th className="text-left px-3 py-2">Fecha pago</th>
                <th className="text-left px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const saldo = saldoDe(v);
                const pagado = v.estado === "pagado";
                return (
                  <tr key={v.id} className="border-b border-white/5 hover:bg-white/5" style={pagado ? { opacity: 0.55 } : {}}>
                    <td className="px-3 py-2 font-medium">
                      {v.cliente || "Sin nombre"}
                      {v.notas && <div className="text-[11px] text-white/35 font-normal">{v.notas}</div>}
                    </td>
                    {mostrarAgente && <td className="px-3 py-2 text-white/50 text-xs">{v.agente}</td>}
                    <td className="px-3 py-2 text-white/70">{nombreProducto(v, productos) || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(v.monto)}</td>
                    <td className="px-3 py-2 text-right w-28">
                      <input
                        className="cellin text-right"
                        type="number"
                        defaultValue={v.abono ?? ""}
                        placeholder="0"
                        onBlur={(e) => { if (e.target.value !== String(v.abono ?? "")) onUpdate(v.id, { abono: e.target.value }); }}
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: saldo > 0 ? GOLD : "#4ade80" }}>
                      {fmtMoney(saldo)}
                    </td>
                    <td className="px-3 py-2 w-36">
                      <input
                        className="cellin"
                        type="date"
                        value={v.fecha || ""}
                        onChange={(e) => onUpdate(v.id, { fecha: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded"
                            style={pagado
                              ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" }
                              : v.tipo === "posible"
                                ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
                                : { background: "rgba(201,162,39,0.15)", color: GOLD }}>
                        {pagado ? "Pagado" : v.tipo === "posible" ? "Posible" : "Agendado"}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        title={pagado ? "Marcar como pendiente" : "Marcar como pagado"}
                        onClick={() => onUpdate(v.id, { estado: pagado ? "pendiente" : "pagado" })}
                        className="text-white/40 hover:text-white px-1"
                      >
                        <Check size={15} />
                      </button>
                      <button title="Editar" onClick={() => onEdit(v)} className="text-white/40 hover:text-white px-1">✎</button>
                      <button title="Eliminar" onClick={() => onDelete(v.id, v.cliente)} className="text-white/40 hover:text-red-400 px-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {porProducto.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Ventas por servicio</div>
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/10">
                  <th className="text-left px-3 py-2">Servicio</th>
                  <th className="text-right px-3 py-2">Unidades</th>
                  <th className="text-right px-3 py-2">Facturado</th>
                  <th className="text-right px-3 py-2">Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {porProducto.map((p) => (
                  <tr key={p.producto} className="border-b border-white/5">
                    <td className="px-3 py-2">{p.producto}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.unidades}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(p.monto)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#4ade80" }}>{fmtMoney(p.cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostrarAgente && porAgente.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Ranking por agente</div>
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/10">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Agente</th>
                  <th className="text-right px-3 py-2">Ventas</th>
                  <th className="text-right px-3 py-2">Facturado</th>
                  <th className="text-right px-3 py-2">Cobrado</th>
                  <th className="text-right px-3 py-2">Comisión causada</th>
                </tr>
              </thead>
              <tbody>
                {porAgente.map((a, i) => (
                  <tr key={a.agente} className="border-b border-white/5">
                    <td className="px-3 py-2 text-white/40">{i + 1}</td>
                    <td className="px-3 py-2">{a.agente}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.n}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(a.monto)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(a.cobrado)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: GOLD }}>{fmtMoney(a.comision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- MÓDULO: CARTERA (mis ventas pendientes) ---------------- */

function Cartera({ items, clients, productos, mostrarAgente, onUpdate, onAdd }) {
  const vencidos = items.filter((v) => v.dias !== null && v.dias < 0);
  const totalSaldo = items.reduce((s, v) => s + v.saldo, 0);
  const totalVencido = vencidos.reduce((s, v) => s + v.saldo, 0);
  const sinFecha = items.filter((v) => v.dias === null).length;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Clientes en cartera" value={items.length} />
        <MiniStat label="Saldo total" value={fmtMoney(totalSaldo)} />
        <MiniStat label="Vencido" value={fmtMoney(totalVencido)} alerta={totalVencido > 0} />
        <MiniStat label="Sin fecha de pago" value={sinFecha} alerta={sinFecha > 0} />
      </div>

      <div className="flex justify-end mb-3">
        <button onClick={onAdd} className="flex items-center gap-1 text-sm px-3 py-2 rounded" style={{ background: GOLD, color: "black" }}>
          <Plus size={15} /> Agregar a cartera
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-white/40 text-sm py-10 text-center">
          No hay dinero comprometido todavía. Reporta una venta con abono o fecha de pago y aparecerá aquí.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((v) => {
            const vencido = v.dias !== null && v.dias < 0;
            const hoy = v.dias === 0;
            const tel = telefonoDeVenta(v, clients);
            const link = whatsappLink(tel, `Hola ${v.cliente}, te recuerdo el pago pendiente de ${fmtMoney(v.saldo)}.`);
            return (
              <div
                key={v.id}
                className="rounded border px-4 py-3"
                style={{
                  borderColor: vencido ? "rgba(239,68,68,0.45)" : hoy ? GOLD : "rgba(255,255,255,0.1)",
                  background: vencido ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {v.cliente || "Sin nombre"}
                      {mostrarAgente && <span className="text-white/40 text-xs"> ({v.agente})</span>}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      {nombreProducto(v, productos) || "Sin servicio"} · Total {fmtMoney(v.monto)} · Abonado {fmtMoney(v.abono)}
                    </div>
                    {v.notas && <div className="text-[11px] text-white/35 mt-0.5">{v.notas}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Saldo</div>
                      <div className="text-lg font-semibold tabular-nums" style={{ color: vencido ? "#f87171" : GOLD }}>
                        {fmtMoney(v.saldo)}
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded whitespace-nowrap"
                      style={{
                        background: vencido ? "rgba(239,68,68,0.18)" : hoy ? "rgba(201,162,39,0.2)" : "rgba(255,255,255,0.08)",
                        color: vencido ? "#f87171" : hoy ? GOLD : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {fmtDias(v.dias)}
                    </span>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded" style={{ background: GOLD, color: "black" }}>
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-[11px] text-white/30">Sin teléfono</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5">
                  <label className="text-[11px] text-white/40">
                    <div className="mb-1 uppercase tracking-wider">Abono recibido</div>
                    <input className="cellin w-32" type="number" defaultValue={v.abono ?? ""} placeholder="0"
                           onBlur={(e) => { if (e.target.value !== String(v.abono ?? "")) onUpdate(v.id, { abono: e.target.value }); }} />
                  </label>
                  <label className="text-[11px] text-white/40">
                    <div className="mb-1 uppercase tracking-wider">Fecha de pago</div>
                    <input className="cellin w-40" type="date" value={v.fecha || ""}
                           onChange={(e) => onUpdate(v.id, { fecha: e.target.value })} />
                  </label>
                  <label className="text-[11px] text-white/40 flex-1 min-w-[180px]">
                    <div className="mb-1 uppercase tracking-wider">Observaciones</div>
                    <input className="cellin" defaultValue={v.notas || ""} placeholder="Ej: pide llamar en la tarde…"
                           onBlur={(e) => { if (e.target.value !== (v.notas || "")) onUpdate(v.id, { notas: e.target.value }); }} />
                  </label>
                  <div className="flex items-end">
                    <button
                      onClick={() => onUpdate(v.id, { estado: "pagado" })}
                      className="text-xs px-3 py-2 rounded border flex items-center gap-1.5"
                      style={{ borderColor: "rgba(74,222,128,0.4)", color: "#4ade80" }}
                    >
                      <Check size={13} /> Pago completo
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- CONFIGURACIÓN (directora) ---------------- */

function Config({ productos, onSave, onDelete }) {
  const [nuevo, setNuevo] = useState({ nombre: "", precio: "", comision: "", tipo: "membresia" });

  function agregar() {
    if (!nuevo.nombre.trim()) return;
    onSave([
      ...productos,
      {
        id: uid(),
        nombre: nuevo.nombre.trim(),
        precio: num(nuevo.precio),
        comision: num(nuevo.comision),
        tipo: nuevo.tipo,
        activo: true,
        orden: productos.reduce((m, p) => Math.max(m, p.orden || 0), 0) + 10,
      },
    ]);
    setNuevo({ nombre: "", precio: "", comision: "", tipo: "membresia" });
  }

  function patch(id, campo, valor) {
    onSave(productos.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  }

  return (
    <div>
      <div className="rounded border border-white/10 p-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
          <Settings size={14} /> Catálogo de servicios
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-[11px] text-white/40 flex-1 min-w-[160px]">
            <div className="mb-1 uppercase tracking-wider">Nombre</div>
            <input className="input" value={nuevo.nombre} placeholder="Ej: Diamante"
                   onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </label>
          <label className="text-[11px] text-white/40">
            <div className="mb-1 uppercase tracking-wider">Precio</div>
            <input className="input w-28" type="number" value={nuevo.precio}
                   onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} />
          </label>
          <label className="text-[11px] text-white/40">
            <div className="mb-1 uppercase tracking-wider">Comisión fija</div>
            <input className="input w-28" type="number" value={nuevo.comision}
                   onChange={(e) => setNuevo({ ...nuevo, comision: e.target.value })} />
          </label>
          <label className="text-[11px] text-white/40">
            <div className="mb-1 uppercase tracking-wider">Tipo</div>
            <select className="input w-36" value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>
              <option value="membresia">Membresía</option>
              <option value="upgrade">Upgrade</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <button onClick={agregar} className="px-4 py-2 text-sm rounded font-medium" style={{ background: GOLD, color: "black" }}>
            + Agregar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/10">
              <th className="text-left px-3 py-2">Servicio</th>
              <th className="text-right px-3 py-2">Precio</th>
              <th className="text-right px-3 py-2">Comisión fija</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-center px-3 py-2">Activo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-white/5" style={p.activo ? {} : { opacity: 0.45 }}>
                <td className="px-3 py-2">
                  <input className="cellin" defaultValue={p.nombre}
                         onBlur={(e) => { if (e.target.value !== p.nombre) patch(p.id, "nombre", e.target.value); }} />
                </td>
                <td className="px-3 py-2 w-28">
                  <input className="cellin text-right" type="number" defaultValue={p.precio}
                         onBlur={(e) => { if (num(e.target.value) !== num(p.precio)) patch(p.id, "precio", num(e.target.value)); }} />
                </td>
                <td className="px-3 py-2 w-28">
                  <input className="cellin text-right" type="number" defaultValue={p.comision}
                         onBlur={(e) => { if (num(e.target.value) !== num(p.comision)) patch(p.id, "comision", num(e.target.value)); }} />
                </td>
                <td className="px-3 py-2 w-36">
                  <select className="cellin" value={p.tipo} onChange={(e) => patch(p.id, "tipo", e.target.value)}>
                    <option value="membresia">Membresía</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="otro">Otro</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => patch(p.id, "activo", !p.activo)} className="text-white/50 hover:text-white">
                    {p.activo ? "●" : "○"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => onDelete(p.id, p.nombre)} className="text-white/40 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-white/35 mt-3 leading-relaxed">
        <b>Comisión fija</b> = cuánto gana el agente por cada venta de ese servicio. Si la dejas en 0, se calcula
        automáticamente el <b>{Math.round(COMISION_PCT * 100)}%</b> del monto de la venta. Desactivar un servicio (○) lo
        saca del formulario de venta pero no toca el histórico.
      </div>
    </div>
  );
}

/* ---------------- MODALES ---------------- */

function ClientModal({ client, agents, isDirector, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(client);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !!client._nuevo;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-20 px-4" onClick={onClose}>
      <div className="bg-[#0d0d0d] border border-white/10 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="font-semibold" style={{ color: GOLD }}>{isNew ? "Nuevo cliente" : "Editar cliente"}</span>
          <button onClick={onClose}><X size={18} className="text-white/50" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} /></Field>
          <Field label="Teléfono (con indicativo, ej 57...)"><input className="input" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} /></Field>
          {isDirector && (
            <Field label="Agente">
              <select className="input" value={form.agente} onChange={(e) => set("agente", e.target.value)}>
                {agents.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          )}
          <Field label="Etapa">
            <select className="input" value={form.etapa} onChange={(e) => set("etapa", e.target.value)}>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Fecha Zoom 1 a 1">
            <input type="date" className="input" value={form.zoomDate} onChange={(e) => set("zoomDate", e.target.value)} />
          </Field>

          <Field label="Clases a las que asistió">
            <div className="flex flex-wrap gap-2">
              {CLASES.map((n) => {
                const on = (form.clases || []).includes(n);
                return (
                  <button key={n} type="button"
                    onClick={() => set("clases", on ? form.clases.filter((x) => x !== n) : [...(form.clases || []), n])}
                    className="w-9 h-9 rounded-full text-xs font-semibold border"
                    style={on ? { background: GOLD, borderColor: GOLD, color: "black" } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)" }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Zooms a los que asistió">
            <div className="flex flex-wrap gap-2">
              {ZOOMS.map((z) => {
                const on = (form.zooms || []).includes(z.key);
                return (
                  <button key={z.key} type="button"
                    onClick={() => set("zooms", on ? form.zooms.filter((x) => x !== z.key) : [...(form.zooms || []), z.key])}
                    className="px-3 h-9 rounded-full text-xs font-semibold border"
                    style={on ? { background: "rgba(201,162,39,0.18)", borderColor: GOLD, color: GOLD } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)" }}>
                    {z.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Notas"><input className="input" value={form.notas || ""} onChange={(e) => set("notas", e.target.value)} /></Field>

          <div className="text-[11px] text-white/35 border-t border-white/10 pt-3 leading-relaxed">
            Los montos, abonos y fechas de pago ahora se registran en la pestaña <b>Ventas</b>, una línea por servicio vendido.
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
          {!isNew
            ? <button onClick={() => onDelete(form.id, form.nombre)} className="text-red-400 text-sm">Eliminar</button>
            : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-white/60">Cancelar</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 text-sm rounded font-medium" style={{ background: GOLD, color: "black" }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VentaModal({ venta, productos, clientes, agents, isDirector, onClose, onSave }) {
  const [form, setForm] = useState(venta);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const activos = productos.filter((p) => p.activo);

  // Al elegir el servicio se guarda su id (vínculo estable) y una copia del
  // nombre. El precio del catálogo se precarga, pero queda editable.
  function elegirProducto(id) {
    if (id === "__otro__") {
      setForm((f) => ({ ...f, productoId: "", producto: "Otro" }));
      return;
    }
    const p = productos.find((x) => x.id === id);
    if (!p) {
      setForm((f) => ({ ...f, productoId: "", producto: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      productoId: p.id,
      producto: p.nombre,
      monto: num(p.precio) > 0 ? p.precio : f.monto,
    }));
  }

  function elegirCliente(id) {
    const c = clientes.find((x) => x.id === id);
    setForm((f) => ({ ...f, clienteId: id, cliente: c ? c.nombre : f.cliente }));
  }

  function guardar() {
    if (!(form.cliente || "").trim()) { setError("Escribe o elige el cliente."); return; }
    if (!form.producto) { setError("Elige el servicio vendido."); return; }
    if (num(form.monto) <= 0) { setError("El monto de la venta debe ser mayor a 0."); return; }
    if (num(form.abono) > num(form.monto)) { setError("El abono no puede ser mayor que el monto total."); return; }
    onSave({ ...form, cliente: form.cliente.trim() });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-20 px-4" onClick={onClose}>
      <div className="bg-[#0d0d0d] border border-white/10 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="font-semibold" style={{ color: GOLD }}>Reporte de venta</span>
          <button onClick={onClose}><X size={18} className="text-white/50" /></button>
        </div>
        <div className="p-5 space-y-3">
          {isDirector && (
            <Field label="Agente que vendió">
              <select className="input" value={form.agente} onChange={(e) => set("agente", e.target.value)}>
                {agents.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          )}

          <Field label="Cliente del embudo (opcional)">
            <select className="input" value={form.clienteId} onChange={(e) => elegirCliente(e.target.value)}>
              <option value="">— Escribir el nombre a mano —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || "Sin nombre"}</option>)}
            </select>
          </Field>

          <Field label="Nombre del cliente">
            <input className="input" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nombre del cliente" />
          </Field>

          <Field label="Servicio vendido">
            <select
              className="input"
              value={form.productoId || (form.producto ? "__otro__" : "")}
              onChange={(e) => elegirProducto(e.target.value)}
            >
              <option value="">— Elegir servicio —</option>
              {["membresia", "upgrade", "otro"].map((tipo) => {
                const grupo = activos.filter((p) => p.tipo === tipo);
                if (!grupo.length) return null;
                return (
                  <optgroup key={tipo} label={tipo === "membresia" ? "Membresías" : tipo === "upgrade" ? "Upgrades" : "Otros"}>
                    {grupo.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}{num(p.precio) > 0 ? ` (${fmtMoney(p.precio)})` : ""}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
              <option value="__otro__">Otro (personalizado)</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto total">
              <input className="input" type="number" value={form.monto} onChange={(e) => set("monto", e.target.value)} />
            </Field>
            <Field label="Abono recibido">
              <input className="input" type="number" value={form.abono} onChange={(e) => set("abono", e.target.value)} />
            </Field>
          </div>

          <div className="rounded border border-white/10 px-3 py-2 text-xs text-white/50 flex justify-between">
            <span>Saldo pendiente</span>
            <span style={{ color: GOLD }} className="font-semibold">
              {fmtMoney(Math.max(0, num(form.monto) - num(form.abono)))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select className="input" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="agendado">Agendado (confirmado)</option>
                <option value="posible">Posible</option>
              </select>
            </Field>
            <Field label="Fecha de pago">
              <input className="input" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </Field>
          </div>

          <Field label="Observaciones">
            <input className="input" value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Ej: pide llamar en la tarde…" />
          </Field>

          {error && <div className="text-red-400 text-xs">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/60">Cancelar</button>
          <button onClick={guardar} className="px-4 py-2 text-sm rounded font-medium" style={{ background: GOLD, color: "black" }}>Guardar venta</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      {children}
    </div>
  );
}

function ConfirmModal({ texto, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-30 px-4" onClick={onCancel}>
      <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-5 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 text-sm">{texto || "¿Confirmas esta acción? No se puede deshacer."}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-white/60">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded bg-red-500/80 text-white">Eliminar</button>
        </div>
      </div>
    </div>
  );
}
