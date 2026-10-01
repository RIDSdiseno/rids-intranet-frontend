import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    CalendarClock,
    Eye,
    FileText,
    Pencil,
    Plus,
    Trash2,
    Upload,
} from "lucide-react";

import {
    eliminarContrato,
    eliminarSuscripcion,
    listarSuscripciones,
    obtenerContrato,
    subirContrato,
} from "../suscripciones/suscripciones.api";

import type {
    ContratoPdfData,
    SuscripcionContrato,
} from "../suscripciones/suscripciones.types";

import SuscripcionContratoModal
    from "../suscripciones/SuscripcionContratoModal";

import ContratoPdfModal
    from "../suscripciones/ContratoPdfModal";

import SuscripcionContratoDetalleModal
    from "../suscripciones/SuscripcionContratoDetalleModal";

type Props = {
    empresaId:
    number;

    canEdit:
    boolean;
};

export default function SuscripcionesContratosTab({
    empresaId,
    canEdit,
}: Props) {
    const [
        items,
        setItems,
    ] =
        useState<
            SuscripcionContrato[]
        >([]);

    const [
        loading,
        setLoading,
    ] =
        useState(
            false
        );

    const [
        modalOpen,
        setModalOpen,
    ] =
        useState(
            false
        );

    const [
        editando,
        setEditando,
    ] =
        useState<
            SuscripcionContrato | null
        >(
            null
        );

    const [
        pdf,
        setPdf,
    ] =
        useState<
            ContratoPdfData | null
        >(
            null
        );

    const [
        pdfOpen,
        setPdfOpen,
    ] =
        useState(
            false
        );

    const [
        uploadingId,
        setUploadingId,
    ] =
        useState<
            number | null
        >(
            null
        );

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(
            null
        );

    const inputFileRef =
        useRef<
            HTMLInputElement | null
        >(
            null
        );

    const [
        suscripcionArchivoId,
        setSuscripcionArchivoId,
    ] =
        useState<
            number | null
        >(
            null
        );

    const [
        detalleOpen,
        setDetalleOpen,
    ] =
        useState(
            false
        );

    const [
        detalleItem,
        setDetalleItem,
    ] =
        useState<
            SuscripcionContrato | null
        >(
            null
        );

    const cargar =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setError(
                        null
                    );

                    const data =
                        await listarSuscripciones(
                            empresaId
                        );

                    setItems(
                        data
                    );
                } catch (
                error
                ) {
                    console.error(
                        error
                    );

                    setError(
                        "No fue posible cargar las suscripciones."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                empresaId,
            ]
        );

    useEffect(
        () => {
            void cargar();
        },
        [
            cargar,
        ]
    );

    const totalMensualClp =
        useMemo(
            () =>
                items
                    .filter(
                        item =>
                            item.activo &&
                            item.moneda ===
                            "CLP"
                    )
                    .reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            Number(
                                item.costoMensual ??
                                0
                            ),
                        0
                    ),
            [
                items,
            ]
        );

    function verDetalle(
        item:
            SuscripcionContrato
    ) {
        setDetalleItem(
            item
        );

        setDetalleOpen(
            true
        );
    }

    function nuevaSuscripcion() {
        setEditando(
            null
        );

        setModalOpen(
            true
        );
    }

    function editar(
        item:
            SuscripcionContrato
    ) {
        setEditando(
            item
        );

        setModalOpen(
            true
        );
    }

    async function eliminar(
        item:
            SuscripcionContrato
    ) {
        const ok =
            window.confirm(
                `¿Eliminar la suscripción "${item.productoPlan}"?`
            );

        if (
            !ok
        ) {
            return;
        }

        try {
            await eliminarSuscripcion(
                empresaId,
                item.id
            );

            await cargar();
        } catch (
        error
        ) {
            console.error(
                error
            );

            window.alert(
                "No fue posible eliminar la suscripción."
            );
        }
    }

    function seleccionarArchivo(
        item:
            SuscripcionContrato
    ) {
        setSuscripcionArchivoId(
            item.id
        );

        inputFileRef
            .current
            ?.click();
    }

    async function archivoSeleccionado(
        event:
            React.ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target
                .files?.[0];

        const suscripcionId =
            suscripcionArchivoId;

        event.target.value =
            "";

        if (
            !file ||
            !suscripcionId
        ) {
            return;
        }

        if (
            file.type !==
            "application/pdf"
        ) {
            window.alert(
                "Solo puedes adjuntar archivos PDF."
            );

            return;
        }

        if (
            file.size >
            10 *
            1024 *
            1024
        ) {
            window.alert(
                "El PDF no puede superar los 10 MB."
            );

            return;
        }

        try {
            setUploadingId(
                suscripcionId
            );

            await subirContrato(
                empresaId,
                suscripcionId,
                file
            );

            await cargar();
        } catch (
        error
        ) {
            console.error(
                error
            );

            window.alert(
                "No fue posible subir el contrato."
            );
        } finally {
            setUploadingId(
                null
            );

            setSuscripcionArchivoId(
                null
            );
        }
    }

    async function verContrato(
        item:
            SuscripcionContrato
    ) {
        try {
            const data =
                await obtenerContrato(
                    empresaId,
                    item.id
                );

            setPdf(
                data
            );

            setPdfOpen(
                true
            );
        } catch (
        error
        ) {
            console.error(
                error
            );

            window.alert(
                "No fue posible abrir el contrato."
            );
        }
    }

    async function borrarContrato(
        item:
            SuscripcionContrato
    ) {
        const ok =
            window.confirm(
                "¿Eliminar el contrato PDF adjunto?"
            );

        if (
            !ok
        ) {
            return;
        }

        try {
            await eliminarContrato(
                empresaId,
                item.id
            );

            await cargar();
        } catch (
        error
        ) {
            console.error(
                error
            );

            window.alert(
                "No fue posible eliminar el contrato."
            );
        }
    }

    function formatCurrency(
        item:
            SuscripcionContrato
    ) {
        if (
            item.costoMensual ===
            null
        ) {
            return "—";
        }

        return new Intl
            .NumberFormat(
                "es-CL",
                {
                    style:
                        "currency",

                    currency:
                        item.moneda ===
                            "CLP" ||
                            item.moneda ===
                            "USD" ||
                            item.moneda ===
                            "EUR"
                            ? item.moneda
                            : "CLP",

                    maximumFractionDigits:
                        item.moneda ===
                            "CLP"
                            ? 0
                            : 2,
                }
            )
            .format(
                Number(
                    item.costoMensual
                )
            );
    }

    function formatDate(
        value:
            string | null
    ) {
        if (
            !value
        ) {
            return "—";
        }

        return new Date(
            value
        ).toLocaleDateString(
            "es-CL",
            {
                timeZone:
                    "UTC",
            }
        );
    }

    return (
        <div className="space-y-5">
            <input
                ref={
                    inputFileRef
                }
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={
                    archivoSeleccionado
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Suscripciones y Contratos
                    </h3>

                    <p className="text-sm text-gray-500">
                        Licencias, servicios y contratos asociados a esta empresa.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        nuevaSuscripcion
                    }
                    disabled={
                        !canEdit
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus size={17} />

                    Nueva suscripción
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border p-4 dark:border-gray-800">
                    <div className="text-sm text-gray-500">
                        Suscripciones
                    </div>

                    <div className="mt-1 text-2xl font-semibold">
                        {
                            items.length
                        }
                    </div>
                </div>

                <div className="rounded-xl border p-4 dark:border-gray-800">
                    <div className="text-sm text-gray-500">
                        Activas
                    </div>

                    <div className="mt-1 text-2xl font-semibold">
                        {
                            items.filter(
                                item =>
                                    item.activo
                            ).length
                        }
                    </div>
                </div>

                <div className="rounded-xl border p-4 dark:border-gray-800">
                    <div className="text-sm text-gray-500">
                        Costo mensual CLP
                    </div>

                    <div className="mt-1 text-xl font-semibold">
                        {
                            new Intl.NumberFormat(
                                "es-CL",
                                {
                                    style:
                                        "currency",

                                    currency:
                                        "CLP",

                                    maximumFractionDigits:
                                        0,
                                }
                            ).format(
                                totalMensualClp
                            )
                        }
                    </div>
                </div>
            </div>

            {
                error &&
                (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )
            }

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr className="text-center">
                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Fabricante
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Producto / Plan
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Proveedor
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Lic.
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Costo mensual
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Renovación
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Estado
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Contrato
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                        {
                            loading
                                ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="
                                    px-4
                                    py-10
                                    text-center
                                    text-slate-500
                                "
                                        >
                                            Cargando suscripciones...
                                        </td>
                                    </tr>
                                )
                                : items.length ===
                                    0
                                    ? (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="
                                        px-4
                                        py-12
                                        text-center
                                        text-slate-500
                                    "
                                            >
                                                No hay suscripciones registradas.
                                            </td>
                                        </tr>
                                    )
                                    : items.map(
                                        item => (
                                            <tr
                                                key={
                                                    item.id
                                                }
                                                className="
                                        bg-white
                                        transition-colors
                                        hover:bg-slate-50
                                    "
                                            >
                                                <td className="px-4 py-3 text-center font-medium text-slate-900">
                                                    {
                                                        item.fabricante
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-center text-slate-700">
                                                    {item.productoPlan}
                                                </td>

                                                <td className="px-4 py-3 text-center text-slate-700">
                                                    {item.proveedor}
                                                </td>

                                                <td className="px-4 py-3 text-center text-slate-700">
                                                    {item.cantidadLicencias}
                                                </td>

                                                <td className="px-4 py-3 text-center font-medium text-slate-900">
                                                    {formatCurrency(item)}
                                                </td>

                                                <td className="px-4 py-3 text-center text-slate-700">
                                                    <span className="inline-flex items-center justify-center gap-1.5">
                                                        <CalendarClock size={15} />

                                                        {formatDate(item.fechaRenovacion)}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={
                                                            item.activo
                                                                ? `
                                                        inline-flex
                                                        rounded-full
                                                        border
                                                        border-emerald-200
                                                        bg-emerald-50
                                                        px-2.5
                                                        py-1
                                                        text-xs
                                                        font-medium
                                                        text-emerald-700
                                                    `
                                                                : `
                                                        inline-flex
                                                        rounded-full
                                                        border
                                                        border-slate-200
                                                        bg-slate-100
                                                        px-2.5
                                                        py-1
                                                        text-xs
                                                        font-medium
                                                        text-slate-600
                                                    `
                                                        }
                                                    >
                                                        {
                                                            item.activo
                                                                ? "Activa"
                                                                : "Inactiva"
                                                        }
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    {
                                                        item.contratoStoragePath
                                                            ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            () =>
                                                                                verContrato(
                                                                                    item
                                                                                )
                                                                        }
                                                                        className="
                                                                rounded-lg
                                                                p-2
                                                                text-slate-600
                                                                transition
                                                                hover:bg-slate-100
                                                                hover:text-slate-900
                                                            "
                                                                        title="Ver contrato"
                                                                    >
                                                                        <Eye
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            () =>
                                                                                seleccionarArchivo(
                                                                                    item
                                                                                )
                                                                        }
                                                                        disabled={
                                                                            !canEdit
                                                                        }
                                                                        className="
                                                                rounded-lg
                                                                p-2
                                                                text-slate-600
                                                                transition
                                                                hover:bg-slate-100
                                                                hover:text-slate-900
                                                                disabled:cursor-not-allowed
                                                                disabled:opacity-40
                                                            "
                                                                        title="Reemplazar contrato"
                                                                    >
                                                                        <Upload
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            () =>
                                                                                borrarContrato(
                                                                                    item
                                                                                )
                                                                        }
                                                                        disabled={
                                                                            !canEdit
                                                                        }
                                                                        className="
                                                                rounded-lg
                                                                p-2
                                                                text-red-600
                                                                transition
                                                                hover:bg-red-50
                                                                disabled:cursor-not-allowed
                                                                disabled:opacity-40
                                                            "
                                                                        title="Eliminar contrato"
                                                                    >
                                                                        <Trash2
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    </button>
                                                                </div>
                                                            )
                                                            : (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        !canEdit ||
                                                                        uploadingId ===
                                                                        item.id
                                                                    }
                                                                    onClick={
                                                                        () =>
                                                                            seleccionarArchivo(
                                                                                item
                                                                            )
                                                                    }
                                                                    className="
                                                            inline-flex
                                                            items-center
                                                            gap-1.5
                                                            rounded-lg
                                                            border
                                                            border-slate-300
                                                            bg-white
                                                            px-2.5
                                                            py-1.5
                                                            text-xs
                                                            font-medium
                                                            text-slate-700
                                                            transition
                                                            hover:bg-slate-50
                                                            disabled:cursor-not-allowed
                                                            disabled:opacity-40
                                                        "
                                                                >
                                                                    <FileText
                                                                        size={
                                                                            14
                                                                        }
                                                                    />

                                                                    {
                                                                        uploadingId ===
                                                                            item.id
                                                                            ? "Subiendo..."
                                                                            : "Adjuntar PDF"
                                                                    }
                                                                </button>
                                                            )
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    verDetalle(
                                                                        item
                                                                    )
                                                            }
                                                            title="Ver detalle"
                                                            className="
                rounded-lg
                p-2
                text-slate-600
                transition
                hover:bg-slate-100
                hover:text-slate-900
            "
                                                        >
                                                            <Eye size={17} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    editar(
                                                                        item
                                                                    )
                                                            }
                                                            disabled={
                                                                !canEdit
                                                            }
                                                            title="Editar"
                                                            className="
                                                    rounded-lg
                                                    p-2
                                                    text-slate-600
                                                    transition
                                                    hover:bg-slate-100
                                                    hover:text-slate-900
                                                    disabled:cursor-not-allowed
                                                    disabled:opacity-40
                                                "
                                                        >
                                                            <Pencil
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    eliminar(
                                                                        item
                                                                    )
                                                            }
                                                            disabled={
                                                                !canEdit
                                                            }
                                                            title="Eliminar"
                                                            className="
                                                    rounded-lg
                                                    p-2
                                                    text-red-600
                                                    transition
                                                    hover:bg-red-50
                                                    disabled:cursor-not-allowed
                                                    disabled:opacity-40
                                                "
                                                        >
                                                            <Trash2
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )
                        }
                    </tbody>
                </table>
            </div>

            <SuscripcionContratoDetalleModal
                open={
                    detalleOpen
                }
                suscripcion={
                    detalleItem
                }
                onClose={
                    () => {
                        setDetalleOpen(
                            false
                        );

                        setDetalleItem(
                            null
                        );
                    }
                }
            />

            <SuscripcionContratoModal
                open={
                    modalOpen
                }
                empresaId={
                    empresaId
                }
                suscripcion={
                    editando
                }
                onClose={
                    () =>
                        setModalOpen(
                            false
                        )
                }
                onSaved={
                    async () => {
                        await cargar();
                    }
                }
            />

            <ContratoPdfModal
                open={
                    pdfOpen
                }
                url={
                    pdf?.url ??
                    null
                }
                nombre={
                    pdf?.nombre ??
                    null
                }
                onClose={
                    () => {
                        setPdfOpen(
                            false
                        );

                        setPdf(
                            null
                        );
                    }
                }
            />
        </div>
    );
}