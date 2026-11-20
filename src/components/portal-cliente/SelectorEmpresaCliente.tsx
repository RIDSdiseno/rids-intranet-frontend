// src/components/portal-cliente/SelectorEmpresaCliente.tsx
// Grupos de empresas · G2a: selector de empresa del portal cliente (sidebar).
// Solo se muestra si el usuario tiene «Ver todo el grupo» y su grupo tiene más de una empresa.
import React, { useEffect, useState } from "react";
import { Select } from "antd";
import { Building2 } from "lucide-react";

import { api } from "../../api/api";
import {
    empresaClienteActual,
    restablecerEmpresaCliente,
    seleccionarEmpresaCliente,
} from "./empresaCliente";

interface MisEmpresas {
    empresaIdPropia: number | null;
    grupo: { id: number; nombre: string } | null;
    empresas: { id_empresa: number; nombre: string }[];
}

const SelectorEmpresaCliente: React.FC = () => {
    const [datos, setDatos] = useState<MisEmpresas | null>(null);
    const actual = empresaClienteActual();

    useEffect(() => {
        let activo = true;

        api.get("/portal/mis-empresas")
            .then(({ data }) => {
                if (!activo) return;
                const d = data?.data as MisEmpresas | undefined;
                if (!d) return;

                /* Si la empresa elegida ya no está permitida, volver a la propia */
                const permitida = d.empresas.some((e) => e.id_empresa === empresaClienteActual());
                if (!permitida && restablecerEmpresaCliente()) {
                    window.location.reload();
                    return;
                }

                setDatos(d);
            })
            .catch(() => {
                /* Sin selector si falla: el portal sigue con la empresa actual */
            });

        return () => {
            activo = false;
        };
    }, []);

    if (!datos || datos.empresas.length <= 1) return null;

    const cambiar = (empresaId: number) => {
        if (empresaId === actual) return;
        if (empresaId === datos.empresaIdPropia) {
            restablecerEmpresaCliente();
        } else {
            seleccionarEmpresaCliente(empresaId);
        }
        window.location.reload();
    };

    return (
        <div className="mb-3 rounded-xl border border-cyan-200 bg-white px-3 py-2 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                <Building2 size={14} />
                {datos.grupo ? `Grupo ${datos.grupo.nombre}` : "Empresa"}
            </div>
            <Select<number>
                className="w-full"
                size="small"
                value={actual ?? undefined}
                onChange={cambiar}
                showSearch
                optionFilterProp="label"
                options={datos.empresas.map((e) => ({
                    value: e.id_empresa,
                    label: e.id_empresa === datos.empresaIdPropia ? `${e.nombre} (mi empresa)` : e.nombre,
                }))}
            />
        </div>
    );
};

export default SelectorEmpresaCliente;