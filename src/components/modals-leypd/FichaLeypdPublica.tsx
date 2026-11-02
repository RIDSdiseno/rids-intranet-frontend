// src/components/modals-leypd/FichaLeypdPublica.tsx

import {
    CheckCircleFilled,
    FileProtectOutlined,
    SaveOutlined,
    SendOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Card,
    Divider,
    Input,
    Result,
    Space,
    Spin,
    message,
} from "antd";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import FichaLeypdForm from "./FichaLeypdForm";

import {
    getLeypdFichaPublica,
    saveLeypdFichaPublica,
    sendLeypdFichaPublica,
} from "./leypd.api";

import {
    esValorVacioLeypd,
    obtenerErroresCampoApi,
    validarCamposFichaLeypd,
} from "./leypd.helpers";

import type {
    LeypdFichaPublicaResponse,
} from "./leypd.types";

interface Props {
    token: string;
}

type ErrorPublico =
    | "INVALIDO"
    | "EXPIRADO"
    | "REVOCADO"
    | "GENERAL"
    | null;

function obtenerValoresIniciales(
    data: LeypdFichaPublicaResponse
) {
    const result: Record<string, unknown> = {};

    data.campos.forEach(
        (campo) => {
            const valor =
                data.datos[
                    campo.key
                ]?.valor;

            result[campo.key] =
                valor ?? "";
        }
    );

    return result;
}

export default function FichaLeypdPublica({
    token,
}: Props) {
    const [
        data,
        setData,
    ] = useState<LeypdFichaPublicaResponse | null>(
        null
    );

    const [
        values,
        setValues,
    ] = useState<Record<string, unknown>>(
        {}
    );

    const [
        dirtyKeys,
        setDirtyKeys,
    ] = useState<Set<string>>(
        () => new Set()
    );

    const [
        nombre,
        setNombre,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        sending,
        setSending,
    ] = useState(false);

    const [
        submitted,
        setSubmitted,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<ErrorPublico>(
        null
    );

    const [
        fieldErrors,
        setFieldErrors,
    ] = useState<Record<string, string>>(
        {}
    );

    /* =====================================================
       LOAD
    ===================================================== */

    const loadFicha =
        useCallback(
            async () => {
                setLoading(true);

                setError(null);

                try {
                    const result =
                        await getLeypdFichaPublica(
                            token
                        );

                    setData(result);

                    setValues(
                        obtenerValoresIniciales(
                            result
                        )
                    );

                    setDirtyKeys(
                        new Set()
                    );

                    setFieldErrors({});

                    setNombre(
                        result.nombreRespondienteBorrador ??
                        ""
                    );

                    setSubmitted(
                        Boolean(
                            result.respondidoAt
                        )
                    );
                } catch (err: any) {
                    console.error(
                        "[LEYPD PUBLIC] Error cargando ficha:",
                        err
                    );

                    const status =
                        err?.response?.status;

                    const messageText =
                        String(
                            err?.response?.data?.message ??
                            ""
                        ).toLowerCase();

                    if (
                        status === 410 &&
                        messageText.includes("revoc")
                    ) {
                        setError("REVOCADO");
                    } else if (
                        status === 410
                    ) {
                        setError("EXPIRADO");
                    } else if (
                        status === 404
                    ) {
                        setError("INVALIDO");
                    } else {
                        setError("GENERAL");
                    }
                } finally {
                    setLoading(false);
                }
            },
            [token]
        );

    useEffect(
        () => {
            void loadFicha();
        },
        [loadFicha]
    );

    /* =====================================================
       FIELD
    ===================================================== */

    const handleFieldChange =
        (
            key: string,
            value: unknown
        ) => {
            setValues(
                (current) => ({
                    ...current,
                    [key]: value,
                })
            );

            setDirtyKeys(
                (current) => {
                    const next =
                        new Set(current);

                    next.add(key);

                    return next;
                }
            );

            /*
             * Al editar un campo se limpia su error.
             */
            setFieldErrors(
                (current) => {
                    if (!(key in current)) {
                        return current;
                    }

                    const next = {
                        ...current,
                    };

                    delete next[key];

                    return next;
                }
            );
        };

    /* =====================================================
       ERRORES API (409 / 422)
    ===================================================== */

    /**
     * Devuelve true si el error fue manejado.
     */
    const manejarErrorApi =
        async (
            err: unknown
        ): Promise<boolean> => {
            const status =
                (
                    err as {
                        response?: {
                            status?: number;
                        };
                    }
                )?.response?.status;

            /*
             * 409: la ficha ya fue enviada (por ejemplo,
             * desde otra pestaña). Recargamos para mostrar
             * la pantalla de envío exitoso.
             */
            if (status === 409) {
                message.info(
                    "Esta ficha ya fue enviada."
                );

                await loadFicha();

                return true;
            }

            /*
             * 422: errores de validación por campo.
             */
            const erroresApi =
                obtenerErroresCampoApi(
                    err
                );

            if (erroresApi) {
                setFieldErrors(
                    erroresApi
                );

                message.warning(
                    "Revisa los campos marcados en rojo."
                );

                return true;
            }

            return false;
        };

    /* =====================================================
       VALIDACIÓN
    ===================================================== */

    const camposObligatoriosFaltantes =
        useMemo(
            () => {
                if (!data) {
                    return [];
                }

                return data.campos.filter(
                    (campo) => {
                        /*
                         * Mientras no tengamos resuelta
                         * la aplicabilidad, una pregunta
                         * condicional no bloquea el envío.
                         */
                        if (campo.condicion) {
                            return false;
                        }

                        if (!campo.obligatorio) {
                            return false;
                        }

                        /*
                         * Misma regla que el backend:
                         * solo espacios cuenta como vacío.
                         */
                        return esValorVacioLeypd(
                            values[campo.key]
                        );
                    }
                );
            },
            [
                data,
                values,
            ]
        );

    /* =====================================================
       GUARDAR PARCIAL
    ===================================================== */

    const handleSave =
        async () => {
            const nombreLimpio =
                nombre.trim();

            /*
             * Solo se validan los campos modificados:
             * el guardado parcial no exige completar todo.
             */
            const erroresFormato =
                validarCamposFichaLeypd(
                    data?.campos ?? [],
                    values,
                    dirtyKeys
                );

            if (
                Object.keys(
                    erroresFormato
                ).length > 0
            ) {
                setFieldErrors(
                    erroresFormato
                );

                message.warning(
                    "Revisa los campos marcados en rojo."
                );

                return;
            }

            /*
             * Para guardar el nombre no es obligatorio
             * haber modificado un campo.
             */
            const datosModificados: Record<string, unknown> = {};

            dirtyKeys.forEach(
                (key) => {
                    datosModificados[key] =
                        values[key];
                }
            );

            setSaving(true);

            try {
                await saveLeypdFichaPublica(
                    token,
                    {
                        nombre:
                            nombreLimpio || null,

                        datos:
                            datosModificados,
                    }
                );

                setDirtyKeys(
                    new Set()
                );

                message.success(
                    "Tu avance fue guardado correctamente."
                );

                /*
                 * Recargamos para sincronizar CRM + respuestas
                 * y que las etiquetas reflejen la fuente real.
                 */
                await loadFicha();
            } catch (err) {
                console.error(
                    "[LEYPD PUBLIC] Error guardando:",
                    err
                );

                if (
                    await manejarErrorApi(err)
                ) {
                    return;
                }

                message.error(
                    "No se pudo guardar la ficha."
                );
            } finally {
                setSaving(false);
            }
        };

    /* =====================================================
       ENVIAR
    ===================================================== */

    const handleSend =
        async () => {
            const nombreLimpio =
                nombre.trim();

            if (
                nombreLimpio.length < 2
            ) {
                message.warning(
                    "Indica tu nombre antes de enviar la ficha."
                );

                return;
            }

            if (
                camposObligatoriosFaltantes.length > 0
            ) {
                message.warning(
                    `Completa los ${camposObligatoriosFaltantes.length} campo(s) obligatorio(s) antes de enviar.`
                );

                return;
            }

            /*
             * En el envío final se valida el formato
             * de todos los campos.
             */
            const erroresFormato =
                validarCamposFichaLeypd(
                    data?.campos ?? [],
                    values
                );

            if (
                Object.keys(
                    erroresFormato
                ).length > 0
            ) {
                setFieldErrors(
                    erroresFormato
                );

                message.warning(
                    "Revisa los campos marcados en rojo."
                );

                return;
            }

            setSending(true);

            try {
                await sendLeypdFichaPublica(
                    token,
                    {
                        nombre:
                            nombreLimpio,

                        datos:
                            values,
                    }
                );

                /*
                 * El backend es la fuente de verdad:
                 * recargamos para obtener respondidoAt.
                 */
                await loadFicha();

                message.success(
                    "Ficha enviada correctamente."
                );
            } catch (err) {
                console.error(
                    "[LEYPD PUBLIC] Error enviando:",
                    err
                );

                if (
                    await manejarErrorApi(err)
                ) {
                    return;
                }

                message.error(
                    "No se pudo enviar la ficha."
                );
            } finally {
                setSending(false);
            }
        };

    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {
        return (
            <div
                className="
                    flex
                    min-h-[420px]
                    items-center
                    justify-center
                "
            >
                <Spin
                    size="large"
                    tip="Cargando ficha..."
                />
            </div>
        );
    }

    /* =====================================================
       ERROR
    ===================================================== */

    if (error) {
        const content = {
            INVALIDO: {
                title:
                    "Enlace no válido",
                subTitle:
                    "El enlace utilizado no existe o ya no se encuentra disponible.",
            },

            EXPIRADO: {
                title:
                    "El enlace expiró",
                subTitle:
                    "Solicita a RIDS un nuevo enlace para completar la ficha.",
            },

            REVOCADO: {
                title:
                    "El enlace fue revocado",
                subTitle:
                    "Este enlace ya no puede utilizarse. Solicita uno nuevo a RIDS.",
            },

            GENERAL: {
                title:
                    "No fue posible cargar la ficha",
                subTitle:
                    "Ocurrió un problema al consultar la información. Intenta nuevamente.",
            },
        }[error];

        return (
            <Card className="rounded-2xl shadow-sm">
                <Result
                    status="warning"
                    title={content.title}
                    subTitle={content.subTitle}
                    extra={
                        error === "GENERAL" ? (
                            <Button
                                type="primary"
                                onClick={() =>
                                    void loadFicha()
                                }
                            >
                                Reintentar
                            </Button>
                        ) : undefined
                    }
                />
            </Card>
        );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    if (submitted) {
        return (
            <Card className="rounded-2xl shadow-sm">
                <Result
                    status="success"
                    icon={<CheckCircleFilled />}
                    title="Ficha enviada correctamente"
                    subTitle="La información fue registrada y ya se encuentra disponible para revisión por RIDS."
                />
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    /* =====================================================
       FORM
    ===================================================== */

    const empresaNombre =
        data.empresa.razonSocial ??
        data.empresa.nombre;

    return (
        <div className="space-y-5">
            {/* =====================================================
                CABECERA
            ===================================================== */}

            <Card
                className="
                    rounded-2xl
                    border
                    border-slate-200
                    shadow-sm
                "
            >
                <div
                    className="
                        flex
                        items-start
                        gap-4
                    "
                >
                    <div
                        className="
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-cyan-50
                            text-xl
                            text-cyan-700
                        "
                    >
                        <FileProtectOutlined />
                    </div>

                    <div>
                        <h1
                            className="
                                m-0
                                text-xl
                                font-semibold
                                text-slate-800
                            "
                        >
                            Ficha Ley PD
                        </h1>

                        <p
                            className="
                                mb-0
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            {empresaNombre}
                        </p>
                    </div>
                </div>

                <Divider />

                <Alert
                    showIcon
                    type="info"
                    message="Revisa y confirma la información"
                    description="Algunos datos fueron precargados desde los registros existentes de RIDS. Revisa la información, corrige lo necesario y completa los campos pendientes."
                />
            </Card>

            {/* =====================================================
                IDENTIFICACIÓN
            ===================================================== */}

            <Card
                className="
                    rounded-2xl
                    border
                    border-slate-200
                    shadow-sm
                "
            >
                <label
                    className="
                        mb-2
                        block
                        text-sm
                        font-semibold
                        text-slate-700
                    "
                >
                    Nombre de quien responde
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <Input
                    size="large"
                    value={nombre}
                    maxLength={120}
                    placeholder="Nombre y apellido"
                    onChange={(event) =>
                        setNombre(
                            event.target.value
                        )
                    }
                />

                <p className="mb-0 mt-2 text-xs text-slate-500">
                    Este nombre quedará registrado como responsable de la respuesta enviada.
                </p>
            </Card>

            {/* =====================================================
                FORMULARIO
            ===================================================== */}

            <FichaLeypdForm
                campos={data.campos}
                datos={data.datos}
                values={values}
                showMetadata
                errors={fieldErrors}
                onChange={handleFieldChange}
            />

            {/* =====================================================
                CAMPOS OBLIGATORIOS
            ===================================================== */}

            {camposObligatoriosFaltantes.length > 0 && (
                <Alert
                    showIcon
                    type="warning"
                    message="Existen campos obligatorios pendientes"
                    description={
                        <div>
                            <p className="mb-2">
                                Completa los siguientes campos antes de enviar:
                            </p>

                            <ul className="mb-0 list-disc pl-5">
                                {camposObligatoriosFaltantes.map(
                                    (campo) => (
                                        <li key={campo.key}>
                                            {campo.numero}.{" "}
                                            {campo.label}
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    }
                />
            )}

            {/* =====================================================
                ACCIONES
            ===================================================== */}

            <Card
                className="
                    sticky
                    bottom-4
                    z-10
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white/95
                    shadow-lg
                    backdrop-blur
                "
            >
                <div
                    className="
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >
                    <p
                        className="
                            m-0
                            text-xs
                            text-slate-500
                        "
                    >
                        Puedes guardar tu avance y continuar utilizando este mismo enlace mientras siga vigente.
                    </p>

                    <Space wrap>
                        <Button
                            icon={<SaveOutlined />}
                            loading={saving}
                            disabled={sending}
                            onClick={() =>
                                void handleSave()
                            }
                        >
                            Guardar y continuar
                        </Button>

                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            loading={sending}
                            disabled={
                                saving ||
                                nombre.trim().length < 2 ||
                                camposObligatoriosFaltantes.length > 0
                            }
                            onClick={() =>
                                void handleSend()
                            }
                        >
                            Enviar a RIDS
                        </Button>

                        {camposObligatoriosFaltantes.length > 0 && (
                            <span
                                className="
                                    text-xs
                                    text-amber-600
                                "
                            >
                                Completa los campos obligatorios para enviar.
                            </span>
                        )}
                    </Space>
                </div>
            </Card>
        </div>
    );
}