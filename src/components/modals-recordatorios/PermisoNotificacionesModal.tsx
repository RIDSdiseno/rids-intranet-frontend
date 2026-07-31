// src/components/modals-recordatorios/PermisoNotificacionesModal.tsx

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Alert,
    Button,
    Modal,
    message,
} from "antd";

import {
    BellOutlined,
    CheckCircleOutlined,
    SettingOutlined,
} from "@ant-design/icons";

/*
 * Prefijo utilizado para recordar que el usuario
 * pospuso el permiso durante la sesión actual.
 */
const SESSION_DISMISSED_PREFIX =
    "rids-notificaciones-pospuestas";

/**
 * Obtiene una llave distinta por usuario.
 * Esto evita que la decisión de una cuenta afecte
 * a otra cuenta que utilice el mismo navegador.
 */
function getSessionStorageKey() {
    try {
        const rawUser =
            localStorage.getItem("user");

        const user = rawUser
            ? JSON.parse(rawUser)
            : null;

        const identifier = String(
            user?.email ?? "usuario"
        )
            .trim()
            .toLowerCase();

        return `${SESSION_DISMISSED_PREFIX}:${identifier}`;
    } catch {
        return `${SESSION_DISMISSED_PREFIX}:usuario`;
    }
}

export default function PermisoNotificacionesModal() {
    const [open, setOpen] =
        useState(false);

    const [requesting, setRequesting] =
        useState(false);

    const [permission, setPermission] =
        useState<
            NotificationPermission |
            "unsupported"
        >("default");

    /*
     * Se calcula una vez para el usuario
     * autenticado en esta sesión.
     */
    const sessionStorageKey =
        useMemo(
            () => getSessionStorageKey(),
            []
        );

    useEffect(() => {
        /*
         * Si el navegador no soporta notificaciones,
         * no es posible solicitar el permiso.
         */
        if (!("Notification" in window)) {
            setPermission("unsupported");
            return;
        }

        const currentPermission =
            Notification.permission;

        setPermission(currentPermission);

        /*
         * Si ya está concedido, no mostrar el modal.
         */
        if (
            currentPermission === "granted"
        ) {
            setOpen(false);
            return;
        }

        /*
         * Si el usuario seleccionó "Ahora no" durante
         * esta sesión, no volver a mostrarlo.
         */
        const dismissedThisSession =
            sessionStorage.getItem(
                sessionStorageKey
            ) === "true";

        if (dismissedThisSession) {
            return;
        }

        /*
         * Mostrar el modal poco después de cargar
         * el layout protegido del sistema.
         */
        const timeoutId =
            window.setTimeout(() => {
                setOpen(true);
            }, 700);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [sessionStorageKey]);

    /**
     * Solicita el permiso nativo del navegador.
     *
     * Debe ejecutarse desde un clic del usuario;
     * los navegadores suelen bloquear solicitudes
     * automáticas hechas directamente en useEffect.
     */
    async function activarNotificaciones() {
        if (!("Notification" in window)) {
            message.error(
                "Este navegador no soporta notificaciones."
            );
            return;
        }

        try {
            setRequesting(true);

            const result =
                await Notification.requestPermission();

            setPermission(result);

            if (result === "granted") {
                /*
                 * Limpiar una posible postergación
                 * de esta misma sesión.
                 */
                sessionStorage.removeItem(
                    sessionStorageKey
                );

                setOpen(false);

                message.success(
                    "Notificaciones activadas correctamente."
                );

                /*
                 * Solicitar a la campana que vuelva
                 * a revisar recordatorios pendientes.
                 */
                window.dispatchEvent(
                    new Event(
                        "recordatorios:actualizar"
                    )
                );

                /*
                 * Mostrar una notificación de prueba
                 * para confirmar que el permiso funciona.
                 */
                new Notification(
                    "Notificaciones activadas",
                    {
                        body:
                            "Recibirás avisos de recordatorios y tickets pendientes.",

                        icon:
                            "/favicon.ico",

                        tag:
                            "rids-notificaciones-activadas",
                    }
                );

                return;
            }

            if (result === "denied") {
                message.warning(
                    "Las notificaciones fueron bloqueadas por el navegador."
                );
            }
        } catch (error) {
            console.error(
                "Error solicitando permiso de notificaciones:",
                error
            );

            message.error(
                "No fue posible solicitar el permiso de notificaciones."
            );
        } finally {
            setRequesting(false);
        }
    }

    /**
     * Oculta el modal únicamente durante
     * la sesión actual del navegador.
     */
    function posponerPermiso() {
        sessionStorage.setItem(
            sessionStorageKey,
            "true"
        );

        setOpen(false);
    }

    /**
     * Abre la configuración del sitio.
     *
     * Los navegadores no permiten abrir directamente
     * su panel de permisos mediante JavaScript, por lo
     * que se muestra una explicación al usuario.
     */
    function mostrarInstruccionesConfiguracion() {
        message.info(
            "Presiona el icono de candado junto a la dirección del sitio y habilita Notificaciones."
        );
    }

    /*
     * No renderizar nada cuando el navegador
     * no soporte la API.
     */
    if (permission === "unsupported") {
        return null;
    }

    const bloqueado =
        permission === "denied";

    return (
        <Modal
            open={open}
            centered
            width={500}
            closable={false}
            maskClosable={false}
            keyboard={false}
            footer={null}
            title={
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                        <BellOutlined className="text-xl" />
                    </div>

                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            Activar notificaciones
                        </h2>
                    </div>
                </div>
            }
        >
            <div className="space-y-4 pt-2">
                {bloqueado ? (
                    <Alert
                        type="warning"
                        showIcon
                        message="Las notificaciones están bloqueadas"
                        description="Debes habilitarlas desde la configuración del sitio en tu navegador."
                    />
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm leading-6 text-slate-700">
                            Activa las notificaciones para recibir avisos sobre:
                        </p>

                        <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircleOutlined className="text-cyan-600" />
                                Recordatorios programados.
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircleOutlined className="text-cyan-600" />
                                Nuevos tickets asignados.
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircleOutlined className="text-cyan-600" />
                                Respuestas de solicitantes.
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-xs leading-5 text-slate-500">
                    La campana interna seguirá funcionando aunque no concedas este permiso.
                    El permiso solo controla las alertas emergentes del navegador y del sistema operativo.
                </p>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        onClick={posponerPermiso}
                        disabled={requesting}
                    >
                        Ahora no
                    </Button>

                    {bloqueado ? (
                        <Button
                            type="primary"
                            icon={
                                <SettingOutlined />
                            }
                            onClick={
                                mostrarInstruccionesConfiguracion
                            }
                        >
                            Cómo habilitarlas
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            icon={
                                <BellOutlined />
                            }
                            loading={requesting}
                            onClick={() =>
                                void activarNotificaciones()
                            }
                        >
                            Activar notificaciones
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}