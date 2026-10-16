// src/components/modals-funnel/EnviarInformeFunnelModal.tsx
import {
    App,
    Input,
    Modal,
    Select,
} from "antd";

import {
    FilePdfOutlined,
    MailOutlined,
} from "@ant-design/icons";

import {
    useEffect,
    useState,
} from "react";

import type {
    EnviarInformeOportunidadPayload,
    EnviarInformeOportunidadResultado,
    OportunidadDetalle,
} from "./types";

import {
    getEtapaLabel,
    getOportunidadErrorMessage,
} from "./utils";

import {
    api,
} from "../../api/api";

interface UsuarioInforme {
    id_tecnico:
    number;

    nombre:
    string;

    email:
    string |
    null;

    status:
    boolean;

    rol:
    string;
}

interface EnviarInformeFunnelModalProps {
    open:
    boolean;

    oportunidad:
    OportunidadDetalle |
    null;

    onClose:
    () =>
        void;

    onEnviar:
    (
        oportunidadId:
            number,

        payload:
            EnviarInformeOportunidadPayload
    ) =>
        Promise<
            EnviarInformeOportunidadResultado
        >;
}


const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export default function EnviarInformeFunnelModal({
    open,
    oportunidad,
    onClose,
    onEnviar,
}: EnviarInformeFunnelModalProps) {

    const {
        notification,
    } =
        App.useApp();


    const [
        destinatarios,
        setDestinatarios,
    ] =
        useState<string[]>(
            []
        );


    const [
        mensaje,
        setMensaje,
    ] =
        useState(
            ""
        );


    const [
        enviando,
        setEnviando,
    ] =
        useState(
            false
        );


    const [
        errorDestinatarios,
        setErrorDestinatarios,
    ] =
        useState<
            string |
            null
        >(
            null
        );

    const [
        usuarios,
        setUsuarios,
    ] =
        useState<
            UsuarioInforme[]
        >(
            []
        );


    const [
        cargandoUsuarios,
        setCargandoUsuarios,
    ] =
        useState(
            false
        );


    /*
     * Cada vez que se abre para otra oportunidad,
     * limpiamos el formulario.
     *
     * Deliberadamente NO precargamos el correo
     * del cliente para evitar enviar por accidente
     * un informe interno/comercial al contacto.
     */
    useEffect(
        () => {

            if (
                !open
            ) {
                return;
            }


            setDestinatarios(
                []
            );

            setMensaje(
                ""
            );

            setErrorDestinatarios(
                null
            );

        },
        [
            open,
            oportunidad?.id,
        ]
    );

    useEffect(
        () => {

            if (
                !open
            ) {
                return;
            }


            let activo =
                true;


            async function cargarUsuarios() {

                setCargandoUsuarios(
                    true
                );


                try {

                    const res =
                        await api.get(
                            "/tecnicos"
                        );


                    const data:
                        UsuarioInforme[] =
                        res.data?.data ??
                        res.data?.items ??
                        res.data ??
                        [];


                    /*
                     * Aunque el backend /tecnicos ya devuelve
                     * únicamente usuarios activos y roles internos,
                     * dejamos este filtro también en frontend como
                     * protección adicional.
                     */
                    const usuariosValidos =
                        data.filter(
                            (
                                usuario
                            ) =>
                                usuario.status ===
                                true &&
                                usuario.rol !==
                                "CLIENTE" &&
                                Boolean(
                                    usuario.email
                                        ?.trim()
                                )
                        );


                    if (
                        activo
                    ) {
                        setUsuarios(
                            usuariosValidos
                        );
                    }

                } catch (
                err
                ) {

                    console.error(
                        "[FUNNEL][INFORME] Error cargando usuarios:",
                        err
                    );


                    if (
                        activo
                    ) {
                        setUsuarios(
                            []
                        );
                    }

                } finally {

                    if (
                        activo
                    ) {
                        setCargandoUsuarios(
                            false
                        );
                    }
                }
            }


            void cargarUsuarios();


            return () => {
                activo =
                    false;
            };

        },
        [
            open,
        ]
    );


    if (
        !oportunidad
    ) {
        return null;
    }


    function normalizarDestinatarios(
        valores:
            string[]
    ): string[] {

        return Array.from(
            new Set(
                valores
                    .flatMap(
                        (
                            valor
                        ) =>
                            valor
                                .split(
                                    /[,;\n]+/
                                )
                    )
                    .map(
                        (
                            valor
                        ) =>
                            valor
                                .trim()
                                .toLowerCase()
                    )
                    .filter(
                        Boolean
                    )
            )
        );
    }


    function validarDestinatarios(): string[] | null {

        const normalizados =
            normalizarDestinatarios(
                destinatarios
            );


        if (
            normalizados.length ===
            0
        ) {

            setErrorDestinatarios(
                "Debes indicar al menos un destinatario."
            );

            return null;
        }


        const invalidos =
            normalizados.filter(
                (
                    correo
                ) =>
                    !EMAIL_REGEX.test(
                        correo
                    )
            );


        if (
            invalidos.length >
            0
        ) {

            setErrorDestinatarios(
                `Correo inválido: ${invalidos.join(
                    ", "
                )}`
            );

            return null;
        }


        if (
            normalizados.length >
            20
        ) {

            setErrorDestinatarios(
                "Puedes indicar un máximo de 20 destinatarios."
            );

            return null;
        }


        setErrorDestinatarios(
            null
        );


        return normalizados;
    }


    async function handleEnviar() {

        if (
            !oportunidad
        ) {
            notification.error({
                message:
                    "No se pudo enviar el informe",

                description:
                    "No existe una oportunidad seleccionada.",
            });

            return;
        }


        const correos =
            validarDestinatarios();


        if (
            !correos
        ) {
            return;
        }


        const mensajeLimpio =
            mensaje.trim();


        setEnviando(
            true
        );


        try {

            const resultado =
                await onEnviar(
                    oportunidad.id,

                    {
                        destinatarios:
                            correos,

                        ...(mensajeLimpio
                            ? {
                                mensaje:
                                    mensajeLimpio,
                            }
                            : {}),
                    }
                );


            notification.success({
                message:
                    "Informe enviado",

                description:
                    `${resultado.nombreArchivo} fue enviado correctamente a ${resultado.destinatarios.length} ${resultado.destinatarios.length ===
                        1
                        ? "destinatario"
                        : "destinatarios"
                    }.`,
            });


            onClose();

        } catch (
        err
        ) {

            notification.error({
                message:
                    "No se pudo enviar el informe",

                description:
                    getOportunidadErrorMessage(
                        err,
                        "Ocurrió un error al generar o enviar el informe."
                    ),
            });

        } finally {

            setEnviando(
                false
            );
        }
    }

    return (

        <Modal
            open={
                open
            }

            title={
                <div className="flex items-center gap-2">

                    <FilePdfOutlined
                        className="text-rose-600"
                    />

                    <span>
                        Enviar informe de respaldo
                    </span>

                </div>
            }

            okText={
                enviando
                    ? "Generando y enviando..."
                    : "Generar y enviar"
            }

            cancelText="Cancelar"

            confirmLoading={
                enviando
            }

            okButtonProps={{
                disabled:
                    destinatarios.length ===
                    0,
            }}

            onCancel={() => {

                if (
                    enviando
                ) {
                    return;
                }

                onClose();
            }}

            onOk={
                handleEnviar
            }

            destroyOnHidden
        >

            {/* =========================================
          OPORTUNIDAD
      ========================================= */}

            <div
                className="
          mb-4
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          p-3
        "
            >

                <div
                    className="
            text-xs
            font-semibold
            text-slate-700
          "
                >
                    {oportunidad.codigo}
                    {" · "}
                    {oportunidad.titulo}
                </div>


                <div
                    className="
            mt-1
            text-xs
            text-slate-500
          "
                >
                    {oportunidad.entidad
                        ?.nombre ??
                        "Sin cliente"}

                    {" · "}

                    {getEtapaLabel(
                        oportunidad.etapa
                    )}
                </div>

            </div>


            {/* =========================================
          DESTINATARIOS
      ========================================= */}

            <div className="mb-4">

                <label
                    className="
            mb-1
            block
            text-xs
            font-medium
            text-slate-600
          "
                >
                    Destinatarios
                    <span className="text-rose-500">
                        {" "}*
                    </span>
                </label>


                <Select
                    mode="tags"

                    value={
                        destinatarios
                    }

                    loading={
                        cargandoUsuarios
                    }

                    onChange={(
                        values
                    ) => {

                        setDestinatarios(
                            values
                        );

                        setErrorDestinatarios(
                            null
                        );
                    }}

                    tokenSeparators={[
                        ",",
                        ";",
                    ]}

                    placeholder={
                        cargandoUsuarios
                            ? "Cargando usuarios..."
                            : "Selecciona usuarios o escribe un correo"
                    }

                    className="w-full"

                    suffixIcon={
                        <MailOutlined />
                    }

                    showSearch

                    optionFilterProp="label"

                    maxTagCount="responsive"

                    options={
                        usuarios.map(
                            (
                                usuario
                            ) => {

                                const correo =
                                    usuario.email
                                        ?.trim() ??
                                    "";


                                return {
                                    value:
                                        correo,

                                    label:
                                        `${usuario.nombre} · ${correo}`,

                                    searchText:
                                        `${usuario.nombre} ${correo} ${usuario.rol}`,
                                };
                            }
                        )
                    }

                    filterOption={(
                        input,
                        option
                    ) => {

                        const texto =
                            String(
                                option?.searchText ??
                                option?.label ??
                                ""
                            )
                                .toLowerCase();


                        return texto.includes(
                            input
                                .toLowerCase()
                                .trim()
                        );
                    }}
                />

                <p
                    className="
            mt-1
            text-[11px]
            text-slate-400
          "
                >
                    Puedes ingresar varios correos
                    separados por coma o punto y coma.
                </p>


                {errorDestinatarios && (

                    <p
                        className="
              mt-1
              text-xs
              text-rose-500
            "
                    >
                        {errorDestinatarios}
                    </p>

                )}

            </div>


            {/* =========================================
          MENSAJE OPCIONAL
      ========================================= */}

            <div className="mb-4">

                <label
                    className="
            mb-1
            block
            text-xs
            font-medium
            text-slate-600
          "
                >
                    Mensaje adicional
                </label>


                <Input.TextArea
                    rows={
                        4
                    }

                    maxLength={
                        2000
                    }

                    value={
                        mensaje
                    }

                    onChange={(
                        event
                    ) =>
                        setMensaje(
                            event.target.value
                        )
                    }

                    placeholder="Ej: Adjunto envío informe de respaldo comercial de la oportunidad."

                    className="resize-none"
                />


                <div
                    className="
            mt-1
            text-right
            text-[10px]
            text-slate-400
          "
                >
                    {mensaje.length} / 2000
                </div>

            </div>


            {/* =========================================
          CONTENIDO DEL INFORME
      ========================================= */}

            <div
                className="
          rounded-xl
          border
          border-cyan-100
          bg-cyan-50/50
          p-3
        "
            >

                <div
                    className="
            mb-2
            text-xs
            font-semibold
            text-cyan-800
          "
                >
                    El PDF incluirá
                </div>


                <ul
                    className="
            space-y-1
            text-xs
            text-slate-600
          "
                >

                    <li>
                        • Datos generales de la oportunidad
                    </li>

                    <li>
                        • Cotizaciones actualmente relacionadas
                    </li>

                    <li>
                        • Historial de envíos de cotizaciones
                    </li>

                    <li>
                        • Seguimientos y tareas
                    </li>

                    <li>
                        • Resultados y motivos de cancelación
                    </li>

                    <li>
                        • Cambios de etapa y sus motivos
                    </li>

                    <li>
                        • Línea de tiempo del proceso comercial
                    </li>

                    <li>
                        • Estado actual de la oportunidad
                    </li>

                </ul>

            </div>


            <p
                className="
          mt-3
          text-[11px]
          text-slate-400
        "
            >
                El PDF se genera al momento del envío.
                No se almacena dentro del sistema.
            </p>

        </Modal>
    );
}