// src/components/modals-ticketera/config-tickets/reply-templates/tickets-config.tsx

import { Button, Result, Tabs } from "antd";
import {
    ArrowLeftOutlined,
    LockOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import TicketEmailTemplatesPage from "./TicketEmailTemplate";
import SlaConfigEditor from "./sla-config";

import { useAuth } from "../../../hooks/useAuth";

export default function HelpdeskConfigPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const rolUsuario = String(user?.rol ?? "").toUpperCase();

    const puedeConfigurarTickets =
        rolUsuario === "ADMIN" ||
        rolUsuario === "ADMINISTRACION";

    if (!puedeConfigurarTickets) {
        return (
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                        Configuración
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Administra plantillas de correo y tiempos SLA.
                    </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <Result
                        status="403"
                        icon={
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-600">
                                <LockOutlined />
                            </div>
                        }
                        title="Acceso restringido"
                        subTitle={
                            <div className="mx-auto max-w-xl">
                                Tu usuario no tiene permisos para acceder a la
                                configuración de tickets. Esta sección está
                                disponible únicamente para usuarios con rol de
                                administrador o administración.
                            </div>
                        }
                        extra={
                            <Button
                                type="primary"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => {
                                    navigate("/helpdesk");
                                }}
                            >
                                Volver a Tickets
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">
                    Configuración
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                    Administra plantillas de correo y tiempos SLA.
                </p>
            </div>

            <Tabs
                items={[
                    {
                        key: "templates",
                        label: "Plantillas de correo",
                        children: <TicketEmailTemplatesPage />,
                    },
                    {
                        key: "sla",
                        label: "Configuración SLA",
                        children: <SlaConfigEditor />,
                    },
                ]}
            />
        </div>
    );
}