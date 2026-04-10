import React, { useEffect, useState, useCallback } from "react";
import { EditOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAuth } from "../components/hooks/useAuth";
import { http } from "../service/http";

// Definición del tipo Técnico
type Tecnico = {
  id_tecnico: number;
  nombre: string;
  email: string;
  status: boolean;
  rol: string;
};

// Componente principal
const TecnicosPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado modal edición
  const [editando, setEditando] = useState<Tecnico | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formStatus, setFormStatus] = useState(true);
  const [formRol, setFormRol] = useState("TECNICO");
  const [guardando, setGuardando] = useState(false);

  // Estado modal crear
  const [creando, setCreando] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRol, setNewRol] = useState("TECNICO");
  const [newStatus, setNewStatus] = useState(true);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  // Para controlar el estado de eliminación
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  
  // Filtrar técnicos según búsqueda, rol y estado
  const tecnicosFiltrados = tecnicos.filter((t) => {
    const texto = busqueda.toLowerCase();

    const matchNombre =
      (t.nombre?.toLowerCase() || "").includes(texto) ||
      (t.email?.toLowerCase() || "").includes(texto);

    const matchRol = filtroRol
      ? t.rol?.toUpperCase().trim() === filtroRol.toUpperCase().trim()
      : true;

    const statusBool = Boolean(t.status);

    const matchStatus =
      filtroStatus === ""
        ? true
        : filtroStatus === "activo"
          ? statusBool
          : !statusBool;

    return matchNombre && matchRol && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(tecnicosFiltrados.length / PAGE_SIZE));
  const tecnicosPaginados = tecnicosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Función para cargar técnicos
  const fetchTecnicos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get("/tecnicos");
      setTecnicos(res.data);
    } catch (err: any) {
      setError(err?.message || "Error al cargar técnicos");
    } finally {
      setLoading(false);
    }
  }, [http]);
  
  // Cargar técnicos al montar el componente
  useEffect(() => {
    fetchTecnicos();
  }, [fetchTecnicos]);
  
  // Ajustar página actual si el número total de páginas cambia
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);
  
  // Funciones para editar, eliminar y crear técnicos
  const onClickEdit = (t: Tecnico) => {
    setEditando(t);
    setFormNombre(t.nombre);
    setFormEmail(t.email);
    setFormStatus(t.status);
    setFormRol(t.rol ?? "TECNICO");
  };
  
  // Función para guardar cambios de edición
  const onGuardar = async () => {
    if (!editando) return;
    try {
      setGuardando(true);
      await http.put(`/tecnicos/${editando.id_tecnico}`, {
        nombre: formNombre,
        email: formEmail,
        status: formStatus,
        rol: formRol,
      });
      setEditando(null);
      fetchTecnicos();
    } catch (err: any) {
      alert(err?.message || "Error al actualizar técnico");
    } finally {
      setGuardando(false);
    }
  };
  
  // Función para eliminar técnico
  const onClickDelete = async (t: Tecnico) => {
    if (!window.confirm(`¿Eliminar a ${t.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      setDeletingId(t.id_tecnico);
      await http.delete(`/tecnicos/${t.id_tecnico}`);
      fetchTecnicos();
    } catch (err: any) {
      alert(err?.message || "Error al eliminar técnico");
    } finally {
      setDeletingId(null);
    }
  };
  
  // Función para crear nuevo técnico
  const onCrearTecnico = async () => {
    try {
      setGuardandoNuevo(true);
      await http.post("/tecnicos", {
        nombre: newNombre,
        email: newEmail,
        password: newPassword,
        rol: newRol,
        status: newStatus,
      });
      setCreando(false);
      setNewNombre("");
      setNewEmail("");
      setNewPassword("");
      setNewRol("TECNICO");
      setNewStatus(true);
      fetchTecnicos();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al crear técnico");
    } finally {
      setGuardandoNuevo(false);
    }
  };
  
  // Renderizado del componente
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-cyan-50 px-4 py-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="rounded-2xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Técnicos{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
            RIDS.CL
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">Gestión de usuarios técnicos del sistema.</p>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-cyan-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-cyan-200">
          <div className="flex items-center justify-between px-4 py-3 bg-cyan-50">
            <span className="text-sm font-semibold text-slate-700">Lista de técnicos</span>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTecnicos}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-50 transition"
              >
                <ReloadOutlined /> Recargar
              </button>
              {isAdmin && (
                <button
                  onClick={() => setCreando(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-1.5 text-sm text-white font-semibold hover:bg-cyan-700 transition"
                >
                  + Nuevo Técnico
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Buscador */}
            <div className="flex-1">
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                placeholder=" Buscar por nombre o email..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-sm"
              />
            </div>

            {/* Rol */}
            <select
              value={filtroRol}
              onChange={(e) => {
                setFiltroRol(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
            >
              <option value="">Rol</option>
              <option value="ADMIN">Admin</option>
              <option value="TECNICO">Técnico</option>
              <option value="CLIENTE">Cliente</option>
            </select>

            {/* Estado */}
            <select
              value={filtroStatus}
              onChange={(e) => {
                setFiltroStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm"
            >
              <option value="">Estado</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>

            {/* Botón limpiar */}
            <button
              onClick={() => {
                setBusqueda("");
                setFiltroRol("");
                setFiltroStatus("");
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
            >
              Limpiar
            </button>
          </div>

        </div>

        {loading && (
          <div className="p-8 text-center text-slate-500 animate-pulse">Cargando...</div>
        )}
        {error && (
          <div className="p-8 text-center text-rose-700">{error}</div>
        )}
        
        {/* Tabla de técnicos */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-800 border-b border-cyan-200">
                <tr>
                  {["ID", "Nombre", "Email", "Rol", "Estado", ...(isAdmin ? ["Acciones"] : [])].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tecnicosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                      {tecnicos.length === 0 ? "Sin técnicos." : "Sin técnicos que coincidan con el filtro."}
                    </td>
                  </tr>
                )}
                {tecnicosPaginados.map((t) => (
                  <tr key={t.id_tecnico} className="border-t border-cyan-100 odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60 transition">
                    <td className="px-4 py-3">{t.id_tecnico}</td>
                    <td className="px-4 py-3 font-medium">{t.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{t.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                        {t.rol ?? "TECNICO"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.status ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
                        {t.status ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onClickEdit(t)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 text-emerald-700 px-2 py-1 hover:bg-emerald-50 transition text-xs"
                          >
                            <EditOutlined /> Editar
                          </button>
                          <button
                            onClick={() => onClickDelete(t)}
                            disabled={deletingId === t.id_tecnico}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-700 px-2 py-1 hover:bg-rose-50 transition text-xs disabled:opacity-50"
                          >
                            <DeleteOutlined /> {deletingId === t.id_tecnico ? "..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginador */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-cyan-200 bg-slate-50">
        <span className="text-sm text-slate-600">
          Página <strong>{page}</strong> de <strong>{totalPages}</strong> — {tecnicosFiltrados.length} técnicos
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-50 transition disabled:opacity-40"
          >
            Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
            .reduce<(number | string)[]>((acc, n, i, arr) => {
              if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(n);
              return acc;
            }, [])
            .map((n, i) =>
              n === "..." ? (
                <span key={`dots-${i}`} className="px-2 text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(Number(n))}
                  className={`rounded-xl border px-3 py-1.5 text-sm transition ${page === n
                      ? "bg-cyan-600 text-white border-cyan-600 font-semibold"
                      : "border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50"
                    }`}
                >
                  {n}
                </button>
              ),
            )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-50 transition disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
      
      {/* Modal crear */}
      {creando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-cyan-200 p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nuevo Técnico</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input value={newNombre} onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select value={newRol} onChange={(e) => setNewRol(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  <option value="TECNICO">TECNICO</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CLIENTE">CLIENTE</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="newStatus" checked={newStatus} onChange={(e) => setNewStatus(e.target.checked)} className="rounded" />
                <label htmlFor="newStatus" className="text-sm text-slate-700">Activo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setCreando(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={onCrearTecnico} disabled={guardandoNuevo}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white font-semibold hover:bg-cyan-700 transition disabled:opacity-60">
                {guardandoNuevo ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-cyan-200 p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Editar técnico</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input value={formNombre} onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select value={formRol} onChange={(e) => setFormRol(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  <option value="TECNICO">TECNICO</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CLIENTE">CLIENTE</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="status"
                    checked={formStatus === true}
                    onChange={() => setFormStatus(true)}
                  />
                  Activo
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="status"
                    checked={formStatus === false}
                    onChange={() => setFormStatus(false)}
                  />
                  Inactivo
                </label>
              </div>

            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditando(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={onGuardar} disabled={guardando}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white font-semibold hover:bg-cyan-700 transition disabled:opacity-60">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TecnicosPage;
