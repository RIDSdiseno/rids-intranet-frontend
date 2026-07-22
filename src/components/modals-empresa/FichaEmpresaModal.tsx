// ./src/components/modals-empresa/FichaEmpresaModal.tsx
import React from "react";
import { Drawer, Tabs } from "antd";

import FichaTab from "./tabs/FichaTab";
import ChecklistTab from "./tabs/ChecklistTab";
import FichaTecnicaTab from "./tabs/FichaTecnicaTab";
import SucursalTab from "./tabs/SucursalTab";
import ServidoresTab from "./tabs/ServidoresTab";
import RedesTab from "./tabs/RedesTab";

import type {
  FichaEmpresaModalProps,
  FichaEmpresaCompleta,
} from "./types";

import { http } from "../../service/http";

const FichaEmpresaModal: React.FC<
  FichaEmpresaModalProps
> = ({
  open,
  onClose,
  empresa,
  loading,
  onUpdated,
  canEdit = true,
}) => {
    const [activeTab, setActiveTab] =
      React.useState("ficha");

    const [localData, setLocalData] =
      React.useState<FichaEmpresaCompleta | null>(
        null
      );

    React.useEffect(() => {
      if (!open || !empresa) {
        return;
      }

      let cancelled = false;

      const loadFichaCompleta = async () => {
        try {
          const { data } = await http.get(
            `/ficha-empresa/${empresa.id_empresa}/completa`
          );

          if (cancelled || !data?.empresa) {
            return;
          }

          setLocalData({
            ...data,
            empresa: {
              ...data.empresa,
              isActive:
                typeof data.empresa.isActive ===
                  "boolean"
                  ? data.empresa.isActive
                  : empresa.isActive,
              deactivatedAt:
                data.empresa.deactivatedAt ??
                empresa.deactivatedAt ??
                null,
            },
          });
        } catch (error) {
          console.error(
            "Error cargando ficha completa:",
            error
          );
        }
      };

      void loadFichaCompleta();

      return () => {
        cancelled = true;
      };
    }, [open, empresa]);

    React.useEffect(() => {
      if (!open) {
        setActiveTab("ficha");
        setLocalData(null);
      }
    }, [open]);

    const refetchFicha = async () => {
      if (!localData?.empresa) {
        return;
      }

      const empresaActual = localData.empresa;

      try {
        const { data } = await http.get(
          `/ficha-empresa/${empresaActual.id_empresa}/completa`
        );

        if (!data?.empresa) {
          return;
        }

        setLocalData({
          ...data,
          empresa: {
            ...data.empresa,
            isActive:
              typeof data.empresa.isActive ===
                "boolean"
                ? data.empresa.isActive
                : empresaActual.isActive,
            deactivatedAt:
              data.empresa.deactivatedAt ??
              empresaActual.deactivatedAt ??
              null,
          },
        });
      } catch (error) {
        console.error(
          "Error actualizando ficha completa:",
          error
        );
      }
    };

    const canEditLocal =
      canEdit &&
      localData?.empresa?.isActive !== false;

    if (!open) {
      return null;
    }

    return (
      <Drawer
        open={open}
        onClose={onClose}
        width={1200}
        destroyOnClose={false}
        title={`Ficha Empresa · ${localData?.empresa?.nombre ??
          empresa?.nombre ??
          ""
          }`}
      >
        {!localData || loading ? (
          <div className="p-6 text-slate-500">
            Cargando ficha de la empresa…
          </div>
        ) : (
          <>
            {localData.empresa.isActive === false && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="font-semibold">
                  Empresa inactiva
                </div>

                <div className="mt-1">
                  La información permanece disponible
                  para consulta histórica, pero no se
                  permiten modificaciones hasta reactivar
                  la empresa.
                </div>

                {localData.empresa.deactivatedAt && (
                  <div className="mt-1 text-xs">
                    Desactivada el{" "}
                    {new Date(
                      localData.empresa.deactivatedAt
                    ).toLocaleDateString("es-CL")}
                  </div>
                )}
              </div>
            )}

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "ficha",
                  label: "Cliente",
                  children: (
                    <FichaTab
                      key={
                        localData.empresa.id_empresa
                      }
                      empresa={localData.empresa}
                      ficha={localData.ficha}
                      detalleEmpresa={
                        localData.detalleEmpresa
                      }
                      contactos={
                        localData.contactos
                      }
                      sucursales={
                        localData.sucursales
                      }
                      canEdit={canEditLocal}
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
                      key={
                        localData.empresa.id_empresa
                      }
                      empresaId={
                        localData.empresa.id_empresa
                      }
                      checklist={
                        localData.checklist
                      }
                      canEdit={canEditLocal}
                      onUpdated={refetchFicha}
                    />
                  ),
                },
                {
                  key: "tecnica",
                  label: "Ficha técnica",
                  children: (
                    <FichaTecnicaTab
                      key={
                        localData.empresa.id_empresa
                      }
                      empresaId={
                        localData.empresa.id_empresa
                      }
                      canEdit={canEditLocal}
                    />
                  ),
                },
                {
                  key: "redes",
                  label: "Redes / ISP",
                  children: (
                    <RedesTab
                      empresaId={
                        localData.empresa.id_empresa
                      }
                      canEdit={canEditLocal}
                    />
                  ),
                },
                {
                  key: "sucursales",
                  label: "Sucursales",
                  children: (
                    <SucursalTab
                      key={
                        localData.empresa.id_empresa
                      }
                      empresaId={
                        localData.empresa.id_empresa
                      }
                      canEdit={canEditLocal}
                    />
                  ),
                },
                {
                  key: "servidores",
                  label: "Servidores",
                  children: (
                    <ServidoresTab
                      empresaId={
                        localData.empresa.id_empresa
                      }
                      canEdit={canEditLocal}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
    );
  };

export default FichaEmpresaModal;
