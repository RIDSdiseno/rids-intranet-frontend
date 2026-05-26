// src/host/TecnicosPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  SearchOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useAuth } from "../components/hooks/useAuth";
import { http } from "../service/http";
import HorasHombreDashboard from "../components/modals-tecnicos/Horashombredashboard";
import type { HorasTecnicosDashboardData } from "../components/modals-tecnicos/Horashombredashboard";

type Tecnico = {
  id_tecnico: number;
  nombre: string;
  email: string;
  status: boolean;
  rol: string;
};

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthRangeFromKey(monthKey: string) {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    const current = getCurrentMonthKey();
    return getMonthRangeFromKey(current);
  }

  const from = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonthDate = new Date(year, month, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = String(nextMonthDate.getMonth() + 1).padStart(2, "0");

  const to = `${nextYear}-${nextMonth}-01`;

  return { from, to };
}

function formatMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) return monthKey;

  return date.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });
}

type TecnicosTab = "lista" | "horas";

const ROLES_VISIBLES = ["ADMINISTRACION", "ADMIN", "TECNICO", "VENTAS"];

const RolBadge: React.FC<{ rol: string }> = ({ rol }) => {
  const colors: Record<string, string> = {
    ADMIN: "bg-red-50 text-red-700 ring-red-200",
    ADMINISTRACION: "bg-orange-50 text-orange-700 ring-orange-200",
    TECNICO: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    VENTAS: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${colors[rol] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}>
      {rol}
    </span>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
    <div className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-cyan-200 bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 transition-colors text-slate-400"><CloseOutlined /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const TecnicosPage: React.FC = () => {
  const { isAdminLike } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Tecnico | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStatus, setFormStatus] = useState(true);
  const [formRol, setFormRol] = useState("TECNICO");
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRol, setNewRol] = useState("TECNICO");
  const [newStatus, setNewStatus] = useState(true);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"activo" | "inactivo" | "todos">("activo");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TecnicosTab>("lista");
  const [horasData, setHorasData] = useState<HorasTecnicosDashboardData | null>(null);
  const [horasLoading, setHorasLoading] = useState(false);
  const [horasError, setHorasError] = useState<string | null>(null);

  const [horasMonth, setHorasMonth] = useState(getCurrentMonthKey());

  const horasRange = useMemo(
    () => getMonthRangeFromKey(horasMonth),
    [horasMonth]
  );

  const tecnicosFiltrados = useMemo(
    () =>
      tecnicos.filter((t) => {
        const rol = String(t.rol ?? "").toUpperCase().trim();

        if (!ROLES_VISIBLES.includes(rol)) return false;

        const texto = busqueda.toLowerCase();

        const matchTexto =
          (t.nombre?.toLowerCase() ?? "").includes(texto) ||
          (t.email?.toLowerCase() ?? "").includes(texto);

        const matchRol = filtroRol
          ? rol === filtroRol.toUpperCase().trim()
          : true;

        return matchTexto && matchRol;
      }),
    [tecnicos, busqueda, filtroRol]
  );

  const totalPages = Math.max(1, Math.ceil(tecnicosFiltrados.length / pageSize));
  const tecnicosPaginados = tecnicosFiltrados.slice((page - 1) * pageSize, page * pageSize);

  const fetchTecnicos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await http.get("/tecnicos/usuarios", {
        params: {
          status: filtroStatus,
        },
      });

      setTecnicos(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.message || "Error al cargar técnicos");
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  const fetchHorasDashboard = useCallback(async () => {
    try {
      setHorasLoading(true);
      setHorasError(null);

      const { data } = await http.get("/tecnicos/dashboard/horas-hombre", {
        params: {
          from: horasRange.from,
          to: horasRange.to,
        },
      });

      setHorasData(data?.data ?? null);
    } catch (err: any) {
      setHorasError(
        err?.response?.data?.message ||
        err?.message ||
        "Error al cargar dashboard de horas hombre"
      );
    } finally {
      setHorasLoading(false);
    }
  }, [horasRange.from, horasRange.to]);

  useEffect(() => { fetchTecnicos(); }, [fetchTecnicos]);
  useEffect(() => {
    if (activeTab !== "horas") return;
    fetchHorasDashboard();
  }, [activeTab, fetchHorasDashboard]);
  useEffect(() => { setPage((p) => Math.min(p, totalPages)); }, [totalPages]);

  const onClickEdit = (t: Tecnico) => { setEditando(t); setFormNombre(t.nombre); setFormEmail(t.email); setFormStatus(t.status); setFormRol(t.rol ?? "TECNICO"); };
  const onGuardar = async () => {
    if (!editando) return;
    try { setGuardando(true); await http.put(`/tecnicos/${editando.id_tecnico}`, { nombre: formNombre, email: formEmail, status: formStatus, rol: formRol }); setEditando(null); await fetchTecnicos(); }
    catch (err: any) { alert(err?.message || "Error al actualizar técnico"); }
    finally { setGuardando(false); }
  };
  const onClickDelete = async (t: Tecnico) => {
    if (!window.confirm(`¿Eliminar a ${t.nombre}? Esta acción no se puede deshacer.`)) return;
    try { setDeletingId(t.id_tecnico); await http.delete(`/tecnicos/${t.id_tecnico}`); await fetchTecnicos(); }
    catch (err: any) { alert(err?.message || "Error al eliminar técnico"); }
    finally { setDeletingId(null); }
  };
  const onCrearTecnico = async () => {
    try { setGuardandoNuevo(true); await http.post("/tecnicos", { nombre: newNombre, email: newEmail, password: newPassword, rol: newRol, status: newStatus }); setCreando(false); setNewNombre(""); setNewEmail(""); setNewPassword(""); setNewRol("TECNICO"); setNewStatus(true); await fetchTecnicos(); }
    catch (err: any) { alert(err?.response?.data?.error || "Error al crear técnico"); }
    finally { setGuardandoNuevo(false); }
  };

  const pageNumbers = useMemo(() => {
    const nums = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
    return nums.reduce<(number | "...")[]>((acc, n, i, arr) => { if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("..."); acc.push(n); return acc; }, []);
  }, [totalPages, page]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-white to-cyan-50">
      <div className="mx-auto max-w-screen-2xl px-3 pt-14 pb-10 sm:px-5 sm:pt-6 lg:px-8">
        <div className="mb-5 rounded-2xl border border-cyan-200 bg-white/80 px-5 py-4 shadow-sm backdrop-blur-xl sm:px-6 sm:py-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Técnicos <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">RIDS.CL</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de usuarios técnicos del sistema.</p>
        </div>

        <div className="mb-5 inline-flex rounded-2xl border border-cyan-200 bg-white p-1 shadow-sm">
          {(["lista", "horas"] as TecnicosTab[]).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === tab ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:bg-cyan-50"}`}>
              {tab === "lista" ? "Lista de técnicos" : "Horas hombre"}
            </button>
          ))}
        </div>

        {activeTab === "lista" && (
          <div className="rounded-2xl border border-cyan-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-cyan-200 bg-cyan-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-slate-700">Lista de técnicos</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button onClick={fetchTecnicos} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-cyan-800 hover:bg-cyan-50 transition sm:py-1.5">
                  <ReloadOutlined /> Recargar
                </button>
                {isAdminLike && (
                  <button onClick={() => setCreando(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition sm:py-1.5">
                    + Nuevo Técnico
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center border-b border-slate-100">
              <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} placeholder="Buscar por nombre o email..." className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <select value={filtroRol} onChange={(e) => { setFiltroRol(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 sm:w-auto w-full">
                <option value="">Todos los roles</option>
                <option value="ADMINISTRACION">Administración</option>
                <option value="ADMIN">Admin</option>
                <option value="TECNICO">Técnico</option>
                <option value="VENTAS">Ventas</option>
              </select>

              <select
                value={filtroStatus}
                onChange={(e) => {
                  setFiltroStatus(e.target.value as "activo" | "inactivo" | "todos");
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 sm:w-auto w-full"
              >
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
                <option value="todos">Todos los estados</option>
              </select>

              {(busqueda || filtroRol || filtroStatus) && (
                <button onClick={() => { setBusqueda(""); setFiltroRol(""); setFiltroStatus("activo"); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 transition sm:w-auto w-full">
                  Limpiar filtros
                </button>
              )}
            </div>

            {loading && <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>}
            {error && <div className="px-4 py-8 text-center text-rose-700">{error}</div>}
            {!loading && !error && (
              <>
                <div className="block sm:hidden divide-y divide-slate-100">
                  {tecnicosPaginados.length === 0 ? (
                    <div className="px-4 py-10 text-center"><UserOutlined className="text-3xl text-slate-300 mb-2 block" /><p className="text-sm text-slate-400">{tecnicos.length === 0 ? "Sin técnicos." : "Sin coincidencias."}</p></div>
                  ) : tecnicosPaginados.map((t) => (
                    <div key={t.id_tecnico} className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-700 shrink-0"><UserOutlined /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-slate-800 text-sm">{t.nombre}</span><RolBadge rol={t.rol ?? "TECNICO"} /></div>
                          <p className="text-xs text-slate-500 mt-0.5 break-all">{t.email}</p>
                        </div>
                        <span className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${t.status ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
                          {t.status ? <CheckCircleOutlined /> : <StopOutlined />}{t.status ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      {isAdminLike && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => onClickEdit(t)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition"><EditOutlined /> Editar</button>
                          <button onClick={() => onClickDelete(t)} disabled={deletingId === t.id_tecnico} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 transition disabled:opacity-50"><DeleteOutlined />{deletingId === t.id_tecnico ? "Eliminando…" : "Eliminar"}</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="border-b border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">ID</th>
                        <th className="px-4 py-3 text-left">Nombre</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Rol</th>
                        <th className="px-4 py-3 text-left">Estado</th>
                        {isAdminLike && <th className="px-4 py-3 text-left">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {tecnicosPaginados.length === 0 ? (
                        <tr><td colSpan={isAdminLike ? 6 : 5} className="px-4 py-10 text-center text-slate-400">{tecnicos.length === 0 ? "Sin técnicos." : "Sin coincidencias."}</td></tr>
                      ) : tecnicosPaginados.map((t) => (
                        <tr key={t.id_tecnico} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-400 text-xs">{t.id_tecnico}</td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0 text-xs"><UserOutlined /></div><span className="font-medium text-slate-800">{t.nombre}</span></div></td>
                          <td className="px-4 py-3 text-slate-500">{t.email}</td>
                          <td className="px-4 py-3"><RolBadge rol={t.rol ?? "TECNICO"} /></td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${t.status ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
                              {t.status ? <CheckCircleOutlined /> : <StopOutlined />}{t.status ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          {isAdminLike && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => onClickEdit(t)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 transition"><EditOutlined /> Editar</button>
                                <button onClick={() => onClickDelete(t)} disabled={deletingId === t.id_tecnico} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 transition disabled:opacity-50"><DeleteOutlined />{deletingId === t.id_tecnico ? "…" : "Eliminar"}</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">Página <strong>{page}</strong> de <strong>{totalPages}</strong> — {tecnicosFiltrados.length} técnicos</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-xs text-cyan-800 hover:bg-cyan-50 transition disabled:opacity-40">← Anterior</button>
                {pageNumbers.map((n, i) => n === "..." ? <span key={`d${i}`} className="px-1 text-slate-400 text-xs">…</span> : (
                  <button key={n} onClick={() => setPage(Number(n))} className={`rounded-xl border px-3 py-1.5 text-xs transition ${page === n ? "border-cyan-600 bg-cyan-600 font-semibold text-white" : "border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50"}`}>{n}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-xs text-cyan-800 hover:bg-cyan-50 transition disabled:opacity-40">Siguiente →</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "horas" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Dashboard de horas hombre</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Visitas completadas + mantenciones remotas. Filtra por empresa en el panel lateral.</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Mes</div>
                  <input
                    type="month"
                    value={horasMonth}
                    onChange={(e) => setHorasMonth(e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Período:{" "}
                  <span className="font-semibold text-slate-700 capitalize">
                    {formatMonthTitle(horasMonth)}
                  </span>
                </div>
              </div>
            </div>
            <HorasHombreDashboard
              data={horasData}
              loading={horasLoading}
              error={horasError}
            />
          </div>
        )}
      </div>

      {creando && (
        <Modal title="Nuevo técnico" onClose={() => setCreando(false)}>
          <div className="space-y-4">
            {[{ label: "Nombre", value: newNombre, set: setNewNombre, type: "text" }, { label: "Email", value: newEmail, set: setNewEmail, type: "email" }, { label: "Contraseña", value: newPassword, set: setNewPassword, type: "password" }].map(({ label, value, set, type }) => (
              <div key={label}><label className="block text-sm font-medium text-slate-700 mb-1">{label}</label><input type={type} value={value} onChange={(e) => set(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" /></div>
            ))}
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Rol</label><select value={newRol} onChange={(e) => setNewRol(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"><option value="ADMINISTRACION">ADMINISTRACION</option><option value="ADMIN">ADMIN</option><option value="TECNICO">TECNICO</option><option value="VENTAS">VENTAS</option></select></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newStatus} onChange={(e) => setNewStatus(e.target.checked)} className="rounded" /><span className="text-sm text-slate-700">Activo</span></label>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button onClick={() => setCreando(false)} className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
            <button onClick={onCrearTecnico} disabled={guardandoNuevo} className="w-full sm:w-auto rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition disabled:opacity-60">{guardandoNuevo ? "Creando…" : "Crear técnico"}</button>
          </div>
        </Modal>
      )}

      {editando && (
        <Modal title="Editar técnico" onClose={() => setEditando(null)}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label><input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Rol</label><select value={formRol} onChange={(e) => setFormRol(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"><option value="ADMINISTRACION">ADMINISTRACION</option><option value="ADMIN">ADMIN</option><option value="TECNICO">TECNICO</option><option value="VENTAS">VENTAS</option></select></div>
            <div className="flex gap-4">{[true, false].map((val) => (<label key={String(val)} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="formStatus" checked={formStatus === val} onChange={() => setFormStatus(val)} /><span className="text-sm text-slate-700">{val ? "Activo" : "Inactivo"}</span></label>))}</div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button onClick={() => setEditando(null)} className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
            <button onClick={onGuardar} disabled={guardando} className="w-full sm:w-auto rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition disabled:opacity-60">{guardando ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TecnicosPage;