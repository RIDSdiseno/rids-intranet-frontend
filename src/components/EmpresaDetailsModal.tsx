// src/components/EmpresaDetailsModal.tsx (versión modificada)
import React, { useEffect, useMemo, useState } from "react";
import {
  CloseOutlined,
  LoadingOutlined,
  TeamOutlined,
  LaptopOutlined,
  CalendarOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  UserOutlined,
  BuildOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined
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
  Card,
  Statistic,
  Button
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

  solicitante?: {
    id_solicitante: number;
    nombre: string;
  } | null;
}

export interface SolicitanteLite {
  id_solicitante: number;
  nombre: string;
  email: string | null;
  telefono?: string | null;
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
    sitioWeb?: string;
    industria?: string;
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

type TabKey = "solicitantes" | "equipos" | "visitas" | "resumen";

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
  return new Date(ts).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getTimeAgo = (date?: string | Date | null): string => {
  if (!date) return "—";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return `Hace ${Math.floor(diffDays / 30)} meses`;
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
  if (value === "COMPLETADA") return (
    <Tag color="green">
      COMPLETADA
    </Tag>
  );
  if (value === "PENDIENTE") return (
    <Tag color="orange">
      PENDIENTE
    </Tag>
  );
  if (value === "CANCELADA") return (
    <Tag color="red">
      CANCELADA
    </Tag>
  );
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
    width: 80,
    fixed: 'left',
    sorter: sorterByNumber<SolicitanteLite>((r) => r.id_solicitante),
  },
  {
    title: "Nombre",
    dataIndex: "nombre",
    ellipsis: true,
    render: (text: string) => (
      <div className="font-medium text-slate-800">{text}</div>
    ),
  },
  {
    title: "Contacto",
    dataIndex: "email",
    ellipsis: true,
    render: (email: string | null, record) => (
      <div className="space-y-1">
        {email && (
          <div className="flex items-center gap-1 text-sm">
            <MailOutlined className="text-slate-400 text-xs" />
            <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => {
              navigator.clipboard.writeText(email).then(() => message.success("Email copiado"));
            }}>
              {email}
            </span>
          </div>
        )}
        {record.telefono && (
          <div className="flex items-center gap-1 text-sm">
            <PhoneOutlined className="text-slate-400 text-xs" />
            <span className="text-slate-600">{record.telefono}</span>
          </div>
        )}
      </div>
    ),
  },
  {
    title: "Equipos",
    dataIndex: "equipos",
    width: 100,
    align: "center",
    render: (arr?: EquipoLite[]) => (
      <Badge
        count={arr?.length ?? 0}
        style={{ backgroundColor: '#3b82f6' }}
        showZero
      />
    ),
  },
];

const useEquiposColumns = (): TableColumnsType<EquipoLite> => [
  {
    title: "ID",
    dataIndex: "id_equipo",
    width: 80,
    fixed: 'left',
    sorter: sorterByNumber<EquipoLite>((r) => r.id_equipo),
  },
  {
    title: "Serial",
    dataIndex: "serial",
    ellipsis: true,
    render: (v: string | null) => v ? (
      <Tag color="geekblue" className="font-mono">{v}</Tag>
    ) : "—"
  },
  {
    title: "Marca/Modelo",
    ellipsis: true,
    render: (_: unknown, record: EquipoLite) => (
      <div>
        <div className="font-medium">{record.marca || "—"}</div>
        <div className="text-sm text-slate-500">{record.modelo || "—"}</div>
      </div>
    ),
  },
  {
    title: "Especificaciones",
    ellipsis: true,
    render: (_: unknown, record: EquipoLite) => (
      <div className="space-y-1 text-sm">
        {record.procesador && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">CPU:</span>
            <span className="font-medium">{record.procesador}</span>
          </div>
        )}
        {record.ram && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">RAM:</span>
            <span className="font-medium">{record.ram}</span>
          </div>
        )}
        {record.disco && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">DISCO:</span>
            <span className="font-medium">{record.disco}</span>
          </div>
        )}
      </div>
    ),
  },
  {
    title: "Propiedad",
    dataIndex: "propiedad",
    width: 120,
    render: (v: string | null) => (
      v ? <Tag color={v === 'Empresa' ? 'green' : 'orange'}>{v}</Tag> : "—"
    ),
  },
  {
    title: "Solicitante",
    key: "solicitante",
    ellipsis: true,
    render: (_: unknown, r: EquipoLite) =>
      r.solicitante?.nombre ? (
        <div className="flex items-center gap-2">
          <UserOutlined className="text-slate-400" />
          <span>{r.solicitante.nombre}</span>
        </div>
      ) : "—",
  },
];

const useVisitasColumns = (): TableColumnsType<Visita> => [
  {
    title: "ID",
    dataIndex: "id_visita",
    width: 80,
    sorter: sorterByNumber<Visita>((r) => r.id_visita),
  },
  {
    title: "Fecha",
    key: "inicio",
    width: 160,
    sorter: (a: Visita, b: Visita) => {
      const ad = toTimestamp(a.inicio ?? a.fecha ?? new Date(0));
      const bd = toTimestamp(b.inicio ?? b.fecha ?? new Date(0));
      return ad - bd;
    },
    render: (_: unknown, r: Visita) => (
      <div className="space-y-1">
        <div className="font-medium">{getVisitFecha(r).split(',')[0]}</div>
        <div className="text-xs text-slate-500">{getVisitFecha(r).split(',')[1]?.trim()}</div>
      </div>
    ),
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
    render: (_: unknown, r: Visita) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white text-xs">
          {getVisitTecnico(r).split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <span>{getVisitTecnico(r)}</span>
      </div>
    ),
  },
  {
    title: "Duración",
    key: "duracion",
    width: 110,
    render: (_: unknown, r: Visita) => {
      const duration = diffMinutes(r.inicio, r.fin);
      return duration ? (
        <Tag color="blue">
          {duration}
        </Tag>
      ) : "—";
    },
  },
  {
    title: "Detalle",
    key: "motivo",
    ellipsis: true,
    render: (_: unknown, r: Visita) => (
      <Tooltip placement="topLeft" title={getVisitMotivo(r)}>
        <span className="text-slate-600">{getVisitMotivo(r).slice(0, 40)}...</span>
      </Tooltip>
    ),
  },
];

/* ===================== UI utils ===================== */
const EmpresaInfoGeneral: React.FC<{ empresa: EmpresaLite | null }> = ({ empresa }) => {
  if (!empresa) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label} copiado`);
    });
  };

  const InfoItem = ({
    icon,
    label,
    value,
    copyable = false,
    link = false
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
    copyable?: boolean;
    link?: boolean;
  }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
        {value ? (
          <div className={`flex items-center gap-2 ${link ? 'text-blue-600 hover:underline cursor-pointer' : 'text-slate-900'}`}
            onClick={() => {
              if (copyable) copyToClipboard(value, label);
              if (link && value.includes('@')) window.location.href = `mailto:${value}`;
            }}>
            <span className="font-semibold truncate">{value}</span>
            {copyable && (
              <CopyOutlined className="text-slate-400 hover:text-slate-600 cursor-pointer" />
            )}
          </div>
        ) : (
          <span className="text-slate-400 italic">No especificado</span>
        )}
      </div>
    </div>
  );

  return (
    <Card
      className="mb-6 border-0 shadow-sm bg-gradient-to-br from-white to-blue-50/50"
      bodyStyle={{ padding: '24px' }}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white grid place-items-center text-2xl font-bold shadow-lg">
              {empresa.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "E"}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{empresa.nombre}</h1>
            {empresa.detalleEmpresa?.industria && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                <BuildOutlined className="text-xs" />
                {empresa.detalleEmpresa.industria}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem
          icon={<IdcardOutlined />}
          label="RUT"
          value={empresa.detalleEmpresa?.rut}
          copyable
        />
        <InfoItem
          icon={<MailOutlined />}
          label="Email"
          value={empresa.detalleEmpresa?.email}
          copyable
          link
        />
        <InfoItem
          icon={<PhoneOutlined />}
          label="Teléfono"
          value={empresa.detalleEmpresa?.telefono}
          copyable
        />
        <InfoItem
          icon={<EnvironmentOutlined />}
          label="Dirección"
          value={empresa.detalleEmpresa?.direccion}
          copyable
        />
      </div>

      {empresa.detalleEmpresa?.sitioWeb && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <a
            href={empresa.detalleEmpresa.sitioWeb.startsWith('http') ? empresa.detalleEmpresa.sitioWeb : `https://${empresa.detalleEmpresa.sitioWeb}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {empresa.detalleEmpresa.sitioWeb}
          </a>
        </div>
      )}
    </Card>
  );
};

const StatsOverview: React.FC<{
  solicitantes: SolicitanteLite[];
  equipos: EquipoLite[];
  visitas: Visita[];
}> = ({ solicitantes, equipos, visitas }) => {
  const completedVisits = visitas.filter(v => v.status === 'COMPLETADA').length;
  const pendingVisits = visitas.filter(v => v.status === 'PENDIENTE').length;
  const visitCompletionRate = visitas.length > 0 ? Math.round((completedVisits / visitas.length) * 100) : 0;

  const equiposPorSolicitante = solicitantes.length > 0
    ? (equipos.length / solicitantes.length).toFixed(1)
    : '0.0';

  const lastVisit = visitas.length > 0
    ? visitas.sort((a, b) => {
      const dateA = new Date(a.inicio || a.fecha || 0);
      const dateB = new Date(b.inicio || b.fecha || 0);
      return dateB.getTime() - dateA.getTime();
    })[0]
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={
            <div className="flex items-center gap-2 text-slate-600">
              <TeamOutlined />
              <span>Solicitantes</span>
            </div>
          }
          value={solicitantes.length}
          valueStyle={{ color: '#3b82f6', fontSize: '28px' }}
        />
      </Card>

      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={
            <div className="flex items-center gap-2 text-slate-600">
              <LaptopOutlined />
              <span>Equipos</span>
            </div>
          }
          value={equipos.length}
          valueStyle={{ color: '#10b981', fontSize: '28px' }}
          suffix={
            <div className="text-sm text-slate-500">
              {solicitantes.length > 0 ? (
                <div className="flex items-center gap-1">
                </div>
              ) : null}
            </div>
          }
        />
      </Card>

      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarOutlined />
              <span>Visitas</span>
            </div>
          }
          value={visitas.length}
          valueStyle={{ color: '#8b5cf6', fontSize: '28px' }}
        />
      </Card>

      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircleOutlined />
              <span>Tasa de completitud</span>
            </div>
          }
          value={visitCompletionRate}
          valueStyle={{ color: '#ef4444', fontSize: '28px' }}
          suffix="%"
        />
      </Card>

      {lastVisit && (
        <div className="col-span-2 lg:col-span-4">
          <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500 mb-1">Última visita</div>
                <div className="font-semibold">{getVisitFecha(lastVisit)}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {getVisitTecnico(lastVisit)} • {estadoTag(lastVisit.status)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Hace</div>
                <div className="text-lg font-bold text-slate-800">
                  {getTimeAgo(lastVisit.inicio || lastVisit.fecha)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

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
  const [tab, setTab] = useState<TabKey>("resumen");
  const [density, setDensity] = useState<"Cómodo" | "Compacto">("Cómodo");

  useEffect(() => {
    if (open) setTab("resumen");
  }, [open]);

  const compact = density === "Compacto";

  const solicitantesColumns = useSolicitantesColumns(compact);
  const equiposColumns = useEquiposColumns();
  const visitasColumns = useVisitasColumns();

  const tableCommon: Pick<
    TableProps<unknown>,
    "size" | "bordered" | "sticky" | "className" | "scroll" | "pagination" | "rowClassName"
  > = {
    size: compact ? "small" : "middle",
    bordered: false,
    sticky: { offsetHeader: 0 },
    className: "rounded-lg shadow-sm",
    scroll: { y: 400 },
    pagination: {
      pageSize: compact ? 10 : 8,
      showSizeChanger: false,
      showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`
    },
    rowClassName: (_record: unknown, index: number) =>
      (index % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-slate-50/60 hover:bg-blue-50"),
  };

  const tabItems: TabsProps["items"] = useMemo(
    () => [
      {
        key: "resumen",
        label: (
          <Space size={6}>
            <span className="font-medium">Resumen</span>
          </Space>
        ),
        children: (
          <div className="space-y-6">
            <StatsOverview
              solicitantes={solicitantes}
              equipos={equipos}
              visitas={visitas}
            />
          </div>
        ),
      },
      {
        key: "solicitantes",
        label: (
          <Space size={6}>
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center text-white">
              <TeamOutlined className="text-xs" />
            </div>
            <span className="font-medium">Solicitantes</span>
            <Badge
              count={solicitantes.length}
              style={{ backgroundColor: '#6366f1' }}
              showZero
            />
          </Space>
        ),
        children:
          solicitantes.length === 0 ? (
            <div className="py-16 text-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <div className="text-lg font-medium text-slate-700 mb-2">Sin solicitantes</div>
                    <div className="text-slate-500">Esta empresa no tiene solicitantes registrados</div>
                  </div>
                }
              />
            </div>
          ) : (
            <Card className="border-0 shadow-sm" bodyStyle={{ padding: 0 }}>
              <Table<SolicitanteLite>
                rowKey="id_solicitante"
                columns={solicitantesColumns}
                dataSource={solicitantes}
                {...tableCommon}
              />
            </Card>
          ),
      },
      {
        key: "equipos",
        label: (
          <Space size={6}>
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-white">
              <LaptopOutlined className="text-xs" />
            </div>
            <span className="font-medium">Equipos</span>
            <Badge
              count={equipos.length}
              style={{ backgroundColor: '#10b981' }}
              showZero
            />
          </Space>
        ),
        children:
          equipos.length === 0 ? (
            <div className="py-16 text-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <div className="text-lg font-medium text-slate-700 mb-2">Sin equipos</div>
                    <div className="text-slate-500">No hay equipos registrados para esta empresa</div>
                  </div>
                }
              />
            </div>
          ) : (
            <Card className="border-0 shadow-sm" bodyStyle={{ padding: 0 }}>
              <Table<EquipoLite>
                rowKey="id_equipo"
                columns={equiposColumns}
                dataSource={equipos}
                {...tableCommon}
              />
            </Card>
          ),
      },
      {
        key: "visitas",
        label: (
          <Space size={6}>
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-white">
              <CalendarOutlined className="text-xs" />
            </div>
            <span className="font-medium">Visitas</span>
            <Badge
              count={visitas.length}
              style={{ backgroundColor: '#f59e0b' }}
              showZero
            />
          </Space>
        ),
        children:
          visitas.length === 0 ? (
            <div className="py-16 text-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <div className="text-lg font-medium text-slate-700 mb-2">Sin visitas</div>
                    <div className="text-slate-500">No hay visitas registradas para esta empresa</div>
                  </div>
                }
              />
            </div>
          ) : (
            <Card className="border-0 shadow-sm" bodyStyle={{ padding: 0 }}>
              <Table<Visita>
                rowKey="id_visita"
                columns={visitasColumns}
                dataSource={visitas}
                {...tableCommon}
              />
            </Card>
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
      width={1000}
      destroyOnClose
      styles={{
        header: { padding: 0 },
        body: { padding: 0 },
        footer: {
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }
      }}
      closeIcon={
        <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <CloseOutlined className="text-slate-600" />
        </div>
      }
      title={null}
      footer={
        <div className="w-full flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {empresa && (
              <>
                <span className="font-medium text-slate-700">{empresa.nombre}</span>
                <span className="mx-2">•</span>
                <span>ID: {empresa.id_empresa}</span>
              </>
            )}
          </div>
          <Space>
            <Segmented
              size="small"
              options={[
                { label: 'Cómodo', value: 'Cómodo' },
                { label: 'Compacto', value: 'Compacto' }
              ]}
              value={density}
              onChange={onChangeDensity}
            />
            <Button onClick={onClose}>Cerrar</Button>
          </Space>
        </div>
      }
    >
      {/* Contenido */}
      <div className="px-6 pt-4 pb-6 h-full overflow-y-auto">
        {loading && (
          <div className="h-96 flex flex-col items-center justify-center gap-4">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
              size="large"
            />
            <div className="text-lg font-medium text-slate-700">Cargando detalles de la empresa...</div>
            <div className="text-slate-500">Estamos preparando toda la información</div>
          </div>
        )}

        {!loading && error && (
          <div className="mb-6">
            <Alert
              type="error"
              message="Error al cargar datos"
              description={error}
              showIcon
              closable
            />
          </div>
        )}

        {!loading && empresa && (
          <>
            <EmpresaInfoGeneral empresa={empresa} />

            <div className="mb-6">
              <Tabs
                activeKey={tab}
                onChange={(k) => setTab(k as TabKey)}
                items={tabItems}
                className="custom-tabs"
                tabBarStyle={{
                  marginBottom: '24px',
                  borderBottom: '1px solid #f1f5f9'
                }}
              />
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
};

export default EmpresaDetailsModal;