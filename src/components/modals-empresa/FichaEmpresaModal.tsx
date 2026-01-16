import React from "react";
import { Drawer, Tabs } from "antd";

import FichaTab from "./tabs/FichaTab";
import ChecklistTab from "./tabs/ChecklistTab";
import FichaTecnicaTab from "./tabs/FichaTecnicaTab";

import type { FichaEmpresaModalProps } from "./types";

const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL ||
  "http://localhost:4000/api";

const FichaEmpresaModal: React.FC<FichaEmpresaModalProps> = ({
  open,
  onClose,
  empresa,
  ficha,
  checklist,
  detalleEmpresa,
  loading,
}) => {
  const [activeTab, setActiveTab] = React.useState("ficha");
  const [localData, setLocalData] = React.useState({
    empresa,
    ficha,
    checklist,
    detalleEmpresa,
  });

  /* 🔁 Sync cuando cambia empresa o llegan nuevos props */
  React.useEffect(() => {
    setActiveTab("ficha");
    setLocalData({ empresa, ficha, checklist, detalleEmpresa });
  }, [empresa?.id_empresa, ficha, checklist, detalleEmpresa]);

  /* 🔄 Refetch ficha completa */
  const refetchFicha = async () => {
    if (!empresa) return;

    const res = await fetch(
      `${API_URL}/ficha-empresa/${empresa.id_empresa}/completa`
    );

    if (!res.ok) return;

    const data = await res.json();

    setLocalData({
      empresa: data.empresa,
      ficha: data.ficha,
      checklist: data.checklist,
      detalleEmpresa: data.detalleEmpresa,
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={900}
      destroyOnClose
      title={`Ficha Empresa · ${localData.empresa?.nombre ?? ""}`}
    >
      {!localData.empresa || loading ? (
        <div className="p-6 text-slate-500">
          Cargando ficha de la empresa…
        </div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "ficha",
              label: "Cliente",
              children: (
                <FichaTab
                  empresa={localData.empresa}
                  ficha={localData.ficha}
                  detalleEmpresa={localData.detalleEmpresa ?? null}
                  onUpdated={refetchFicha} // 👈 CLAVE
                />
              ),
            },
            {
              key: "checklist",
              label: "Checklist",
              children: (
                <ChecklistTab
                  empresaId={localData.empresa.id_empresa}
                  checklist={localData.checklist}
                />
              ),
            },

            {
              key: "tecnica",
              label: "Ficha técnica",
              children: (
                <FichaTecnicaTab empresaId={empresa!.id_empresa} />
              ),
            }

          ]}
        />
      )}
    </Drawer>
  );
};

export default FichaEmpresaModal;
