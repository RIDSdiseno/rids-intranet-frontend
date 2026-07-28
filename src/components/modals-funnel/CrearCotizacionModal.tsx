// src/components/modals-funnel/CrearCotizacionModal.tsx
// Réplica funcional y visual del modal real "Nueva Cotización" (modals-cotizaciones/CreateCotizacion.tsx),
// para crear y vincular una cotización sin salir del Funnel. Reutiliza los sub-modales
// reales (selección/creación de producto, servicio, empresa, equipo) y las utilidades
// reales de cálculo (calcularTotales, calcularValoresItem, formatearPrecio, estadoConfig)
// — no duplica esa lógica, solo la orquesta con estado propio y self-contained.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DeleteOutlined, FileTextOutlined, PlusOutlined } from "@ant-design/icons";
import { http } from "../../service/http";
import { calcularTotales, calcularValoresItem, estadoConfig, formatearPrecio } from "../modals-cotizaciones/utils";
import { ItemTipoGestioo, EstadoCotizacionGestioo, TipoCotizacionGestioo } from "../modals-cotizaciones/types";
import type { CotizacionItemGestioo, EmpresaForm, ProductoForm, SeccionCotizacion } from "../modals-cotizaciones/types";
import SelectProductoModal from "../modals-cotizaciones/SelectProducto";
import SelectServicioModal from "../modals-cotizaciones/SelectServicio";
import SelectEquipoModal, { type EquipoOption } from "../modals-cotizaciones/SelectEquipo";
import NewEmpresaModal from "../modals-cotizaciones/NewEmpresa";
import NewEntidadModal from "../modals-cotizaciones/NewEntidad";
import NewProductoModal from "../modals-cotizaciones/NewProducto";
import NewServicioModal from "../modals-cotizaciones/NewServicio";
import type { EntidadResumen, MonedaOportunidad, OportunidadDetalle } from "./types";
import { getOportunidadErrorMessage } from "./utils";

interface CrearCotizacionModalProps {
  open: boolean;
  oportunidad: OportunidadDetalle | null;
  onClose: () => void;
  onCotizacionCreada: (cotizacionId: number) => Promise<unknown>;
}

let siguienteItemId = 1;
let siguienteSeccionId = 1;

const FILTROS_VACIOS = { texto: "", codigo: "", precioMin: "", precioMax: "", categoria: "" };
const PERSONA_FORM_VACIO = { nombre: "", rut: "", correo: "", telefono: "", direccion: "" };

interface ProductoCatalogo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  precioTotal?: number | null;
  porcGanancia?: number | null;
  serie?: string | null;
  imagen?: string | null;
  categoria?: string | null;
}

interface ServicioCatalogo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  categoria?: string | null;
}

interface EntidadCreadaPayload extends EmpresaForm {
  tipo: string;
}

interface ServicioCreadoPayload {
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string | null;
  duracionHoras: number | null;
}

const EMPRESA_FORM_VACIO: EmpresaForm = { nombre: "", rut: "", correo: "", telefono: "", direccion: "", origen: "RIDS" };

const PRODUCTO_FORM_VACIO: ProductoForm = {
  nombre: "",
  descripcion: "",
  precio: 0,
  porcGanancia: 0,
  precioTotal: 0,
  categoria: "",
  stock: 0,
  serie: "",
  imagen: null,
  imagenFile: null,
};

export default function CrearCotizacionModal({ open, oportunidad, onClose, onCotizacionCreada }: CrearCotizacionModalProps) {
  // --- Cliente / Entidad ---
  const [tipoEntidad, setTipoEntidad] = useState<"EMPRESA" | "PERSONA">("EMPRESA");
  const [filtroOrigen, setFiltroOrigen] = useState<"TODOS" | "RIDS" | "ECONNET" | "OTRO">("TODOS");
  const [entidades, setEntidades] = useState<EntidadResumen[]>([]);
  const [entidadId, setEntidadId] = useState<number | undefined>(undefined);
  const [personaResponsable, setPersonaResponsable] = useState("");

  // --- Configuración ---
  const [tipoCotizacion, setTipoCotizacion] = useState<string>(TipoCotizacionGestioo.CLIENTE);
  const [estadoCotizacion, setEstadoCotizacion] = useState<EstadoCotizacionGestioo>(EstadoCotizacionGestioo.BORRADOR);
  const [moneda, setMoneda] = useState<MonedaOportunidad>("CLP");
  const [tasaCambio, setTasaCambio] = useState(950);

  // --- Secciones e ítems ---
  const [secciones, setSecciones] = useState<SeccionCotizacion[]>([
    { id: 0, nombre: "Sección Principal", descripcion: "", items: [], orden: 0 },
  ]);
  const [seccionActiva, setSeccionActiva] = useState(0);
  const [items, setItems] = useState<CotizacionItemGestioo[]>([]);
  const [comentario, setComentario] = useState("");

  // --- Catálogos ---
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [servicios, setServicios] = useState<ServicioCatalogo[]>([]);
  const [equipos, setEquipos] = useState<EquipoOption[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);

  // --- Selectores / sub-modales ---
  const [showSelectorProducto, setShowSelectorProducto] = useState(false);
  const [showSelectorServicio, setShowSelectorServicio] = useState(false);
  const [showNewEmpresa, setShowNewEmpresa] = useState(false);
  const [showNewPersona, setShowNewPersona] = useState(false);
  const [newPersonaForm, setNewPersonaForm] = useState(PERSONA_FORM_VACIO);
  const [showNewProducto, setShowNewProducto] = useState(false);
  const [showNewServicio, setShowNewServicio] = useState(false);
  const [itemParaVincularEquipo, setItemParaVincularEquipo] = useState<number | null>(null);

  const [filtrosProductos, setFiltrosProductos] = useState(FILTROS_VACIOS);
  const [ordenProducto, setOrdenProducto] = useState("nombre");
  const [filtrosServicios, setFiltrosServicios] = useState(FILTROS_VACIOS);

  const [newEmpresaForm, setNewEmpresaForm] = useState<EmpresaForm>(EMPRESA_FORM_VACIO);
  const [newProductoForm, setNewProductoForm] = useState<ProductoForm>(PRODUCTO_FORM_VACIO);

  const [enviando, setEnviando] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !oportunidad) return;

    setTipoEntidad("EMPRESA");
    setFiltroOrigen("TODOS");
    setEntidadId(oportunidad.entidadId ?? undefined);
    setPersonaResponsable("");
    setTipoCotizacion(TipoCotizacionGestioo.CLIENTE);
    setEstadoCotizacion(EstadoCotizacionGestioo.BORRADOR);
    setMoneda(oportunidad.moneda);
    setTasaCambio(950);
    setSecciones([{ id: 0, nombre: "Sección Principal", descripcion: "", items: [], orden: 0 }]);
    setSeccionActiva(0);
    setItems([]);
    setComentario("");
    setError(null);

    http.get("/entidades").then((res) => setEntidades(res.data?.data ?? [])).catch(() => setEntidades([]));
    http.get("/productos-gestioo").then((res) => setProductos(res.data?.data ?? [])).catch(() => setProductos([]));
    http.get("/servicios-gestioo").then((res) => setServicios(res.data?.data ?? [])).catch(() => setServicios([]));

    setLoadingEquipos(true);
    http
      .get("/equipos", { params: { page: 1, pageSize: 1000 } })
      .then((res) => setEquipos(res.data?.data?.items ?? res.data?.items ?? []))
      .catch(() => setEquipos([]))
      .finally(() => setLoadingEquipos(false));
  }, [open, oportunidad]);

  if (!open || !oportunidad) return null;

  const entidadesFiltradas = entidades
    .filter((e) => (e.tipo ? e.tipo === tipoEntidad : true))
    .filter((e) => tipoEntidad !== "EMPRESA" || filtroOrigen === "TODOS" || e.origen === filtroOrigen)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const entidadSeleccionada = entidades.find((e) => e.id === entidadId);
  const categoriasDisponibles = Array.from(
    new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))
  );

  const itemsSeccionActiva = items.filter((i) => i.seccionId === seccionActiva);
  const totales = calcularTotales(items);

  function calcularTotalesSeccion(seccionId: number) {
    return calcularTotales(items.filter((i) => i.seccionId === seccionId));
  }

  /* =========================================================
     Secciones
  ========================================================= */
  function agregarSeccion() {
    const nueva: SeccionCotizacion = {
      id: ++siguienteSeccionId,
      nombre: `Sección ${secciones.length + 1}`,
      descripcion: "",
      items: [],
      orden: secciones.length,
    };
    setSecciones((prev) => [...prev, nueva]);
    setSeccionActiva(nueva.id);
  }

  function eliminarSeccion(seccionId: number) {
    if (secciones.length <= 1) return;
    setSecciones((prev) => prev.filter((s) => s.id !== seccionId));
    setItems((prev) => prev.filter((i) => i.seccionId !== seccionId));
    if (seccionActiva === seccionId) setSeccionActiva(secciones[0].id);
  }

  function actualizarSeccion(seccionId: number, campo: "nombre" | "descripcion", valor: string) {
    setSecciones((prev) => prev.map((s) => (s.id === seccionId ? { ...s, [campo]: valor } : s)));
  }

  /* =========================================================
     Ítems
  ========================================================= */
  function actualizarItem(id: number, campo: string, valor: unknown) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  }

  function eliminarItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // "Descuento adicional": línea de descuento global aplicado sobre el subtotal bruto
  // de la sección (mismo comportamiento que ItemTipoGestioo.ADICIONAL en Cotizaciones).
  function agregarDescuentoAdicional() {
    const nuevo: CotizacionItemGestioo = {
      id: siguienteItemId++,
      cotizacionId: 0,
      tipo: ItemTipoGestioo.ADICIONAL,
      nombre: "Descuento adicional",
      descripcion: "",
      cantidad: 1,
      precio: 0,
      precioOriginalCLP: 0,
      porcentaje: 0,
      tieneDescuento: true,
      tieneIVA: false,
      seccionId: seccionActiva,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, nuevo]);
  }

  async function agregarProducto(producto: ProductoCatalogo) {
    try {
      const res = await http.get(`/productos-gestioo/${producto.id}`);
      const real: ProductoCatalogo = res.data?.data ?? producto;
      const nuevo: CotizacionItemGestioo = {
        id: siguienteItemId++,
        cotizacionId: 0,
        tipo: ItemTipoGestioo.PRODUCTO,
        nombre: real.nombre,
        descripcion: real.descripcion ?? "",
        cantidad: 1,
        precio: real.precioTotal || real.precio || 0,
        precioOriginalCLP: real.precioTotal || real.precio || 0,
        precioCosto: real.precio ?? undefined,
        porcGanancia: real.porcGanancia || 0,
        porcentaje: 0,
        tieneIVA: true,
        tieneDescuento: false,
        sku: real.serie || "",
        seccionId: seccionActiva,
        imagen: real.imagen || null,
        productoId: real.id,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => [...prev, nuevo]);
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo agregar el producto."));
    } finally {
      setShowSelectorProducto(false);
    }
  }

  function agregarServicio(servicio: ServicioCatalogo) {
    const nuevo: CotizacionItemGestioo = {
      id: siguienteItemId++,
      cotizacionId: 0,
      tipo: ItemTipoGestioo.SERVICIO,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion ?? "",
      cantidad: 1,
      precio: servicio.precio || 0,
      precioOriginalCLP: servicio.precio || 0,
      porcentaje: 0,
      tieneIVA: false,
      tieneDescuento: false,
      seccionId: seccionActiva,
      servicioId: servicio.id,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, nuevo]);
    setShowSelectorServicio(false);
  }

  function vincularEquipo(equipo: EquipoOption) {
    if (itemParaVincularEquipo == null) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemParaVincularEquipo
          ? { ...i, equipoId: equipo.id_equipo, equipo: { id_equipo: equipo.id_equipo, serial: equipo.serial, marca: equipo.marca, modelo: equipo.modelo } }
          : i
      )
    );
    setItemParaVincularEquipo(null);
  }

  function desvincularEquipo(id: number) {
    actualizarItem(id, "equipoId", null);
    actualizarItem(id, "equipo", null);
  }

  /* =========================================================
     Crear empresa / producto / servicio al vuelo
  ========================================================= */
  async function crearEmpresa(datos: EntidadCreadaPayload) {
    setApiLoading(true);
    try {
      const res = await http.post("/entidades", datos);
      const creada: EntidadResumen = res.data?.data ?? res.data;
      setEntidades((prev) => [...prev, creada]);
      setEntidadId(creada.id);
      setShowNewEmpresa(false);
      setNewEmpresaForm(EMPRESA_FORM_VACIO);
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo crear la empresa."));
    } finally {
      setApiLoading(false);
    }
  }

  async function crearPersona(datos: typeof PERSONA_FORM_VACIO & { tipo: string; origen: null }) {
    setApiLoading(true);
    try {
      const res = await http.post("/entidades", datos);
      const creada: EntidadResumen = res.data?.data ?? res.data;
      setEntidades((prev) => [...prev, creada]);
      setEntidadId(creada.id);
      setShowNewPersona(false);
      setNewPersonaForm(PERSONA_FORM_VACIO);
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo crear la persona."));
    } finally {
      setApiLoading(false);
    }
  }

  async function crearServicio(datos: ServicioCreadoPayload) {
    setApiLoading(true);
    try {
      const res = await http.post("/servicios-gestioo", datos);
      const creado: ServicioCatalogo = res.data?.data ?? res.data;
      setServicios((prev) => [...prev, creado]);
      agregarServicio(creado);
      setShowNewServicio(false);
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo crear el servicio."));
    } finally {
      setApiLoading(false);
    }
  }

  /* =========================================================
     Guardar cotización
  ========================================================= */
  async function handleGuardar() {
    if (!entidadId) {
      setError("Debes seleccionar una entidad.");
      return;
    }
    if (items.length === 0) {
      setError("Debes agregar al menos un ítem en alguna sección.");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const tasa = moneda === "USD" ? tasaCambio : 1;
      const itemsParaEnviar = items.map((item) => {
        const precioCLP = moneda === "USD" ? Math.round(Number(item.precio || 0) * tasa) : Number(item.precio || 0);
        const precioCostoCLP =
          item.precioCosto != null ? (moneda === "USD" ? Math.round(Number(item.precioCosto) * tasa) : Number(item.precioCosto)) : null;

        return {
          tipo: item.tipo,
          nombre: item.nombre,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio: precioCLP,
          precioOriginalCLP: precioCLP,
          precioCosto: precioCostoCLP,
          porcentaje: item.porcentaje || null,
          tieneIVA: item.tieneIVA || false,
          tieneDescuento: item.tieneDescuento || false,
          sku: item.sku || null,
          porcGanancia: item.porcGanancia || null,
          imagen: item.imagen || null,
          equipoId: item.equipoId ?? null,
        };
      });

      const totalesReales = calcularTotales(itemsParaEnviar as CotizacionItemGestioo[]);

      const payload = {
        tipo: tipoCotizacion,
        estado: estadoCotizacion,
        entidadId,
        subtotal: totalesReales.subtotal,
        descuentos: totalesReales.descuentos,
        iva: totalesReales.iva,
        total: totalesReales.total,
        moneda,
        tasaCambio: tasa,
        items: itemsParaEnviar,
        comentariosCotizacion: comentario.trim() || null,
        personaResponsable: personaResponsable.trim() || null,
      };

      const res = await http.post("/cotizaciones", payload);
      const cotizacionId: number | undefined = res.data?.data?.id;
      if (!cotizacionId) throw new Error("El backend no devolvió el id de la cotización creada.");

      await onCotizacionCreada(cotizacionId);
      onClose();
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo crear la cotización."));
    } finally {
      setEnviando(false);
    }
  }

  const seccionActivaObj = secciones.find((s) => s.id === seccionActiva);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative max-h-[92vh] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Nueva Cotización</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl" aria-label="Cerrar">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-500 -mt-3 mb-4">
              Se vinculará automáticamente a {oportunidad.codigo} · {oportunidad.titulo}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Información del Cliente */}
              <div className="p-4 border border-cyan-200 rounded-2xl bg-white shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-3">Información del Cliente</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Entidad</label>
                    <select
                      value={tipoEntidad}
                      onChange={(e) => setTipoEntidad(e.target.value as "EMPRESA" | "PERSONA")}
                      className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="EMPRESA">Empresa</option>
                      <option value="PERSONA">Persona</option>
                    </select>
                  </div>

                  {tipoEntidad === "EMPRESA" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Filtrar por Origen</label>
                      <select
                        value={filtroOrigen}
                        onChange={(e) => setFiltroOrigen(e.target.value as typeof filtroOrigen)}
                        className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        <option value="TODOS">Todos los orígenes</option>
                        <option value="RIDS">RIDS</option>
                        <option value="ECONNET">ECONNET</option>
                        <option value="OTRO">OTRO</option>
                      </select>
                    </div>
                  )}

                  {tipoEntidad === "EMPRESA" ? (
                    <button
                      type="button"
                      onClick={() => setShowNewEmpresa(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-700 transition"
                    >
                      <PlusOutlined /> Crear Empresa
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewPersona(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition"
                    >
                      <PlusOutlined /> Crear Persona
                    </button>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Entidad <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={entidadId ?? ""}
                      onChange={(e) => setEntidadId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="">Seleccione una entidad…</option>
                      {entidadesFiltradas.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Mostrando {entidadesFiltradas.length} de {entidades.length}
                    </p>
                  </div>

                  {entidadSeleccionada && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
                      <p className="font-medium">Entidad seleccionada</p>
                      <p><strong>Nombre:</strong> {entidadSeleccionada.nombre}</p>
                      {entidadSeleccionada.rut && <p><strong>RUT:</strong> {entidadSeleccionada.rut}</p>}
                      {entidadSeleccionada.origen && <p><strong>Origen:</strong> {entidadSeleccionada.origen}</p>}
                      {entidadSeleccionada.correo && <p><strong>Email:</strong> {entidadSeleccionada.correo}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Persona Responsable</label>
                    <input
                      className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm"
                      placeholder="Ej: Juan Pérez"
                      value={personaResponsable}
                      onChange={(e) => setPersonaResponsable(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Configuración */}
              <div className="p-4 border border-cyan-200 rounded-2xl bg-white shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-3">Configuración</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                    <select
                      value={tipoCotizacion}
                      onChange={(e) => setTipoCotizacion(e.target.value)}
                      className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value={TipoCotizacionGestioo.CLIENTE}>Cliente</option>
                      <option value={TipoCotizacionGestioo.INTERNA}>Interna</option>
                      <option value={TipoCotizacionGestioo.PROVEEDOR}>Proveedor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Estado Inicial</label>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(estadoConfig)
                        .filter(([key]) => key !== "FACTURADA")
                        .map(([key, config]) => {
                          const estado = key as EstadoCotizacionGestioo;
                          const isActive = estadoCotizacion === estado;
                          return (
                            <button
                              key={estado}
                              type="button"
                              onClick={() => setEstadoCotizacion(estado)}
                              className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200 ${
                                isActive ? config.active : config.color
                              }`}
                            >
                              {config.label}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Moneda de Cotización</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as MonedaOportunidad)}
                      className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                    >
                      <option value="CLP">CLP - Pesos chilenos</option>
                      <option value="USD">USD - Dólares americanos</option>
                    </select>

                    {moneda === "USD" && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="block text-xs font-medium text-blue-700 mb-1">Tasa de Cambio (CLP → USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={tasaCambio}
                          onChange={(e) => setTasaCambio(Math.max(1, Number(e.target.value)))}
                          className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400"
                        />
                        <p className="text-xs text-blue-600 mt-1">1 USD = {tasaCambio.toLocaleString("es-CL")} CLP</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Secciones de Cotización */}
              <div className="border border-cyan-200 rounded-2xl p-4 bg-white md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-cyan-600" />
                    <h3 className="font-semibold text-slate-700">Secciones de Cotización</h3>
                  </div>
                  <button
                    type="button"
                    onClick={agregarSeccion}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700 transition"
                  >
                    <PlusOutlined /> Nueva Sección
                  </button>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {secciones.map((seccion) => {
                    const t = calcularTotalesSeccion(seccion.id);
                    const isActive = seccionActiva === seccion.id;
                    return (
                      <div
                        key={seccion.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors min-w-0 flex-shrink-0 ${
                          isActive ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                        onClick={() => setSeccionActiva(seccion.id)}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{seccion.nombre}</span>
                          <span className={`text-xs ${isActive ? "text-cyan-100" : "text-slate-500"}`}>
                            {formatearPrecio(t.total, moneda, tasaCambio)}
                          </span>
                        </div>
                        {secciones.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarSeccion(seccion.id);
                            }}
                            className={`text-xs opacity-70 hover:opacity-100 ${isActive ? "text-white" : "text-slate-500"}`}
                          >
                            <DeleteOutlined />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {seccionActivaObj && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Nombre de sección"
                        value={seccionActivaObj.nombre}
                        onChange={(e) => actualizarSeccion(seccionActiva, "nombre", e.target.value)}
                      />
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Descripción (opcional)"
                        value={seccionActivaObj.descripcion ?? ""}
                        onChange={(e) => actualizarSeccion(seccionActiva, "descripcion", e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        onClick={() => setShowSelectorProducto(true)}
                        className="px-3 py-1.5 rounded-full border border-cyan-300 text-cyan-700 text-xs hover:bg-cyan-50 transition"
                      >
                        + Seleccionar Producto
                      </button>
                      <button
                        onClick={() => setShowNewProducto(true)}
                        className="px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-700 text-xs hover:bg-emerald-50 transition"
                      >
                        + Crear Producto Nuevo
                      </button>
                      <button
                        onClick={() => setShowSelectorServicio(true)}
                        className="px-3 py-1.5 rounded-full border border-cyan-300 text-cyan-700 text-xs hover:bg-cyan-50 transition"
                      >
                        + Servicio
                      </button>
                      <button
                        onClick={() => setShowNewServicio(true)}
                        className="px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-700 text-xs hover:bg-emerald-50 transition"
                      >
                        + Nuevo servicio
                      </button>
                      <button
                        onClick={agregarDescuentoAdicional}
                        className="px-3 py-1.5 rounded-full border border-rose-300 text-rose-700 text-xs hover:bg-rose-50 transition"
                      >
                        + Descuento
                      </button>
                    </div>

                    <div className="border border-cyan-200 rounded-xl overflow-hidden overflow-x-auto">
                      <div className="flex items-center justify-between px-3 py-2 bg-cyan-50 border-b border-cyan-200">
                        <span className="text-sm text-cyan-700">{itemsSeccionActiva.length} items</span>
                        <span className="text-sm font-medium text-cyan-800">
                          Total: {formatearPrecio(calcularTotalesSeccion(seccionActiva).total, moneda, tasaCambio)}
                        </span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-cyan-50 text-slate-700 border-b border-cyan-200">
                          <tr>
                            <th className="px-3 py-2 text-left border-r border-cyan-200">Nombre</th>
                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-16">Cant.</th>
                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-24">P.Unitario</th>
                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-20">% Ganancia</th>
                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-20">IVA</th>
                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-24">% Desc</th>
                            <th className="px-3 py-2 text-right border-r border-cyan-200 w-28">Neto sin IVA</th>
                            <th className="px-3 py-2 text-right border-r border-cyan-200 w-28">Total con IVA</th>
                            <th className="px-3 py-2 text-right w-16"></th>
                            <th className="px-3 py-2 text-center border-l border-cyan-200 w-32">Equipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsSeccionActiva.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="text-center py-4 text-slate-400 border-b border-cyan-100">
                                No hay productos o servicios en esta sección.
                              </td>
                            </tr>
                          ) : (
                            itemsSeccionActiva.map((item) => {
                              const valores = calcularValoresItem(item);
                              const esDescuentoAdicional = item.tipo === ItemTipoGestioo.ADICIONAL;
                              return (
                                <tr key={item.id} className="border-b border-cyan-100">
                                  <td className="px-3 py-2 border-r border-cyan-100">
                                    {esDescuentoAdicional ? (
                                      <span className="text-slate-600">{item.nombre}</span>
                                    ) : (
                                      <input
                                        className="w-full text-sm border-none focus:outline-none bg-transparent"
                                        value={item.nombre}
                                        onChange={(e) => actualizarItem(item.id, "nombre", e.target.value)}
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center border-r border-cyan-100">
                                    {!esDescuentoAdicional && (
                                      <input
                                        type="number"
                                        min={1}
                                        className="w-14 text-center border border-slate-200 rounded px-1 py-0.5"
                                        value={item.cantidad}
                                        onChange={(e) => actualizarItem(item.id, "cantidad", Math.max(1, Number(e.target.value)))}
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center border-r border-cyan-100">
                                    {!esDescuentoAdicional && formatearPrecio(item.precio, moneda, tasaCambio)}
                                  </td>
                                  <td className="px-3 py-2 text-center border-r border-cyan-100">
                                    {item.tipo === ItemTipoGestioo.PRODUCTO ? (
                                      <span className="text-xs font-medium text-emerald-700">{(item.porcGanancia ?? 0).toFixed(1)}%</span>
                                    ) : (
                                      <span className="text-slate-400 text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center border-r border-cyan-100">
                                    {!esDescuentoAdicional ? (
                                      <label className="flex items-center justify-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={item.tieneIVA || false}
                                          onChange={(e) => actualizarItem(item.id, "tieneIVA", e.target.checked)}
                                        />
                                        IVA
                                      </label>
                                    ) : (
                                      <span className="text-slate-400 text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center border-r border-cyan-100">
                                    <div className="flex flex-col items-center gap-1">
                                      <label className="flex items-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={item.tieneDescuento || false}
                                          onChange={(e) => {
                                            actualizarItem(item.id, "tieneDescuento", e.target.checked);
                                            if (!e.target.checked) actualizarItem(item.id, "porcentaje", 0);
                                          }}
                                        />
                                        Desc.
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        disabled={!item.tieneDescuento}
                                        value={item.tieneDescuento ? item.porcentaje ?? "" : ""}
                                        onChange={(e) => {
                                          const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                          actualizarItem(item.id, "porcentaje", v);
                                        }}
                                        className="w-16 rounded px-1 py-0.5 text-center text-xs border border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right border-r border-cyan-100 font-semibold text-slate-700">
                                    {formatearPrecio(valores.neto, moneda, tasaCambio)}
                                  </td>
                                  <td className="px-3 py-2 text-right border-r border-cyan-100 font-medium">
                                    {esDescuentoAdicional ? (
                                      <span className="text-rose-600">-{formatearPrecio(valores.descuento, moneda, tasaCambio)}</span>
                                    ) : (
                                      formatearPrecio(valores.total, moneda, tasaCambio)
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => eliminarItem(item.id)}
                                      className="text-rose-500 hover:text-rose-700 p-1"
                                      title="Eliminar ítem"
                                    >
                                      <DeleteOutlined />
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {!esDescuentoAdicional &&
                                      (item.equipoId ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="px-2 py-0.5 bg-green-50 border border-green-200 rounded text-xs text-green-700 truncate max-w-[110px]">
                                            {item.equipo?.serial ?? `#${item.equipoId}`}
                                          </span>
                                          <button
                                            onClick={() => desvincularEquipo(item.id)}
                                            className="text-rose-400 hover:text-rose-600 text-xs underline"
                                          >
                                            Desvincular
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setItemParaVincularEquipo(item.id)}
                                          className="px-2 py-1 border border-dashed border-cyan-300 text-cyan-600 rounded text-xs hover:bg-cyan-50"
                                        >
                                          Vincular
                                        </button>
                                      ))}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Comentarios de la cotización</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-y"
                  rows={3}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Notas internas, condiciones especiales, indicaciones para el cliente, etc."
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <div className="text-right space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700">
                  <p>Total productos antes de descuentos: {formatearPrecio(totales.subtotalBruto, moneda, tasaCambio)}</p>
                  <p className="text-rose-600">Descuentos Aplicados: -{formatearPrecio(totales.descuentos, moneda, tasaCambio)}</p>
                  <p>Subtotal neto sin IVA: {formatearPrecio(totales.subtotal, moneda, tasaCambio)}</p>
                  <p>IVA (19%): {formatearPrecio(totales.iva, moneda, tasaCambio)}</p>
                  <p className="font-bold text-slate-900 border-t pt-1">Total final: {formatearPrecio(totales.total, moneda, tasaCambio)}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
            )}

            <div className="flex justify-between items-center pt-4 mt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Estado inicial:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoConfig[estadoCotizacion]?.color}`}>
                  {estadoConfig[estadoCotizacion]?.label}
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} disabled={enviando} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300">
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!entidadId || items.length === 0 || enviando}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviando ? "Creando…" : "Crear Cotización"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sub-modales reales, reutilizados tal cual */}
      <SelectProductoModal
        show={showSelectorProducto}
        onClose={() => setShowSelectorProducto(false)}
        productos={productos}
        filtros={filtrosProductos}
        onFiltroChange={(filtro, value) => setFiltrosProductos((prev) => ({ ...prev, [filtro]: value }))}
        onLimpiarFiltros={() => setFiltrosProductos(FILTROS_VACIOS)}
        onAgregarProducto={agregarProducto}
        onEliminarProducto={() => {}}
        orden={ordenProducto}
        onOrdenChange={setOrdenProducto}
        categoriasDisponibles={categoriasDisponibles}
      />

      <SelectServicioModal
        show={showSelectorServicio}
        onClose={() => setShowSelectorServicio(false)}
        servicios={servicios}
        filtros={filtrosServicios}
        onFiltroChange={(filtro, value) => setFiltrosServicios((prev) => ({ ...prev, [filtro]: value }))}
        onLimpiarFiltros={() => setFiltrosServicios(FILTROS_VACIOS)}
        onAgregarServicio={agregarServicio}
      />

      <SelectEquipoModal
        show={itemParaVincularEquipo != null}
        equipos={equipos}
        loading={loadingEquipos}
        onClose={() => setItemParaVincularEquipo(null)}
        onSelect={vincularEquipo}
      />

      <NewEmpresaModal
        show={showNewEmpresa}
        onClose={() => setShowNewEmpresa(false)}
        onSubmit={crearEmpresa}
        formData={newEmpresaForm}
        onFormChange={(field, value) => setNewEmpresaForm((prev) => ({ ...prev, [field]: value }))}
        apiLoading={apiLoading}
      />

      <NewEntidadModal
        show={showNewPersona}
        onClose={() => setShowNewPersona(false)}
        onSubmit={crearPersona}
        formData={newPersonaForm}
        onFormChange={(field, value) => setNewPersonaForm((prev) => ({ ...prev, [field]: value }))}
        apiLoading={apiLoading}
      />

      <NewProductoModal
        show={showNewProducto}
        onClose={() => setShowNewProducto(false)}
        onSubmit={(creado: ProductoCatalogo) => {
          setProductos((prev) => [...prev, creado]);
          agregarProducto(creado);
          setShowNewProducto(false);
          setNewProductoForm(PRODUCTO_FORM_VACIO);
        }}
        formData={newProductoForm}
        onFormChange={(field, value) => setNewProductoForm((prev) => ({ ...prev, [field]: value }))}
        categoriasDisponibles={categoriasDisponibles}
        apiLoading={apiLoading}
      />

      <NewServicioModal show={showNewServicio} onClose={() => setShowNewServicio(false)} onSave={crearServicio} apiLoading={apiLoading} />
    </>
  );
}
