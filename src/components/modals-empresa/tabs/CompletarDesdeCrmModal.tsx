// src/components/modals-empresa/tabs/CompletarDesdeCrmModal.tsx
//
// «Completar desde el CRM» de la ficha técnica: muestra, campo por campo, el valor actual del formulario y el
// que se puede armar con lo que ya está en el CRM (inventario, suscripciones, ISP, redes, servidores,
// solicitantes, visitas). El técnico marca cuáles aplicar; solo se copian al formulario y se guardan con
// «Guardar». Por defecto vienen marcados los campos vacíos.
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Checkbox, Modal, Spin, Table, Tag, Typography, message } from "antd";
import { api } from "../../../api/api";

/* ===================== TIPOS (iguales al backend) ===================== */

export type SugerenciaCrmFichaTecnica = {
    valor: string;
    fuente: string;
};

export type VisitasCrmFichaTecnica = {
    ultima: { fecha: string; tecnico: string | null } | null;
    proxima: { fecha: string; hora: string | null; tecnicos: string[] } | null;
};

export type DatosCrmFichaTecnica = {
    visitas: VisitasCrmFichaTecnica;
    sugerencias: Partial<Record<string, SugerenciaCrmFichaTecnica>>;
};

/** Campos que el backend puede sugerir, en el orden del formulario. */
const CAMPOS: Array<[string, string]> = [
    ["tecnicoPrincipal", "Técnico principal"],
    ["tecnicosRespaldo", "Técnicos de respaldo"],
    ["pcsNotebooks", "PCs / notebooks"],
    ["servidores", "Servidores"],
    ["impresorasPerifericos", "Impresoras / periféricos"],
    ["sistemasOperativos", "Sistemas operativos"],
    ["licenciasVigentes", "Licencias vigentes"],
    ["antivirusSeguridad", "Antivirus / seguridad"],
    ["proveedorInternet", "Proveedor de internet"],
    ["velocidadContratada", "Velocidad contratada"],
    ["routersSwitches", "Routers / switches"],
    ["configuracionIP", "Configuración IP"],
    ["correosCorporativos", "Correos corporativos"],
];

type Fila = {
    campo: string;
    label: string;
    actual: string;
    sugerido: string;
    fuente: string;
    igual: boolean;
};

interface Props {
    open: boolean;
    empresaId: number;
    /** Valores actuales del formulario (form.getFieldsValue()). */
    valoresActuales: Record<string, unknown>;
    onAplicar: (valores: Record<string, string>) => void;
    onClose: () => void;
}

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

const CompletarDesdeCrmModal: React.FC<Props> = ({ open, empresaId, valoresActuales, onAplicar, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [datos, setDatos] = useState<DatosCrmFichaTecnica | null>(null);
    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) return;

        let activo = true;
        setLoading(true);
        setDatos(null);

        api.get<DatosCrmFichaTecnica>(`/ficha-empresa/${empresaId}/ficha-tecnica/datos-crm`)
            .then(({ data }) => {
                if (activo) setDatos(data);
            })
            .catch(() => {
                message.error("No se pudieron obtener los datos del CRM");
                onClose();
            })
            .finally(() => {
                if (activo) setLoading(false);
            });

        return () => {
            activo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, empresaId]);

    const filas = useMemo<Fila[]>(() => {
        if (!datos) return [];

        return CAMPOS.flatMap(([campo, label]) => {
            const s = datos.sugerencias[campo];
            if (!s) return [];

            const actual = texto(valoresActuales[campo]);
            return [{ campo, label, actual, sugerido: s.valor, fuente: s.fuente, igual: actual === s.valor }];
        });
    }, [datos, valoresActuales]);

    /* Por defecto: los campos vacíos */
    useEffect(() => {
        setSeleccion(new Set(filas.filter((f) => !f.actual && !f.igual).map((f) => f.campo)));
    }, [filas]);

    const alternar = (campo: string, marcado: boolean) => {
        setSeleccion((prev) => {
            const nueva = new Set(prev);
            if (marcado) nueva.add(campo);
            else nueva.delete(campo);
            return nueva;
        });
    };

    const aplicar = () => {
        const valores: Record<string, string> = {};
        for (const f of filas) {
            if (seleccion.has(f.campo)) valores[f.campo] = f.sugerido;
        }
        onAplicar(valores);
        onClose();
    };

    return (
        <Modal
            open={open}
            title="Completar desde el CRM"
            width={900}
            onCancel={onClose}
            onOk={aplicar}
            okText={`Aplicar (${seleccion.size})`}
            okButtonProps={{ disabled: seleccion.size === 0 }}
            cancelText="Cancelar"
            destroyOnHidden
        >
            <Alert
                type="info"
                showIcon
                className="mb-3"
                message="Marca los datos que quieres copiar al formulario. Se guardan recién al presionar «Guardar» en la ficha."
            />

            {loading ? (
                <div className="py-10 text-center"><Spin /></div>
            ) : filas.length === 0 ? (
                <Typography.Text type="secondary">
                    El CRM aún no tiene datos para sugerir (inventario, suscripciones, ISP o visitas).
                </Typography.Text>
            ) : (
                <Table<Fila>
                    size="small"
                    rowKey="campo"
                    pagination={false}
                    dataSource={filas}
                    columns={[
                        {
                            key: "sel",
                            width: 40,
                            render: (_, f) => (
                                <Checkbox
                                    checked={seleccion.has(f.campo)}
                                    disabled={f.igual}
                                    onChange={(e) => alternar(f.campo, e.target.checked)}
                                />
                            ),
                        },
                        { title: "Campo", dataIndex: "label", width: 170 },
                        {
                            title: "Actual",
                            dataIndex: "actual",
                            width: 230,
                            render: (v: string) =>
                                v ? <span className="text-gray-600">{v}</span> : <Typography.Text type="secondary">—</Typography.Text>,
                        },
                        {
                            title: "Desde el CRM",
                            key: "sugerido",
                            render: (_, f) => (
                                <div>
                                    <div className="font-medium">
                                        {f.sugerido} {f.igual && <Tag color="green" className="ml-1">Igual</Tag>}
                                    </div>
                                    <div className="text-xs text-gray-400">{f.fuente}</div>
                                </div>
                            ),
                        },
                    ]}
                />
            )}
        </Modal>
    );
};

export default CompletarDesdeCrmModal;