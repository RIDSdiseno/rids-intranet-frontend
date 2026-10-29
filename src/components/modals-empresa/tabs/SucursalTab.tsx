// ./../modals-empresa/tabs/SucursalTab.tsx
import React, { useEffect, useState } from "react";
import {
    Card,
    Button,
    List,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    message,
    Divider,
    Row,
    Col,
    Badge,
    Tooltip,
    Empty,
    Spin
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    EnvironmentOutlined,
    PhoneOutlined,
    WifiOutlined,
    UserOutlined,
    HomeOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import {
    api,
} from "../../../api/api";
import CoordinatesMapPicker from "../CoordinatesMapPicker";

import type {
    Sucursal,
    RedSucursal,
    RedSucursalForm,
    SucursalFormValues,
} from "../types";

interface Props {
    empresaId: number;
    canEdit?: boolean;
}

const SucursalesTab: React.FC<Props> = ({ empresaId, canEdit = true }) => {
    const [data, setData] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] =
        useState(false);

    const [loadingSucursal, setLoadingSucursal] =
        useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteSucursalId, setDeleteSucursalId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [editingSucursalId, setEditingSucursalId] = useState<number | null>(null);
    const [
        originalRedIds,
        setOriginalRedIds,
    ] =
        useState<number[]>(
            []
        );
    const [form] = Form.useForm<SucursalFormValues>();

    const load = async () => {
        try {
            setLoading(true);
            const { data: json } = await api.get(
                `/ficha-empresa/${empresaId}/sucursales`
            );
            setData(Array.isArray(json) ? json : []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setData([]);
        setLoading(true);
        setModalOpen(false);
        setEditingSucursalId(null);
        setDeleteSucursalId(null);
        form.resetFields();
        load();
    }, [empresaId]);

    useEffect(() => {
        if (!canEdit) return;
        if (!modalOpen) return;

        if (editingSucursalId) {

            setLoadingSucursal(true);

            api
                .get(
                    `/ficha-empresa/sucursales/${editingSucursalId}`
                )
                .then(
                    ({
                        data,
                    }) => {

                        const redes: RedSucursal[] =
                            Array.isArray(data.redSucursales)
                                ? data.redSucursales
                                : [];


                        setOriginalRedIds(
                            redes
                                .map(
                                    (
                                        red: RedSucursal
                                    ) =>
                                        Number(
                                            red.id
                                        )
                                )
                                .filter(
                                    (
                                        id: number
                                    ) =>
                                        Number.isInteger(
                                            id
                                        ) &&
                                        id > 0
                                )
                        );


                        form.setFieldsValue({
                            nombre:
                                data.nombre ??
                                "",

                            direccion:
                                data.direccion ??
                                "",

                            latitud:
                                data.latitud ??
                                null,

                            longitud:
                                data.longitud ??
                                null,

                            telefono:
                                data.telefono ??
                                "",

                            responsableSucursals:
                                data.responsableSucursals ??
                                [],

                            redesWifi:
                                redes.map(
                                    (red: RedSucursal) => ({
                                        id:
                                            red.id,

                                        wifiNombre:
                                            red.wifiNombre ??
                                            "",

                                        claveWifi:
                                            red.claveWifi ??
                                            "",

                                        ipRed:
                                            red.ipRed ??
                                            "",

                                        gateway:
                                            red.gateway ??
                                            "",

                                        observaciones:
                                            red.observaciones ??
                                            "",
                                    })
                                ),
                        });
                    }
                )

                .catch((error) => {

                    console.error(
                        "Error cargando sucursal:",
                        error
                    );

                    message.error(
                        "No se pudo cargar la sucursal"
                    );

                })
                .finally(() => {

                    setLoadingSucursal(false);

                });

        } else {
            form.resetFields();

            setOriginalRedIds(
                []
            );

            form.setFieldsValue({
                responsableSucursals:
                    [],

                redesWifi:
                    [],
            });
        }
    }, [modalOpen, editingSucursalId, form, canEdit]);

    const openCreate = () => {
        if (!canEdit) {
            return;
        }

        setEditingSucursalId(null);
        setOriginalRedIds([]);
        setLoadingSucursal(false);

        form.resetFields();

        form.setFieldsValue({
            responsableSucursals: [],
            redesWifi: [],
        });

        setModalOpen(true);
    };

    const openEdit = (sucursalId: number) => {
        if (!canEdit) return;

        setEditingSucursalId(sucursalId);
        setModalOpen(true);
    };

    const openDelete = (sucursalId: number) => {
        if (!canEdit) return;

        setDeleteSucursalId(sucursalId);
    };

    const onSave =

        async () => {

            if (saving) {
                return;
            }

            if (
                !canEdit
            ) {

                message.warning(
                    "No tienes permisos para editar sucursales"
                );

                return;
            }

            try {

                setSaving(true);

                const values =
                    await form.validateFields();


                const {
                    redesWifi = [],
                    ...sucursalData
                } =
                    values;


                let sucursalId:
                    number;


                /* =========================================
                   1. CREAR / ACTUALIZAR SUCURSAL
                ========================================= */

                if (
                    editingSucursalId
                ) {

                    await api.put(
                        `/ficha-empresa/sucursales/${editingSucursalId}`,
                        sucursalData
                    );


                    sucursalId =
                        editingSucursalId;

                } else {

                    const {
                        data:
                        saved,
                    } =
                        await api.post(
                            `/ficha-empresa/${empresaId}/sucursales`,
                            sucursalData
                        );


                    sucursalId =
                        saved.id_sucursal;
                }


                /* =========================================
                   2. REDES QUE PERMANECEN EN EL FORMULARIO
                ========================================= */

                const redesValidas =
                    Array.isArray(
                        redesWifi
                    )
                        ? redesWifi.filter(
                            redTieneDatos
                        )
                        : [];


                const idsActuales =
                    redesValidas
                        .map((red: RedSucursalForm) =>
                            Number(red.id)
                        )
                        .filter(
                            (
                                id:
                                    number
                            ) =>
                                Number.isInteger(
                                    id
                                ) &&
                                id > 0
                        );


                /* =========================================
                   3. ELIMINAR REDES QUITADAS
                ========================================= */

                const idsEliminados =
                    originalRedIds.filter(
                        (
                            id
                        ) =>
                            !idsActuales.includes(
                                id
                            )
                    );


                for (
                    const redId
                    of idsEliminados
                ) {

                    await api.delete(
                        `/ficha-empresa/sucursales/${sucursalId}/redes/${redId}`
                    );
                }


                /* =========================================
                   4. CREAR / ACTUALIZAR REDES
                ========================================= */

                for (
                    const red
                    of redesValidas
                ) {

                    const payload = {
                        wifiNombre:
                            red.wifiNombre ??
                            null,

                        claveWifi:
                            red.claveWifi ??
                            null,

                        ipRed:
                            red.ipRed ??
                            null,

                        gateway:
                            red.gateway ??
                            null,

                        observaciones:
                            red.observaciones ??
                            null,
                    };


                    if (
                        red.id
                    ) {

                        await api.patch(
                            `/ficha-empresa/sucursales/${sucursalId}/redes/${red.id}`,
                            payload
                        );

                    } else {

                        await api.post(
                            `/ficha-empresa/sucursales/${sucursalId}/redes`,
                            payload
                        );
                    }
                }


                message.success(
                    editingSucursalId
                        ? "Sucursal actualizada correctamente"
                        : "Sucursal creada correctamente"
                );


                setModalOpen(
                    false
                );

                setEditingSucursalId(
                    null
                );

                setOriginalRedIds(
                    []
                );


                form.resetFields();


                await load();

            } catch (e: any) {

                console.error(
                    "Error guardando sucursal:",
                    e
                );

                if (!e?.errorFields) {

                    message.error(
                        e?.response?.data?.message ||
                        "No se pudo guardar la sucursal"
                    );
                }

            } finally {

                setSaving(false);

            }
        };
    const onDelete = async () => {
        if (!canEdit) return;
        if (!deleteSucursalId) return;

        try {
            setDeleting(true);
            await api.delete(`/ficha-empresa/sucursales/${deleteSucursalId}`);

            message.success("Sucursal eliminada correctamente");
            setDeleteSucursalId(null);
            await load();
        } catch {
            message.error("No se pudo eliminar la sucursal");
        } finally {
            setDeleting(false);
        }
    };

    function redTieneDatos(
        red: RedSucursalForm | undefined
    ): boolean {
        if (!red) {
            return false;
        }

        return [
            red.wifiNombre,
            red.claveWifi,
            red.ipRed,
            red.gateway,
            red.observaciones,
        ].some(
            (value) =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
        );
    }

    return (
        <div className="p-2">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold mb-1">Sucursales</h3>
                    <p className="text-gray-500 text-sm">
                        {data.length} sucursal{data.length !== 1 ? "es" : ""} registrada
                        {data.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {canEdit && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openCreate}
                        disabled={saving || deleting}
                    >
                        Nueva sucursal
                    </Button>
                )}
            </div>

            {data.length === 0 && !loading ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <span className="text-gray-500">
                            Esta empresa no tiene sucursales registradas
                        </span>
                    }
                    className="py-8"
                />
            ) : (
                <List
                    loading={loading}
                    dataSource={data}
                    grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                    renderItem={(sucursal) => (
                        <List.Item>
                            <Card
                                className="h-full hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                                title={
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center truncate">
                                            <HomeOutlined className="text-blue-500 mr-2" />
                                            <span className="font-medium truncate">
                                                {sucursal.nombre}
                                            </span>
                                        </div>

                                        {
                                            Array.isArray(
                                                sucursal.redSucursales
                                            ) &&
                                            sucursal.redSucursales.length >
                                            0 &&
                                            (
                                                <Badge
                                                    count={
                                                        sucursal
                                                            .redSucursales
                                                            .length
                                                    }

                                                    color="green"

                                                    title={
                                                        `${sucursal.redSucursales.length} red${sucursal.redSucursales.length !==
                                                            1
                                                            ? "es"
                                                            : ""
                                                        } WiFi`
                                                    }
                                                />
                                            )
                                        }
                                    </div>
                                }
                                extra={
                                    canEdit ? (
                                        <Space>
                                            <Tooltip title="Editar sucursal">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => openEdit(sucursal.id_sucursal)}
                                                />
                                            </Tooltip>

                                            <Tooltip title="Eliminar sucursal">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => openDelete(sucursal.id_sucursal)}
                                                />
                                            </Tooltip>
                                        </Space>
                                    ) : null
                                }
                            >
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        {sucursal.direccion && (
                                            <div className="flex items-start">
                                                <EnvironmentOutlined className="text-gray-400 mt-1 mr-2" />
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 mb-0">
                                                        Dirección
                                                    </p>
                                                    <p className="mb-0 text-sm">
                                                        {sucursal.direccion}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {sucursal.telefono && (
                                            <div className="flex items-center">
                                                <PhoneOutlined className="text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-0">
                                                        Teléfono
                                                    </p>
                                                    <p className="mb-0 text-sm">
                                                        {sucursal.telefono}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {sucursal.latitud != null && sucursal.longitud != null && (
                                            <a
                                                href={`https://www.google.com/maps?q=${sucursal.latitud},${sucursal.longitud}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-cyan-700 underline"
                                            >
                                                Ver en mapa
                                            </a>
                                        )}
                                    </div>

                                    {
                                        Array.isArray(
                                            sucursal.redSucursales
                                        ) &&
                                            sucursal.redSucursales.length >
                                            0
                                            ? (
                                                <div className="space-y-2">

                                                    <div className="flex items-center">

                                                        <WifiOutlined className="mr-2 text-gray-500" />

                                                        <span className="text-sm font-medium">
                                                            Redes WiFi
                                                        </span>

                                                    </div>


                                                    <div className="space-y-2">

                                                        {
                                                            sucursal.redSucursales.map(
                                                                (
                                                                    red:
                                                                        any
                                                                ) => (

                                                                    <div
                                                                        key={
                                                                            red.id
                                                                        }

                                                                        className="
                                        rounded-lg
                                        border
                                        border-slate-200
                                        bg-slate-50
                                        p-3
                                    "
                                                                    >

                                                                        <div
                                                                            className="
                                            mb-1
                                            flex
                                            items-center
                                            gap-2
                                        "
                                                                        >

                                                                            <WifiOutlined className="text-cyan-600" />

                                                                            <span className="text-sm font-semibold">

                                                                                {
                                                                                    red.wifiNombre ||
                                                                                    "Red sin nombre"
                                                                                }

                                                                            </span>

                                                                        </div>


                                                                        {
                                                                            red.claveWifi &&
                                                                            (
                                                                                <div className="text-xs">

                                                                                    <span className="text-gray-500">
                                                                                        Clave:{" "}
                                                                                    </span>

                                                                                    <code
                                                                                        className="
                                                        cursor-pointer
                                                        rounded
                                                        bg-white
                                                        px-1.5
                                                        py-0.5
                                                    "

                                                                                        title="Clic para copiar"

                                                                                        onClick={
                                                                                            async () => {

                                                                                                await navigator
                                                                                                    .clipboard
                                                                                                    .writeText(
                                                                                                        red.claveWifi
                                                                                                    );


                                                                                                message.success(
                                                                                                    "Clave copiada"
                                                                                                );
                                                                                            }
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            red.claveWifi
                                                                                        }
                                                                                    </code>

                                                                                </div>
                                                                            )
                                                                        }


                                                                        {
                                                                            red.ipRed &&
                                                                            (
                                                                                <div className="mt-1 text-xs">

                                                                                    <span className="text-gray-500">
                                                                                        Red:{" "}
                                                                                    </span>

                                                                                    {
                                                                                        red.ipRed
                                                                                    }

                                                                                </div>
                                                                            )
                                                                        }


                                                                        {
                                                                            red.gateway &&
                                                                            (
                                                                                <div className="mt-1 text-xs">

                                                                                    <span className="text-gray-500">
                                                                                        Gateway:{" "}
                                                                                    </span>

                                                                                    {
                                                                                        red.gateway
                                                                                    }

                                                                                </div>
                                                                            )
                                                                        }

                                                                    </div>
                                                                )
                                                            )
                                                        }

                                                    </div>

                                                </div>
                                            )
                                            : (
                                                <div className="flex items-center text-gray-400">

                                                    <WifiOutlined className="mr-2" />

                                                    <span className="text-sm">
                                                        WiFi no configurado
                                                    </span>

                                                </div>
                                            )
                                    }

                                    <div>
                                        <div className="flex items-center mb-2">
                                            <UserOutlined className="text-gray-500 mr-2" />
                                            <span className="text-sm font-medium">Responsables</span>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {Array.isArray(sucursal.responsableSucursals) &&
                                                sucursal.responsableSucursals.length > 0 ? (
                                                sucursal.responsableSucursals.map((r: any) => (
                                                    <Tag key={r.id} color="blue" className="m-0">
                                                        {r.nombre}
                                                        {r.cargo && ` (${r.cargo})`}
                                                    </Tag>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-sm">
                                                    Sin responsables
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </List.Item>
                    )}
                />
            )}

            {canEdit && (
                <Modal
                    open={modalOpen}

                    title={
                        <div className="flex items-center">
                            <EnvironmentOutlined className="mr-2 text-blue-500" />

                            {editingSucursalId
                                ? "Editar sucursal"
                                : "Nueva sucursal"}
                        </div>
                    }

                    onCancel={() => {

                        if (saving) {
                            return;
                        }

                        setModalOpen(false);
                        setEditingSucursalId(null);
                        setOriginalRedIds([]);

                        form.resetFields();
                    }}

                    onOk={onSave}

                    destroyOnClose

                    width={760}

                    okText={
                        editingSucursalId
                            ? "Guardar cambios"
                            : "Crear sucursal"
                    }

                    cancelText="Cancelar"

                    confirmLoading={saving}

                    okButtonProps={{
                        disabled: loadingSucursal,
                    }}

                    cancelButtonProps={{
                        disabled: saving,
                    }}

                    maskClosable={!saving}

                    closable={!saving}
                >
                    <Spin
                        spinning={loadingSucursal}
                        tip="Cargando sucursal..."
                    >
                        <Form
                            layout="vertical"
                            form={form}
                            className="pt-4"

                            disabled={
                                saving ||
                                loadingSucursal
                            }
                        >
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="nombre"
                                        label="Nombre"
                                        rules={[{ required: true, message: "Ingrese el nombre" }]}
                                    >
                                        <Input
                                            placeholder="Nombre de la sucursal"
                                            prefix={<EnvironmentOutlined className="text-gray-300" />}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col span={12}>
                                    <Form.Item name="direccion" label="Dirección">
                                        <Input
                                            placeholder="Dirección completa"
                                            prefix={<HomeOutlined className="text-gray-300" />}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col span={12}>
                                    <Form.Item name="telefono" label="Teléfono">
                                        <Input
                                            placeholder="Teléfono"
                                            prefix={<PhoneOutlined className="text-gray-300" />}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col span={24}>
                                    <Form.Item label="Ubicación en el mapa">
                                        <CoordinatesMapPicker form={form} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider
                                orientation="left"
                                className="!mt-8 !mb-4"
                            >
                                <WifiOutlined className="mr-2" />

                                Redes WiFi de la sucursal
                            </Divider>


                            <Form.List
                                name="redesWifi"
                            >
                                {(
                                    fields,
                                    {
                                        add,
                                        remove,
                                    }
                                ) => (

                                    <div className="space-y-3">

                                        {
                                            fields.length ===
                                            0 &&
                                            (
                                                <div
                                                    className="
                            rounded-xl
                            border
                            border-dashed
                            border-slate-300
                            bg-slate-50
                            px-4
                            py-6
                            text-center
                            text-sm
                            text-slate-400
                        "
                                                >
                                                    <WifiOutlined className="mb-2 text-xl" />

                                                    <div>
                                                        No hay redes WiFi registradas
                                                    </div>
                                                </div>
                                            )
                                        }


                                        {
                                            fields.map(
                                                (
                                                    {
                                                        key,
                                                        name,
                                                    },

                                                    index
                                                ) => (

                                                    <Card
                                                        key={
                                                            key
                                                        }

                                                        size="small"

                                                        className="
                                border-l-2
                                border-l-cyan-300
                            "

                                                        title={
                                                            <div className="flex items-center gap-2">

                                                                <WifiOutlined className="text-cyan-600" />

                                                                <span>
                                                                    Red WiFi {index + 1}
                                                                </span>

                                                            </div>
                                                        }

                                                        extra={
                                                            <Button
                                                                danger
                                                                type="text"
                                                                size="small"

                                                                icon={
                                                                    <DeleteOutlined />
                                                                }

                                                                onClick={
                                                                    () =>
                                                                        remove(
                                                                            name
                                                                        )
                                                                }
                                                            >
                                                                Eliminar
                                                            </Button>
                                                        }
                                                    >

                                                        {/* ID oculto para redes existentes */}
                                                        <Form.Item
                                                            name={[
                                                                name,
                                                                "id",
                                                            ]}
                                                            hidden
                                                        >
                                                            <Input />
                                                        </Form.Item>


                                                        <Row
                                                            gutter={[
                                                                16,
                                                                8,
                                                            ]}
                                                        >

                                                            <Col
                                                                xs={
                                                                    24
                                                                }
                                                                md={
                                                                    12
                                                                }
                                                            >
                                                                <Form.Item
                                                                    label="Nombre de la red"
                                                                    name={[
                                                                        name,
                                                                        "wifiNombre",
                                                                    ]}
                                                                >
                                                                    <Input
                                                                        placeholder="Ej: WGC, Empresa, Invitados"
                                                                        prefix={
                                                                            <WifiOutlined className="text-gray-300" />
                                                                        }
                                                                    />
                                                                </Form.Item>
                                                            </Col>


                                                            <Col
                                                                xs={
                                                                    24
                                                                }
                                                                md={
                                                                    12
                                                                }
                                                            >
                                                                <Form.Item
                                                                    label="Contraseña WiFi"
                                                                    name={[
                                                                        name,
                                                                        "claveWifi",
                                                                    ]}
                                                                >
                                                                    <Input.Password
                                                                        placeholder="Contraseña WiFi"
                                                                    />
                                                                </Form.Item>
                                                            </Col>


                                                            <Col
                                                                xs={
                                                                    24
                                                                }
                                                                md={
                                                                    12
                                                                }
                                                            >
                                                                <Form.Item
                                                                    label="IP de red"
                                                                    name={[
                                                                        name,
                                                                        "ipRed",
                                                                    ]}
                                                                >
                                                                    <Input
                                                                        placeholder="Ej: 192.168.1.0/24"
                                                                    />
                                                                </Form.Item>
                                                            </Col>


                                                            <Col
                                                                xs={
                                                                    24
                                                                }
                                                                md={
                                                                    12
                                                                }
                                                            >
                                                                <Form.Item
                                                                    label="Gateway"
                                                                    name={[
                                                                        name,
                                                                        "gateway",
                                                                    ]}
                                                                >
                                                                    <Input
                                                                        placeholder="Ej: 192.168.1.1"
                                                                    />
                                                                </Form.Item>
                                                            </Col>


                                                            <Col
                                                                span={
                                                                    24
                                                                }
                                                            >
                                                                <Form.Item
                                                                    label="Observaciones"
                                                                    name={[
                                                                        name,
                                                                        "observaciones",
                                                                    ]}
                                                                    className="mb-0"
                                                                >
                                                                    <Input.TextArea
                                                                        rows={
                                                                            2
                                                                        }
                                                                        placeholder="Observaciones adicionales de la red"
                                                                    />
                                                                </Form.Item>
                                                            </Col>

                                                        </Row>

                                                    </Card>
                                                )
                                            )
                                        }


                                        <Button
                                            type="dashed"

                                            onClick={
                                                () =>
                                                    add({
                                                        wifiNombre:
                                                            "",

                                                        claveWifi:
                                                            "",

                                                        ipRed:
                                                            "",

                                                        gateway:
                                                            "",

                                                        observaciones:
                                                            "",
                                                    })
                                            }

                                            block

                                            icon={
                                                <PlusOutlined />
                                            }
                                        >
                                            Agregar red WiFi
                                        </Button>

                                    </div>
                                )}
                            </Form.List>

                            <Divider orientation="left" className="!mt-8 !mb-4">
                                <UserOutlined className="mr-2" />
                                Responsables de la sucursal
                            </Divider>

                            <Form.List name="responsableSucursals">
                                {(fields, { add, remove }) => (
                                    <div className="space-y-3">
                                        {fields.map(({ key, name }) => (
                                            <Card
                                                key={key}
                                                size="small"
                                                className="border-l-2 border-l-blue-200"
                                            >
                                                <Row gutter={8} align="middle">
                                                    <Col span={5}>
                                                        <Form.Item
                                                            name={[name, "nombre"]}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: "Nombre requerido",
                                                                },
                                                            ]}
                                                            className="mb-0"
                                                        >
                                                            <Input placeholder="Nombre" size="small" />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={5}>
                                                        <Form.Item name={[name, "cargo"]} className="mb-0">
                                                            <Input placeholder="Cargo" size="small" />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={6}>
                                                        <Form.Item name={[name, "email"]} className="mb-0">
                                                            <Input placeholder="Email" size="small" />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={5}>
                                                        <Form.Item
                                                            name={[name, "telefono"]}
                                                            className="mb-0"
                                                        >
                                                            <Input placeholder="Teléfono" size="small" />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Button
                                                            danger
                                                            type="text"
                                                            size="small"
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => remove(name)}
                                                            className="w-full"
                                                        />
                                                    </Col>
                                                </Row>
                                            </Card>
                                        ))}

                                        <Button
                                            type="dashed"
                                            onClick={() => add()}
                                            block
                                            icon={<PlusOutlined />}
                                            className="mt-2"
                                        >
                                            Agregar responsable
                                        </Button>
                                    </div>
                                )}
                            </Form.List>
                        </Form>
                    </Spin>
                </Modal>
            )}

            {canEdit && (
                <Modal
                    open={deleteSucursalId !== null}
                    title="¿Eliminar sucursal?"
                    onCancel={() => {
                        if (!deleting) setDeleteSucursalId(null);
                    }}
                    onOk={onDelete}
                    maskClosable={!deleting}
                    closable={!deleting}
                    okText="Sí, eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true, loading: deleting }}
                    cancelButtonProps={{ disabled: deleting }}
                >
                    <p>Esta acción no se puede deshacer.</p>
                </Modal>
            )}
        </div>
    );
};

export default SucursalesTab;