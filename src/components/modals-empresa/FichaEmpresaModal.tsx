import React from "react";
import { Drawer, Tabs } from "antd";

import FichaTab from "./tabs/FichaTab";
import ChecklistTab from "./tabs/ChecklistTab";
import FichaTecnicaTab from "./tabs/FichaTecnicaTab";
import SucursalTab from "./tabs/SucursalTab";

import type {
  FichaEmpresaModalProps,
  ContactoEmpresa,
  FichaEmpresaCompleta
} from "./types";
import RedesTab from "./tabs/RedesTab";



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
  contactos,
  loading,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = React.useState("ficha");

  /* 🔥 ESTADO LOCAL (CLAVE) */
  const [localData, setLocalData] =
    React.useState<FichaEmpresaCompleta | null>(null);


  React.useEffect(() => {
    if (!open || !empresa) return;

    const loadFichaCompleta = async () => {
      const res = await fetch(
        `${API_URL}/ficha-empresa/${empresa.id_empresa}/completa`
      );

      if (!res.ok) return;

      const data = await res.json();

      setLocalData(data);
    };

    loadFichaCompleta();
  }, [open, empresa]);


  /* 🔄 Refetch ficha completa */
  const refetchFicha = async () => {
    if (!localData?.empresa) return;

    const res = await fetch(
      `${API_URL}/ficha-empresa/${localData.empresa.id_empresa}/completa`
    );

    if (!res.ok) return;

    const data = await res.json();

    setLocalData(data);
  };

  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={1200}
      destroyOnClose={false}
      title={`Ficha Empresa · ${localData?.empresa?.nombre ?? ""}`}
    >
      {!localData || loading ? (
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
                  key={localData.empresa.id_empresa} // 🔥
                  empresa={localData.empresa}
                  ficha={localData.ficha}
                  detalleEmpresa={localData.detalleEmpresa}
                  contactos={localData.contactos}
                  sucursales={localData.sucursales}
                  onUpdated={async () => {
                    await refetchFicha(); // 🔥 espera
                    onUpdated?.();
                  }}
                />
              ),
            },
            {
              key: "checklist",
              label: "Checklist",
              children: (
                <ChecklistTab
                  key={localData.empresa.id_empresa} // 🔥
                  empresaId={localData.empresa.id_empresa}
                  checklist={localData.checklist}
                  onUpdated={refetchFicha}
                />
              ),
            },
            {
              key: "tecnica",
              label: "Ficha técnica",
              children: (
                <FichaTecnicaTab
                  key={localData.empresa.id_empresa} // 🔥🔥🔥
                  empresaId={localData.empresa.id_empresa}
                />
              ),
            },
            {
              key: "redes",
              label: "Redes / ISP",
              children: <RedesTab empresaId={localData.empresa.id_empresa} />,
            },
            {
              key: "sucursales",
              label: "Sucursales",
              children: (
                <SucursalTab
                  key={localData.empresa?.id_empresa} // 🔥 CLAVE
                  empresaId={localData.empresa.id_empresa}
                />
              ),
            }
          ]}
        />
      )}
    </Drawer>
  );
};

export default FichaEmpresaModal;
