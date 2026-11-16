// src/components/modals-empresa/LogoEmpresa.tsx
import React from "react";
import { Button, Popconfirm, Spin, Upload, message } from "antd";
import {
    DeleteOutlined,
    PictureOutlined,
    UploadOutlined,
} from "@ant-design/icons";

import { http } from "../../service/http";

type LogoEmpresaInfo = {
    logoUrl: string | null;
    logoPngUrl: string | null;
    actualizadoAt: string | null;
};

type Props = {
    empresaId: number;
    canEdit: boolean;
};

const MAX_BYTES = 2 * 1024 * 1024;

const ACEPTADOS = ".png,.jpg,.jpeg,.webp,.svg";

function mensajeError(error: unknown, porDefecto: string): string {
    const e = error as { response?: { data?: { message?: string } } };
    return e?.response?.data?.message ?? porDefecto;
}

/**
 * Logo de la empresa (Cloudinary). Se usa en el PDF del
 * consentimiento de protección de datos, junto al de RIDS.
 */
const LogoEmpresa: React.FC<Props> = ({ empresaId, canEdit }) => {

    const [logo, setLogo] = React.useState<LogoEmpresaInfo | null>(null);
    const [cargando, setCargando] = React.useState(true);
    const [guardando, setGuardando] = React.useState(false);

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try {
            const { data } = await http.get(`/empresas-logo/${empresaId}`);
            setLogo(data?.data ?? null);
        } catch (error) {
            console.error("Error cargando logo de empresa:", error);
            setLogo(null);
        } finally {
            setCargando(false);
        }
    }, [empresaId]);

    React.useEffect(() => {
        void cargar();
    }, [cargar]);

    const subir = async (archivo: File) => {
        if (archivo.size > MAX_BYTES) {
            message.error("El logo supera el máximo de 2 MB.");
            return;
        }

        const form = new FormData();
        form.append("archivo", archivo);

        setGuardando(true);
        try {
            const { data } = await http.put(`/empresas-logo/${empresaId}`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setLogo(data?.data ?? null);
            message.success("Logo actualizado.");
        } catch (error) {
            message.error(mensajeError(error, "No se pudo subir el logo."));
        } finally {
            setGuardando(false);
        }
    };

    const quitar = async () => {
        setGuardando(true);
        try {
            const { data } = await http.delete(`/empresas-logo/${empresaId}`);
            setLogo(data?.data ?? null);
            message.success("Logo quitado.");
        } catch (error) {
            message.error(mensajeError(error, "No se pudo quitar el logo."));
        } finally {
            setGuardando(false);
        }
    };

    const url = logo?.logoPngUrl ?? null;

    return (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
            <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                {cargando ? (
                    <Spin size="small" />
                ) : url ? (
                    <img
                        src={url}
                        alt="Logo de la empresa"
                        className="max-h-14 max-w-[150px] object-contain"
                    />
                ) : (
                    <PictureOutlined className="text-2xl text-slate-300" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800">Logo de la empresa</div>
                <div className="text-xs text-slate-500">
                    {url
                        ? "Se usa en el PDF de consentimiento junto al logo de RIDS."
                        : "Sin logo. El PDF de consentimiento muestra solo el logo de RIDS."}{" "}
                    PNG, JPG, WEBP o SVG, máx. 2 MB.
                </div>
            </div>

            {canEdit && (
                <div className="flex shrink-0 gap-2">
                    <Upload
                        accept={ACEPTADOS}
                        showUploadList={false}
                        disabled={guardando || cargando}
                        beforeUpload={(archivo) => {
                            void subir(archivo);
                            return false;
                        }}
                    >
                        <Button icon={<UploadOutlined />} loading={guardando} disabled={cargando}>
                            {url ? "Cambiar" : "Subir logo"}
                        </Button>
                    </Upload>

                    {url && (
                        <Popconfirm
                            title="Quitar logo"
                            description="El PDF de consentimiento quedará solo con el logo de RIDS."
                            okText="Quitar"
                            okButtonProps={{ danger: true }}
                            cancelText="Cancelar"
                            onConfirm={() => quitar()}
                        >
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                disabled={guardando}
                            />
                        </Popconfirm>
                    )}
                </div>
            )}
        </div>
    );
};

export default LogoEmpresa;