// src/components/EmpresaDetailsModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  CloseOutlined,
  LoadingOutlined,
  TeamOutlined,
  LaptopOutlined,
} from "@ant-design/icons";
import {
  Drawer,
  Tabs,
  Table,
  Empty,
  Alert,
  Tag,
  Spin,
  Space,
  Tooltip,
  Badge,
  Segmented,
  message,
} from "antd";
import type { TabsProps, TableColumnsType, TableProps } from "antd";

/* ===== Tipos ===== */
export interface EquipoLite {
  id_equipo: number;
  serial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  procesador?: string | null;
  ram?: string | null;
  disco?: string | null;
  propiedad?: string | null;
  idSolicitante?: number | null;
  solicitanteNombre?: string | null;
}

export interface SolicitanteLite {
  id_solicitante: number;
  nombre: string;
  email: string | null;
  area?: string | null;
  cargo?: string | null;
  equipos?: Array<EquipoLite>;
}

export interface EmpresaLite {
  id_empresa: number;
  nombre: string;
  detalleEmpresa?: {
    rut?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
}

/** Compatible controller + legacy */
export interface Visita {
  id_visita: number;

  empresaId?: number | null;
  tecnicoId?: number | null;
  solicitanteId?: number | null;
  solicitante?: string | null;
  inicio?: string | Date | null;
  fin?: string | Date | null;
  status?: "PENDIENTE" | "COMPLETADA" | "CANCELADA" | string | null;

  confImpresoras?: boolean;
  confTelefonos?: boolean;
  confPiePagina?: boolean;
  otros?: boolean;
  otrosDetalle?: string | null;
  actualizaciones?: boolean;
  antivirus?: boolean;
  ccleaner?: boolean;
  estadoDisco?: boolean;
  licenciaOffice?: boolean;
  licenciaWindows?: boolean;
  mantenimientoReloj?: boolean;
  rendimientoEquipo?: boolean;

  empresa?: { id_empresa: number; nombre: string } | null;
  tecnico?: { id_tecnico: number; nombre: string } | string | null;
  solicitanteRef?: { id_solicitante: number; nombre: string } | null;

  // legacy
  fecha?: string | null;
  estado?: string | null;
  motivo?: string | null;
}

type TabKey = "solicitantes" | "equipos" | "visitas";

interface Props {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error?: string | null;
  empresa: EmpresaLite | null;
  solicitantes: SolicitanteLite[];
  equipos: EquipoLite[];
  visitas: Visita[];
}

/* ===================== Helpers ===================== */
const toTimestamp = (value: string | Date): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

const toDateStringCL = (value?: string | Date | null): string => {
  if (!value) return "—";
  const ts = toTimestamp(value as string | Date);
  if (Number.isNaN(ts)) return "—";
  return new Date(ts).toLocaleString("es-CL");
};

const diffMinutes = (a?: string | Date | null, b?: string | Date | null): string | null => {
  if (!a || !b) return null;
  const da = toTimestamp(a);
  const db = toTimestamp(b);
  if (Number.isNaN(da) || Number.isNaN(db)) return null;

  const mins = Math.max(0, Math.round((db - da) / 60000));
  if (!Number.isFinite(mins)) return null;

  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const getVisitFecha = (v: Visita) => toDateStringCL(v.inicio ?? v.fecha ?? null);
const getVisitEstado = (v: Visita) => v.status ?? v.estado ?? "—";
const getVisitTecnico = (v: Visita): string => {
  if (!v.tecnico) return "—";
  return typeof v.tecnico === "string" ? v.tecnico : (v.tecnico?.nombre ?? "—");
};
const getVisitMotivo = (v: Visita) => v.otrosDetalle ?? v.motivo ?? v.solicitante ?? "—";

const estadoTag = (estado?: string | null) => {
  const value = (estado ?? "").toUpperCase();
  if (value === "COMPLETADA") return <Tag color="green">COMPLETADA</Tag>;
  if (value === "PENDIENTE") return <Tag color="orange">PENDIENTE</Tag>;
  if (value === "CANCELADA") return <Tag color="red">CANCELADA</Tag>;
  return <Tag>{estado ?? "—"}</Tag>;
};

const sorterByString =
  <T,>(selector: (row: T) => string) =>
  (a: T, b: T) =>
    selector(a).localeCompare(selector(b), "es");

const sorterByNumber =
  <T,>(selector: (row: T) => number) =>
  (a: T, b: T) =>
    selector(a) - selector(b);

/* ===================== Columnas ===================== */
const useSolicitantesColumns = (dense: boolean): TableColumnsType<SolicitanteLite> => [
  {
    title: "ID",
    dataIndex: "id_solicitante",
    width: 90,
    sorter: sorterByNumber<SolicitanteLite>((r) => r.id_solicitante),
  },
  {
    title: "Nombre",
    dataIndex: "nombre",
    ellipsis: true,
    sorter: sorterByString<SolicitanteLite>((r) => r.nombre ?? ""),
  },
  {
    title: "Email",
    dataIndex: "email",
    ellipsis: true,
    render: (v: string | null) =>
      v ? (
        <Tooltip title="Copiar email">
          <span
            className="cursor-pointer text-blue-600 hover:underline"
            onClick={() => {
              navigator.clipboard.writeText(v).then(() => message.success("Email copiado"));
            }}
          >
            {v}
          </span>
        </Tooltip>
      ) : (
        "—"
      ),
  },
  {
    title: "Equipos",
    dataIndex: "equipos",
    width: dense ? 90 : 110,
    align: "center",
    render: (arr?: EquipoLite[]) => arr?.length ?? 0,
  },
];

const useEquiposColumns = (): TableColumnsType<EquipoLite> => [
  {
    title: "ID",
    dataIndex: "id_equipo",
    width: 90,
    sorter: sorterByNumber<EquipoLite>((r) => r.id_equipo),
  },
  { title: "Serial", dataIndex: "serial", ellipsis: true, render: (v: string | null) => v ?? "—" },
  { title: "Marca", dataIndex: "marca", ellipsis: true, render: (v: string | null) => v ?? "—" },
  { title: "Modelo", dataIndex: "modelo", ellipsis: true, render: (v: string | null) => v ?? "—" },
  {
    title: "Solicitante",
    dataIndex: "solicitanteNombre",
    ellipsis: true,
    render: (v: string | null) => v ?? "—",
  },
];

const useVisitasColumns = (): TableColumnsType<Visita> => [
  {
    title: "ID",
    dataIndex: "id_visita",
    width: 90,
    sorter: sorterByNumber<Visita>((r) => r.id_visita),
  },
  {
    title: "Fecha (inicio)",
    key: "inicio",
    width: 190,
    sorter: (a: Visita, b: Visita) => {
      const ad = toTimestamp(a.inicio ?? a.fecha ?? new Date(0));
      const bd = toTimestamp(b.inicio ?? b.fecha ?? new Date(0));
      return ad - bd;
    },
    render: (_: unknown, r: Visita) => getVisitFecha(r),
  },
  {
    title: "Estado",
    key: "estado",
    width: 140,
    filters: [
      { text: "Pendiente", value: "PENDIENTE" },
      { text: "Completada", value: "COMPLETADA" },
      { text: "Cancelada", value: "CANCELADA" },
    ],
    onFilter: (value, record) =>
      (getVisitEstado(record) ?? "").toUpperCase().includes(String(value)),
    render: (_: unknown, r: Visita) => estadoTag(getVisitEstado(r)),
  },
  {
    title: "Técnico",
    key: "tecnico",
    ellipsis: true,
    sorter: sorterByString<Visita>((r) => getVisitTecnico(r) ?? ""),
    render: (_: unknown, r: Visita) => getVisitTecnico(r),
  },
  {
    title: "Duración",
    key: "duracion",
    width: 110,
    render: (_: unknown, r: Visita) => diffMinutes(r.inicio, r.fin) ?? "—",
  },
  {
    title: "Motivo / Detalle",
    key: "motivo",
    ellipsis: true,
    render: (_: unknown, r: Visita) => (
      <Tooltip placement="topLeft" title={getVisitMotivo(r)}>
        {getVisitMotivo(r)}
      </Tooltip>
    ),
  },
];

/* ===================== UI utils ===================== */
const initials = (name?: string) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/* ===================== Componente ===================== */
const EmpresaDetailsModal: React.FC<Props> = ({
  open,
  onClose,
  loading,
  error,
  empresa,
  solicitantes,
  equipos,
  visitas,
}) => {
  const [tab, setTab] = useState<TabKey>("solicitantes");
  const [density, setDensity] = useState<"Cómodo" | "Compacto">("Cómodo");

  useEffect(() => {
    if (open) setTab("solicitantes");
  }, [open]);

  const compact = density === "Compacto";

  const solicitantesColumns = useSolicitantesColumns(compact);
  const equiposColumns = useEquiposColumns();
  const visitasColumns = useVisitasColumns();

  const resumenChips = useMemo(
    () => [
      { key: "sol", label: "Solicitantes", value: solicitantes.length, icon: <TeamOutlined className="text-blue-600" /> },
      { key: "eq", label: "Equipos", value: equipos.length, icon: <LaptopOutlined className="text-emerald-600" /> },
      { key: "vi", label: "Visitas", value: visitas.length, icon: <Badge status="processing" /> },
    ],
    [solicitantes.length, equipos.length, visitas.length]
  );

  const tableCommon: Pick<
    TableProps<unknown>,
    "size" | "bordered" | "sticky" | "className" | "scroll" | "pagination" | "rowClassName"
  > = {
    size: compact ? "small" : "middle",
    bordered: false,
    sticky: { offsetHeader: 0 },
    className: "rounded-lg",
    scroll: { y: 420 },
    pagination: { pageSize: compact ? 9 : 8, showSizeChanger: false },
    rowClassName: (_record: unknown, index: number) =>
      (index % 2 === 0 ? "bg-white" : "bg-slate-50/60"),
  };

  const tabItems: TabsProps["items"] = useMemo(
    () => [
      {
        key: "solicitantes",
        label: (
          <Space size={6}>
            <TeamOutlined />
            <span>Solicitantes</span>
            <Tag className="ml-1" color="default">
              {solicitantes.length}
            </Tag>
          </Space>
        ),
        children:
          solicitantes.length === 0 ? (
            <div className="py-10">
              <Empty description="Sin solicitantes" />
            </div>
          ) : (
            <Table<SolicitanteLite>
              rowKey="id_solicitante"
              columns={solicitantesColumns}
              dataSource={solicitantes}
              {...tableCommon}
            />
          ),
      },
      {
        key: "equipos",
        label: (
          <Space size={6}>
            <LaptopOutlined />
            <span>Equipos</span>
            <Tag className="ml-1" color="default">
              {equipos.length}
            </Tag>
          </Space>
        ),
        children:
          equipos.length === 0 ? (
            <div className="py-10">
              <Empty description="Sin equipos" />
            </div>
          ) : (
            <Table<EquipoLite>
              rowKey="id_equipo"
              columns={equiposColumns}
              dataSource={equipos}
              {...tableCommon}
            />
          ),
      },
      {
        key: "visitas",
        label: (
          <Space size={6}>
            <span>Visitas</span>
            <Tag className="ml-1" color="default">
              {visitas.length}
            </Tag>
          </Space>
        ),
        children:
          visitas.length === 0 ? (
            <div className="py-10">
              <Empty description="Sin visitas" />
            </div>
          ) : (
            <Table<Visita>
              rowKey="id_visita"
              columns={visitasColumns}
              dataSource={visitas}
              {...tableCommon}
            />
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solicitantes, equipos, visitas, density]
  );

  const onChangeDensity = (v: string | number) => {
    if (v === "Cómodo" || v === "Compacto") setDensity(v);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={900}
      destroyOnClose
      styles={{ header: { padding: 0 }, body: { padding: 0 } }}
      closeIcon={<CloseOutlined />}
      title={
        <div className="px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {/* Avatar con iniciales */}
              <div className="w-10 h-10 rounded-xl shrink-0 bg-gradient-to-br from-cyan-500 to-blue-600 text-white grid place-items-center font-bold">
                {initials(empresa?.nombre) || "E"}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {empresa?.nombre ?? "Detalles de Empresa"}
                </h3>
                {/* (Se removieron los chips de RUT / email / Ver mapa) */}
              </div>
            </div>

            {/* chips de resumen + densidad */}
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="flex gap-2">
                {resumenChips.map((c) => (
                  <div
                    key={c.key}
                    className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[13px] flex items-center gap-2"
                  >
                    {c.icon}
                    <span className="font-medium">{c.value}</span>
                    <span className="text-slate-500">{c.label}</span>
                  </div>
                ))}
              </div>
              <Segmented
                size="small"
                options={["Cómodo", "Compacto"]}
                value={density}
                onChange={onChangeDensity}
              />
            </div>
          </div>
        </div>
      }
    >
      {/* Contenido */}
      <div className="px-4 sm:px-5 pt-3 pb-5">
        {loading && (
          <div className="h-64 flex items-center justify-center">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />}
              tip="Cargando detalles…"
            />
          </div>
        )}

        {!loading && error && (
          <div className="mb-3">
            <Alert type="warning" message={error} showIcon />
          </div>
        )}

        {!loading && (
          <Tabs
            activeKey={tab}
            onChange={(k) => setTab(k as TabKey)}
            items={tabItems}
            className="[&_.ant-tabs-tab]:px-3 [&_.ant-tabs-tab]:py-1"
          />
        )}
      </div>
    </Drawer>
  );
};

export default EmpresaDetailsModal;
