// src/components/accessibility/NotaRapidaGlobal.tsx
import { useEffect, useState } from "react";
import {
    Button,
    DatePicker,
    Input,
    Modal,
    Select,
    Tooltip,
} from "antd";

import {
    BellOutlined,
    FormOutlined,
} from "@ant-design/icons";

import { api } from "../../api/api";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const CHILE_TZ = "America/Santiago";

/*
 * Opciones rápidas disponibles para programar
 * un recordatorio desde el momento actual.
 */
const OPCIONES_RAPIDAS_RECORDATORIO = [
    {
        label: "30 min",
        minutos: 30,
    },
    {
        label: "1 hora",
        minutos: 60,
    },
    {
        label: "1 h 30",
        minutos: 90,
    },
    {
        label: "2 horas",
        minutos: 120,
    },
    {
        label: "3 horas",
        minutos: 180,
    },
] as const;

type TipoBitacoraTecnico =
    | "SOPORTE"
    | "TERRENO"
    | "REMOTO"
    | "TALLER"
    | "INTERNO"
    | "ADMINISTRATIVO"
    | "REUNION"
    | "OTRO";

type TecnicoOption = {
    id_tecnico: number;
    nombre: string;
    email?: string | null;
};

type UsuarioAutenticado = {
    id_tecnico?: number | null;
    idTecnico?: number | null;
    tecnicoId?: number | null;
    nombre?: string | null;
    email?: string | null;
    rol?: string | null;
};

type CrearBitacoraTecnicoPayload = {
    fecha?: string;
    titulo?: string;
    descripcion: string;
    tipoActividad?: TipoBitacoraTecnico;
    tecnicoId: number;

    // Fecha ISO opcional del recordatorio.
    recordatorioAt?: string | null;
};

const labelBase =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600";


function todayInputDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function getAxiosErrorMessage(error: unknown) {
    const err = error as {
        response?: {
            data?: {
                error?: string;
                message?: string;
            };
        };
        message?: string;
    };

    return (
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "No fue posible guardar la nota."
    );
}

function getUsuarioAutenticado(): UsuarioAutenticado | null {
    try {
        const raw = localStorage.getItem("user");

        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as UsuarioAutenticado;
    } catch {
        return null;
    }
}

function normalizarEmail(value?: string | null) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function formatRecordatorioChile(
    value: string
) {
    return dayjs(value)
        .tz(CHILE_TZ)
        .format("DD/MM/YYYY [a las] HH:mm");
}

function obtenerTecnicoAutenticadoId(
    tecnicos: TecnicoOption[]
): string {
    const usuario = getUsuarioAutenticado();

    if (!usuario) {
        return "";
    }

    const idDirecto =
        usuario.id_tecnico ??
        usuario.idTecnico ??
        usuario.tecnicoId;

    if (
        typeof idDirecto === "number" &&
        Number.isInteger(idDirecto) &&
        idDirecto > 0
    ) {
        const existe = tecnicos.some(
            (tecnico) =>
                tecnico.id_tecnico === idDirecto
        );

        if (existe) {
            return String(idDirecto);
        }
    }

    const emailUsuario = normalizarEmail(
        usuario.email
    );

    if (!emailUsuario) {
        return "";
    }

    const tecnicoEncontrado = tecnicos.find(
        (tecnico) =>
            normalizarEmail(tecnico.email) ===
            emailUsuario
    );

    return tecnicoEncontrado
        ? String(tecnicoEncontrado.id_tecnico)
        : "";
}

export default function NotaRapidaGlobal() {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingTecnicos, setLoadingTecnicos] =
        useState(false);

    const [tecnicos, setTecnicos] = useState<
        TecnicoOption[]
    >([]);

    const [error, setError] = useState<string | null>(
        null
    );

    const [success, setSuccess] = useState<
        string | null
    >(null);

    const [form, setForm] = useState({
        tecnicoId: "",
        titulo: "",
        descripcion: "",
        tipoActividad:
            "INTERNO" as TipoBitacoraTecnico,

        // Fecha y hora opcional como ISO.
        recordatorioAt: "",
    });

    function resetForm(
        listaTecnicos: TecnicoOption[] = tecnicos
    ) {
        setForm({
            tecnicoId:
                obtenerTecnicoAutenticadoId(
                    listaTecnicos
                ),
            titulo: "",
            descripcion: "",
            tipoActividad: "INTERNO",

            // Limpiar recordatorio al abrir una nota nueva.
            recordatorioAt: "",
        });

        setError(null);
        setSuccess(null);
    }

    function cerrarModal() {
        if (saving) {
            return;
        }

        setOpen(false);
        resetForm();
    }

    async function cargarTecnicos() {
        try {
            setLoadingTecnicos(true);

            const response = await api.get(
                "/tecnicos"
            );

            const rows = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.data)
                    ? response.data.data
                    : Array.isArray(
                        response.data?.tecnicos
                    )
                        ? response.data.tecnicos
                        : [];

            const tecnicosOrdenados = rows
                .map((tecnico: TecnicoOption) => ({
                    id_tecnico:
                        tecnico.id_tecnico,
                    nombre: tecnico.nombre,
                    email:
                        tecnico.email ?? null,
                }))
                .sort(
                    (
                        a: TecnicoOption,
                        b: TecnicoOption
                    ) =>
                        a.nombre.localeCompare(
                            b.nombre,
                            "es"
                        )
                );

            setTecnicos(tecnicosOrdenados);

            const tecnicoAutenticadoId =
                obtenerTecnicoAutenticadoId(
                    tecnicosOrdenados
                );

            setForm((prev) => ({
                ...prev,
                tecnicoId: tecnicoAutenticadoId,
            }));
        } catch (err) {
            console.error(
                "Error cargando técnicos:",
                err
            );

            setTecnicos([]);
            setError(
                "No se pudieron cargar los técnicos."
            );
        } finally {
            setLoadingTecnicos(false);
        }
    }

    useEffect(() => {
        if (!open || tecnicos.length > 0) {
            return;
        }

        void cargarTecnicos();
    }, [open, tecnicos.length]);

    /**
 * Programa el recordatorio una cantidad determinada
 * de minutos desde el momento actual.
 */
    function aplicarRecordatorioRapido(
        minutos: number
    ) {
        /*
         * Se parte desde el siguiente minuto completo.
         * De esta forma, +30 minutos nunca queda algunos
         * segundos antes del intervalo solicitado.
         */
        const fechaProgramada = dayjs()
            .tz(CHILE_TZ)
            .add(1, "minute")
            .startOf("minute")
            .add(minutos, "minute");

        setForm((prev) => ({
            ...prev,
            recordatorioAt:
                fechaProgramada.toISOString(),
        }));

        setError(null);
    }

    async function guardarNota() {
        if (saving) {
            return;
        }

        const tecnicoId = Number(form.tecnicoId);
        const descripcion =
            form.descripcion.trim();

        if (
            !Number.isInteger(tecnicoId) ||
            tecnicoId <= 0
        ) {
            setError(
                "Debes seleccionar un técnico."
            );
            return;
        }

        if (!descripcion) {
            setError(
                "Debes escribir el contenido de la nota."
            );
            return;
        }

        // No permitir fechas iguales o anteriores al momento actual.
        if (
            form.recordatorioAt &&
            !dayjs(form.recordatorioAt).isAfter(dayjs())
        ) {
            setError(
                "El recordatorio debe programarse para una fecha futura."
            );
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const titulo =
                form.titulo.trim();

            const payload: CrearBitacoraTecnicoPayload = {
                fecha: todayInputDate(),
                tecnicoId,
                descripcion,
                tipoActividad:
                    form.tipoActividad,
                titulo: titulo
                    ? `Nota rápida · ${titulo}`
                    : "Nota rápida",

                // null indica que no se configuró recordatorio.
                recordatorioAt:
                    form.recordatorioAt || null,
            };

            await api.post(
                "/bitacora-tecnico",
                payload
            );

            /*
 * Informar a la campana global que existe
 * un nuevo recordatorio o una nueva bitácora.
 */
            window.dispatchEvent(
                new Event("recordatorios:actualizar")
            );

            setSuccess(
                "Nota rápida registrada correctamente."
            );

            setForm({
                // Conservar el técnico autenticado después de guardar.
                tecnicoId:
                    obtenerTecnicoAutenticadoId(
                        tecnicos
                    ),
                titulo: "",
                descripcion: "",
                tipoActividad: "INTERNO",
                recordatorioAt: "",
            });

            window.setTimeout(() => {
                setOpen(false);
                setSuccess(null);
            }, 900);
        } catch (err) {
            console.error(
                "Error guardando nota rápida:",
                err
            );

            setError(
                getAxiosErrorMessage(err)
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Tooltip
                title="Registrar nota rápida"
                placement="left"
            >
                <button
                    type="button"
                    onClick={() => {
                        resetForm(tecnicos);
                        setOpen(true);
                    }}
                    aria-label="Registrar nota rápida"
                    className="
  fixed bottom-4 right-[68px] z-[60]
  inline-flex h-11 w-11 items-center justify-center
  rounded-full border border-amber-400
  bg-amber-500 text-white shadow-lg
  transition-transform duration-200
  hover:scale-105 hover:bg-amber-600
  focus:outline-none focus:ring-4 focus:ring-amber-200
  sm:bottom-6 sm:right-[76px]
"
                >
                    <FormOutlined className="text-lg" />
                </button>
            </Tooltip>

            <Modal
                open={open}
                onCancel={cerrarModal}
                footer={null}
                width={620}
                centered
                destroyOnClose
                rootClassName="nota-rapida-modal"
                maskClosable={!saving}
                closable={!saving}
                styles={{
                    body: {
                        maxHeight:
                            "calc(100vh - 180px)",
                        overflowY: "auto",
                    },
                }}
                title={
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Nota rápida
                        </h2>

                        <p className="mt-1 text-sm font-normal text-slate-500">
                            Registra una actividad breve sin
                            relaciones avanzadas.
                        </p>
                    </div>
                }
            >
                <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelBase}>
                                Técnico{" "}
                                <span className="text-red-500">
                                    *
                                </span>
                            </label>

                            <Select
                                value={form.tecnicoId || undefined}
                                loading={loadingTecnicos}
                                disabled
                                placeholder={
                                    loadingTecnicos
                                        ? "Identificando técnico..."
                                        : "Técnico autenticado"
                                }
                                className="w-full"
                                options={tecnicos.map((tecnico) => ({
                                    value: String(tecnico.id_tecnico),
                                    label: tecnico.nombre,
                                }))}
                            />

                            {!loadingTecnicos && !form.tecnicoId && (
                                <p className="mt-1 text-xs font-medium text-amber-600">
                                    No fue posible identificar al técnico autenticado.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={labelBase}>
                                Tipo
                            </label>

                            <Select
                                value={
                                    form.tipoActividad
                                }
                                onChange={(value) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        tipoActividad:
                                            value as TipoBitacoraTecnico,
                                    }))
                                }
                                className="w-full"
                                options={[
                                    {
                                        value: "INTERNO",
                                        label: "Interno",
                                    },
                                    {
                                        value: "SOPORTE",
                                        label: "Soporte",
                                    },
                                    {
                                        value: "REMOTO",
                                        label: "Remoto",
                                    },
                                    {
                                        value:
                                            "ADMINISTRATIVO",
                                        label:
                                            "Administrativo",
                                    },
                                    {
                                        value: "REUNION",
                                        label: "Reunión",
                                    },
                                    {
                                        value: "OTRO",
                                        label: "Otro",
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelBase}>
                            Título
                        </label>

                        <Input
                            value={form.titulo}
                            maxLength={120}
                            placeholder="Opcional. Ej: Revisión de correo"
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    titulo:
                                        event.target.value,
                                }))
                            }
                        />
                    </div>

                    {/* =====================================================
    RECORDATORIO OPCIONAL
===================================================== */}
                    <div>
                        <label className={labelBase}>
                            Recordatorio
                        </label>

                        <DatePicker
                            showTime={{
                                format: "HH:mm",

                                /*
                                 * Se permite cualquier minuto porque las opciones
                                 * rápidas se calculan desde la hora exacta actual.
                                 */
                                minuteStep: 1,
                            }}
                            format="DD/MM/YYYY HH:mm"
                            value={
                                form.recordatorioAt
                                    ? dayjs(form.recordatorioAt)
                                    : null
                            }
                            onChange={(value) => {
                                setForm((prev) => ({
                                    ...prev,

                                    // Guardar como ISO para que el backend
                                    // pueda interpretar correctamente la zona.
                                    recordatorioAt: value
                                        ? value.toISOString()
                                        : "",
                                }));

                                setError(null);
                            }}
                            disabledDate={(current) =>
                                Boolean(
                                    current &&
                                    current
                                        .endOf("day")
                                        .isBefore(dayjs().startOf("day"))
                                )
                            }
                            disabledTime={(current) => {
                                // Si es hoy, se bloquean las horas anteriores.
                                if (
                                    !current ||
                                    !current.isSame(dayjs(), "day")
                                ) {
                                    return {};
                                }

                                const ahora = dayjs();

                                return {
                                    disabledHours: () =>
                                        Array.from(
                                            { length: ahora.hour() },
                                            (_, index) => index
                                        ),

                                    disabledMinutes: (
                                        selectedHour: number
                                    ) =>
                                        selectedHour === ahora.hour()
                                            ? Array.from(
                                                { length: ahora.minute() + 1 },
                                                (_, index) => index
                                            )
                                            : [],
                                };
                            }}
                            placeholder="Sin recordatorio"
                            allowClear
                            className="w-full"
                        />

                        {/* =====================================================
    HORAS PREDEFINIDAS
===================================================== */}
                        <div className="mt-2">
                            <p className="mb-2 text-xs font-medium text-slate-500">
                                Programar desde ahora
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {OPCIONES_RAPIDAS_RECORDATORIO.map(
                                    (opcion) => (
                                        <Button
                                            key={opcion.minutos}
                                            type="default"
                                            size="small"
                                            onClick={() =>
                                                aplicarRecordatorioRapido(
                                                    opcion.minutos
                                                )
                                            }
                                            className="
                        !rounded-full
                        !border-amber-200
                        !bg-amber-50
                        !text-amber-700
                        hover:!border-amber-400
                        hover:!bg-amber-100
                    "
                                        >
                                            + {opcion.label}
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>

                        {form.recordatorioAt && (
                            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                <BellOutlined className="mr-1" />

                                Se recordará el{" "}
                                {formatRecordatorioChile(
                                    form.recordatorioAt
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={labelBase}>
                            Nota{" "}
                            <span className="text-red-500">
                                *
                            </span>
                        </label>

                        <Input.TextArea
                            value={
                                form.descripcion
                            }
                            rows={4}
                            maxLength={1000}
                            autoFocus
                            placeholder="Escribe brevemente lo realizado, pendiente o acordado..."
                            onChange={(event) => {
                                setForm((prev) => ({
                                    ...prev,
                                    descripcion:
                                        event.target.value,
                                }));

                                setError(null);
                            }}
                        />

                        <div className="mt-1 flex justify-end">
                            <span className="text-xs text-slate-400">
                                {
                                    form.descripcion
                                        .length
                                }{" "}
                                / 1000
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                        Se guardará con la fecha actual,
                        estado REGISTRADA y sin relaciones
                        asociadas.
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                            {success}
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            onClick={cerrarModal}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="primary"
                            icon={
                                <FormOutlined />
                            }
                            loading={saving}
                            disabled={
                                saving ||
                                !form.tecnicoId ||
                                !form.descripcion.trim()
                            }
                            onClick={() =>
                                void guardarNota()
                            }
                            className="
                                !border-amber-500
                                !bg-amber-500
                                hover:!border-amber-600
                                hover:!bg-amber-600
                                disabled:!border-slate-200
                                disabled:!bg-slate-100
                            "
                        >
                            Guardar nota
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}