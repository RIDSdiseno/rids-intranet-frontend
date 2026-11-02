// src/components/modals-leypd/LeypdFichaTab.tsx

import {
    CopyOutlined,
    LinkOutlined,
    ReloadOutlined,
    SaveOutlined,
    StopOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Card,
    Divider,
    Empty,
    Input,
    Modal,
    Space,
    Spin,
    Tag,
    Tooltip,
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
    createLeypdFichaLink,
    getLeypdFicha,
    revokeLeypdFichaLink,
    updateLeypdFicha,
} from "./leypd.api";

import {
    obtenerErroresCampoApi,
    validarCamposFichaLeypd,
} from "./leypd.helpers";

import type {
    LeypdFichaInternaResponse,
} from "./leypd.types";

interface Props {
    empresaId: number;

    onChanged?:
    () => void | Promise<void>;
}

function valorEditable(
    value: unknown
): unknown {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return value;
}

export default function LeypdFichaTab({
    empresaId,
    onChanged,
}: Props) {
    /*
     * useModal hereda el tema (modo oscuro),
     * a diferencia de Modal.confirm estático.
     */
    const [
        modal,
        modalContextHolder,
    ] = Modal.useModal();

    const [
        data,
        setData,
    ] = useState<LeypdFichaInternaResponse | null>(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        generating,
        setGenerating,
    ] = useState(false);

    const [
        revoking,
        setRevoking,
    ] = useState(false);

    const [
        form,
        setForm,
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
        fieldErrors,
        setFieldErrors,
    ] = useState<Record<string, string>>(
        {}
    );

    const [
        generatedUrl,
        setGeneratedUrl,
    ] = useState<string | null>(
        null
    );

    /* =====================================================
       LOAD
    ===================================================== */

    const loadFicha =
        useCallback(
            async () => {
                setLoading(true);

                try {
                    const result =
                        await getLeypdFicha(
                            empresaId
                        );

                    setData(result);

                    const valores: Record<string, unknown> = {};

                    result.campos.forEach(
                        (campo) => {
                            valores[campo.key] =
                                valorEditable(
                                    result.ficha.datos[
                                        campo.key
                                    ]?.valor
                                );
                        }
                    );

                    setForm(valores);

                    setDirtyKeys(
                        new Set()
                    );

                    setFieldErrors({});
                } catch (error) {
                    console.error(
                        "[LEYPD] Error cargando ficha:",
                        error
                    );

                    message.error(
                        "No se pudo cargar la ficha del cliente."
                    );
                } finally {
                    setLoading(false);
                }
            },
            [empresaId]
        );

    useEffect(
        () => {
            void loadFicha();
        },
        [loadFicha]
    );

    /* =====================================================
       CAMBIAR CAMPO
    ===================================================== */

    const setField =
        (
            key: string,
            value: unknown
        ) => {
            setForm(
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
       SAVE
    ===================================================== */

    const handleSave =
        async () => {
            if (
                dirtyKeys.size === 0
            ) {
                message.info(
                    "No hay cambios pendientes."
                );

                return;
            }

            const erroresFormato =
                validarCamposFichaLeypd(
                    data?.campos ?? [],
                    form,
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

            const datos: Record<string, unknown> = {};

            dirtyKeys.forEach(
                (key) => {
                    datos[key] =
                        form[key];
                }
            );

            setSaving(true);

            try {
                await updateLeypdFicha(
                    empresaId,
                    datos
                );

                message.success(
                    "Ficha actualizada correctamente."
                );

                await loadFicha();

                await onChanged?.();
            } catch (error) {
                console.error(
                    "[LEYPD] Error guardando ficha:",
                    error
                );

                const erroresApi =
                    obtenerErroresCampoApi(
                        error
                    );

                if (erroresApi) {
                    setFieldErrors(
                        erroresApi
                    );

                    message.warning(
                        "Revisa los campos marcados en rojo."
                    );

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
       LINK
    ===================================================== */

    const handleGenerateLink =
        async () => {
            setGenerating(true);

            try {
                const result =
                    await createLeypdFichaLink(
                        empresaId
                    );

                setGeneratedUrl(
                    result.url
                );

                message.success(
                    "Enlace generado correctamente."
                );

                await loadFicha();

                await onChanged?.();
            } catch (error) {
                console.error(
                    "[LEYPD] Error generando enlace:",
                    error
                );

                message.error(
                    "No se pudo generar el enlace."
                );
            } finally {
                setGenerating(false);
            }
        };

    const handleRevokeLink =
        async () => {
            setRevoking(true);

            try {
                await revokeLeypdFichaLink(
                    empresaId
                );

                setGeneratedUrl(null);

                message.success(
                    "Enlace revocado correctamente."
                );

                await loadFicha();

                await onChanged?.();
            } catch (error) {
                console.error(
                    "[LEYPD] Error revocando enlace:",
                    error
                );

                message.error(
                    "No se pudo revocar el enlace."
                );
            } finally {
                setRevoking(false);
            }
        };

    const handleCopyLink =
        async () => {
            if (!generatedUrl) {
                return;
            }

            try {
                await navigator.clipboard.writeText(
                    generatedUrl
                );

                message.success(
                    "Enlace copiado."
                );
            } catch {
                message.error(
                    "No se pudo copiar el enlace."
                );
            }
        };

    /* =====================================================
       LINK STATUS
    ===================================================== */

    const enlaceExpirado =
        useMemo(
            () => {
                if (
                    !data?.ficha.enlaceCreadoAt ||
                    data.ficha.tokenRevokedAt ||
                    !data.ficha.tokenExpiresAt
                ) {
                    return false;
                }

                return (
                    new Date(
                        data.ficha.tokenExpiresAt
                    ) < new Date()
                );
            },
            [data]
        );

    const enlaceActivo =
        useMemo(
            () => {
                if (
                    !data?.ficha.enlaceCreadoAt
                ) {
                    return false;
                }

                if (
                    data.ficha.tokenRevokedAt
                ) {
                    return false;
                }

                if (enlaceExpirado) {
                    return false;
                }

                return true;
            },
            [
                data,
                enlaceExpirado,
            ]
        );

    /* =====================================================
       CONFIRMAR GENERACIÓN / REGENERACIÓN
    ===================================================== */

    const fichaRespondida =
        Boolean(
            data?.ficha.respondidoAt
        );

    const requestGenerateLink =
        () => {
            /*
             * Primera generación sin respuestas:
             * no hay nada que advertir.
             */
            if (
                !fichaRespondida &&
                !enlaceActivo
            ) {
                void handleGenerateLink();
                return;
            }

            modal.confirm({
                title:
                    "Regenerar enlace",

                content:
                    fichaRespondida
                        ? "Se generará un nuevo enlace y la ficha volverá a quedar pendiente de respuesta. Las respuestas ya registradas se conservarán."
                        : "Se generará un nuevo enlace y el enlace anterior dejará de funcionar.",

                okText:
                    "Regenerar",

                cancelText:
                    "Cancelar",

                /*
                 * Al devolver la promesa, el botón OK
                 * queda en loading hasta que termine.
                 */
                onOk: () =>
                    handleGenerateLink(),
            });
        };

    /* =====================================================
       RENDER
    ===================================================== */

    if (loading) {
        return (
            <div className="flex min-h-[280px] items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    if (!data) {
        return (
            <Empty description="No fue posible cargar la ficha" />
        );
    }

    return (
        <div className="space-y-4">
            {modalContextHolder}

            {/* =====================================================
                ENLACE CLIENTE
            ===================================================== */}

            <Card className="rounded-2xl border border-slate-200 shadow-sm">
                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        lg:flex-row
                        lg:items-center
                        lg:justify-between
                    "
                >
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">
                                Enlace para completar la ficha
                            </span>

                            {enlaceActivo ? (
                                <Tag color="green">
                                    Activo
                                </Tag>
                            ) : data.ficha.tokenRevokedAt ? (
                                <Tag color="red">
                                    Revocado
                                </Tag>
                            ) : enlaceExpirado ? (
                                <Tag color="orange">
                                    Expirado
                                </Tag>
                            ) : (
                                <Tag>
                                    Sin enlace
                                </Tag>
                            )}
                        </div>

                        <p className="mb-0 mt-1 text-xs text-slate-500">
                            Permite que el contacto de la empresa complete o confirme los datos requeridos.
                        </p>
                    </div>

                    <Space wrap>
                        <Button
                            icon={<LinkOutlined />}
                            loading={generating}
                            onClick={requestGenerateLink}
                        >
                            {enlaceActivo ||
                                fichaRespondida
                                ? "Regenerar enlace"
                                : "Generar enlace"}
                        </Button>

                        {enlaceActivo && (
                            <Button
                                danger
                                icon={<StopOutlined />}
                                loading={revoking}
                                onClick={() =>
                                    void handleRevokeLink()
                                }
                            >
                                Revocar
                            </Button>
                        )}
                    </Space>
                </div>

                {generatedUrl && (
                    <>
                        <Divider />

                        <div
                            className="
                                flex
                                flex-col
                                gap-2
                                sm:flex-row
                            "
                        >
                            <Input
                                readOnly
                                value={generatedUrl}
                            />

                            <Tooltip title="Copiar enlace">
                                <Button
                                    icon={<CopyOutlined />}
                                    onClick={() =>
                                        void handleCopyLink()
                                    }
                                >
                                    Copiar
                                </Button>
                            </Tooltip>
                        </div>
                    </>
                )}

                {enlaceActivo &&
                    !generatedUrl && (
                        <Alert
                            className="mt-4"
                            type="info"
                            showIcon
                            message="Existe un enlace activo"
                            description="Por seguridad el token original no se almacena en el servidor. Si necesitas volver a copiar el enlace, debes regenerarlo."
                        />
                    )}
            </Card>

            {/* =====================================================
                ESTADO FICHA
            ===================================================== */}

            <div className="flex flex-wrap gap-2">
                {data.ficha.respondidoAt ? (
                    <Tag color="green">
                        Ficha respondida
                    </Tag>
                ) : (
                    <Tag>
                        Pendiente de respuesta
                    </Tag>
                )}

                {data.ficha.respondidoPor && (
                    <Tag>
                        Respondido por:{" "}
                        {data.ficha.respondidoPor}
                    </Tag>
                )}
            </div>

            {/* =====================================================
                CAMPOS
            ===================================================== */}

            <FichaLeypdForm
                campos={data.campos}
                datos={data.ficha.datos}
                values={form}
                showMetadata
                errors={fieldErrors}
                onChange={setField}
            />

            {/* =====================================================
                ACCIONES
            ===================================================== */}

            <div
                className="
                    sticky
                    bottom-0
                    z-10
                    flex
                    justify-end
                    gap-2
                    border-t
                    border-slate-200
                    bg-white/95
                    py-3
                    backdrop-blur
                "
            >
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() =>
                        void loadFicha()
                    }
                >
                    Recargar
                </Button>

                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    disabled={
                        dirtyKeys.size === 0
                    }
                    onClick={() =>
                        void handleSave()
                    }
                >
                    Guardar cambios
                </Button>
            </div>
        </div>
    );
}