import {
    useEffect,
    useState,
} from "react";

import {
    Modal,
    Input,
    Button,
    Empty,
    Spin,
    Tag,
    message,
} from "antd";

import {
    LinkOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import {
    buscarEntidadesEmpresa,
    vincularEntidadEmpresa,
} from "./empresaEntidad.api";

import type {
    EmpresaEntidadMini,
} from "./empresaEntidad.types";


type Props = {
    open:
    boolean;

    empresaId:
    number;

    empresaNombre:
    string;

    onClose:
    () => void;

    onSuccess:
    () => void;
};


export default function VincularEntidadModal({
    open,
    empresaId,
    empresaNombre,
    onClose,
    onSuccess,
}: Props) {

    const [
        search,
        setSearch,
    ] =
        useState(
            ""
        );


    const [
        entidades,
        setEntidades,
    ] =
        useState<
            EmpresaEntidadMini[]
        >(
            []
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            false
        );


    const [
        vinculandoId,
        setVinculandoId,
    ] =
        useState<
            number |
            null
        >(
            null
        );


    async function cargar(
        value:
            string = ""
    ) {

        if (
            !open
        ) {
            return;
        }


        try {

            setLoading(
                true
            );


            const data =
                await buscarEntidadesEmpresa(
                    empresaId,
                    value
                );


            setEntidades(
                data
            );

        } catch (
        error:
            any
        ) {

            message.error(
                error
                    ?.response
                    ?.data
                    ?.error ||
                "No se pudieron cargar las entidades"
            );

        } finally {

            setLoading(
                false
            );
        }
    }


    useEffect(
        () => {

            if (
                open
            ) {

                setSearch(
                    ""
                );

                void cargar(
                    ""
                );
            }

        },
        [
            open,
            empresaId,
        ]
    );


    useEffect(
        () => {

            if (
                !open
            ) {
                return;
            }


            const timer =
                window.setTimeout(
                    () => {

                        void cargar(
                            search
                        );

                    },
                    350
                );


            return () =>
                window.clearTimeout(
                    timer
                );

        },
        [
            search,
            open,
        ]
    );


    async function handleVincular(
        entidad:
            EmpresaEntidadMini
    ) {

        try {

            setVinculandoId(
                entidad.id
            );


            await vincularEntidadEmpresa(
                empresaId,
                entidad.id
            );


            message.success(
                `Entidad "${entidad.nombre}" vinculada correctamente`
            );


            onSuccess();

            onClose();

        } catch (
        error:
            any
        ) {

            message.error(
                error
                    ?.response
                    ?.data
                    ?.error ||
                "No se pudo vincular la entidad"
            );

        } finally {

            setVinculandoId(
                null
            );
        }
    }


    return (
        <Modal
            open={
                open
            }

            title={
                `Relacionar entidad con ${empresaNombre}`
            }

            onCancel={
                onClose
            }

            footer={
                null
            }

            width={
                720
            }

            destroyOnHidden
        >

            <div className="space-y-4">

                <Input
                    value={
                        search
                    }

                    onChange={
                        (
                            e
                        ) =>
                            setSearch(
                                e.target.value
                            )
                    }

                    prefix={
                        <SearchOutlined />
                    }

                    placeholder="Buscar por nombre, RUT o correo"
                    allowClear
                />


                {
                    loading
                        ? (
                            <div className="flex justify-center py-10">

                                <Spin />

                            </div>
                        )
                        : entidades.length ===
                            0
                            ? (
                                <Empty
                                    description="No se encontraron entidades disponibles"
                                />
                            )
                            : (
                                <div className="max-h-[420px] space-y-2 overflow-y-auto">

                                    {
                                        entidades.map(
                                            (
                                                entidad
                                            ) => (

                                                <div
                                                    key={
                                                        entidad.id
                                                    }

                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-4
                                                        rounded-xl
                                                        border
                                                        border-slate-200
                                                        bg-white
                                                        p-4
                                                    "
                                                >

                                                    <div className="min-w-0">

                                                        <div className="font-semibold text-slate-800">
                                                            {
                                                                entidad.nombre
                                                            }
                                                        </div>


                                                        <div className="mt-1 text-xs text-slate-500">

                                                            RUT:{" "}

                                                            {
                                                                entidad.rut ||
                                                                "Sin RUT"
                                                            }

                                                        </div>


                                                        <div className="mt-2">

                                                            {
                                                                entidad.empresaId ===
                                                                    empresaId
                                                                    ? (
                                                                        <Tag color="green">
                                                                            Ya vinculada
                                                                        </Tag>
                                                                    )
                                                                    : (
                                                                        <Tag>
                                                                            Disponible
                                                                        </Tag>
                                                                    )
                                                            }

                                                            <Tag>
                                                                {
                                                                    entidad.origen
                                                                }
                                                            </Tag>

                                                        </div>

                                                    </div>


                                                    {
                                                        entidad.empresaId !==
                                                        empresaId &&
                                                        (
                                                            <Button
                                                                type="primary"

                                                                icon={
                                                                    <LinkOutlined />
                                                                }

                                                                loading={
                                                                    vinculandoId ===
                                                                    entidad.id
                                                                }

                                                                onClick={
                                                                    () =>
                                                                        void handleVincular(
                                                                            entidad
                                                                        )
                                                                }
                                                            >
                                                                Vincular
                                                            </Button>
                                                        )
                                                    }

                                                </div>
                                            )
                                        )
                                    }

                                </div>
                            )
                }

            </div>

        </Modal>
    );
}