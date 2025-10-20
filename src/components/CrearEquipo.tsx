// src/components/CrearEquipoModal.tsx
import React, { useEffect, useMemo, useState } from "react";
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



/* =================== API =================== */
const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL || "http://localhost:4000/api";
const MAX_PAGE_SIZE = 200;

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
  ram: string; // `${ramGb}GB`
  disco: string;
  propiedad: string;
};

type CrearEquipoModalProps = {
  open: boolean;
  onClose: () => void;
  defaultSolicitanteId?: number;
  onCreated?: (nuevoEquipo: EquipoDTO) => void; // 👈 sin any
  brand?: "rids" | "econnet";
  logoUrl?: string;
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

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};


async function fetchSolicitantes(
  search: string,
  page = 1,
  pageSize = 120
): Promise<ListSolicitantesResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search.trim()) params.set("search", search.trim());

  const res = await fetch(`${API_URL}/solicitantes?${params.toString()}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
    },
  });
  if (!res.ok) throw new Error("No se pudo listar solicitantes");
  return res.json();
}

async function fetchEmpresasDesdeEquipos(): Promise<EmpresaOpt[]> {
  const empresas = new Map<number, string>();

  const page1 = new URL(`${API_URL}/equipos`);
  page1.searchParams.set("page", "1");
  page1.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
  page1.searchParams.set("_ts", String(Date.now()));

  const res1 = await fetch(page1.toString(), {
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
  });
  if (!res1.ok) throw new Error(`HTTP ${res1.status}`);
  const first = await res1.json();
  const totalPages: number = first?.totalPages || 1;

  const consume = (pl: ApiList<EquipoLite>) => {
    for (const it of pl.items) {
      if (it.empresaId != null && it.empresa) empresas.set(it.empresaId, it.empresa);
    }
  };


  consume(first);

  for (let p = 2; p <= totalPages; p++) {
    const u = new URL(`${API_URL}/equipos`);
    u.searchParams.set("page", String(p));
    u.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
    u.searchParams.set("_ts", String(Date.now()));
    const rx = await fetch(u.toString(), {
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
    });
    if (!rx.ok) throw new Error(`HTTP ${rx.status}`);
    const pj = await rx.json();
    consume(pj);
  }

  return Array.from(empresas.entries())
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

async function postEquipo(payload: CreateEquipoPayload) {
  const res = await fetch(`${API_URL}/equipos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg =
      data?.error ||
      data?.message ||
      `Error HTTP ${res.status} al crear el equipo`;
    throw new Error(msg);
  }
  return res.json();
}

/* =================== Componente =================== */
const CrearEquipoModal: React.FC<CrearEquipoModalProps> = ({
  open,
  onClose,
  defaultSolicitanteId,
  onCreated,
  brand = "rids",
  logoUrl,
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

  // --- solicitantes ---
  const [solSearch, setSolSearch] = useState("");
  const debSearch = useDebounce(solSearch, 400);
  const [solOpts, setSolOpts] = useState<SolicitanteLite[]>([]);
  const [loadingSolicitantes, setLoadingSolicitantes] = useState(false);

  // animación de validación
  const [shakeField, setShakeField] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // fuerza re-render para clases de error

  const loadSolicitantes = async () => {
    setLoadingSolicitantes(true);
    try {
      const data = await fetchSolicitantes(debSearch, 1, 120);
      setSolOpts(
        data.items.map((it) => ({
          id_solicitante: it.id_solicitante,
          nombre: it.nombre,
          empresa: it.empresa,
        }))
      );
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
        const emps = await fetchEmpresasDesdeEquipos();
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
  }, [open, debSearch]);

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

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ idSolicitante: null });
    setSolSearch("");
  }, [empresaId, open, form]);

  const handleOk = async () => {
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
      };

      const nuevo = await postEquipo(payload);
      message.success("Equipo creado correctamente");
      onCreated?.(nuevo);
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
        const msg = err instanceof Error ? err.message : "Error al crear el equipo";
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  


  // helpers visuales de error
  const hasError = (name: string) => form.getFieldError(name).length > 0;

  /* =================== Animations =================== */
  // usa curva bézier en lugar de string para que pase TS

  // Curva bezier tipada como tupla de 4 números (no number[])
  const EASE_OUT_BEZIER: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const fadeUp = {
    initial: { opacity: 0, y: 8 },
    animate:  { opacity: 1, y: 0 },
    transition: { duration: 0.22, ease: EASE_OUT_BEZIER } as Transition,
  } as const;

  const stepEmpresaDone = !!empresaId;
  const stepSolicDone = stepEmpresaDone && form.getFieldValue("idSolicitante") !== undefined;

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
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
                className={`h-2 w-2 rounded-full ${
                  stepEmpresaDone ? T.stepDone : "bg-slate-300"
                }`}
              />
              <span>Empresa</span>
            </div>
            <span className="h-px w-6 bg-slate-300" />
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white ring-1 ring-black/5">
              <span
                className={`h-2 w-2 rounded-full ${
                  stepSolicDone ? T.stepDone : "bg-slate-300"
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
      maskClosable={!loading}
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
          
          initialValues={{ propiedad: "Empresa", idSolicitante: null }}
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
                    dropdownStyle={{ maxHeight: 360, overflow: "auto" }}
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
                        return [{ label: "— Sin solicitante —", value: null } as const, ...opts];
                      }, [solOpts, empresaId]) as { label: string; value: number | null }[]
                    }
                    loading={loadingSolicitantes}
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    onSearch={setSolSearch}
                    allowClear={false}
                    notFoundContent={loadingSolicitantes ? <LoadingOutlined /> : "Sin resultados"}
                    dropdownStyle={{ maxHeight: 360, overflow: "auto" }}
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
                      { required: true, message: `Ingresa ${f.label.toLowerCase()}` },
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
                    <Input
                      allowClear
                      placeholder={f.placeholder}
                      maxLength={f.max}
                      className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                      onBlur={(e) => {
                        if (f.name === "serial") {
                          form.setFieldsValue({
                            serial: (e.target.value || "").toUpperCase(),
                          });
                        }
                      }}
                    />
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
                    { required: true, message: "Ingresa la RAM" },
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
                    { required: true, message: "Ingresa el almacenamiento" },
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
                      { label: "Cliente", value: "Cliente" },
                      { label: "Leasing", value: "Leasing" },
                      { label: "Otro (especificar en notas)", value: "Otro" },
                    ]}
                    className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                  />
                </Form.Item>
              </motion.div>
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
        </Form>
      </motion.div>
    </Modal>
  );

};

export default CrearEquipoModal;
