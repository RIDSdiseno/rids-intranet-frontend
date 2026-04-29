// ./src/components/modals-empresa/FichaEmpresaModal.tsx
import React from "react";
import { Drawer, Tabs } from "antd";

import FichaTab from "./tabs/FichaTab";
import ChecklistTab from "./tabs/ChecklistTab";
import FichaTecnicaTab from "./tabs/FichaTecnicaTab";
import SucursalTab from "./tabs/SucursalTab";
import ServidoresTab from "./tabs/ServidoresTab";
import EntityAuditTab from "./tabs/HistorialCambiosTab";

import type {
  FichaEmpresaModalProps,
  FichaEmpresaCompleta,
} from "./types";

import RedesTab from "./tabs/RedesTab";
import { http } from "../../service/http";

const FichaEmpresaModal: React.FC<FichaEmpresaModalProps> = ({
  open,
  onClose,
  empresa,
  loading,
  onUpdated,
  canEdit = true,
}) => {
  const [activeTab, setActiveTab] = React.useState("ficha");

  const [localData, setLocalData] =
    React.useState<FichaEmpresaCompleta | null>(null);

  React.useEffect(() => {
    if (!open || !empresa) return;

    const loadFichaCompleta = async () => {
      const { data } = await http.get(
        `/ficha-empresa/${empresa.id_empresa}/completa`
      );

      setLocalData(data);
    };

    loadFichaCompleta();
  }, [open, empresa]);

  const refetchFicha = async () => {
    if (!localData?.empresa) return;

    const { data } = await http.get(
      `/ficha-empresa/${localData.empresa.id_empresa}/completa`
    );

    if (!data) return;

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
                  key={localData.empresa.id_empresa}
                  empresa={localData.empresa}
                  ficha={localData.ficha}
                  detalleEmpresa={localData.detalleEmpresa}
                  contactos={localData.contactos}
                  sucursales={localData.sucursales}
                  canEdit={canEdit}
                  onUpdated={async () => {
                    await refetchFicha();
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
                  key={localData.empresa.id_empresa}
                  empresaId={localData.empresa.id_empresa}
                  checklist={localData.checklist}
                  canEdit={canEdit}
                  onUpdated={refetchFicha}
                />
              ),
            },
            {
              key: "tecnica",
              label: "Ficha técnica",
              children: (
                <FichaTecnicaTab
                  key={localData.empresa.id_empresa}
                  empresaId={localData.empresa.id_empresa}
                  canEdit={canEdit}
                />
              ),
            },
            {
              key: "redes",
              label: "Redes / ISP",
              children: (
                <RedesTab
                  empresaId={localData.empresa.id_empresa}
                  canEdit={canEdit}
                />
              ),
            },
            {
              key: "sucursales",
              label: "Sucursales",
              children: (
                <SucursalTab
                  key={localData.empresa.id_empresa}
                  empresaId={localData.empresa.id_empresa}
                  canEdit={canEdit}
                />
              ),
            },
            {
              key: "servidores",
              label: "Servidores",
              children: (
                <ServidoresTab
                  empresaId={localData.empresa.id_empresa}
                  canEdit={canEdit}
                />
              ),
            },
            {
              key: "historial",
              label: "Historial",
              children: (
                <EntityAuditTab
                  endpoint={`/audit/empresa/${localData.empresa.id_empresa}`}
                />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  );
};

export default FichaEmpresaModal;