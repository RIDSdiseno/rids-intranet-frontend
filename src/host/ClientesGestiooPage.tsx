import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Header from "../components/Header";
import {
    Building2,
    Pencil,
    Trash2,
    Plus,
    X,
    Search,
    Mail,
    Phone,
    MapPin,
    Hash,
    User,
    AlertCircle,
    Loader2,
    CheckCircle2,
    ChevronRight,
    Filter,
    Calendar,
    Eye,
    Download,
    Shield,
} from "lucide-react";
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

/* =====================================================================
   TIPOS
===================================================================== */
interface Cliente {
    id: number;
    nombre: string;
    rut?: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    origen?: string;
}

type CamposValidables = "nombre" | "rut" | "correo" | "telefono" | "direccion";

/* =====================================================================
   UTIL — Debounce
===================================================================== */
function debounce(fn: (...args: any[]) => void, delay: number) {
    let timer: any;
    return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/* =====================================================================
   VALIDACIONES CHILENAS
===================================================================== */
const validarRUT = (rut: string): boolean => {
    if (!rut || rut.length < 3) return false;

    const cleanRut = rut.replace(/\./g, "").replace("-", "").toUpperCase();
    if (cleanRut.length < 8) return false;

    const cuerpo = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);

    if (!/^\d+$/.test(cuerpo)) return false;

    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += multiplo * Number(cuerpo[i]);
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    let dvEsperado: string | number = 11 - (suma % 11);

    if (dvEsperado === 11) dvEsperado = 0;
    else if (dvEsperado === 10) dvEsperado = "K";

    return String(dvEsperado) === dv;
};

const validarEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validarTelefono = (telefono: string): boolean => {
    const clean = telefono.replace(/\D/g, "");
    return /^9\d{8}$/.test(clean);
};

const formatRut = (rut: string): string => {
    if (!rut) return "";
    const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length <= 1) return clean;

    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);

    return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
};

/* =====================================================================
   MODAL
===================================================================== */
interface ModalProps {
    show: boolean;
    title: string;
    onClose: () => void;
    onSave: () => void;
    isSaving?: boolean;
    form: Cliente;
    setForm: React.Dispatch<React.SetStateAction<Cliente>>;
    errors: Record<CamposValidables, string>;
    touched: Record<CamposValidables, boolean>;
    handleBlur: (campo: CamposValidables) => void;
}

const Modal: React.FC<ModalProps> = React.memo(
    ({
        show,
        title,
        onClose,
        onSave,
        isSaving = false,
        form,
        setForm,
        errors,
        touched,
        handleBlur,
    }) => {
        const [isClosing, setIsClosing] = useState(false);
        const firstInputRef = useRef<HTMLInputElement>(null);

        const handleClose = useCallback(() => {
            setIsClosing(true);
            setTimeout(() => {
                onClose();
                setIsClosing(false);
            }, 200);
        }, [onClose]);

        useEffect(() => {
            if (show && firstInputRef.current) {
                setTimeout(() => firstInputRef.current?.focus(), 100);
            }
        }, [show]);

        if (!show) return null;

        const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            const clean = value.replace(/[^0-9kK\.\-]/g, "");
            setForm((prev) => ({ ...prev, rut: clean }));
        };

        const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value.replace(/\D/g, "");
            if (value.length <= 9) setForm((prev) => ({ ...prev, telefono: value }));
        };

        return (
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${isClosing ? "bg-black/0 backdrop-blur-0" : "bg-black/50 backdrop-blur-sm"
                    }`}
            >
                <div
                    className={`bg-gradient-to-br from-white to-gray-50/80 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
                        } border border-gray-200/50`}
                >
                    <div className="relative">
                        {/* Header decorativo */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-t-2xl"></div>

                        <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-sm">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Complete todos los campos requeridos</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="p-2 hover:bg-gray-100/80 rounded-lg transition-all duration-200 hover:scale-105"
                                        disabled={isSaving}
                                    >
                                        <X size={20} className="text-gray-400 hover:text-gray-600" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                    {/* NOMBRE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <User size={14} />
                                                Nombre
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </span>
                                        </label>
                                        <input
                                            ref={firstInputRef}
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-1 outline-none transition-all duration-200 ${errors.nombre && touched.nombre
                                                ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                } placeholder-gray-400`}
                                            placeholder="Ej: Juan Pérez López"
                                            value={form.nombre}
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, nombre: e.target.value }))
                                            }
                                            onBlur={() => handleBlur("nombre")}
                                            disabled={isSaving}
                                            maxLength={100}
                                        />
                                        {errors.nombre && touched.nombre && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">{errors.nombre}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* RUT */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <Hash size={14} />
                                                RUT
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </span>
                                        </label>
                                        <input
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-1 outline-none transition-all duration-200 ${errors.rut && touched.rut
                                                ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                } placeholder-gray-400`}
                                            placeholder="12.345.678-9"
                                            value={formatRut(String(form.rut ?? ""))}
                                            onChange={handleRutChange}
                                            onBlur={() => handleBlur("rut")}
                                            disabled={isSaving}
                                        />
                                        {errors.rut && touched.rut && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">{errors.rut}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* CORREO */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <Mail size={14} />
                                                Correo electrónico
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-1 outline-none transition-all duration-200 ${errors.correo && touched.correo
                                                ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                } placeholder-gray-400`}
                                            placeholder="ejemplo@empresa.cl"
                                            value={String(form.correo ?? "")}
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, correo: e.target.value }))
                                            }
                                            onBlur={() => handleBlur("correo")}
                                            disabled={isSaving}
                                            maxLength={100}
                                        />
                                        {errors.correo && touched.correo && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">{errors.correo}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* TELEFONO */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-left gap-1">
                                                <Phone size={14} />
                                                Teléfono
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </span>
                                        </label>

                                        <div className="relative">
                                            {/* Input */}
                                            <input
                                                className={`w-full pl-1 pr-4 py-3 border rounded-xl focus:ring-2 outline-none transition-all duration-200 ${errors.telefono && touched.telefono
                                                    ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                    : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                    } placeholder-gray-400`}
                                                placeholder="+56912345678"
                                                value={String(form.telefono ?? "")}
                                                onChange={handleTelefonoChange}
                                                onBlur={() => handleBlur("telefono")}
                                                disabled={isSaving}
                                                maxLength={9}
                                            />
                                        </div>

                                        {errors.telefono && touched.telefono && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">{errors.telefono}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* DIRECCION */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                Dirección
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </span>
                                        </label>
                                        <input
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-1 outline-none transition-all duration-200 ${errors.direccion && touched.direccion
                                                ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                } placeholder-gray-400`}
                                            placeholder="Calle, número, comuna, ciudad"
                                            value={String(form.direccion ?? "")}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    direccion: e.target.value,
                                                }))
                                            }
                                            onBlur={() => handleBlur("direccion")}
                                            disabled={isSaving}
                                            maxLength={200}
                                        />
                                        {errors.direccion && touched.direccion && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">{errors.direccion}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* ORIGEN */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <Shield size={14} />
                                                Origen del cliente
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all duration-200 appearance-none bg-white cursor-pointer"
                                                value={form.origen}
                                                onChange={(e) =>
                                                    setForm((prev) => ({ ...prev, origen: e.target.value }))
                                                }
                                                disabled={isSaving}
                                            >
                                                <option value="RIDS">RIDS</option>
                                                <option value="ECONNET">ECONNET</option>
                                                <option value="OTRO">Otro</option>
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 w-4 h-4 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/80 rounded-b-2xl">
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium border border-gray-300 hover:border-gray-400 hover:shadow-sm disabled:opacity-50"
                                        disabled={isSaving}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed group"
                                        disabled={isSaving}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isSaving ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>Guardando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-0.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                                        <CheckCircle2 size={16} className="text-white" />
                                                    </div>
                                                    <span>Guardar cliente</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
);

/* =====================================================================
   COMPONENTE PRINCIPAL
===================================================================== */
const ClientesPage: React.FC = () => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<
        | {
            type: "success" | "error";
            message: string;
        }
        | null
    >(null);

    const [pagina, setPagina] = useState(1);
    const itemsPorPagina = 10;

    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);

    const [form, setForm] = useState<Cliente>({
        id: 0,
        nombre: "",
        rut: "",
        correo: "",
        telefono: "",
        direccion: "",
        origen: "OTRO",
    });

    const [errors, setErrors] = useState({
        nombre: "",
        rut: "",
        correo: "",
        telefono: "",
        direccion: "",
    });

    const [touched, setTouched] = useState({
        nombre: false,
        rut: false,
        correo: false,
        telefono: false,
        direccion: false,
    });

    /* ==============================
       NOTIFICACIONES
    =============================== */
    const showNotification = useCallback((type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    /* ==============================
       CARGAR CLIENTES
    =============================== */
    const loadClientes = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/entidades");
            const lista = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];

            const formateados = lista.map((c: Cliente) => ({
                ...c,
                rut: String(c.rut ?? ""),
                correo: String(c.correo ?? ""),
                telefono: String(c.telefono ?? ""),
                direccion: String(c.direccion ?? ""),
                origen: c.origen ?? "OTRO",
            }));

            setClientes(formateados);
        } catch (err) {
            console.error("❌ Error cargando clientes", err);
            showNotification("error", "Error al cargar los clientes");
            setClientes([]);
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        loadClientes();
    }, [loadClientes]);

    /* ==============================
       BUSCADOR
    =============================== */
    const debouncedSearch = useMemo(
        () => debounce((value: string) => setQuery(value), 300),
        []
    );

    const filtrados = useMemo(() => {
        return clientes.filter(
            (c) =>
                c.nombre.toLowerCase().includes(query.toLowerCase()) ||
                c.rut?.toLowerCase().includes(query.toLowerCase()) ||
                c.correo?.toLowerCase().includes(query.toLowerCase())
        );
    }, [clientes, query]);

    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);

    const paginados = useMemo(() => {
        const inicio = (pagina - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    }, [filtrados, pagina, itemsPorPagina]);


    /* ==============================
       VALIDACIÓN
    =============================== */
    const validarCampo = useCallback((campo: CamposValidables, valor: string) => {
        switch (campo) {
            case "nombre":
                return valor.trim() ? "" : "El nombre es obligatorio.";
            case "rut":
                return validarRUT(valor) ? "" : "RUT inválido (ej: 12.345.678-9).";
            case "correo":
                return validarEmail(valor) ? "" : "Correo inválido.";
            case "telefono":
                return validarTelefono(valor)
                    ? ""
                    : "Teléfono inválido (9 dígitos y comienza con 9).";
            case "direccion":
                return valor.trim() ? "" : "La dirección es obligatoria.";
            default:
                return "";
        }
    }, []);

    const handleBlur = useCallback(
        (campo: CamposValidables) => {
            setTouched((prev) => ({ ...prev, [campo]: true }));
            setErrors((prev) => ({
                ...prev,
                [campo]: validarCampo(campo, String(form[campo] ?? "")),
            }));
        },
        [form, validarCampo]
    );

    const validarFormulario = useCallback(() => {
        const nuevosErrores = {
            nombre: validarCampo("nombre", String(form.nombre ?? "")),
            rut: validarCampo("rut", String(form.rut ?? "")),
            correo: validarCampo("correo", String(form.correo ?? "")),
            telefono: validarCampo("telefono", String(form.telefono ?? "")),
            direccion: validarCampo("direccion", String(form.direccion ?? "")),
        };

        setErrors(nuevosErrores);
        setTouched({
            nombre: true,
            rut: true,
            correo: true,
            telefono: true,
            direccion: true,
        });

        return Object.values(nuevosErrores).every((e) => e === "");
    }, [form, validarCampo]);

    /* ==============================
       RESET FORM
    =============================== */
    const resetForm = useCallback(() => {
        setForm({
            id: 0,
            nombre: "",
            rut: "",
            correo: "",
            telefono: "",
            direccion: "",
            origen: "OTRO",
        });
        setErrors({
            nombre: "",
            rut: "",
            correo: "",
            telefono: "",
            direccion: "",
        });
        setTouched({
            nombre: false,
            rut: false,
            correo: false,
            telefono: false,
            direccion: false,
        });
    }, []);

    /* ==============================
       CREAR
    =============================== */
    const handleCreate = useCallback(async () => {
        if (!validarFormulario()) return;

        setIsSaving(true);
        try {
            await api.post("/entidades", form);
            setShowCreate(false);
            resetForm();
            showNotification("success", "Cliente creado exitosamente");
            loadClientes();
        } catch (err) {
            console.error("❌ Error creando cliente", err);
            showNotification("error", "Error al crear el cliente");
        } finally {
            setIsSaving(false);
        }
    }, [form, validarFormulario, loadClientes, resetForm, showNotification]);

    /* ==============================
       ABRIR MODAL EDITAR
    =============================== */
    const openEdit = useCallback((cliente: Cliente) => {
        setForm({
            id: cliente.id,
            nombre: cliente.nombre ?? "",
            rut: cliente.rut ?? "",
            correo: cliente.correo ?? "",
            telefono: cliente.telefono ?? "",
            direccion: cliente.direccion ?? "",
            origen: cliente.origen ?? "OTRO",
        });

        setErrors({
            nombre: "",
            rut: "",
            correo: "",
            telefono: "",
            direccion: "",
        });

        setTouched({
            nombre: false,
            rut: false,
            correo: false,
            telefono: false,
            direccion: false,
        });

        setShowEdit(true);
    }, []);

    /* ==============================
       ACTUALIZAR
    =============================== */
    const handleUpdate = useCallback(async () => {
        if (!validarFormulario()) return;

        setIsSaving(true);
        try {
            await api.put(`/entidades/${form.id}`, form);
            setShowEdit(false);
            resetForm();
            showNotification("success", "Cliente actualizado exitosamente");
            loadClientes();
        } catch (err) {
            console.error("❌ Error actualizando cliente", err);
            showNotification("error", "Error al actualizar el cliente");
        } finally {
            setIsSaving(false);
        }
    }, [form, validarFormulario, loadClientes, resetForm, showNotification]);

    /* ==============================
       ELIMINAR
    =============================== */
    const handleDelete = useCallback(
        async (id: number) => {
            if (!window.confirm("¿Seguro deseas eliminar este cliente?")) return;

            setIsSaving(true);
            try {
                await api.delete(`/entidades/${id}`);
                showNotification("success", "Cliente eliminado exitosamente");
                loadClientes();
            } catch (err) {
                console.error("❌ Error eliminando cliente", err);
                showNotification("error", "Error al eliminar el cliente");
            } finally {
                setIsSaving(false);
            }
        },
        [loadClientes, showNotification]
    );

    return (
        <>
            <Header />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* NOTIFICACIÓN */}
                    {notification && (
                        <div
                            className={`mb-8 p-4 rounded-xl border shadow-sm animate-fadeIn ${notification.type === "success"
                                ? "bg-gradient-to-r from-green-50 to-emerald-50/80 border-green-200 text-green-800"
                                : "bg-gradient-to-r from-red-50 to-rose-50/80 border-red-200 text-red-800"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${notification.type === "success"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-red-100 text-red-600"
                                    }`}>
                                    {notification.type === "success" ? (
                                        <CheckCircle2 size={20} />
                                    ) : (
                                        <AlertCircle size={20} />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium">{notification.message}</p>
                                    <p className="text-sm opacity-80 mt-0.5">
                                        {notification.type === "success" ? "Operación completada correctamente" : "Por favor, intenta nuevamente"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER LISTA */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-sm">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
                                    <p className="text-gray-600 mt-1">Gestiona tu base de datos de clientes</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-4">
                                <div className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium border border-cyan-100">
                                    <span className="font-bold">{clientes.length}</span> cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
                                </div>
                                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                                    {filtrados.length} visibles
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowCreate(true);
                                }}
                                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow group"
                            >
                                <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                    <Plus size={18} className="text-white" />
                                </div>
                                Nuevo Cliente
                            </button>
                        </div>
                    </div>

                    {/* BUSCADOR */}
                    <div className="relative max-w-2xl mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl"></div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar clientes por nombre, RUT o correo electrónico..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white/90 border border-gray-300/80 rounded-2xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all duration-200 shadow-sm hover:shadow backdrop-blur-sm placeholder-gray-500"
                                value={query}
                                onChange={(e) => {
                                    debouncedSearch(e.target.value);
                                    setPagina(1);
                                }}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                {query ? `${filtrados.length} resultados` : "Escribe para buscar"}
                            </div>
                        </div>
                    </div>

                    {/* LISTA */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
                        {isLoading ? (
                            <div className="py-16">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-700 font-medium">Cargando clientes</p>
                                        <p className="text-gray-500 text-sm mt-1">Estamos obteniendo la información de tus clientes...</p>
                                    </div>
                                </div>
                            </div>
                        ) : filtrados.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl mb-6 border border-gray-200">
                                    <Building2 className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {query ? "No se encontraron coincidencias" : "No hay clientes registrados"}
                                </h3>
                                <p className="text-gray-600 max-w-md mx-auto mb-6">
                                    {query
                                        ? "No encontramos clientes que coincidan con tu búsqueda. Intenta con otros términos."
                                        : "Comienza agregando tu primer cliente para gestionar tu base de datos."}
                                </p>
                                {!query && (
                                    <button
                                        onClick={() => {
                                            resetForm();
                                            setShowCreate(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow"
                                    >
                                        <Plus size={18} />
                                        Agregar primer cliente
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100/80">
                                {paginados.map((c) => (
                                    <div
                                        key={c.id}
                                        className="p-6 hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-blue-50/30 transition-all duration-200 group"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="flex-shrink-0">
                                                    <div className="h-14 w-14 flex items-center justify-center bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
                                                        <Building2 size={22} />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-cyan-700 transition-colors">
                                                            {c.nombre}
                                                        </h3>
                                                        <span
                                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${c.origen === "RIDS"
                                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                : c.origen === "ECONNET"
                                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                                                }`}
                                                        >
                                                            {c.origen || "OTRO"}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                                        {c.rut && (
                                                            <div className="flex items-center gap-3 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/60">
                                                                <div className="p-1.5 bg-gray-100 rounded-lg">
                                                                    <Hash size={14} className="text-gray-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500 font-medium">RUT</div>
                                                                    <div className="text-sm text-gray-800 font-mono">{c.rut}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {c.correo && (
                                                            <div className="flex items-center gap-3 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/60">
                                                                <div className="p-1.5 bg-gray-100 rounded-lg">
                                                                    <Mail size={14} className="text-gray-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500 font-medium">Correo</div>
                                                                    <div className="text-sm text-gray-800 truncate">{c.correo}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {c.telefono && (
                                                            <div className="flex items-center gap-3 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/60">
                                                                <div className="p-1.5 bg-gray-100 rounded-lg">
                                                                    <Phone size={14} className="text-gray-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500 font-medium">Teléfono</div>
                                                                    <div className="text-sm text-gray-800"> {c.telefono}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {c.direccion && (
                                                        <div className="flex items-start gap-3 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/60">
                                                            <div className="p-1.5 bg-gray-100 rounded-lg mt-0.5">
                                                                <MapPin size={14} className="text-gray-600" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-gray-500 font-medium">Dirección</div>
                                                                <div className="text-sm text-gray-800">{c.direccion}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                                                <button
                                                    onClick={() => openEdit(c)}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-50 text-cyan-700 rounded-xl hover:bg-cyan-100 transition-all duration-200 font-medium border border-cyan-200 hover:border-cyan-300 group/edit"
                                                >
                                                    <Pencil size={16} />
                                                    <span>Editar</span>
                                                    <ChevronRight size={14} className="opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium border border-red-200 hover:border-red-300 group/delete"
                                                >
                                                    <Trash2 size={16} />
                                                    <span>Eliminar</span>
                                                    <ChevronRight size={14} className="opacity-0 group-hover/delete:opacity-100 transition-opacity" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PIE LISTA */}
                    {filtrados.length > 0 && (
                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/80">
                                <span className="font-medium">{filtrados.length}</span> de{" "}
                                <span className="font-medium">{clientes.length}</span> clientes mostrados
                                {query && (
                                    <span className="text-cyan-600 font-medium">
                                        {" "}• Filtrados por: "{query}"
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PAGINACIÓN */}
                    {/* PAGINACIÓN MEJORADA */}
                    {totalPaginas > 1 && (
                        <div className="mt-8 pt-6 border-t border-gray-200/80">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                {/* INFORMACIÓN DE PÁGINA */}
                                <div className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/80">
                                    Mostrando <span className="font-medium text-cyan-600">{((pagina - 1) * itemsPorPagina) + 1}</span> -{" "}
                                    <span className="font-medium text-cyan-600">
                                        {Math.min(pagina * itemsPorPagina, filtrados.length)}
                                    </span> de{" "}
                                    <span className="font-medium">{filtrados.length}</span> clientes
                                    <span className="text-gray-400 mx-2">•</span>
                                    Página <span className="font-medium text-cyan-600">{pagina}</span> de{" "}
                                    <span className="font-medium">{totalPaginas}</span>
                                </div>

                                {/* CONTROLES DE PAGINACIÓN */}
                                <div className="flex items-center gap-2">
                                    {/* PRIMERA PÁGINA */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === 1
                                            ? "text-gray-400 cursor-not-allowed bg-gray-100/50"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600 border border-gray-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === 1}
                                        onClick={() => setPagina(1)}
                                        aria-label="Primera página"
                                    >
                                        <span className="text-lg font-bold">«</span>
                                    </button>

                                    {/* PÁGINA ANTERIOR */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === 1
                                            ? "text-gray-400 cursor-not-allowed bg-gray-100/50"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600 border border-gray-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === 1}
                                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                        aria-label="Página anterior"
                                    >
                                        <span className="text-lg">‹</span>
                                    </button>

                                    {/* NÚMEROS DE PÁGINAS */}
                                    <div className="flex items-center gap-1.5 mx-2">
                                        {(() => {
                                            const pages: number[] = [];
                                            const maxVisible = 5;

                                            if (totalPaginas <= maxVisible) {
                                                for (let i = 1; i <= totalPaginas; i++) pages.push(i);
                                            } else {
                                                let start = Math.max(1, pagina - 2);
                                                let end = Math.min(totalPaginas, start + maxVisible - 1);

                                                if (end - start + 1 < maxVisible) {
                                                    start = Math.max(1, end - maxVisible + 1);
                                                }

                                                if (start > 1) pages.push(1);
                                                if (start > 2) pages.push(-1); // -1 representa puntos suspensivos

                                                for (let i = start; i <= end; i++) {
                                                    if (i >= 1 && i <= totalPaginas) pages.push(i);
                                                }

                                                if (end < totalPaginas - 1) pages.push(-1);
                                                if (end < totalPaginas) pages.push(totalPaginas);
                                            }

                                            return pages.map((num, index) => (
                                                num === -1 ? (
                                                    <span key={`dots-${index}`} className="px-2 text-gray-400">
                                                        ...
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={num}
                                                        onClick={() => setPagina(num)}
                                                        className={`flex items-center justify-center w-10 h-10 rounded-xl font-medium transition-all duration-200 ${pagina === num
                                                            ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md transform scale-105"
                                                            : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600 border border-gray-300/80 hover:border-cyan-300"
                                                            }`}
                                                        aria-label={`Ir a página ${num}`}
                                                        aria-current={pagina === num ? "page" : undefined}
                                                    >
                                                        {num}
                                                    </button>
                                                )
                                            ));
                                        })()}
                                    </div>

                                    {/* PÁGINA SIGUIENTE */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === totalPaginas
                                            ? "text-gray-400 cursor-not-allowed bg-gray-100/50"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600 border border-gray-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === totalPaginas}
                                        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                                        aria-label="Página siguiente"
                                    >
                                        <span className="text-lg">›</span>
                                    </button>

                                    {/* ÚLTIMA PÁGINA */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === totalPaginas
                                            ? "text-gray-400 cursor-not-allowed bg-gray-100/50"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600 border border-gray-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === totalPaginas}
                                        onClick={() => setPagina(totalPaginas)}
                                        aria-label="Última página"
                                    >
                                        <span className="text-lg font-bold">»</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* MODALES */}
            <Modal
                show={showCreate}
                title="Crear Cliente"
                onClose={() => setShowCreate(false)}
                onSave={handleCreate}
                isSaving={isSaving}
                form={form}
                setForm={setForm}
                errors={errors}
                touched={touched}
                handleBlur={handleBlur}
            />

            <Modal
                show={showEdit}
                title="Editar Cliente"
                onClose={() => setShowEdit(false)}
                onSave={handleUpdate}
                isSaving={isSaving}
                form={form}
                setForm={setForm}
                errors={errors}
                touched={touched}
                handleBlur={handleBlur}
            />

        </>
    );
};

export default ClientesPage;