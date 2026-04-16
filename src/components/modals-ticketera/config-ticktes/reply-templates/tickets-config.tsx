import { Tabs } from "antd";
import TicketEmailTemplatesPage from "./TicketEmailTemplate";
import SlaConfigEditor from "./sla-config";

export default function HelpdeskConfigPage() {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">
                    Configuración
                </h2>
                <p className="text-sm text-gray-500 mt-1">
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