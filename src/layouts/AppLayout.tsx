import { Outlet } from "react-router-dom";
import Header from "../components/Header";

const AppLayout = () => {
    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
            <Header />

            <div className="flex-1 overflow-y-auto">
                <main className="app-content-zoom min-h-full p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;