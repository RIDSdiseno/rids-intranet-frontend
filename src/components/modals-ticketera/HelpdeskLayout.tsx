import { Outlet, useLocation, useNavigate, matchPath } from "react-router-dom";
import { Tabs } from "antd";
import {
    CustomerServiceOutlined,
    DashboardOutlined,
    BarChartOutlined,
    SettingOutlined,
} from "@ant-design/icons";

export default function HelpdeskLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const isTicketDetail = !!matchPath("/helpdesk/tickets/:id", location.pathname);

    const activeKey = location.pathname.startsWith("/helpdesk/tickets-dashboard")
        ? "tickets-dashboard"
        : location.pathname.startsWith("/helpdesk/dashboard")
            ? "dashboard"
            : location.pathname.startsWith("/helpdesk/email-templates")
                ? "templates"
                : "tickets";

    const items = [
        {
            key: "tickets",
            label: (
                <span className="flex items-center gap-2">
                    <CustomerServiceOutlined />
                    Tickets
                </span>
            ),
        },
        {
            key: "dashboard",
            label: (
                <span className="flex items-center gap-2">
                    <DashboardOutlined />
                    Dashboard técnicos
                </span>
            ),
        },
        {
            key: "tickets-dashboard",
            label: (
                <span className="flex items-center gap-2">
                    <BarChartOutlined />  {/* ← diferente al de técnicos */}
                    Dashboard empresas
                </span>
            ),
        },
        {
            key: "templates",
            label: (
                <span className="flex items-center gap-2">
                    <SettingOutlined />
                    Configuración
                </span>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70">
            {isTicketDetail ? (
                <div className="w-full px-0 py-0">
                    <Outlet />
                </div>
            ) : (
                <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
                    <div className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 px-6 pt-5 pb-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 m-0">
                                        Centro de Soporte
                                    </h1>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Gestión de tickets, métricas y configuración
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 px-4 md:px-6">
                            <Tabs
                                activeKey={activeKey}
                                onChange={(key) => {
                                    if (key === "tickets") navigate("/helpdesk");
                                    if (key === "dashboard") navigate("/helpdesk/dashboard");
                                    if (key === "tickets-dashboard") navigate("/helpdesk/tickets-dashboard");
                                    if (key === "templates") navigate("/helpdesk/email-templates");
                                }}
                                items={items}
                                className="helpdesk-tabs"
                            />
                        </div>
                    </div>

                    <Outlet />
                </div>
            )}
        </div>
    );
}