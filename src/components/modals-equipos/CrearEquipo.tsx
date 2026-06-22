// src/components/modals-equipos/CrearEquipo.tsx
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
  AutoComplete,
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

import { http } from "../../service/http";

import type {
  CreateEquipoPayload,
  CreateEquipoResponse,
  EquipoAdicionalInput,
  EquipoDTO,
  EmpresaOpt,
  ListSolicitantesResponse,
  SolicitanteLite,
} from "./equipos.types";

import {
  ESTADO_EQUIPO_OPTIONS,
  REQUIRED_FIELDS_BY_TIPO,
  ADICIONAL_TIPOS,
  ADICIONAL_TIPO_LABEL,
  formatRut,
} from "./equipos.helpers";

import {
  MARCAS_EQUIPO,
  MODELOS_POR_MARCA,
  PROCESADORES,
  TipoEquipo,
  TipoEquipoLabel,
  type TipoEquipoValue,
} from "../modals-gestioo/types";

/* =================== Tipos =================== */

type AntdFieldError = { name: Array<string | number>; errors: string[] };
type AntdValidateError = { errorFields: AntdFieldError[] };

type CrearEquipoModalProps = {
  open: boolean;
  onClose: () => void;
  defaultSolicitanteId?: number;
  onCreated?: (nuevoEquipo: EquipoDTO) => void;
  brand?: "rids" | "econnet";
  logoUrl?: string;

  defaultValues?: {
    serial?: string;
    marca?: string;
    modelo?: string;
    precioVenta?: number;
    empresaId?: number;
  };
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
  return res.data.items.map((it: {
    id: number;
    nombre: string;
    email?: string | null;
    rut?: string | null;
  }) => ({
    id_solicitante: it.id,
    nombre: it.nombre,
    email: it.email ?? null,
    rut: it.rut ?? null,
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

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-red-500">*</span>
      <span>{children}</span>
    </span>
  );
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

  const tipoEquipoValue =
    (Form.useWatch("tipo", form) as TipoEquipoValue | undefined) ??
    TipoEquipo.GENERICO;

  const requiredFields =
    REQUIRED_FIELDS_BY_TIPO[tipoEquipoValue] ??
    REQUIRED_FIELDS_BY_TIPO[TipoEquipo.GENERICO];

  const requiresProcesador = requiredFields.procesador;
  const requiresRam = requiredFields.ram;
  const requiresDisco = requiredFields.disco;

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
        // NO pasamos debSearch - cargamos TODOS los solicitantes de la empresa
        const solicitantes = await fetchSolicitantesByEmpresa(empresaId); // ← Sin search
        setSolOpts(solicitantes.map(s => ({ ...s, empresa: { id_empresa: empresaId, nombre: "" } })));
      } else {
        // Para búsqueda global (sin empresa), SÍ usamos debSearch
        const { items } = await fetchSolicitantes(debSearch);
        setSolOpts(items.map(it => ({
          id_solicitante: it.id_solicitante,
          nombre: it.nombre,
          email: it.email ?? null,
          rut: it.rut ?? null,
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

  useEffect(() => {
    if (!open) return;

    const currentRequired =
      REQUIRED_FIELDS_BY_TIPO[tipoEquipoValue] ??
      REQUIRED_FIELDS_BY_TIPO[TipoEquipo.GENERICO];

    if (!currentRequired.procesador) {
      form.setFields([
        { name: "procesador", errors: [] },
      ]);
      form.setFieldsValue({ procesador: undefined });
    }

    if (!currentRequired.ram) {
      form.setFields([
        { name: "ramGb", errors: [] },
      ]);
      form.setFieldsValue({ ramGb: undefined });
    }

    if (!currentRequired.disco) {
      form.setFields([
        { name: "disco", errors: [] },
      ]);
      form.setFieldsValue({ disco: undefined });
    }
  }, [tipoEquipoValue, open, form]);

  const handleOk = async () => {
    setSubmitError(null);
    try {
      const values = await form.validateFields();
      setLoading(true);

      const tipoEquipo = (values.tipo ?? TipoEquipo.GENERICO) as TipoEquipoValue;

      const currentRequired =
        REQUIRED_FIELDS_BY_TIPO[tipoEquipo] ??
        REQUIRED_FIELDS_BY_TIPO[TipoEquipo.GENERICO];

      const payload: CreateEquipoPayload = {
        empresaId: values.empresaId,
        idSolicitante:
          values.idSolicitante === null || values.idSolicitante === undefined
            ? null
            : values.idSolicitante,

        tipo: tipoEquipo,
        serial: (values.serial || "").trim().toUpperCase(),
        marca: values.marca.trim(),
        modelo: values.modelo.trim(),

        // El backend actual exige estos 3 campos.
        // Si no aplican para el tipo seleccionado, se envía "N/A".
        procesador: currentRequired.procesador
          ? values.procesador.trim()
          : "N/A",

        ram: currentRequired.ram
          ? `${Number(values.ramGb)}GB`
          : "N/A",

        disco: currentRequired.disco
          ? values.disco.trim()
          : "N/A",

        propiedad: values.propiedad.trim(),

        estado: values.estado ?? "ACTIVO",
        observaciones: values.observaciones?.trim() || null,

        // detalle
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

        adicionales: (values.adicionales ?? [])
          .filter((a: EquipoAdicionalInput) => !!a?.tipo?.trim())
          .map((a: EquipoAdicionalInput) => ({
            tipo: a.tipo.trim(),
            descripcion: a.descripcion?.trim() || null,
            cantidad: Number(a.cantidad) > 0 ? Number(a.cantidad) : 1,
            serialAdicional: a.serialAdicional?.trim() || null,
          })),
      };

      if (values.anioPc !== undefined && values.anioPc !== null && values.anioPc !== "") {
        payload.anioPc = Number(values.anioPc);
      }

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
        // Captura el error de serial duplicado desde la respuesta del backend
        const axiosData = (err as any)?.response?.data;

        if (axiosData?.errors?.length > 0) {
          const primerError = axiosData.errors[0];

          setSubmitError(
            primerError?.serial
              ? `Serial duplicado: ${primerError.serial} ya está registrado en el sistema`
              : primerError?.error || "Error al crear el equipo"
          );

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

  const solicitanteOptions = useMemo(() => {
    const filtered = empresaId
      ? solOpts.filter((s) => s.empresa?.id_empresa === empresaId)
      : [];

    const opts = filtered.map((s) => {
      const rutTexto = s.rut ? `RUT: ${formatRut(s.rut)}` : "Sin RUT";
      const emailTexto = s.email ? ` — ${s.email}` : "";
      const empresaTexto = s.empresa?.nombre ? ` — ${s.empresa.nombre}` : "";

      return {
        label: `${s.nombre} — ${rutTexto}${emailTexto}${empresaTexto}`,
        value: s.id_solicitante,
      };
    });

    return [{ label: "— Sin solicitante —", value: null }, ...opts] as {
      label: string;
      value: number | null;
    }[];
  }, [solOpts, empresaId]);

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      maskClosable={false}
      footer={null}
      title={null}
      width={980}
      centered
      destroyOnClose
      className="!top-3"
      styles={{
        body: {
          padding: 0,
          maxHeight: "94dvh",
          overflow: "hidden",
        },
      }}
    >
      <div className="relative flex h-[90dvh] flex-col overflow-hidden rounded-2xl bg-white">
        <div className="pointer-events-none absolute -top-10 -left-10 h-52 w-52 rounded-full bg-gradient-to-tr from-sky-200/50 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-60 w-60 rounded-full bg-gradient-to-tr from-transparent to-violet-200/50 blur-3xl" />

        {/* Header */}
        <div className="relative z-10 shrink-0 border-b border-cyan-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${T.gradFrom} ${T.gradTo} text-white shadow-sm`}
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
              </motion.span>

              <div className="leading-tight">
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                  Crear equipo
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Registra la ficha del equipo, datos técnicos, accesos y adicionales.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 text-[11px] md:flex" aria-label="Progreso">
              <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-black/5">
                <span className={`h-2 w-2 rounded-full ${stepEmpresaDone ? T.stepDone : "bg-slate-300"}`} />
                <span>Empresa</span>
              </div>
              <span className="h-px w-6 bg-slate-300" />
              <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-black/5">
                <span className={`h-2 w-2 rounded-full ${stepSolicDone ? T.stepDone : "bg-slate-300"}`} />
                <span>Solicitante</span>
              </div>
              <span className="h-px w-6 bg-slate-300" />
              <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-black/5">
                <span className={`h-2 w-2 rounded-full ${T.stepActive}`} />
                <span>Detalles</span>
              </div>
            </div>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            propiedad: "Empresa",
            idSolicitante: undefined,
            tipo: TipoEquipo.GENERICO,
            estado: "ACTIVO",
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
          className="relative z-10 flex min-h-0 flex-1 flex-col"
        >
          {/* Contenido */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
            <div className="mx-auto w-full max-w-[950px] space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${T.chipBg} text-slate-700 ring-1 ring-black/5`}>
                  <InfoCircleOutlined />
                  Completa los campos requeridos
                </span>
                <AnimatePresence>
                  {empresaId && (
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-green-700 ring-1 ring-black/5"
                    >
                      <CheckCircleTwoTone twoToneColor="#22c55e" />
                      Empresa seleccionada
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {empError && (
                <motion.div {...fadeUp}>
                  <Alert
                    type="error"
                    showIcon
                    message="No se pudieron cargar empresas"
                    description={empError}
                  />
                </motion.div>
              )}

              {submitError && (
                <motion.div {...fadeUp}>
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

              {/* Relación */}
              <motion.section
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                {...fadeUp}
              >
                <div className="mb-4 flex items-center gap-2">
                  <ApartmentOutlined className={T.iconEmpresa} />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Relación</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Empresa y solicitante asociados al equipo.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <motion.div
                    animate={shakeField === "empresaId" ? shakeKeyframes : { x: 0 }}
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

                  <motion.div
                    animate={shakeField === "idSolicitante" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("idSolicitante") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                    key={`sol-${tick}`}
                  >
                    <Form.Item
                      name="idSolicitante"
                      label="Solicitante"
                      tooltip="Primero selecciona una empresa para ver sus solicitantes. Si el solicitante no existe, puedes crearlo desde el módulo de Solicitantes."
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
                        options={solicitanteOptions}
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
              </motion.section>

              {/* Datos principales */}
              <motion.section
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                {...fadeUp}
              >
                <div className="mb-4 flex items-center gap-2">
                  <DesktopOutlined className="text-slate-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Datos principales</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Información base del equipo, estado, propiedad y características generales.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <motion.div
                    animate={shakeField === "tipo" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("tipo") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                  >
                    <Form.Item
                      name="tipo"
                      label={<span className="inline-flex items-center gap-1">Tipo de equipo <Tag color="processing">Requerido</Tag></span>}
                      rules={[{ required: true, message: "Selecciona el tipo de equipo" }]}
                    >
                      <Select
                        placeholder="Selecciona tipo"
                        options={Object.values(TipoEquipo).map((t) => ({
                          value: t,
                          label: TipoEquipoLabel[t],
                        }))}
                        onChange={() => {
                          setSubmitError(null);
                          form.setFields([
                            { name: "procesador", errors: [] },
                            { name: "ramGb", errors: [] },
                            { name: "disco", errors: [] },
                          ]);
                        }}
                        className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                      />
                    </Form.Item>
                  </motion.div>

                  <motion.div
                    animate={shakeField === "serial" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("serial") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                  >
                    <Form.Item
                      name="serial"
                      label={<RequiredLabel>Serial</RequiredLabel>}
                      rules={[
                        {
                          validator: (_, v) =>
                            v && String(v).trim()
                              ? Promise.resolve()
                              : Promise.reject("Ingresa serial"),
                        },
                      ]}
                    >
                      <Input
                        allowClear
                        placeholder="Ej: PF2X3ABC123"
                        maxLength={60}
                        className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        onBlur={(e) => form.setFieldsValue({ serial: (e.target.value || "").toUpperCase() })}
                      />
                    </Form.Item>
                  </motion.div>

                  <motion.div
                    animate={shakeField === "marca" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("marca") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                  >
                    <Form.Item
                      name="marca"
                      label={<RequiredLabel>Marca</RequiredLabel>}
                      rules={[
                        {
                          validator: (_, v) =>
                            v && String(v).trim()
                              ? Promise.resolve()
                              : Promise.reject("Ingresa marca"),
                        },
                      ]}
                    >
                      <AutoComplete
                        options={MARCAS_EQUIPO.map((m) => ({ value: m }))}
                        filterOption={(input, option) =>
                          String(option?.value ?? "").toUpperCase().includes(input.toUpperCase())
                        }
                        onChange={() => form.setFieldsValue({ modelo: undefined })}
                      >
                        <Input
                          allowClear
                          placeholder="Ej: Lenovo, HP, Dell…"
                          maxLength={60}
                          className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        />
                      </AutoComplete>
                    </Form.Item>
                  </motion.div>

                  <motion.div
                    animate={shakeField === "modelo" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("modelo") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                  >
                    <Form.Item
                      name="modelo"
                      label={<RequiredLabel>Modelo</RequiredLabel>}
                      rules={[
                        {
                          validator: (_, v) =>
                            v && String(v).trim()
                              ? Promise.resolve()
                              : Promise.reject("Ingresa modelo"),
                        },
                      ]}
                    >
                      <AutoComplete
                        options={getModelosPorMarca(marcaValue || "").map((m: string) => ({ value: m }))}
                        filterOption={(input, option) =>
                          String(option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        disabled={!marcaValue}
                      >
                        <Input
                          allowClear
                          placeholder={marcaValue ? "Ej: ThinkPad T14 Gen3" : "Selecciona una marca primero"}
                          maxLength={80}
                          className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        />
                      </AutoComplete>
                    </Form.Item>
                  </motion.div>

                  <motion.div
                    animate={shakeField === "procesador" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("procesador") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                  >
                    <Form.Item
                      name="procesador"
                      label={
                        requiresProcesador ? (
                          <RequiredLabel>Procesador</RequiredLabel>
                        ) : (
                          "Procesador (no aplica)"
                        )
                      }
                      rules={[
                        {
                          validator: (_, v) =>
                            !requiresProcesador || (v && String(v).trim())
                              ? Promise.resolve()
                              : Promise.reject("Ingresa procesador"),
                        },
                      ]}
                    >
                      <AutoComplete
                        options={PROCESADORES.map((p) => ({ value: p }))}
                        filterOption={(input, option) =>
                          String(option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        disabled={!requiresProcesador}
                      >
                        <Input
                          allowClear
                          placeholder={requiresProcesador ? "Ej: Intel i5-1240P / Ryzen 5 5600U" : "No aplica para este tipo de equipo"}
                          maxLength={80}
                          className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                        />
                      </AutoComplete>
                    </Form.Item>
                  </motion.div>

                  <motion.div
                    animate={shakeField === "anioPc" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("anioPc") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                  >
                    <Form.Item
                      name="anioPc"
                      label="Año PC"
                      tooltip="Si lo dejas vacío, el sistema intentará calcularlo automáticamente desde el número de serie."
                      rules={[
                        {
                          validator: (_, value) => {
                            if (value === undefined || value === null || value === "") return Promise.resolve();
                            const anio = Number(value);
                            const anioActual = new Date().getFullYear();
                            if (!Number.isInteger(anio)) return Promise.reject(new Error("El año debe ser un número entero"));
                            if (anio < 2000 || anio > anioActual + 1) return Promise.reject(new Error(`El año debe estar entre 2000 y ${anioActual + 1}`));
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={2000}
                        max={new Date().getFullYear() + 1}
                        placeholder="Automático si lo dejas vacío"
                      />
                    </Form.Item>
                  </motion.div>

                  <motion.div
                    animate={shakeField === "ramGb" ? shakeKeyframes : { x: 0 }}
                    transition={shakeTransition}
                    className={`rounded-lg ${hasError("ramGb") ? "ring-2 ring-red-300/70" : ""} transition-all`}
                  >
                    <Form.Item
                      name="ramGb"
                      label={
                        requiresRam ? (
                          <RequiredLabel>RAM</RequiredLabel>
                        ) : (
                          "RAM (no aplica)"
                        )
                      }
                      tooltip={
                        requiresRam
                          ? "Solo el número; se agregará 'GB' automáticamente"
                          : "Este tipo de equipo no requiere RAM"
                      }
                      rules={[
                        {
                          validator: (_, v) =>
                            !requiresRam || (typeof v === "number" && v > 0)
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
                        disabled={!requiresRam}
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
                      label={
                        requiresDisco ? (
                          <RequiredLabel>Disco</RequiredLabel>
                        ) : (
                          "Disco (no aplica)"
                        )
                      }
                      rules={[
                        {
                          validator: (_, v) =>
                            !requiresDisco || (v && String(v).trim())
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
                        disabled={!requiresDisco}
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
                      label={<span className="inline-flex items-center gap-1">Propiedad <Tag color="processing">Requerido</Tag></span>}
                      rules={[{ required: true, message: "Indica la propiedad" }]}
                    >
                      <Select
                        options={[
                          { label: "Empresa", value: "Empresa" },
                          { label: "Equipo Personal", value: "Equipo Personal" },
                        ]}
                        className={`${T.ring} transition-all duration-200 hover:shadow-sm`}
                      />
                    </Form.Item>
                  </motion.div>

                  <Form.Item
                    name="estado"
                    label="Estado del equipo"
                    rules={[{ required: true, message: "Selecciona el estado del equipo" }]}
                  >
                    <Select options={ESTADO_EQUIPO_OPTIONS} placeholder="Selecciona estado" />
                  </Form.Item>

                  <div className="sm:col-span-2 xl:col-span-3">
                    <Form.Item name="observaciones" label="Observaciones">
                      <Input.TextArea
                        rows={3}
                        allowClear
                        showCount
                        maxLength={1000}
                        placeholder="Ingrese observaciones generales del equipo..."
                      />
                    </Form.Item>
                  </div>

                  {tipoEquipoValue && (
                    <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      {requiresProcesador || requiresRam || requiresDisco
                        ? "Este tipo de equipo requiere datos técnicos específicos."
                        : "Este tipo de equipo no requiere procesador, RAM ni disco. Se guardarán como N/A."}
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Detalles técnicos */}
              <motion.section
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                {...fadeUp}
              >
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-800">Detalles técnicos</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Conectividad, sistema operativo, almacenamiento, Office y acceso remoto.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { name: "macWifi", label: "MAC WiFi", placeholder: "Ej: 3C:52:82:AB:91:F4" },
                    { name: "redEthernet", label: "Red Ethernet (MAC)", placeholder: "Ej: 00:1B:44:11:3A:B7" },
                    { name: "so", label: "Sistema Operativo", placeholder: "Ej: Windows 11 Pro 23H2 / macOS Sonoma" },
                    { name: "tipoDd", label: "Tipo Disco", placeholder: "Ej: SSD NVMe / HDD 1TB" },
                    { name: "estadoAlm", label: "Estado Almacenamiento", placeholder: "Ej: 98% BUENO" },
                    { name: "office", label: "Office", placeholder: "Ej: Microsoft 365 Apps / Office 2021" },
                    { name: "teamViewer", label: "TeamViewer ID", placeholder: "Ej: 123 456 789" },
                    { name: "claveTv", label: "Clave TeamViewer", placeholder: "Contraseña actual de TeamViewer" },
                  ].map((f) => (
                    <Form.Item key={f.name} name={f.name} label={f.label}>
                      <Input allowClear placeholder={f.placeholder} className={`${T.ring}`} />
                    </Form.Item>
                  ))}

                  <Form.Item name="revisado" label="Revisado">
                    <Input type="date" className={`${T.ring}`} />
                  </Form.Item>
                </div>
              </motion.section>

              {/* Accesos y usuarios */}
              <motion.section
                className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5"
                {...fadeUp}
              >
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-800">Accesos y usuarios</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Credenciales registradas para administración y usuarios del equipo.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Admin RIDS</div>
                    <Form.Item name="adminRidsUsuario" label="Usuario">
                      <Input allowClear placeholder="Ej: admin / rids" />
                    </Form.Item>
                    <Form.Item name="adminRidsPassword" label="Password">
                      <Input.Password allowClear placeholder="Contraseña administrador" />
                    </Form.Item>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario empresa</div>
                    <Form.Item name="usuarioEmpresa" label="Usuario">
                      <Input allowClear placeholder="Ej: usuario@empresa.cl" />
                    </Form.Item>
                    <Form.Item name="passwordEmpresa" label="Password">
                      <Input.Password allowClear placeholder="Contraseña corporativa" />
                    </Form.Item>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario personal</div>
                    <Form.Item name="usuarioPersonal" label="Usuario">
                      <Input allowClear placeholder="Ej: usuario personal del equipo" />
                    </Form.Item>
                    <Form.Item name="passwordPersonal" label="Password">
                      <Input.Password allowClear placeholder="Contraseña cuenta personal" />
                    </Form.Item>
                  </div>
                </div>
              </motion.section>

              {/* Adicionales */}
              <motion.section
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                {...fadeUp}
              >
                <Form.List name="adicionales" initialValue={[]}>
                  {(fields, { add, remove }) => (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">Adicionales</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Equipos o accesorios adicionales relacionados.
                          </p>
                        </div>

                        <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ cantidad: 1 })}>
                          Agregar adicional
                        </Button>
                      </div>

                      {fields.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          Sin adicionales ingresados.
                        </div>
                      ) : (
                        fields.map(({ key, name, ...restField }) => (
                          <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <Form.Item
                                {...restField}
                                name={[name, "tipo"]}
                                label="Tipo"
                                rules={[{ required: true, message: "Selecciona el tipo" }]}
                              >
                                <Select
                                  placeholder="Selecciona un tipo"
                                  options={ADICIONAL_TIPOS.map((tipo) => ({
                                    value: tipo,
                                    label: ADICIONAL_TIPO_LABEL[tipo] ?? tipo,
                                  }))}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, "cantidad"]}
                                label="Cantidad"
                                initialValue={1}
                                rules={[{ required: true, message: "Ingresa la cantidad" }]}
                              >
                                <InputNumber min={1} className="w-full" />
                              </Form.Item>

                              <Form.Item {...restField} name={[name, "descripcion"]} label="Descripción">
                                <Input allowClear placeholder="Ej: Samsung 24 pulgadas" />
                              </Form.Item>

                              <Form.Item {...restField} name={[name, "serialAdicional"]} label="Serial adicional">
                                <Input allowClear placeholder="Opcional" />
                              </Form.Item>
                            </div>

                            <div className="mt-2 flex justify-end">
                              <Button danger onClick={() => remove(name)}>
                                Quitar
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Form.List>
              </motion.section>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-cyan-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                onClick={handleCancel}
                disabled={loading}
                className="w-full sm:w-auto sm:min-w-[120px]"
              >
                Cancelar
              </Button>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleOk}
                loading={loading}
                className="group relative w-full overflow-hidden border-0 sm:w-auto sm:min-w-[150px]"
              >
                <span className={`absolute inset-0 -z-10 bg-gradient-to-tr ${T.gradFrom} ${T.gradTo} transition-transform duration-300 group-hover:scale-105`} />
                <span className="relative">Guardar equipo</span>
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );

};

export default CrearEquipoModal;
