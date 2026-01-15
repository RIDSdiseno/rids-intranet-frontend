import React, { useEffect, useState } from "react";
import { Table, Tag, Spin } from "antd";
import axios from "axios";

interface Inventario {
    id: number;
    mes: string;
    totalEquipos: number;
    generadoPor: string;
    resumenCambios: Record<string, number>;
    cambios?: Cambio[];
}

interface Cambio {
    id: number;
    tipo: string;
    descripcion: string;
    equipoId: number | null;
    beforeData: any;
    afterData: any;
}

export default function InventariosPage() {
    const [inventarios, setInventarios] = useState<Inventario[]>([]);
    const [loading, setLoading] = useState(false);

    const empresaId = 1;

    useEffect(() => {
        fetchInventarios();
    }, []);

    async function fetchInventarios() {
        setLoading(true);
        const res = await axios.get(`/inventarios/${empresaId}`);
        setInventarios(res.data.inventarios);
        setLoading(false);
    }

    const columns = [
        {
            title: "Mes",
            dataIndex: "mes",
            key: "mes"
        },
        {
            title: "Total equipos",
            dataIndex: "totalEquipos",
            key: "totalEquipos"
        },
        {
            title: "Origen",
            dataIndex: "generadoPor",
            key: "generadoPor",
            render: (v: string) =>
                v === "AUTO" ? <Tag color="blue">AUTO</Tag> : <Tag>MANUAL</Tag>
        },
        {
            title: "Cambios",
            key: "resumen",
            render: (_: any, r: Inventario) =>
                Object.entries(r.resumenCambios).map(([tipo, count]) => (
                    <Tag key={tipo}>
                        {tipo}: {count}
                    </Tag>
                ))
        }
    ];

    return (
        <>
            <h2>Inventarios mensuales</h2>

            <Spin spinning={loading}>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={inventarios}
                    expandable={{
                        expandedRowRender: (record: Inventario) => (
                            <DetalleCambios cambios={record.cambios || []} />
                        ),
                        rowExpandable: (record: Inventario) =>
                            Array.isArray(record.cambios) && record.cambios.length > 0
                    }}
                    pagination={false}
                />
            </Spin>
        </>
    );
}

function DetalleCambios({ cambios }: { cambios: Cambio[] }) {
    const columns = [
        {
            title: "Tipo",
            dataIndex: "tipo",
            key: "tipo",
            render: (t: string) => <Tag color="purple">{t}</Tag>
        },
        {
            title: "Equipo ID",
            dataIndex: "equipoId",
            key: "equipoId"
        },
        {
            title: "Descripción",
            dataIndex: "descripcion",
            key: "descripcion"
        },
        {
            title: "Before / After",
            key: "diff",
            render: (_: any, r: Cambio) => (
                <pre style={{ fontSize: 12, maxHeight: 200, overflow: "auto" }}>
                    {JSON.stringify(
                        {
                            before: r.beforeData,
                            after: r.afterData
                        },
                        null,
                        2
                    )}
                </pre>
            )
        }
    ];

    return (
        <Table
            rowKey="id"
            columns={columns}
            dataSource={cambios}
            pagination={{ pageSize: 5 }}
            size="small"
        />
    );
}

