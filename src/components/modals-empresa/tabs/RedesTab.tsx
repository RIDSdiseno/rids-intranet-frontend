// ./../modals-empresa/tabs/RedesTab.tsx

import React, {
    useEffect,
    useState,
} from "react";

import {
    Card,
    Button,
    Space,
    Input,
    Select,
    Tag,
    Modal,
    Form,
    Row,
    Col,
    message,
} from "antd";

import {
    CloudOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    StarFilled,
    MinusCircleOutlined,
} from "@ant-design/icons";

import {
    http,
} from "../../../service/http";

import type {
    EmpresaISP,
    EmpresaISPFormValues,
    Sucursal,
} from "../types";

interface Props {
    empresaId: number;
    canEdit?: boolean;
}

const IspTab: React.FC<Props> = ({
    empresaId,
    canEdit = true,
}) => {

    const [isps, setIsps] =
        useState<EmpresaISP[]>([]);

    const [sucursales, setSucursales] =
        useState<Sucursal[]>([]);

    const [editing, setEditing] =
        useState<EmpresaISP | null>(null);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        modalOpen,
        setModalOpen,
    ] =
        useState(false);

    const [form] =
        Form.useForm<EmpresaISPFormValues>();

    const load =
        async () => {

            setLoading(
                true
            );

            try {
                const [
                    ispRes,
                    sucRes,
                ] =
                    await Promise.all([
                        http.get(
                            `/ficha-empresa/${empresaId}/isp`
                        ),

                        http.get(
                            `/ficha-empresa/${empresaId}/sucursales`
                        ),
                    ]);

                setIsps(
                    ispRes.data
                );

                setSucursales(
                    sucRes.data
                );

            } catch {
                message.error(
                    "Error cargando redes"
                );

            } finally {
                setLoading(
                    false
                );
            }
        };

    useEffect(
        () => {
            void load();
        },
        [
            empresaId,
        ]
    );

    const openCreate =
        () => {

            if (
                !canEdit
            ) {
                return;
            }

            setEditing(
                null
            );

            form.resetFields();

            form.setFieldsValue({
                ipRed:
                    [""],

                esPrincipal:
                    false,
            });

            setModalOpen(
                true
            );
        };

    const openEdit = (
        isp: EmpresaISP
    ) => {
        if (!canEdit) return;

        setEditing(isp);

        form.setFieldsValue({
            operador:
                isp.operador ?? "",

            servicio:
                isp.servicio ?? "",

            telefono:
                isp.telefono ?? "",

            numeroTicket:
                isp.numeroTicket ?? "",

            wifiNombre:
                isp.wifiNombre ?? "",

            wifiClaveRef:
                isp.wifiClaveRef ?? "",

            ipRed:
                isp.ipRed.length > 0
                    ? isp.ipRed
                    : [""],

            sucursalId:
                isp.sucursalId ?? null,

            esPrincipal:
                isp.esPrincipal,
        });

        setModalOpen(true);
    };

    const save =
        async () => {

            if (
                !canEdit
            ) {
                message.warning(
                    "No tienes permisos para editar redes"
                );

                return;
            }

            try {
                const values =
                    await form
                        .validateFields();

                const ipRed =
                    Array.isArray(
                        values.ipRed
                    )
                        ? Array.from(
                            new Set(
                                values.ipRed
                                    .filter(
                                        (
                                            value:
                                                unknown
                                        ): value is string =>
                                            typeof value ===
                                            "string"
                                    )
                                    .map(
                                        value =>
                                            value.trim()
                                    )
                                    .filter(
                                        Boolean
                                    )
                            )
                        )
                        : [];

                if (
                    ipRed.length >
                    5
                ) {
                    message.warning(
                        "Solo puedes registrar hasta 5 IP públicas"
                    );

                    return;
                }

                const payload = {
                    ...values,
                    ipRed,
                };

                if (
                    editing
                ) {
                    await http.put(
                        `/ficha-empresa/isp/${editing.id}`,
                        payload
                    );

                } else {
                    await http.post(
                        `/ficha-empresa/${empresaId}/isp`,
                        payload
                    );
                }

                message.success(
                    "Red guardada"
                );

                setModalOpen(
                    false
                );

                await load();

            } catch {
                message.error(
                    "Error guardando red"
                );
            }
        };

    const remove =
        async (
            id:
                number
        ) => {

            if (
                !canEdit
            ) {
                return;
            }

            try {
                await http.delete(
                    `/ficha-empresa/isp/${id}`
                );

                message.success(
                    "Red eliminada"
                );

                await load();

            } catch {
                message.error(
                    "Error eliminando red"
                );
            }
        };

    const setPrincipal =
        async (
            isp:
                EmpresaISP
        ) => {

            if (
                !canEdit
            ) {
                return;
            }

            try {
                await http.put(
                    `/ficha-empresa/isp/${isp.id}`,
                    {
                        operador:
                            isp.operador,

                        telefono:
                            isp.telefono,

                        servicio:
                            isp.servicio,

                        numeroTicket:
                            isp.numeroTicket,

                        wifiNombre:
                            isp.wifiNombre,

                        wifiClaveRef:
                            isp.wifiClaveRef,

                        ipRed:
                            isp.ipRed,

                        sucursalId:
                            isp.sucursalId,

                        esPrincipal:
                            true,
                    }
                );

                await load();

            } catch {
                message.error(
                    "Error actualizando red principal"
                );
            }
        };

    return (
        <Card
            loading={
                loading
            }

            title={
                <div>
                    <CloudOutlined />{" "}
                    Redes / ISP
                </div>
            }

            extra={
                canEdit
                    ? (
                        <Button
                            type="primary"
                            icon={
                                <PlusOutlined />
                            }
                            onClick={
                                openCreate
                            }
                        >
                            Nueva Red
                        </Button>
                    )
                    : null
            }
        >
            {isps.map(
                isp => (
                    <Card
                        key={
                            isp.id
                        }

                        style={{
                            marginBottom:
                                16,
                        }}

                        type="inner"

                        title={
                            <Space>
                                {isp.esPrincipal && (
                                    <Tag
                                        color="gold"
                                    >
                                        <StarFilled />{" "}
                                        Principal
                                    </Tag>
                                )}

                                {isp.operador ||
                                    "Sin operador"}
                            </Space>
                        }

                        extra={
                            canEdit
                                ? (
                                    <Space>
                                        {!isp.esPrincipal && (
                                            <Button
                                                size="small"
                                                onClick={
                                                    () =>
                                                        setPrincipal(
                                                            isp
                                                        )
                                                }
                                            >
                                                Hacer Principal
                                            </Button>
                                        )}

                                        <Button
                                            size="small"
                                            icon={
                                                <EditOutlined />
                                            }
                                            onClick={
                                                () =>
                                                    openEdit(
                                                        isp
                                                    )
                                            }
                                        />

                                        <Button
                                            size="small"
                                            danger
                                            icon={
                                                <DeleteOutlined />
                                            }
                                            onClick={
                                                () =>
                                                    remove(
                                                        isp.id
                                                    )
                                            }
                                        />
                                    </Space>
                                )
                                : null
                        }
                    >
                        <Row
                            gutter={
                                [
                                    12,
                                    12,
                                ]
                            }
                        >
                            <Col
                                xs={24}
                                md={12}
                            >
                                <b>
                                    Servicio:
                                </b>{" "}
                                {isp.servicio ||
                                    "—"}
                            </Col>

                            <Col
                                xs={24}
                                md={12}
                            >
                                <b>
                                    IP públicas:
                                </b>{" "}

                                {Array.isArray(
                                    isp.ipRed
                                ) &&
                                    isp.ipRed.length >
                                    0
                                    ? (
                                        <Space
                                            size={[
                                                4,
                                                4,
                                            ]}
                                            wrap
                                        >
                                            {isp.ipRed.map(
                                                (
                                                    ip:
                                                        string
                                                ) => (
                                                    <Tag
                                                        key={
                                                            ip
                                                        }
                                                    >
                                                        {ip}
                                                    </Tag>
                                                )
                                            )}
                                        </Space>
                                    )
                                    : "—"}
                            </Col>

                            <Col
                                xs={24}
                                md={12}
                            >
                                <b>
                                    WiFi:
                                </b>{" "}
                                {isp.wifiNombre ||
                                    "—"}
                            </Col>

                            <Col
                                xs={24}
                                md={12}
                            >
                                <b>
                                    Sucursal:
                                </b>{" "}
                                {isp.sucursal
                                    ?.nombre ||
                                    "Empresa (General)"}
                            </Col>
                        </Row>
                    </Card>
                )
            )}

            {canEdit && (
                <Modal
                    open={
                        modalOpen
                    }

                    onCancel={
                        () =>
                            setModalOpen(
                                false
                            )
                    }

                    onOk={
                        save
                    }

                    title={
                        editing
                            ? "Editar Red"
                            : "Nueva Red"
                    }

                    destroyOnClose
                >
                    <Form
                        layout="vertical"
                        form={
                            form
                        }
                    >
                        <Form.Item
                            name="operador"
                            label="Operador"
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="servicio"
                            label="Servicio"
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="IP públicas"
                        >
                            <Form.List
                                name="ipRed"
                                rules={[
                                    {
                                        validator:
                                            async (
                                                _,
                                                values
                                            ) => {
                                                if (
                                                    Array.isArray(
                                                        values
                                                    ) &&
                                                    values.length >
                                                    5
                                                ) {
                                                    throw new Error(
                                                        "Solo puedes registrar hasta 5 IP públicas"
                                                    );
                                                }
                                            },
                                    },
                                ]}
                            >
                                {(
                                    fields,
                                    {
                                        add,
                                        remove:
                                        removeIp,
                                    },
                                    {
                                        errors,
                                    }
                                ) => (
                                    <>
                                        {fields.map(
                                            (
                                                field,
                                                index
                                            ) => (
                                                <Space
                                                    key={
                                                        field.key
                                                    }

                                                    align="baseline"

                                                    style={{
                                                        display:
                                                            "flex",

                                                        width:
                                                            "100%",

                                                        marginBottom:
                                                            8,
                                                    }}
                                                >
                                                    <Form.Item
                                                        {...field}

                                                        style={{
                                                            flex:
                                                                1,

                                                            marginBottom:
                                                                0,
                                                        }}

                                                        rules={[
                                                            {
                                                                required:
                                                                    true,

                                                                whitespace:
                                                                    true,

                                                                message:
                                                                    "Ingresa una IP pública",
                                                            },
                                                        ]}
                                                    >
                                                        <Input
                                                            placeholder={
                                                                `IP pública ${index + 1}`
                                                            }
                                                        />
                                                    </Form.Item>

                                                    <Button
                                                        type="text"
                                                        danger

                                                        icon={
                                                            <MinusCircleOutlined />
                                                        }

                                                        onClick={
                                                            () =>
                                                                removeIp(
                                                                    field.name
                                                                )
                                                        }
                                                    />
                                                </Space>
                                            )
                                        )}

                                        {fields.length <
                                            5 && (
                                                <Button
                                                    type="dashed"
                                                    block

                                                    icon={
                                                        <PlusOutlined />
                                                    }

                                                    onClick={
                                                        () =>
                                                            add(
                                                                ""
                                                            )
                                                    }
                                                >
                                                    Agregar IP pública
                                                </Button>
                                            )}

                                        <div
                                            style={{
                                                marginTop:
                                                    6,

                                                color:
                                                    "#8c8c8c",

                                                fontSize:
                                                    12,
                                            }}
                                        >
                                            Puedes registrar hasta 5 IP públicas.
                                        </div>

                                        <Form.ErrorList
                                            errors={
                                                errors
                                            }
                                        />
                                    </>
                                )}
                            </Form.List>
                        </Form.Item>

                        <Form.Item
                            name="wifiNombre"
                            label="WiFi"
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="telefono"
                            label="Teléfono ISP"
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="sucursalId"
                            label="Sucursal"
                        >
                            <Select
                                allowClear
                                placeholder="Seleccionar sucursal"
                            >
                                {sucursales.map(
                                    s => (
                                        <Select.Option
                                            key={
                                                s.id_sucursal
                                            }

                                            value={
                                                s.id_sucursal
                                            }
                                        >
                                            {s.nombre}
                                        </Select.Option>
                                    )
                                )}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="esPrincipal"
                            label="¿Es principal?"
                        >
                            <Select
                                options={[
                                    {
                                        label:
                                            "Sí (Principal)",

                                        value:
                                            true,
                                    },
                                    {
                                        label:
                                            "No",

                                        value:
                                            false,
                                    },
                                ]}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </Card>
    );
};

export default IspTab;