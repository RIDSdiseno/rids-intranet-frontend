// src/components/CrearEquipoModal.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  Tooltip,
  Tag,
  Alert,
  InputNumber,
  AutoComplete
} from "antd";
import {
  LoadingOutlined,
  PlusOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  ApartmentOutlined,
  DesktopOutlined,
  CheckCircleTwoTone,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import type { TargetAndTransition, Transition } from "framer-motion";

import { http } from "../service/http";

import {
  MARCAS_EQUIPO,
  MODELOS_POR_MARCA,
  PROCESADORES,
} from "../components/modals-gestioo/types";

/* =================== Tipos =================== */
type EmpresaOpt = { id: number; nombre: string };

// Añade esto cerca de tus otros tipos en el archivo
type EquipoLite = { empresaId: number | null; empresa: string | null };
type ApiList<T> = { items: T[]; totalPages?: number };


// ==== DTOs devueltos por la API (para evitar "any") ====
type EmpresaDTO = {
  id_empresa: number;
  nombre: string;
};

type SolicitanteDTO = {
  id_solicitante: number;
  nombre: string;
  empresaId: number | null;
  empresa: EmpresaDTO | null;
};

export type EquipoDTO = {
  id_equipo: number;
  serial: string;
  marca: string;
  modelo: string;
  procesador: string;
  ram: string;
  disco: string;
  propiedad: string;
  idSolicitante: number;
  solicitante: SolicitanteDTO | null;
};

type SolicitanteLite = {
  id_solicitante: number;
  nombre: string;
  empresa?: { id_empresa: number; nombre: string } | null;
};

type ListSolicitantesResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Array<{
    id_solicitante: number;
    nombre: string;
    empresaId: number | null;
    empresa: { id_empresa: number; nombre: string } | null;
  }>;
};

type AntdFieldError = { name: Array<string | number>; errors: string[] };
type AntdValidateError = { errorFields: AntdFieldError[] };

type CreateEquipoPayload = {
  empresaId: number;
  idSolicitante: number | null;
  serial: string;
  marca: string;
  modelo: string;
  procesador: string;
  ram: string;
  disco: string;
  propiedad: string;

  // 🔥 DETALLE
  macWifi?: string;
  redEthernet?: string;
  so?: string;
  tipoDd?: string;
  estadoAlm?: string;
  office?: string;
  teamViewer?: string;
  claveTv?: string;
  revisado?: string;

  adminRidsUsuario?: string;
  adminRidsPassword?: string;
  usuarioEmpresa?: string;
  passwordEmpresa?: string;
  usuarioPersonal?: string;
  passwordPersonal?: string;
};

type CrearEquipoModalProps = {
  open: boolean;
  onClose: () => void;
  defaultSolicitanteId?: number;
  onCreated?: (nuevoEquipo: EquipoDTO) => void;
  brand?: "rids" | "econnet";
  logoUrl?: string;
  // 🔥 NUEVO
  defaultValues?: {
    serial?: string;
    marca?: string;
    modelo?: string;
    precioVenta?: number;
    empresaId?: number;
  };
};

type CreateEquipoResponse = {
  ok: boolean;
  totalReceived: number;
  totalCreated: number;
  totalErrors: number;
  created: EquipoDTO[];
  errors: Array<{
    serial?: string;
    error: string;
  }>;
};

/* =================== Branding =================== */
const THEMES = {
  rids: {
    gradFrom: "from-cyan-600",
    gradTo: "to-indigo-600",
    ring: "focus:ring-cyan-500/40",
    border: "border-cyan-100",
    iconEmpresa: "text-cyan-600",
    stepActive: "bg-cyan-600",
    stepDone: "bg-cyan-500",
    chipBg: "bg-cyan-50",
    glow: "shadow-[0_0_0_3px_rgba(34,211,238,0.12)]",
    blobFrom: "from-cyan-200/40",
    blobTo: "to-indigo-200/30",
  },
  econnet: {
    gradFrom: "from-emerald-600",
    gradTo: "to-teal-600",
    ring: "focus:ring-emerald-500/40",
    border: "border-emerald-100",
    iconEmpresa: "text-emerald-600",
    stepActive: "bg-emerald-600",
    stepDone: "bg-emerald-500",
    chipBg: "bg-emerald-50",
    glow: "shadow-[0_0_0_3px_rgba(16,185,129,0.12)]",
    blobFrom: "from-emerald-200/40",
    blobTo: "to-teal-200/30",
  },
};

/* =================== Utils =================== */
function useDebounce<T>(value: T, ms = 400) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return deb;
}

function isAntdValidateError(x: unknown): x is AntdValidateError {
  return !!x &&
    typeof x === "object" &&
    "errorFields" in x &&
    Array.isArray((x as { errorFields?: unknown }).errorFields);
}

async function fetchSolicitantesByEmpresa(
  empresaId: number,
  search?: string
): Promise<SolicitanteLite[]> {
  const params = new URLSearchParams();
  params.set("empresaId", String(empresaId));
  if (search?.trim()) params.set("q", search.trim());

  const res = await http.get(`/solicitantes/by-empresa?${params.toString()}`);
  return res.data.items.map((it: { id: number; nombre: string }) => ({
    id_solicitante: it.id,
    nombre: it.nombre,
    empresa: null,
  }));
}

async function fetchSolicitantes(
  search: string,
  page = 1,
  pageSize = 120
): Promise<ListSolicitantesResponse> {
  const res = await http.get("/solicitantes", {
    params: { page, pageSize, ...(search.trim() ? { search: search.trim() } : {}) },
  });
  return res.data;
}

type EmpresasResponse = {
  success: boolean;
  data: Array<{ id_empresa: number; nombre: string }>;
  total: number;
};

async function fetchEmpresas(): Promise<EmpresaOpt[]> {
  const res = await http.get("/empresas");
  const raw = res.data;
  const list: Array<{ id_empresa: number; nombre: string }> =
    Array.isArray(raw) ? raw : (raw?.data ?? []);
  return list
    .map((e) => ({ id: e.id_empresa, nombre: e.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function postEquipo(payload: CreateEquipoPayload): Promise<CreateEquipoResponse> {
  const res = await http.post("/equipos", payload);
  return res.data;
}

function getModelosPorMarca(marca: string): readonly string[] {
  const key = marca.toUpperCase() as keyof typeof MODELOS_POR_MARCA;
  return MODELOS_POR_MARCA[key] ?? [];
}

/* =================== Componente =================== */
const CrearEquipoModal: React.FC<CrearEquipoModalProps> = ({
  open,
  onClose,
  defaultSolicitanteId,
  onCreated,
  brand = "rids",
  logoUrl,
  defaultValues,
}) => {
  const T = THEMES[brand];
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // --- empresas ---
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const empresaOptions = useMemo(
    () => empresas.map((e) => ({ label: e.nombre, value: e.id })),
    [empresas]
  );

  const shakeKeyframes: TargetAndTransition = { x: [0, -6, 6, -3, 3, 0] };

  const shakeTransition: Transition = {
    duration: 0.25,
    ease: "easeInOut", // también podrías usar [0.36, 0.66, 0.04, 1]
  }

  const [empError, setEmpError] = useState<string | null>(null);

  const empresaId = Form.useWatch("empresaId", form);
  const marcaValue = Form.useWatch("marca", form);

  // --- solicitantes ---
  const [solSearch, setSolSearch] = useState("");
  const debSearch = useDebounce(solSearch, 400);
  const [solOpts, setSolOpts] = useState<SolicitanteLite[]>([]);
  const [loadingSolicitantes, setLoadingSolicitantes] = useState(false);

  // animación de validación
  const [shakeField, setShakeField] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // fuerza re-render para clases de error

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Y modifica loadSolicitantes para que cuando hay empresa, NO use el search:
  const loadSolicitantes = async () => {
    setLoadingSolicitantes(true);
    try {
      if (empresaId) {
        // ✅ NO pasamos debSearch - cargamos TODOS los solicitantes de la empresa
        const solicitantes = await fetchSolicitantesByEmpresa(empresaId); // ← Sin search
        setSolOpts(solicitantes.map(s => ({ ...s, empresa: { id_empresa: empresaId, nombre: "" } })));
      } else {
        // Para búsqueda global (sin empresa), SÍ usamos debSearch
        const { items } = await fetchSolicitantes(debSearch);
        setSolOpts(items.map(it => ({
          id_solicitante: it.id_solicitante,
          nombre: it.nombre,
          empresa: it.empresa,
        })));
      }
    } catch {
      message.error("No se pudieron cargar solicitantes");
    } finally {
      setLoadingSolicitantes(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setEmpError(null);
        setLoadingEmpresas(true);
        const emps = await fetchEmpresas();
        setEmpresas(emps);
      } catch {
        setEmpresas([]);
        setEmpError("No se pudieron cargar las empresas");
      } finally {
        setLoadingEmpresas(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    loadSolicitantes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empresaId]); // ← QUITA debSearch de aquí

  useEffect(() => {
    if (!open) return;
    setSolSearch("");
    form.resetFields(["idSolicitante"]);

    if (defaultSolicitanteId && solOpts.length > 0) {
      const s = solOpts.find((x) => x.id_solicitante === defaultSolicitanteId);
      if (s?.empresa?.id_empresa) {
        form.setFieldsValue({
          empresaId: s.empresa.id_empresa,
          idSolicitante: defaultSolicitanteId,
        });
      } else {
        form.setFieldsValue({ idSolicitante: defaultSolicitanteId });
      }
    }
  }, [open, defaultSolicitanteId, solOpts, form]);

  const prevEmpresaId = useRef(empresaId);

  useEffect(() => {
    if (!open) return;

    // Solo resetear si la empresa CAMBIÓ (no en el primer render o búsqueda)
    if (prevEmpresaId.current !== empresaId && prevEmpresaId.current !== undefined) {
      form.setFieldsValue({ idSolicitante: null });
      setSolSearch("");
    }
    prevEmpresaId.current = empresaId;
  }, [empresaId, open, form]);

  const handleOk = async () => {
    setSubmitError(null);
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateEquipoPayload = {
        empresaId: values.empresaId,
        idSolicitante:
          values.idSolicitante === null || values.idSolicitante === undefined
            ? null
            : values.idSolicitante,

        serial: (values.serial || "").trim().toUpperCase(),
        marca: values.marca.trim(),
        modelo: values.modelo.trim(),
        procesador: values.procesador.trim(),
        ram: `${Number(values.ramGb)}GB`,
        disco: values.disco.trim(),
        propiedad: values.propiedad.trim(),

        // 🔥 detalle
        macWifi: values.macWifi,
        redEthernet: values.redEthernet,
        so: values.so,
        tipoDd: values.tipoDd,
        estadoAlm: values.estadoAlm,
        office: values.office,
        teamViewer: values.teamViewer,
        claveTv: values.claveTv,
        revisado: values.revisado,

        adminRidsUsuario: values.adminRidsUsuario,
        adminRidsPassword: values.adminRidsPassword,
        usuarioEmpresa: values.usuarioEmpresa,
        passwordEmpresa: values.passwordEmpresa,
        usuarioPersonal: values.usuarioPersonal,
        passwordPersonal: values.passwordPersonal,
      };

      const resp = await postEquipo(payload);

      if (resp.totalErrors > 0 || resp.errors?.length > 0) {
        const primerError = resp.errors[0];
        const msg = primerError?.error || "No se pudo crear el equipo";

        // Detectar serial duplicado específicamente
        if (msg.toLowerCase().includes("serial") || msg.toLowerCase().includes("ya existe")) {
          setSubmitError(`Serial duplicado: ${primerError?.serial} ya está registrado en el sistema`);
          return;
        } else {
          message.error(msg);
        }
        return;
      }

      const equipoCreado = resp.created?.[0];

      if (!equipoCreado) {
        throw new Error("No se recibió el equipo creado desde el servidor");
      }

      message.success("Equipo creado correctamente");
      onCreated?.(equipoCreado);
      form.resetFields();
      onClose();
    } catch (err: unknown) {
      // animación de validación: campo con error tiembla
      if (isAntdValidateError(err) && err.errorFields.length) {
        const first = err.errorFields[0]?.name?.[0];
        if (typeof first === "string") {
          setShakeField(first);
          setTick((t) => t + 1); // actualiza estilos de error
          setTimeout(() => setShakeField(null), 500);
        }
      } else {
        // ✅ Captura el error de serial duplicado desde la respuesta del backend
        const axiosData = (err as any)?.response?.data;

        if (axiosData?.errors?.length > 0) {
          const primerError = axiosData.errors[0];
          message.error(primerError.error || "Error al crear el equipo");
          return;
        }

        const msg = (err as any)?.response?.data?.error
          || (err instanceof Error ? err.message : "Error al crear el equipo");
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSubmitError(null);
    onClose();
  };

  // helpers visuales de error
  const hasError = (name: string) => {
    if (!open) return false;

    const errors = form.getFieldError(name);
    return errors && errors.length > 0;
  };

  /* =================== Animations =================== */
  // usa curva bézier en lugar de string para que pase TS

  // Curva bezier tipada como tupla de 4 números (no number[])
  const EASE_OUT_BEZIER: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const fadeUp = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22, ease: EASE_OUT_BEZIER } as Transition,
  } as const;

  const stepEmpresaDone = !!empresaId;
  const stepSolicDone =
    stepEmpresaDone && open && form.getFieldValue("idSolicitante") !== undefined;
  
  // Determinar si el formulario es válido para enviar, basado en validaciones individuales y globales
  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      maskClosable={false}
      onOk={handleOk}
      confirmLoading={loading}
      width={860}
      className="!top-6"
      title={
        <div className="flex items-center justify-between">
          <div className="relative flex items-center gap-3">
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${T.gradFrom} ${T.gradTo} text-white`}
              aria-label="Crear equipo"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="logo"
                  className="h-10 w-10 rounded-xl object-contain"
                />
              ) : (
                <PlusOutlined />
              )}
              {/* halo */}
              <span className="pointer-events-none absolute -inset-1 rounded-2xl blur-md opacity-60 bg-gradient-to-tr from-white/30 to-transparent" />
            </motion.span>

            <div className="leading-tight">
              <div className="font-semibold text-slate-900">Crear equipo</div>
              <div className="text-xs text-slate-500">
                Primero la empresa, luego (opcional) el solicitante.
              </div>
            </div>
          </div>

          {/* Stepper */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center gap-2 text-[11px]"
            aria-label="Progreso"
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white ring-1 ring-black/5">
              <span
                className={`h-2 w-2 rounded-full ${stepEmpresaDone ? T.stepDone : "bg-slate-300"
                  }`}
              />
              <span>Empresa</span>
            </div>
            <span className="h-px w-6 bg-slate-300" />
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white ring-1 ring-black/5">
              <span
                className={`h-2 w-2 rounded-full ${stepSolicDone ? T.stepDone : "bg-slate-300"
                  }`}
              />
              <span>Solicitante</span>
            </div>
            <span className="h-px w-6 bg-slate-300" />
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white ring-1 ring-black/5">
              <span className={`h-2 w-2 rounded-full ${T.stepActive}`} />
              <span>Detalles</span>
            </div>
          </motion.div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
          <Button onClick={handleCancel} disabled={loading} className="sm:min-w-[120px]">
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleOk}
            loading={loading}
            className="group sm:min-w-[140px] border-0 relative overflow-hidden focus:!ring-2 focus:!ring-offset-2 focus:!ring-offset-white"
          >
            <span
              className={`absolute inset-0 -z-10 bg-gradient-to-tr ${T.gradFrom} ${T.gradTo} transition-transform duration-300 group-hover:scale-105`}
            />
            <span className="relative">Guardar</span>
          </Button>
        </div>
      }
      destroyOnClose
    >
      {/* fondo innovador con blobs */}
      <div className="relative">
        <div className="pointer-events-none absolute -top-8 -left-8 h-48 w-48 rounded-full blur-2xl opacity-60 bg-gradient-to-tr from-sky-200/40 to-transparent" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full blur-3xl opacity-60 bg-gradient-to-tr from-transparent to-violet-200/40" />
      </div>

      <motion.div
        className={`relative rounded-2xl border ${T.border} bg-white/90 backdrop-blur p-4 sm:p-6 shadow-sm`}
        {...fadeUp}
      >
        {/* chip info */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${T.chipBg} text-slate-700 ring-1 ring-black/5`}
          >
            <InfoCircleOutlined />
            Completa los campos requeridos
          </span>
          <AnimatePresence>
            {empresaId && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-green-50 text-green-700 ring-1 ring-black/5"
              >
                <CheckCircleTwoTone twoToneColor="#22c55e" />
                Empresa seleccionada
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        <Form
          form={form}
          layout="vertical"

          initialValues={{
            propiedad: "Empresa",
            idSolicitante: undefined,
            // 🔥 Pre-poblar desde cotización si vienen valores
            serial: defaultValues?.serial,
            marca: defaultValues?.marca,
            modelo: defaultValues?.modelo,
            empresaId: defaultValues?.empresaId,
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement)?.tagName?.toLowerCase() !== "textarea"
            ) {
              e.preventDefault();
              handleOk();
            }
          }}
        >
          {/* Contexto */}
          <motion.div
            className="rounded-xl border border-slate-200/60 bg-slate-50/60 p-3 sm:p-4"
            {...fadeUp}
          >
            <div className="mb-3 flex items-center gap-2 text-slate-700 font-medium">
              <ApartmentOutlined className={T.iconEmpresa} />
              Contexto
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Empresa */}
              <motion.div
                animate={shakeField === "empresaId" ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={shakeTransition}
                className={`rounded-lg ${hasError("empresaId") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                key={`empresa-${tick}`}
              >
                <Form.Item
                  name="empresaId"
                  label="Empresa"
                  rules={[{ required: true, message: "Selecciona la empresa" }]}
                  tooltip={{ title: "Obligatorio", icon: <InfoCircleOutlined /> }}
                >
                  <Select
                    placeholder={loadingEmpresas ? "Cargando empresas…" : "Selecciona una empresa"}
                    loading={loadingEmpresas}
                    options={empresaOptions}
                    showSearch
                    optionFilterProp="label"
                    allowClear={false}
                    styles={{ popup: { root: { maxHeight: 360, overflow: "auto" } } }}
                    className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                  />
                </Form.Item>
              </motion.div>

              {/* Solicitante (opcional) */}
              <motion.div
                animate={shakeField === "idSolicitante" ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={shakeTransition}
                className={`rounded-lg ${hasError("idSolicitante") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                key={`sol-${tick}`}
              >
                <Form.Item
                  name="idSolicitante"
                  label="Solicitante (opcional)"
                  tooltip="Primero selecciona una empresa para ver sus solicitantes. Puedes dejar '— Sin solicitante —'."
                  rules={[
                    {
                      validator: (_, v) =>
                        v === null || typeof v === "number"
                          ? Promise.resolve()
                          : Promise.reject("Selecciona un solicitante válido o deja 'Sin solicitante'"),
                    },
                  ]}
                >
                  <Select
                    disabled={!empresaId}
                    showSearch
                    placeholder={!empresaId ? "Selecciona una empresa…" : "Buscar por nombre…"}
                    options={
                      useMemo(() => {
                        const filtered = empresaId
                          ? solOpts.filter((s) => s.empresa?.id_empresa === empresaId)
                          : [];
                        const opts = filtered.map((s) => ({
                          label: s.empresa?.nombre ? `${s.nombre} — ${s.empresa.nombre}` : s.nombre,
                          value: s.id_solicitante,
                        }));
                        return [{ label: "— Sin solicitante —", value: undefined }, ...opts];
                      }, [solOpts, empresaId]) as { label: string; value: number | null }[]
                    }
                    loading={loadingSolicitantes}
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    allowClear={false}
                    notFoundContent={loadingSolicitantes ? <LoadingOutlined /> : "Sin resultados"}
                    styles={{ popup: { root: { maxHeight: 360, overflow: "auto" } } }}
                    className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                  />
                </Form.Item>
              </motion.div>
            </div>

          </motion.div>

          {/* Especificaciones */}
          <motion.div
            className="mt-4 rounded-xl border border-slate-200/60 bg-white p-3 sm:p-4"
            {...fadeUp}
          >
            <div className="mb-3 flex items-center gap-2 text-slate-700 font-medium">
              <DesktopOutlined />
              Especificaciones
              <Tooltip title="Todos los campos son obligatorios">
                <InfoCircleOutlined className="text-slate-400" />
              </Tooltip>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  name: "serial",
                  label: "Serial",
                  placeholder: "Ej: PF2X3ABC123",
                  max: 60,
                },
                {
                  name: "marca",
                  label: "Marca",
                  placeholder: "Ej: Lenovo, HP, Dell…",
                  max: 60,
                },
                {
                  name: "modelo",
                  label: "Modelo",
                  placeholder: "Ej: ThinkPad T14 Gen3",
                  max: 80,
                },
                {
                  name: "procesador",
                  label: "Procesador",
                  placeholder: "Ej: Intel i5-1240P / Ryzen 5 5600U",
                  max: 80,
                },
              ].map((f) => (
                <motion.div
                  key={f.name}
                  animate={shakeField === f.name ? shakeKeyframes : { x: 0 }}
                  transition={shakeTransition}
                  className={`rounded-lg ${hasError(f.name) ? "ring-2 ring-red-300/70" : ""} transition-all`}
                >

                  <Form.Item
                    name={f.name}
                    label={f.label}
                    rules={[
                      {
                        validator: (_, v) =>
                          v && v.trim()
                            ? Promise.resolve()
                            : Promise.reject(
                              `Ingresa ${f.label.toLowerCase()}`
                            ),
                      },
                    ]}
                  >
                    {f.name === "marca" ? (

                      <AutoComplete
                        options={MARCAS_EQUIPO.map((m) => ({ value: m }))}
                        filterOption={(input, option) =>
                          (option?.value ?? "")
                            .toUpperCase()
                            .includes(input.toUpperCase())
                        }
                      >
                        <Input
                          allowClear
                          placeholder={f.placeholder}
                          className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        />
                      </AutoComplete>

                    ) : f.name === "modelo" ? (

                      <AutoComplete
                        options={getModelosPorMarca(marcaValue || "").map((m: string) => ({ value: m }))}
                        filterOption={(input, option) =>
                          (option?.value ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      >
                        <Input
                          allowClear
                          placeholder={f.placeholder}
                          className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        />
                      </AutoComplete>

                    ) : f.name === "procesador" ? (

                      <AutoComplete
                        options={PROCESADORES.map((p) => ({ value: p }))}
                        filterOption={(input, option) =>
                          (option?.value ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      >
                        <Input
                          allowClear
                          placeholder={f.placeholder}
                          className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        />
                      </AutoComplete>

                    ) : (

                      <Input
                        allowClear
                        placeholder={f.placeholder}
                        className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        onBlur={(e) => {
                          if (f.name === "serial") {
                            form.setFieldsValue({
                              serial: (e.target.value || "").toUpperCase(),
                            });
                          }
                        }}
                      />

                    )}
                  </Form.Item>
                </motion.div>
              ))}

              <motion.div
                animate={shakeField === "ramGb" ? shakeKeyframes : { x: 0 }}
                transition={shakeTransition}
                className={`rounded-lg ${hasError("ramGb") ? "ring-2 ring-red-300/70" : ""} transition-all`}
              >
                <Form.Item
                  name="ramGb"
                  label="RAM"
                  tooltip="Solo el número; se agregará 'GB' automáticamente"
                  rules={[
                    {
                      validator: (_, v) =>
                        typeof v === "number" && v > 0
                          ? Promise.resolve()
                          : Promise.reject("Ingresa la cantidad en GB (ej: 16)"),
                    },
                  ]}
                >
                  <InputNumber
                    className={`w-full ${T.ring} transition-all duration-200 hover:shadow-sm`}
                    min={1}
                    max={1024}
                    step={1}
                    placeholder="Ej: 16"
                    addonAfter="GB"
                  />
                </Form.Item>
              </motion.div>

              <motion.div
                animate={shakeField === "disco" ? shakeKeyframes : { x: 0 }}
                transition={shakeTransition}
                className={`rounded-lg ${hasError("disco") ? "ring-2 ring-red-300/70" : ""} transition-all`}
              >

                <Form.Item
                  name="disco"
                  label="Disco"
                  rules={[
                    {
                      validator: (_, v) =>
                        v && v.trim()
                          ? Promise.resolve()
                          : Promise.reject("Ingresa el almacenamiento"),
                    },
                  ]}
                >
                  <Input
                    allowClear
                    placeholder="Ej: 512GB NVMe"
                    maxLength={40}
                    className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                  />
                </Form.Item>
              </motion.div>

              <motion.div
                animate={shakeField === "propiedad" ? shakeKeyframes : { x: 0 }}
                transition={shakeTransition}
                className={`rounded-lg ${hasError("propiedad") ? "ring-2 ring-red-300/70" : ""} transition-all`}
              >

                <Form.Item
                  name="propiedad"
                  label={
                    <span className="inline-flex items-center gap-1">
                      Propiedad <Tag color="processing">Requerido</Tag>
                    </span>
                  }
                  rules={[{ required: true, message: "Indica la propiedad" }]}
                >
                  <Select
                    options={[
                      { label: "Empresa", value: "Empresa" },
                      { label: "Equipo Personal", value: "Equipo Personal" }, // 👈 AQUÍ
                    ]}
                    className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                  />
                </Form.Item>
              </motion.div>
            </div>
          </motion.div>

          {/* Detalle técnico */}
          <motion.div
            className="mt-4 rounded-xl border border-slate-200/60 bg-white p-3 sm:p-4"
            {...fadeUp}
          >
            <div className="mb-4 flex items-center gap-2 text-slate-700 font-medium">
              Detalles Técnicos
            </div>

            {/* HARDWARE */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Hardware y Sistema
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: "macWifi",
                    label: "MAC WiFi",
                    placeholder: "Ej: 3C:52:82:AB:91:F4",
                  },
                  {
                    name: "redEthernet",
                    label: "Red Ethernet (MAC)",
                    placeholder: "Ej: 00:1B:44:11:3A:B7",
                  },
                  {
                    name: "so",
                    label: "Sistema Operativo",
                    placeholder: "Ej: Windows 11 Pro 23H2 / macOS Sonoma",
                  },
                  {
                    name: "tipoDd",
                    label: "Tipo Disco",
                    placeholder: "Ej: SSD NVMe / HDD 1TB",
                  },
                  {
                    name: "estadoAlm",
                    label: "Estado Almacenamiento",
                    placeholder: "Ej: 98% BUENO",
                  },
                  {
                    name: "office",
                    label: "Office",
                    placeholder: "Ej: Microsoft 365 Apps / Office 2021",
                  },
                  {
                    name: "teamViewer",
                    label: "TeamViewer ID",
                    placeholder: "Ej: 123 456 789",
                  },
                  {
                    name: "claveTv",
                    label: "Clave TeamViewer",
                    placeholder: "Contraseña actual de TeamViewer",
                  },
                ].map((f) => (
                  <Form.Item key={f.name} name={f.name} label={f.label}>
                    <Input
                      allowClear
                      placeholder={f.placeholder}
                      className={`${T.ring}`}
                    />
                  </Form.Item>
                ))}
              </div>
            </div>

            {/* CREDENCIALES */}
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Credenciales
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Form.Item name="adminRidsUsuario" label="Admin RIDS Usuario">
                  <Input allowClear placeholder="Ej: admin / rids" />
                </Form.Item>

                <Form.Item name="adminRidsPassword" label="Admin RIDS Password">
                  <Input.Password allowClear placeholder="Contraseña administrador" />
                </Form.Item>

                <Form.Item name="usuarioEmpresa" label="Usuario Empresa">
                  <Input allowClear placeholder="Ej: usuario@empresa.cl" />
                </Form.Item>

                <Form.Item name="passwordEmpresa" label="Password Empresa">
                  <Input.Password allowClear placeholder="Contraseña corporativa" />
                </Form.Item>

                <Form.Item name="usuarioPersonal" label="Usuario Personal">
                  <Input allowClear placeholder="Ej: usuario personal del equipo" />
                </Form.Item>

                <Form.Item name="passwordPersonal" label="Password Personal">
                  <Input.Password allowClear placeholder="Contraseña cuenta personal" />
                </Form.Item>
              </div>
            </div>
          </motion.div>

          {empError && (
            <motion.div className="mt-3" {...fadeUp}>
              <Alert
                type="error"
                showIcon
                message="No se pudieron cargar empresas"
                description={empError}
              />
            </motion.div>
          )}
          {submitError && (
            <motion.div className="mt-3" {...fadeUp}>
              <Alert
                type="error"
                showIcon
                message="Error al crear equipo"
                description={submitError}
                closable
                onClose={() => setSubmitError(null)}
              />
            </motion.div>
          )}
        </Form>
      </motion.div>
    </Modal>
  );

};

export default CrearEquipoModal;
