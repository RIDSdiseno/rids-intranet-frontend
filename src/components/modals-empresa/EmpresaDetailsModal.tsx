// src/components/EmpresaDetailsModal.tsx
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
  Button,
  Form,
  Input
} from "antd";

import type { TabsProps, TableColumnsType, TableProps } from "antd";

import type {
  EmpresaDetailsModalProps,
  EmpresaLite,
  SolicitanteLite,
  EquipoLite,
  Visita,
  TabKey,
} from "../modals-empresa/types";

import { toTimestamp, toDateStringCL } from "../modals-empresa/types";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { api } from "../../api/api"; // 🔥 ajusta ruta

dayjs.extend(utc);

const formatDateTime24 = (date?: string | Date | null) => {
  if (!date) return "—";
  return dayjs.utc(date).format("DD-MM-YYYY, HH:mm");
};

const countVisitDaysInCurrentMonth = (visitas: Visita[]): number => {
  const now = dayjs();
  const uniqueDays = new Set<string>();
  visitas.forEach(v => {
    const date = v.inicio ?? v.fecha;
    if (!date) return;
    const d = dayjs.utc(date);
    if (d.isSame(now, "month")) {
      uniqueDays.add(d.format("YYYY-MM-DD"));
    }
  });
  return uniqueDays.size;
};

const getVisitasMesActual = (visitas: Visita[]): Visita[] => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return visitas.filter(v => {
    const d = new Date(v.inicio ?? v.fecha ?? "");
    return (
      !Number.isNaN(d.getTime()) &&
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear
    );
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
const getVisitMotivo = (v: Visita) =>
  v.otrosDetalle ?? v.motivo ?? v.solicitanteRef?.nombre ?? "—";

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
    width: 80,
    fixed: 'left',
    sorter: sorterByNumber<SolicitanteLite>((r) => r.id_solicitante),
  },
  {
    title: "Nombre",
    dataIndex: "nombre",
    ellipsis: true,
    render: (text: string) => <div className="font-medium text-slate-800">{text}</div>,
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
            <span className="text-blue-600 hover:underline cursor-pointer"
              onClick={() => navigator.clipboard.writeText(email).then(() => message.success("Email copiado"))}>
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
      <Badge count={arr?.length ?? 0} style={{ backgroundColor: '#3b82f6' }} showZero />
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
    render: (v: string | null) => v ? <Tag color="geekblue" className="font-mono">{v}</Tag> : "—",
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
        {record.procesador && <div className="flex items-center gap-1"><span className="text-slate-500">CPU:</span><span className="font-medium">{record.procesador}</span></div>}
        {record.ram && <div className="flex items-center gap-1"><span className="text-slate-500">RAM:</span><span className="font-medium">{record.ram}</span></div>}
        {record.disco && <div className="flex items-center gap-1"><span className="text-slate-500">DISCO:</span><span className="font-medium">{record.disco}</span></div>}
      </div>
    ),
  },
  {
    title: "Propiedad",
    dataIndex: "propiedad",
    width: 120,
    render: (v: string | null) => v ? <Tag color={v === 'Empresa' ? 'green' : 'orange'}>{v}</Tag> : "—",
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
    render: (_: unknown, r: Visita) => {
      const formatted = formatDateTime24(r.inicio ?? r.fecha);
      const [date, time] = formatted.split(",");
      return (
        <div className="space-y-1">
          <div className="font-medium">{date}</div>
          <div className="text-xs text-slate-500">{time?.trim()}</div>
        </div>
      );
    },
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
      return duration ? <Tag color="blue">{duration}</Tag> : "—";
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

/* ===================== EmpresaInfoGeneral ===================== */
const EmpresaInfoGeneral: React.FC<{
  empresa: EmpresaLite | null;
  onUpdated?: () => void;
}> = ({ empresa, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!empresa?.detalleEmpresa) return;
    form.setFieldsValue({
      rut: empresa.detalleEmpresa.rut,
      email: empresa.detalleEmpresa.email,
      telefono: empresa.detalleEmpresa.telefono,
      direccion: empresa.detalleEmpresa.direccion,
    });
  }, [empresa]);

  if (!empresa) return null;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 🔥 usa api en lugar de fetch nativo
      await api.put(`/detalle-empresa/${empresa.detalleEmpresa?.id}`, values);

      message.success("Datos actualizados");
      setEditing(false);
      onUpdated?.();
    } catch {
      message.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className="mb-6 border-0 shadow-sm"
      extra={
        !editing ? (
          <Button type="primary" onClick={() => setEditing(true)}>Editar</Button>
        ) : (
          <Space>
            <Button onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>Guardar</Button>
          </Space>
        )
      }
    >
      {!editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><b>RUT:</b> {empresa.detalleEmpresa?.rut ?? "No especificado"}</div>
          <div><b>Email:</b> {empresa.detalleEmpresa?.email ?? "No especificado"}</div>
          <div><b>Teléfono:</b> {empresa.detalleEmpresa?.telefono ?? "No especificado"}</div>
          <div><b>Dirección:</b> {empresa.detalleEmpresa?.direccion ?? "No especificado"}</div>
        </div>
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item name="rut" label="RUT"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="telefono" label="Teléfono"><Input /></Form.Item>
          <Form.Item name="direccion" label="Dirección"><Input /></Form.Item>
        </Form>
      )}
    </Card>
  );
};

/* ===================== StatsOverview ===================== */
const StatsOverview: React.FC<{
  solicitantes: SolicitanteLite[];
  equipos: EquipoLite[];
  visitas: Visita[];
}> = ({ solicitantes, equipos, visitas }) => {
  const visitDaysThisMonth = countVisitDaysInCurrentMonth(visitas);
  const visitasMesActual = getVisitasMesActual(visitas);

  const lastVisit = visitas.length > 0
    ? [...visitas].sort((a, b) => {
      const dateA = new Date(a.inicio || a.fecha || 0);
      const dateB = new Date(b.inicio || b.fecha || 0);
      return dateB.getTime() - dateA.getTime();
    })[0]
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={<div className="flex items-center gap-2 text-slate-600"><TeamOutlined /><span>Solicitantes</span></div>}
          value={solicitantes.length}
          valueStyle={{ color: '#3b82f6', fontSize: '28px' }}
        />
      </Card>
      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={<div className="flex items-center gap-2 text-slate-600"><LaptopOutlined /><span>Equipos</span></div>}
          value={equipos.length}
          valueStyle={{ color: '#10b981', fontSize: '28px' }}
        />
      </Card>
      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={<div className="flex items-center gap-2 text-slate-600"><CalendarOutlined /><span>Registros de Visitas en el mes actual</span></div>}
          value={visitasMesActual.length}
          valueStyle={{ color: '#8b5cf6', fontSize: '28px' }}
        />
      </Card>
      <Card className="border-0 shadow-sm" bodyStyle={{ padding: '16px' }}>
        <Statistic
          title={<div className="flex items-center gap-2 text-slate-600"><CalendarOutlined /><span>Visitas realizadas este mes</span></div>}
          value={visitDaysThisMonth}
          valueStyle={{ color: '#0ea5e9', fontSize: '28px' }}
          suffix="visitas"
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

/* ===================== Componente principal ===================== */
const EmpresaDetailsModal: React.FC<EmpresaDetailsModalProps> = ({
  open,
  onClose,
  loading,
  error,
  empresa,
  solicitantes,
  equipos,
  visitas,
  onUpdated,
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

  const tabItems: TabsProps["items"] = useMemo(() => [
    {
      key: "resumen",
      label: <Space size={6}><span className="font-medium">Resumen</span></Space>,
      children: (
        <div className="space-y-6">
          <StatsOverview solicitantes={solicitantes} equipos={equipos} visitas={visitas} />
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
          <Badge count={solicitantes.length} style={{ backgroundColor: '#6366f1' }} showZero />
        </Space>
      ),
      children: solicitantes.length === 0 ? (
        <div className="py-16 text-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div><div className="text-lg font-medium text-slate-700 mb-2">Sin solicitantes</div><div className="text-slate-500">Esta empresa no tiene solicitantes registrados</div></div>} />
        </div>
      ) : (
        <Card className="border-0 shadow-sm" bodyStyle={{ padding: 0 }}>
          <Table<SolicitanteLite> rowKey="id_solicitante" columns={solicitantesColumns} dataSource={solicitantes} {...tableCommon} />
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
          <Badge count={equipos.length} style={{ backgroundColor: '#10b981' }} showZero />
        </Space>
      ),
      children: equipos.length === 0 ? (
        <div className="py-16 text-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div><div className="text-lg font-medium text-slate-700 mb-2">Sin equipos</div><div className="text-slate-500">No hay equipos registrados para esta empresa</div></div>} />
        </div>
      ) : (
        <Card className="border-0 shadow-sm" bodyStyle={{ padding: 0 }}>
          <Table<EquipoLite> rowKey="id_equipo" columns={equiposColumns} dataSource={equipos} {...tableCommon} />
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
          <Badge count={visitas.length} style={{ backgroundColor: '#f59e0b' }} showZero />
        </Space>
      ),
      children: visitas.length === 0 ? (
        <div className="py-16 text-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div><div className="text-lg font-medium text-slate-700 mb-2">Sin visitas</div><div className="text-slate-500">No hay visitas registradas para esta empresa</div></div>} />
        </div>
      ) : (
        <Card className="border-0 shadow-sm" bodyStyle={{ padding: 0 }}>
          <Table<Visita> rowKey="id_visita" columns={visitasColumns} dataSource={visitas} {...tableCommon} />
        </Card>
      ),
    },
  ], [solicitantes, equipos, visitas, density]);

  const onChangeDensity = (v: string | number) => {
    if (v === "Cómodo" || v === "Compacto") setDensity(v);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={1000}
      destroyOnClose={false}
      styles={{
        header: { padding: 0 },
        body: { padding: 0 },
        footer: { padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
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
              options={[{ label: 'Cómodo', value: 'Cómodo' }, { label: 'Compacto', value: 'Compacto' }]}
              value={density}
              onChange={onChangeDensity}
            />
            <Button onClick={onClose}>Cerrar</Button>
          </Space>
        </div>
      }
    >
      <div className="px-6 pt-4 pb-6 h-full overflow-y-auto">
        {loading && (
          <div className="h-96 flex flex-col items-center justify-center gap-4">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} size="large" />
            <div className="text-lg font-medium text-slate-700">Cargando detalles de la empresa...</div>
            <div className="text-slate-500">Estamos preparando toda la información</div>
          </div>
        )}

        {!loading && error && (
          <div className="mb-6">
            <Alert type="error" message="Error al cargar datos" description={error} showIcon closable />
          </div>
        )}

        {!loading && empresa && (
          <>
            <div className="mb-8 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-lg font-semibold shadow-sm">
                  {empresa.nombre?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{empresa.nombre}</h2>
                  <p className="text-sm text-slate-500 mt-1">Información y estadísticas generales</p>
                </div>
              </div>
            </div>

            <EmpresaInfoGeneral empresa={empresa} onUpdated={onUpdated} />

            <div className="mb-6">
              <Tabs
                activeKey={tab}
                onChange={(k) => setTab(k as TabKey)}
                items={tabItems}
                className="custom-tabs"
                tabBarStyle={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9' }}
              />
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
};

export default EmpresaDetailsModal;