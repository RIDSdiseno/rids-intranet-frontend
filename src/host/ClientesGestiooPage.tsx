// src/host/ClientesGestiooPage.tsx
import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
} from "react";
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
    Shield,
} from "lucide-react";

import { http } from "../service/http";

/* =====================================================================
   TIPOS
===================================================================== */
type TipoEntidad = "EMPRESA" | "PERSONA";
type OrigenEntidad = "RIDS" | "ECONNET" | "OTRO";
type TipoFiltroEntidad = "TODOS" | TipoEntidad;
type OrigenFiltroEntidad = "TODOS" | OrigenEntidad;

interface Cliente {
    id: number;
    nombre: string;
    rut?: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    tipo: TipoEntidad;
    origen?: OrigenEntidad;
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

    for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
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

const buildEntidadPayload = (form: Cliente) => ({
    nombre: form.nombre.trim(),
    rut: form.rut?.trim() || null,
    correo: form.correo?.trim() || null,
    telefono: form.telefono?.trim() || null,
    direccion: form.direccion?.trim() || null,
    tipo: form.tipo,
    origen: form.origen || "OTRO",
});

const getTipoBadgeClass = (tipo?: TipoEntidad) => {
    if (tipo === "PERSONA") {
        return "bg-violet-50 text-violet-700 border-violet-200";
    }

    return "bg-cyan-50 text-cyan-700 border-cyan-200";
};

const getOrigenBadgeClass = (origen?: OrigenEntidad) => {
    if (origen === "RIDS") {
        return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (origen === "ECONNET") {
        return "bg-green-50 text-green-700 border-green-200";
    }

    return "bg-gray-50 text-gray-700 border-gray-200";
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
    modalError?: string | null;
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
        modalError,
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
            const clean = value.replace(/[^0-9kK.-]/g, "");

            setForm((prev) => ({
                ...prev,
                rut: clean,
            }));
        };

        const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value.replace(/\D/g, "");

            if (value.length <= 9) {
                setForm((prev) => ({
                    ...prev,
                    telefono: value,
                }));
            }
        };

        const tipoIcon =
            form.tipo === "PERSONA" ? (
                <User className="w-5 h-5 text-white" />
            ) : (
                <Building2 className="w-5 h-5 text-white" />
            );

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
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-t-2xl" />

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                onSave();
                            }}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-sm">
                                            {tipoIcon}
                                        </div>

                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">
                                                {title}
                                            </h2>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Complete todos los campos requeridos
                                            </p>
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

                                {modalError && (
                                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                                            <div>
                                                <p className="font-semibold">No se pudo guardar la entidad</p>
                                                <p className="mt-0.5">{modalError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                    {/* TIPO */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                {form.tipo === "PERSONA" ? (
                                                    <User size={14} />
                                                ) : (
                                                    <Building2 size={14} />
                                                )}
                                                Tipo de entidad
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </span>
                                        </label>

                                        <div className="relative">
                                            <select
                                                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all duration-200 appearance-none bg-white cursor-pointer"
                                                value={form.tipo}
                                                onChange={(e) => {
                                                    const tipo = e.target.value as TipoEntidad;

                                                    setForm((prev) => ({
                                                        ...prev,
                                                        tipo,
                                                        origen: prev.origen || "OTRO",
                                                    }));
                                                }}
                                                disabled={isSaving}
                                            >
                                                <option value="EMPRESA">Empresa</option>
                                                <option value="PERSONA">Persona</option>
                                            </select>

                                            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 w-4 h-4 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* NOMBRE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                {form.tipo === "PERSONA" ? (
                                                    <User size={14} />
                                                ) : (
                                                    <Building2 size={14} />
                                                )}
                                                {form.tipo === "PERSONA"
                                                    ? "Nombre completo"
                                                    : "Nombre empresa"}
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </span>
                                        </label>

                                        <input
                                            ref={firstInputRef}
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-1 outline-none transition-all duration-200 ${errors.nombre && touched.nombre
                                                ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                } placeholder-gray-400`}
                                            placeholder={
                                                form.tipo === "PERSONA"
                                                    ? "Ej: Juan Pérez López"
                                                    : "Ej: Empresa SpA"
                                            }
                                            value={form.nombre}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    nombre: e.target.value,
                                                }))
                                            }
                                            onBlur={() => handleBlur("nombre")}
                                            disabled={isSaving}
                                            maxLength={100}
                                        />

                                        {errors.nombre && touched.nombre && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">
                                                    {errors.nombre}
                                                </p>
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
                                                <p className="text-red-500 text-xs font-medium">
                                                    {errors.rut}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* CORREO */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <Mail size={14} />
                                                Correo electrónico
                                            </span>
                                        </label>

                                        <input
                                            type="email"
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-1 outline-none transition-all duration-200 ${errors.correo && touched.correo
                                                ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                } placeholder-gray-400`}
                                            placeholder={
                                                form.tipo === "PERSONA"
                                                    ? "persona@correo.cl"
                                                    : "contacto@empresa.cl"
                                            }
                                            value={String(form.correo ?? "")}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    correo: e.target.value,
                                                }))
                                            }
                                            onBlur={() => handleBlur("correo")}
                                            disabled={isSaving}
                                            maxLength={100}
                                        />

                                        {errors.correo && touched.correo && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">
                                                    {errors.correo}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* TELEFONO */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <Phone size={14} />
                                                Teléfono
                                            </span>
                                        </label>

                                        <input
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 outline-none transition-all duration-200 ${errors.telefono && touched.telefono
                                                ? "border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50/50"
                                                : "border-gray-300 focus:ring-cyan-100 focus:border-cyan-400 bg-white"
                                                } placeholder-gray-400`}
                                            placeholder="912345678"
                                            value={String(form.telefono ?? "")}
                                            onChange={handleTelefonoChange}
                                            onBlur={() => handleBlur("telefono")}
                                            disabled={isSaving}
                                            maxLength={9}
                                        />

                                        {errors.telefono && touched.telefono && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                                                <p className="text-red-500 text-xs font-medium">
                                                    {errors.telefono}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* DIRECCION */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                Dirección
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
                                                <p className="text-red-500 text-xs font-medium">
                                                    {errors.direccion}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* ORIGEN */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                <Shield size={14} />
                                                Origen
                                            </span>
                                        </label>

                                        <div className="relative">
                                            <select
                                                className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all duration-200 appearance-none bg-white cursor-pointer"
                                                value={form.origen ?? "OTRO"}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        origen: e.target.value as OrigenEntidad,
                                                    }))
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
                                                    <span>
                                                        Guardar{" "}
                                                        {form.tipo === "PERSONA"
                                                            ? "persona"
                                                            : "empresa"}
                                                    </span>
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
    const [origenFiltro, setOrigenFiltro] =
        useState<OrigenFiltroEntidad>("TODOS");
    const [tipoFiltro, setTipoFiltro] =
        useState<TipoFiltroEntidad>("TODOS");

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [notification, setNotification] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);

    const [pagina, setPagina] = useState(1);
    const itemsPorPagina = 10;

    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);

    const [inputValue, setInputValue] = useState("");

    const [form, setForm] = useState<Cliente>({
        id: 0,
        nombre: "",
        rut: "",
        correo: "",
        telefono: "",
        direccion: "",
        tipo: "EMPRESA",
        origen: "OTRO",
    });

    const [errors, setErrors] = useState<Record<CamposValidables, string>>({
        nombre: "",
        rut: "",
        correo: "",
        telefono: "",
        direccion: "",
    });

    const [touched, setTouched] = useState<Record<CamposValidables, boolean>>({
        nombre: false,
        rut: false,
        correo: false,
        telefono: false,
        direccion: false,
    });

    const showNotification = useCallback(
        (type: "success" | "error", message: string) => {
            setNotification({ type, message });
            setTimeout(() => setNotification(null), 3000);
        },
        []
    );

    /* ==============================
       CARGAR CLIENTES / ENTIDADES
    =============================== */
    const loadClientes = useCallback(async () => {
        setIsLoading(true);

        try {
            const params: Record<string, string> = {};

            if (tipoFiltro !== "TODOS") {
                params.tipo = tipoFiltro;
            }

            if (origenFiltro !== "TODOS") {
                params.origen = origenFiltro;
            }

            const res = await http.get("/entidades", { params });

            const lista = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : Array.isArray(res.data?.items)
                        ? res.data.items
                        : [];

            const formateados: Cliente[] = lista.map((c: Cliente) => ({
                ...c,
                rut: String(c.rut ?? ""),
                correo: String(c.correo ?? ""),
                telefono: String(c.telefono ?? ""),
                direccion: String(c.direccion ?? ""),
                tipo: c.tipo ?? "EMPRESA",
                origen: c.origen ?? "OTRO",
            }));

            setClientes(formateados);
            setPagina(1);
        } catch (err) {
            console.error("❌ Error cargando entidades", err);
            showNotification("error", "Error al cargar las entidades");
            setClientes([]);
        } finally {
            setIsLoading(false);
        }
    }, [showNotification, origenFiltro, tipoFiltro]);

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
        const q = query.trim().toLowerCase();

        if (!q) return clientes;

        return clientes.filter((c) => {
            const nombre = String(c.nombre ?? "").toLowerCase();
            const rut = String(c.rut ?? "").toLowerCase();
            const correo = String(c.correo ?? "").toLowerCase();
            const telefono = String(c.telefono ?? "").toLowerCase();
            const direccion = String(c.direccion ?? "").toLowerCase();
            const origen = String(c.origen ?? "").toLowerCase();
            const tipo = String(c.tipo ?? "").toLowerCase();

            return (
                nombre.includes(q) ||
                rut.includes(q) ||
                correo.includes(q) ||
                telefono.includes(q) ||
                direccion.includes(q) ||
                origen.includes(q) ||
                tipo.includes(q)
            );
        });
    }, [clientes, query]);

    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);

    const paginados = useMemo(() => {
        const inicio = (pagina - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    }, [filtrados, pagina, itemsPorPagina]);

    const totalEmpresas = useMemo(
        () => clientes.filter((c) => c.tipo === "EMPRESA").length,
        [clientes]
    );

    const totalPersonas = useMemo(
        () => clientes.filter((c) => c.tipo === "PERSONA").length,
        [clientes]
    );

    /* ==============================
       VALIDACIÓN
    =============================== */
    const validarCampo = useCallback((campo: CamposValidables, valor: string) => {
        const v = valor?.trim() ?? "";

        switch (campo) {
            case "nombre":
                return v ? "" : "El nombre es obligatorio.";

            case "rut":
                if (!v) return "El RUT es obligatorio.";
                return validarRUT(v) ? "" : "RUT inválido (ej: 12.345.678-9).";

            case "correo":
                if (!v) return "";
                return validarEmail(v) ? "" : "Correo inválido.";

            case "telefono":
                if (!v) return "";
                return validarTelefono(v)
                    ? ""
                    : "Teléfono inválido. Debe tener 9 dígitos y comenzar con 9.";

            case "direccion":
                return "";

            default:
                return "";
        }
    }, []);

    const handleBlur = useCallback(
        (campo: CamposValidables) => {
            setTouched((prev) => ({
                ...prev,
                [campo]: true,
            }));

            setErrors((prev) => ({
                ...prev,
                [campo]: validarCampo(campo, String(form[campo] ?? "")),
            }));
        },
        [form, validarCampo]
    );

    const validarFormulario = useCallback(() => {
        const nuevosErrores: Record<CamposValidables, string> = {
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
            tipo: "EMPRESA",
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
            await http.post("/entidades", buildEntidadPayload(form));

            setShowCreate(false);
            resetForm();

            showNotification(
                "success",
                form.tipo === "PERSONA"
                    ? "Persona creada exitosamente"
                    : "Empresa creada exitosamente"
            );

            await loadClientes();
        } catch (err: any) {
            console.error("❌ Error creando entidad", err);

            const message =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "Error al crear la entidad";

            setModalError(message);
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
            tipo: cliente.tipo ?? "EMPRESA",
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

        setModalError(null);
        setShowEdit(true);
    }, []);

    /* ==============================
       ACTUALIZAR
    =============================== */
    const handleUpdate = useCallback(async () => {
        if (!validarFormulario()) return;

        setIsSaving(true);

        try {
            await http.put(`/entidades/${form.id}`, buildEntidadPayload(form));

            setShowEdit(false);
            resetForm();

            showNotification(
                "success",
                form.tipo === "PERSONA"
                    ? "Persona actualizada exitosamente"
                    : "Empresa actualizada exitosamente"
            );

            await loadClientes();
        } catch (err: any) {
            console.error("❌ Error actualizando entidad", err);

            const message =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "Error al actualizar la entidad";

            setModalError(message);
        } finally {
            setIsSaving(false);
        }
    }, [form, validarFormulario, loadClientes, resetForm, showNotification]);

    /* ==============================
       ELIMINAR
    =============================== */
    const handleDelete = useCallback(
        async (cliente: Cliente) => {
            const label = cliente.tipo === "PERSONA" ? "esta persona" : "esta empresa";

            if (!window.confirm(`¿Seguro deseas eliminar ${label}?`)) return;

            setIsSaving(true);

            try {
                await http.delete(`/entidades/${cliente.id}`);

                showNotification(
                    "success",
                    cliente.tipo === "PERSONA"
                        ? "Persona eliminada exitosamente"
                        : "Empresa eliminada exitosamente"
                );

                await loadClientes();
            } catch (err) {
                console.error("❌ Error eliminando entidad", err);
                showNotification("error", "Error al eliminar la entidad");
            } finally {
                setIsSaving(false);
            }
        },
        [loadClientes, showNotification]
    );

    return (
        <>
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
                                <div
                                    className={`p-2 rounded-lg ${notification.type === "success"
                                        ? "bg-green-100 text-green-600"
                                        : "bg-red-100 text-red-600"
                                        }`}
                                >
                                    {notification.type === "success" ? (
                                        <CheckCircle2 size={20} />
                                    ) : (
                                        <AlertCircle size={20} />
                                    )}
                                </div>

                                <div>
                                    <p className="font-medium">{notification.message}</p>
                                    <p className="text-sm opacity-80 mt-0.5">
                                        {notification.type === "success"
                                            ? "Operación completada correctamente"
                                            : "Por favor, intenta nuevamente"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-sm">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>

                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        Entidades
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        Gestiona empresas y personas de Gestioo
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <div className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium border border-cyan-100">
                                    <span className="font-bold">{clientes.length}</span>{" "}
                                    entidade{clientes.length !== 1 ? "s" : ""} cargada
                                    {clientes.length !== 1 ? "s" : ""}
                                </div>

                                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                                    {filtrados.length} visibles
                                </div>

                                <div className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium border border-cyan-100">
                                    Empresas: <span className="font-bold">{totalEmpresas}</span>
                                </div>

                                <div className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium border border-violet-100">
                                    Personas: <span className="font-bold">{totalPersonas}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setModalError(null);
                                    setShowCreate(true);
                                }}
                                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow group"
                            >
                                <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                    <Plus size={18} className="text-white" />
                                </div>
                                Nueva entidad
                            </button>
                        </div>
                    </div>

                    {/* BUSCADOR / FILTROS */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_220px] gap-4 mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />

                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, RUT, correo, teléfono, dirección, tipo u origen..."
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none bg-white"
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        debouncedSearch(e.target.value);
                                        setPagina(1);
                                    }}
                                />

                                <div className="hidden sm:block absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                    {inputValue
                                        ? `${filtrados.length} resultados`
                                        : "Escribe para buscar"}
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <select
                                value={tipoFiltro}
                                onChange={(e) => {
                                    setTipoFiltro(e.target.value as TipoFiltroEntidad);
                                    setPagina(1);
                                }}
                                className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none bg-white cursor-pointer appearance-none"
                            >
                                <option value="TODOS">Empresas y personas</option>
                                <option value="EMPRESA">Solo empresas</option>
                                <option value="PERSONA">Solo personas</option>
                            </select>

                            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={origenFiltro}
                                onChange={(e) => {
                                    setOrigenFiltro(e.target.value as OrigenFiltroEntidad);
                                    setPagina(1);
                                }}
                                className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none bg-white cursor-pointer appearance-none"
                            >
                                <option value="TODOS">Todos los orígenes</option>
                                <option value="RIDS">RIDS</option>
                                <option value="ECONNET">ECONNET</option>
                                <option value="OTRO">Otro</option>
                            </select>

                            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>

                    {/* LISTA */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
                        {isLoading ? (
                            <div className="py-16">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
                                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin" />
                                    </div>

                                    <div className="text-center">
                                        <p className="text-gray-700 font-medium">
                                            Cargando entidades
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Estamos obteniendo la información...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : filtrados.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl mb-6 border border-gray-200">
                                    <Building2 className="w-10 h-10 text-gray-400" />
                                </div>

                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {query
                                        ? "No se encontraron coincidencias"
                                        : "No hay entidades registradas"}
                                </h3>

                                <p className="text-gray-600 max-w-md mx-auto mb-6">
                                    {query
                                        ? "No encontramos entidades que coincidan con tu búsqueda. Intenta con otros términos."
                                        : "Comienza agregando una empresa o persona."}
                                </p>

                                {!query && (
                                    <button
                                        onClick={() => {
                                            resetForm();
                                            setModalError(null);
                                            setShowCreate(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow"
                                    >
                                        <Plus size={18} />
                                        Agregar primera entidad
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
                                                    <div
                                                        className={`h-14 w-14 flex items-center justify-center rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200 ${c.tipo === "PERSONA"
                                                            ? "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700"
                                                            : "bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700"
                                                            }`}
                                                    >
                                                        {c.tipo === "PERSONA" ? (
                                                            <User size={22} />
                                                        ) : (
                                                            <Building2 size={22} />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-cyan-700 transition-colors break-words">
                                                            {c.nombre}
                                                        </h3>

                                                        <span
                                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getTipoBadgeClass(
                                                                c.tipo
                                                            )}`}
                                                        >
                                                            {c.tipo === "PERSONA"
                                                                ? "Persona"
                                                                : "Empresa"}
                                                        </span>

                                                        <span
                                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getOrigenBadgeClass(
                                                                c.origen
                                                            )}`}
                                                        >
                                                            {c.origen || "OTRO"}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Hash size={15} className="text-gray-400 shrink-0" />
                                                            <span className="truncate">
                                                                {formatRut(String(c.rut ?? "")) || "Sin RUT"}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Mail size={15} className="text-gray-400 shrink-0" />
                                                            <span className="truncate">
                                                                {c.correo || "Sin correo"}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Phone size={15} className="text-gray-400 shrink-0" />
                                                            <span className="truncate">
                                                                {c.telefono || "Sin teléfono"}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <MapPin size={15} className="text-gray-400 shrink-0" />
                                                            <span className="truncate">
                                                                {c.direccion || "Sin dirección"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 lg:shrink-0">
                                                <button
                                                    onClick={() => openEdit(c)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition"
                                                    disabled={isSaving}
                                                >
                                                    <Pencil size={16} />
                                                    Editar
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(c)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                                                    disabled={isSaving}
                                                >
                                                    <Trash2 size={16} />
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* PAGINACIÓN */}
                        {!isLoading && filtrados.length > 0 && (
                            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="text-sm text-gray-600">
                                    Página{" "}
                                    <span className="font-semibold text-gray-900">
                                        {pagina}
                                    </span>{" "}
                                    de{" "}
                                    <span className="font-semibold text-gray-900">
                                        {Math.max(totalPaginas, 1)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                        disabled={pagina <= 1}
                                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Anterior
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPagina((p) => Math.min(totalPaginas, p + 1))
                                        }
                                        disabled={pagina >= totalPaginas}
                                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL CREAR */}
            <Modal
                show={showCreate}
                title="Crear entidad"
                onClose={() => {
                    setShowCreate(false);
                    setModalError(null);
                    resetForm();
                }}
                onSave={handleCreate}
                isSaving={isSaving}
                form={form}
                setForm={setForm}
                errors={errors}
                touched={touched}
                handleBlur={handleBlur}
                modalError={modalError}
            />

            {/* MODAL EDITAR */}
            <Modal
                show={showEdit}
                title="Editar entidad"
                onClose={() => {
                    setShowEdit(false);
                    setModalError(null);
                    resetForm();
                }}
                onSave={handleUpdate}
                isSaving={isSaving}
                form={form}
                setForm={setForm}
                errors={errors}
                touched={touched}
                handleBlur={handleBlur}
                modalError={modalError}
            />
        </>
    );
};

export default ClientesPage;