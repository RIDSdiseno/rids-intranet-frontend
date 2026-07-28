// src/components/modals-funnel/OportunidadForm.tsx
// Formulario reutilizable de Oportunidad: lo usa OportunidadFormModal (solo creación)
// y OportunidadDrawer en modo edición (inline, sin modal encima del Drawer).
import { useEffect, useState } from "react";
import { App, DatePicker, InputNumber, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { http } from "../../service/http";
import NewEmpresaModal from "../modals-cotizaciones/NewEmpresa";
import NewEntidadModal from "../modals-cotizaciones/NewEntidad";
import type { EmpresaForm } from "../modals-cotizaciones/types";
import type {
  CrearOportunidadPayload,
  EditarOportunidadPayload,
  EntidadResumen,
  EstadoDesarrolloPropuesta,
  MonedaOportunidad,
  OportunidadDetalle,
  PrioridadOportunidadVenta,
  ResponsableResumen,
  RiesgoTecnicoOportunidad,
  TipoServicioOportunidad,
} from "./types";
import { PrioridadOportunidadVenta as PRIORIDAD_ENUM } from "./types";
import {
  getEstadoDesarrolloPropuestaLabel,
  getOportunidadErrorMessage,
  getPrioridadLabel,
  getRiesgoTecnicoLabel,
  getTipoServicioOportunidadLabel,
} from "./utils";

const EMPRESA_FORM_VACIO: EmpresaForm = { nombre: "", rut: "", correo: "", telefono: "", direccion: "", origen: "RIDS" };
const PERSONA_FORM_VACIO = { nombre: "", rut: "", correo: "", telefono: "", direccion: "" };

interface OportunidadFormProps {
  oportunidad: OportunidadDetalle | null; // null = creación, con datos = edición
  onSubmitCrear?: (payload: CrearOportunidadPayload) => Promise<OportunidadDetalle | undefined>;
  onSubmitEditar?: (id: number, payload: EditarOportunidadPayload) => Promise<OportunidadDetalle | undefined>;
  onSuccess: (oportunidad: OportunidadDetalle) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface FormState {
  titulo: string;
  entidadId?: number;
  proyecto: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  responsableId?: number;
  prioridad: PrioridadOportunidadVenta;
  montoEstimado?: number;
  moneda: MonedaOportunidad;
  probabilidadCierre?: number;
  fechaProbableCierre: Dayjs | null;
  proximaAccion: string;
  fechaProximaAccion: Dayjs | null;
  observaciones: string;
  estadoDesarrolloPropuesta?: EstadoDesarrolloPropuesta;
  tipoServicio?: TipoServicioOportunidad;
  tipoServicioOtro: string;
  informacionPendiente: string;
  riesgoTecnico?: RiesgoTecnicoOportunidad;
  condicionesEspeciales: string;
  fechaComprometidaEnvio: Dayjs | null;
  comentariosInternos: string;
  montoPropuesto?: number;
  fechaEnvioPropuesta: Dayjs | null;
  fechaVencimientoPropuesta: Dayjs | null;
  comentariosCliente: string;
  objeciones: string;
  versionPropuesta: string;
  contrapropuestas: string;
  ajustesSolicitados: string;
}

const ESTADO_INICIAL: FormState = {
  titulo: "",
  entidadId: undefined,
  proyecto: "",
  contactoNombre: "",
  contactoEmail: "",
  contactoTelefono: "",
  responsableId: undefined,
  prioridad: "MEDIA",
  montoEstimado: undefined,
  moneda: "CLP",
  probabilidadCierre: undefined,
  fechaProbableCierre: null,
  proximaAccion: "",
  fechaProximaAccion: null,
  observaciones: "",
  estadoDesarrolloPropuesta: undefined,
  tipoServicio: undefined,
  tipoServicioOtro: "",
  informacionPendiente: "",
  riesgoTecnico: undefined,
  condicionesEspeciales: "",
  fechaComprometidaEnvio: null,
  comentariosInternos: "",
  montoPropuesto: undefined,
  fechaEnvioPropuesta: null,
  fechaVencimientoPropuesta: null,
  comentariosCliente: "",
  objeciones: "",
  versionPropuesta: "",
  contrapropuestas: "",
  ajustesSolicitados: "",
};

function normalizeText(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_CARACTERES_VALIDOS = /^[0-9+\-()\s]+$/;

function telefonoEsValido(valor: string): boolean {
  if (!TELEFONO_CARACTERES_VALIDOS.test(valor)) return false;
  const soloDigitos = valor.replace(/\D/g, "");
  return soloDigitos.length >= 8 && soloDigitos.length <= 15;
}

function estadoDesdeOportunidad(oportunidad: OportunidadDetalle | null): FormState {
  if (!oportunidad) return ESTADO_INICIAL;
  return {
    titulo: oportunidad.titulo,
    entidadId: oportunidad.entidadId ?? undefined,
    proyecto: oportunidad.proyecto ?? "",
    contactoNombre: oportunidad.contactoNombre ?? "",
    contactoEmail: oportunidad.contactoEmail ?? "",
    contactoTelefono: oportunidad.contactoTelefono ?? "",
    responsableId: oportunidad.responsableId,
    prioridad: oportunidad.prioridad,
    montoEstimado: oportunidad.montoEstimado != null ? Number(oportunidad.montoEstimado) : undefined,
    moneda: oportunidad.moneda,
    probabilidadCierre: oportunidad.probabilidadCierre ?? undefined,
    fechaProbableCierre: oportunidad.fechaProbableCierre ? dayjs(oportunidad.fechaProbableCierre) : null,
    proximaAccion: oportunidad.proximaAccion ?? "",
    fechaProximaAccion: oportunidad.fechaProximaAccion ? dayjs(oportunidad.fechaProximaAccion) : null,
    observaciones: oportunidad.observaciones ?? "",
    estadoDesarrolloPropuesta: oportunidad.estadoDesarrolloPropuesta ?? undefined,
    tipoServicio: oportunidad.tipoServicio ?? undefined,
    tipoServicioOtro: oportunidad.tipoServicioOtro ?? "",
    informacionPendiente: oportunidad.informacionPendiente ?? "",
    riesgoTecnico: oportunidad.riesgoTecnico ?? undefined,
    condicionesEspeciales: oportunidad.condicionesEspeciales ?? "",
    fechaComprometidaEnvio: oportunidad.fechaComprometidaEnvio ? dayjs(oportunidad.fechaComprometidaEnvio) : null,
    comentariosInternos: oportunidad.comentariosInternos ?? "",
    montoPropuesto: oportunidad.montoPropuesto != null ? Number(oportunidad.montoPropuesto) : undefined,
    // Si aún no se registró una fecha de envío explícita, se hereda la fecha
    // comprometida de envío definida en la etapa Cotización en preparación.
    fechaEnvioPropuesta: oportunidad.fechaEnvioPropuesta
      ? dayjs(oportunidad.fechaEnvioPropuesta)
      : oportunidad.fechaComprometidaEnvio
      ? dayjs(oportunidad.fechaComprometidaEnvio)
      : null,
    fechaVencimientoPropuesta: oportunidad.fechaVencimientoPropuesta
      ? dayjs(oportunidad.fechaVencimientoPropuesta)
      : null,
    comentariosCliente: oportunidad.comentariosCliente ?? "",
    objeciones: oportunidad.objeciones ?? "",
    versionPropuesta: oportunidad.versionPropuesta ?? "",
    contrapropuestas: oportunidad.contrapropuestas ?? "",
    ajustesSolicitados: oportunidad.ajustesSolicitados ?? "",
  };
}

export default function OportunidadForm({
  oportunidad,
  onSubmitCrear,
  onSubmitEditar,
  onSuccess,
  onCancel,
  onDirtyChange,
}: OportunidadFormProps) {
  const { notification } = App.useApp();
  const estadoInicial = estadoDesdeOportunidad(oportunidad);
  const [form, setForm] = useState<FormState>(estadoInicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [entidades, setEntidades] = useState<EntidadResumen[]>([]);
  const [tipoEntidad, setTipoEntidad] = useState<"EMPRESA" | "PERSONA">("EMPRESA");
  const [filtroOrigen, setFiltroOrigen] = useState<"TODOS" | "RIDS" | "ECONNET" | "OTRO">("TODOS");
  const [responsables, setResponsables] = useState<ResponsableResumen[]>([]);

  const [showNewEmpresa, setShowNewEmpresa] = useState(false);
  const [showNewPersona, setShowNewPersona] = useState(false);
  const [newEmpresaForm, setNewEmpresaForm] = useState<EmpresaForm>(EMPRESA_FORM_VACIO);
  const [newPersonaForm, setNewPersonaForm] = useState(PERSONA_FORM_VACIO);
  const [apiLoading, setApiLoading] = useState(false);

  const esEdicion = Boolean(oportunidad);
  // Los campos se acumulan a medida que la oportunidad avanza de etapa (no se
  // reemplazan): "propuesta" aparece desde COTIZACION_PREPARACION en adelante,
  // "envío" desde COTIZACION_ENVIADA en adelante, "negociación" desde NEGOCIACION.
  const mostrarPropuesta = Boolean(oportunidad && oportunidad.etapa !== "NUEVA");
  const mostrarEnvio = Boolean(
    oportunidad && oportunidad.etapa !== "NUEVA" && oportunidad.etapa !== "COTIZACION_PREPARACION"
  );
  const mostrarNegociacion = Boolean(
    oportunidad &&
      oportunidad.etapa !== "NUEVA" &&
      oportunidad.etapa !== "COTIZACION_PREPARACION" &&
      oportunidad.etapa !== "COTIZACION_ENVIADA"
  );
  const mostrarProximaAccion = !oportunidad || !["NEGOCIACION", "GANADA", "PERDIDA", "POSTERGADA"].includes(oportunidad.etapa);

  useEffect(() => {
    // Mismo patrón que CreateCotizacion.tsx: se trae el listado completo una sola vez
    // y el filtro por origen se aplica en el cliente (ver select "Filtrar por origen").
    http
      .get("/entidades")
      .then((res) => setEntidades(res.data?.data ?? res.data?.items ?? res.data ?? []))
      .catch(() => setEntidades([]));

    http
      .get("/tecnicos")
      .then((res) => setResponsables(res.data?.data ?? res.data?.items ?? res.data ?? []))
      .catch(() => setResponsables([]));
    // Se carga una sola vez, al montar el formulario.
  }, []);

  const entidadesFiltradas = entidades
    .filter((e) => (e.tipo ? e.tipo === tipoEntidad : true))
    .filter((e) => tipoEntidad !== "EMPRESA" || filtroOrigen === "TODOS" || e.origen === filtroOrigen)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  async function crearEmpresa(datos: EmpresaForm & { tipo: string }) {
    setApiLoading(true);
    try {
      const res = await http.post("/entidades", datos);
      const creada: EntidadResumen = res.data?.data ?? res.data;
      setEntidades((prev) => [...prev, creada]);
      actualizar({ entidadId: creada.id });
      setShowNewEmpresa(false);
      setNewEmpresaForm(EMPRESA_FORM_VACIO);
    } catch (err) {
      notification.error({
        message: "No se pudo crear la empresa",
        description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
      });
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
      actualizar({ entidadId: creada.id });
      setShowNewPersona(false);
      setNewPersonaForm(PERSONA_FORM_VACIO);
    } catch (err) {
      notification.error({
        message: "No se pudo crear la persona",
        description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
      });
    } finally {
      setApiLoading(false);
    }
  }

  function actualizar(cambios: Partial<FormState>) {
    setForm((f) => {
      const nuevo = { ...f, ...cambios };
      onDirtyChange?.(JSON.stringify(nuevo) !== JSON.stringify(estadoInicial));
      return nuevo;
    });
  }

  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {};
    if (!form.titulo.trim()) nuevosErrores.titulo = "El título es obligatorio.";
    if (form.contactoEmail && !EMAIL_REGEX.test(form.contactoEmail)) {
      nuevosErrores.contactoEmail = "Correo inválido. Debe tener el formato nombre@dominio.cl";
    }
    if (form.contactoTelefono && !telefonoEsValido(form.contactoTelefono)) {
      nuevosErrores.contactoTelefono = "Teléfono inválido. Debe tener entre 8 y 15 dígitos.";
    }
    if (form.probabilidadCierre !== undefined && (form.probabilidadCierre < 0 || form.probabilidadCierre > 100)) {
      nuevosErrores.probabilidadCierre = "Debe estar entre 0 y 100.";
    }
    if (form.montoEstimado !== undefined && form.montoEstimado < 0) {
      nuevosErrores.montoEstimado = "No puede ser negativo.";
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function handleSubmit() {
    if (!validar()) return;
    setEnviando(true);
    try {
      const basePayload = {
        titulo: form.titulo.trim(),
        entidadId: form.entidadId ?? null,
        proyecto: form.proyecto.trim() || null,
        contactoNombre: form.contactoNombre.trim() || null,
        contactoEmail: form.contactoEmail.trim() || null,
        contactoTelefono: form.contactoTelefono.trim() || null,
        responsableId: form.responsableId,
        prioridad: form.prioridad,
        montoEstimado: form.montoEstimado ?? null,
        moneda: form.moneda,
        probabilidadCierre: form.probabilidadCierre ?? null,
        fechaProbableCierre: form.fechaProbableCierre ? form.fechaProbableCierre.toISOString() : null,
        proximaAccion: form.proximaAccion.trim() || null,
        fechaProximaAccion: form.fechaProximaAccion ? form.fechaProximaAccion.toISOString() : null,
        observaciones: form.observaciones.trim() || null,
        estadoDesarrolloPropuesta: form.estadoDesarrolloPropuesta ?? null,
        tipoServicio: form.tipoServicio ?? null,
        tipoServicioOtro: form.tipoServicioOtro.trim() || null,
        informacionPendiente: form.informacionPendiente.trim() || null,
        riesgoTecnico: form.riesgoTecnico ?? null,
        condicionesEspeciales: form.condicionesEspeciales.trim() || null,
        fechaComprometidaEnvio: form.fechaComprometidaEnvio ? form.fechaComprometidaEnvio.toISOString() : null,
        comentariosInternos: form.comentariosInternos.trim() || null,
        montoPropuesto: form.montoPropuesto ?? null,
        fechaEnvioPropuesta: form.fechaEnvioPropuesta ? form.fechaEnvioPropuesta.toISOString() : null,
        fechaVencimientoPropuesta: form.fechaVencimientoPropuesta
          ? form.fechaVencimientoPropuesta.toISOString()
          : null,
        comentariosCliente: form.comentariosCliente.trim() || null,
        objeciones: form.objeciones.trim() || null,
        versionPropuesta: form.versionPropuesta.trim() || null,
        contrapropuestas: form.contrapropuestas.trim() || null,
        ajustesSolicitados: form.ajustesSolicitados.trim() || null,
      };

      let resultado: OportunidadDetalle | undefined;
      if (esEdicion && oportunidad && onSubmitEditar) {
        resultado = await onSubmitEditar(oportunidad.id, basePayload);
      } else if (onSubmitCrear) {
        resultado = await onSubmitCrear(basePayload as CrearOportunidadPayload);
      }

      if (resultado) {
        notification.success({
          message: esEdicion ? "Oportunidad actualizada" : "Oportunidad creada",
          description: `${resultado.codigo} · ${resultado.titulo}`,
        });
        onDirtyChange?.(false);
        onSuccess(resultado);
      }
    } catch (err) {
      // No cerramos el formulario ni limpiamos los datos ingresados ante un error del backend.
      notification.error({
        message: "No se pudo guardar la oportunidad",
        description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Título <span className="text-rose-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.titulo}
            onChange={(e) => actualizar({ titulo: e.target.value })}
            placeholder="Ej: Renovación de equipos sucursal centro"
          />
          {errores.titulo && <p className="text-xs text-rose-500 mt-1">{errores.titulo}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Entidad</label>
          <Select
            className="w-full"
            value={tipoEntidad}
            onChange={(value) => {
              setTipoEntidad(value);
              if (value === "PERSONA") setFiltroOrigen("TODOS");
            }}
            options={[
              { value: "EMPRESA", label: "Empresa" },
              { value: "PERSONA", label: "Persona" },
            ]}
          />
        </div>

        {tipoEntidad === "EMPRESA" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Filtrar por origen</label>
            <Select
              className="w-full"
              value={filtroOrigen}
              onChange={setFiltroOrigen}
              options={[
                { value: "TODOS", label: "Todos los orígenes" },
                { value: "RIDS", label: "RIDS" },
                { value: "ECONNET", label: "ECONNET" },
                { value: "OTRO", label: "OTRO" },
              ]}
            />
          </div>
        )}

        <div className="md:col-span-2 flex gap-2">
          {tipoEntidad === "EMPRESA" ? (
            <button
              type="button"
              onClick={() => setShowNewEmpresa(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition"
            >
              + Crear Empresa
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewPersona(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition"
            >
              + Crear Persona
            </button>
          )}
        </div>

        <div className={tipoEntidad === "EMPRESA" ? "" : "md:col-span-2"}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Cliente / Entidad{" "}
            <span className="font-normal text-slate-400">
              ({entidadesFiltradas.length} de {entidades.length})
            </span>
          </label>
          <Select
            showSearch
            allowClear
            className="w-full"
            placeholder="Seleccione una entidad…"
            value={form.entidadId}
            optionFilterProp="label"
            filterOption={(input, option) => normalizeText(String(option?.label ?? "")).includes(normalizeText(input))}
            onChange={(value) => actualizar({ entidadId: value })}
            options={entidadesFiltradas.map((e) => ({ value: e.id, label: e.nombre }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Responsable comercial</label>
          <Select
            showSearch
            allowClear
            className="w-full"
            placeholder="Se asigna al usuario actual si se deja vacío"
            value={form.responsableId}
            optionFilterProp="label"
            filterOption={(input, option) => normalizeText(String(option?.label ?? "")).includes(normalizeText(input))}
            onChange={(value) => actualizar({ responsableId: value })}
            options={responsables.map((r) => ({ value: r.id_tecnico, label: r.nombre }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Proyecto</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.proyecto}
            onChange={(e) => actualizar({ proyecto: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
          <Select
            className="w-full"
            value={form.prioridad}
            onChange={(value) => actualizar({ prioridad: value })}
            options={Object.values(PRIORIDAD_ENUM).map((p) => ({ value: p, label: getPrioridadLabel(p) }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de contacto</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.contactoNombre}
            onChange={(e) => actualizar({ contactoNombre: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Correo de contacto</label>
          <input
            type="email"
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              errores.contactoEmail ? "border-rose-400 focus:outline-rose-400" : "border-slate-300"
            }`}
            value={form.contactoEmail}
            onChange={(e) => actualizar({ contactoEmail: e.target.value })}
            onBlur={() => {
              const valor = form.contactoEmail.trim();
              setErrores((prev) => {
                const siguiente = { ...prev };
                if (valor && !EMAIL_REGEX.test(valor)) {
                  siguiente.contactoEmail = "Correo inválido. Debe tener el formato nombre@dominio.cl";
                } else {
                  delete siguiente.contactoEmail;
                }
                return siguiente;
              });
            }}
          />
          {errores.contactoEmail && <p className="text-xs text-rose-500 mt-1">{errores.contactoEmail}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono de contacto</label>
          <input
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              errores.contactoTelefono ? "border-rose-400 focus:outline-rose-400" : "border-slate-300"
            }`}
            placeholder="Ej: +56987654321, 56987654321 o 987654321"
            value={form.contactoTelefono}
            onChange={(e) => actualizar({ contactoTelefono: e.target.value })}
            onBlur={() => {
              const valor = form.contactoTelefono.trim();
              setErrores((prev) => {
                const siguiente = { ...prev };
                if (valor && !telefonoEsValido(valor)) {
                  siguiente.contactoTelefono = "Teléfono inválido. Debe tener entre 8 y 15 dígitos.";
                } else {
                  delete siguiente.contactoTelefono;
                }
                return siguiente;
              });
            }}
          />
          {errores.contactoTelefono && <p className="text-xs text-rose-500 mt-1">{errores.contactoTelefono}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Monto estimado</label>
          <div className="flex gap-2">
            <Select
              className="w-24"
              value={form.moneda}
              onChange={(value) => actualizar({ moneda: value })}
              options={[
                { value: "CLP", label: "CLP" },
                { value: "USD", label: "USD" },
              ]}
            />
            <InputNumber
              className="w-full"
              min={0}
              value={form.montoEstimado}
              onChange={(value) => actualizar({ montoEstimado: value ?? undefined })}
            />
          </div>
          {errores.montoEstimado && <p className="text-xs text-rose-500 mt-1">{errores.montoEstimado}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Probabilidad de cierre (%)</label>
          <InputNumber
            className="w-full"
            min={0}
            max={100}
            value={form.probabilidadCierre}
            onChange={(value) => actualizar({ probabilidadCierre: value ?? undefined })}
          />
          {errores.probabilidadCierre && <p className="text-xs text-rose-500 mt-1">{errores.probabilidadCierre}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha probable de cierre</label>
          <DatePicker
            className="w-full"
            format="DD-MM-YYYY"
            value={form.fechaProbableCierre}
            onChange={(value) => actualizar({ fechaProbableCierre: value })}
          />
        </div>

        {mostrarProximaAccion && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Próxima acción</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.proximaAccion}
                onChange={(e) => actualizar({ proximaAccion: e.target.value })}
                placeholder="Ej: Llamar para agendar visita"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha próxima acción</label>
              <DatePicker
                className="w-full"
                format="DD-MM-YYYY"
                value={form.fechaProximaAccion}
                onChange={(value) => actualizar({ fechaProximaAccion: value })}
              />
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={form.observaciones}
            onChange={(e) => actualizar({ observaciones: e.target.value })}
          />
        </div>

        {mostrarPropuesta && (
          <>
            <div className="md:col-span-2 mt-2 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700">Desarrollo de la propuesta</h4>
              <p className="text-xs text-slate-400">
                Campos que se agregan a partir de la etapa Cotización en preparación.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado desarrollo propuesta</label>
              <Select
                allowClear
                className="w-full"
                placeholder="Seleccione un estado…"
                value={form.estadoDesarrolloPropuesta}
                onChange={(value) => actualizar({ estadoDesarrolloPropuesta: value })}
                options={(
                  ["PENDIENTE", "EN_PREPARACION", "ESPERANDO_ANTECEDENTES", "REVISION_INTERNA", "LISTA_PARA_COTIZAR"] as EstadoDesarrolloPropuesta[]
                ).map((v) => ({ value: v, label: getEstadoDesarrolloPropuestaLabel(v) }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de servicio</label>
              <Select
                allowClear
                className="w-full"
                placeholder="Seleccione un tipo…"
                value={form.tipoServicio}
                onChange={(value) => actualizar({ tipoServicio: value })}
                options={(
                  ["SOPORTE_TI", "DESARROLLO_WEB", "VENTA_PRODUCTOS", "OTRO"] as TipoServicioOportunidad[]
                ).map((v) => ({ value: v, label: getTipoServicioOportunidadLabel(v) }))}
              />
            </div>

            {form.tipoServicio === "OTRO" && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Especifique el tipo de servicio</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.tipoServicioOtro}
                  onChange={(e) => actualizar({ tipoServicioOtro: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Riesgo técnico</label>
              <Select
                allowClear
                className="w-full"
                placeholder="Seleccione un riesgo…"
                value={form.riesgoTecnico}
                onChange={(value) => actualizar({ riesgoTecnico: value })}
                options={(["BAJO", "MEDIO", "ALTO"] as RiesgoTecnicoOportunidad[]).map((v) => ({
                  value: v,
                  label: getRiesgoTecnicoLabel(v),
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha comprometida de envío</label>
              <DatePicker
                className="w-full"
                format="DD-MM-YYYY"
                value={form.fechaComprometidaEnvio}
                onChange={(value) => actualizar({ fechaComprometidaEnvio: value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Información pendiente</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={form.informacionPendiente}
                onChange={(e) => actualizar({ informacionPendiente: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Condiciones especiales</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={form.condicionesEspeciales}
                onChange={(e) => actualizar({ condicionesEspeciales: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Comentarios internos</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={form.comentariosInternos}
                onChange={(e) => actualizar({ comentariosInternos: e.target.value })}
              />
            </div>
          </>
        )}

        {mostrarEnvio && (
          <>
            <div className="md:col-span-2 mt-2 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700">Seguimiento de la cotización enviada</h4>
              <p className="text-xs text-slate-400">
                Campos que se agregan a partir de la etapa Cotización enviada.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto propuesto</label>
              <InputNumber
                className="w-full"
                min={0}
                value={form.montoPropuesto}
                onChange={(value) => actualizar({ montoPropuesto: value ?? undefined })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de envío</label>
              <DatePicker
                className="w-full"
                format="DD-MM-YYYY"
                value={form.fechaEnvioPropuesta}
                onChange={(value) => actualizar({ fechaEnvioPropuesta: value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de vencimiento / vigencia</label>
              <DatePicker
                className="w-full"
                format="DD-MM-YYYY"
                value={form.fechaVencimientoPropuesta}
                onChange={(value) => actualizar({ fechaVencimientoPropuesta: value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Comentarios del cliente</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={form.comentariosCliente}
                onChange={(e) => actualizar({ comentariosCliente: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Objeciones</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={form.objeciones}
                onChange={(e) => actualizar({ objeciones: e.target.value })}
              />
            </div>
          </>
        )}

        {mostrarNegociacion && (
          <>
            <div className="md:col-span-2 mt-2 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700">Negociación</h4>
              <p className="text-xs text-slate-400">Campos que se agregan a partir de la etapa Negociación.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Versión propuesta</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.versionPropuesta}
                onChange={(e) => actualizar({ versionPropuesta: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Contrapropuestas</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={form.contrapropuestas}
                onChange={(e) => actualizar({ contrapropuestas: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Ajustes solicitados</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={form.ajustesSolicitados}
                onChange={(e) => actualizar({ ajustesSolicitados: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={enviando}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={enviando}
          className="px-4 py-2 rounded-lg text-sm bg-cyan-600 text-white hover:bg-cyan-700 transition disabled:opacity-60"
        >
          {enviando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear oportunidad"}
        </button>
      </div>

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
    </div>
  );
}
