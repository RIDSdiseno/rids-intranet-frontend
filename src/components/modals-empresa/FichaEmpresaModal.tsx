// ./src/components/modals-empresa/FichaEmpresaModal.tsx
import React from "react";
import { Button, Drawer, Tabs, message } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";

import FichaTab from "./tabs/FichaTab";
import ChecklistTab from "./tabs/ChecklistTab";
import FichaTecnicaTab from "./tabs/FichaTecnicaTab";
import SucursalTab from "./tabs/SucursalTab";
import ServidoresTab from "./tabs/ServidoresTab";
import RedesTab from "./tabs/RedesTab";
import EmpresaEntidadTab from "./tabs/EmpresaEntidadTab";

import TelefoniaTab from "./tabs/TelefoniaTab";
import { useAuth } from "../hooks/useAuth";

/* NUEVO */
import SuscripcionesContratosTab
  from "./tabs/SuscripcionesContratosTab";

import type {
  FichaEmpresaModalProps,
  FichaEmpresaCompleta,
} from "./types";

import { http } from "../../service/http";

/** Pestañas que se pueden abrir directamente (p. ej. desde la campana). */
const TABS_FICHA = [
  "ficha",
  "suscripciones",
  "checklist",
  "tecnica",
  "redes",
  "sucursales",
  "servidores",
  "telefonia",
];

const FichaEmpresaModal: React.FC<
  FichaEmpresaModalProps & {
    /** Pestaña con la que se abre la ficha. Por defecto "ficha". */
    tabInicial?: string | undefined;
  }
> = ({
  open,
  onClose,
  empresa,
  loading,
  onUpdated,
  canEdit = true,
  canViewEntidadRelation = false,
  canManageEntidadRelation = false,
  tabInicial,
}) => {
    const [activeTab, setActiveTab] =
      React.useState("ficha");

    /* Telefonía guarda contraseñas: mismos roles que acepta el backend */
    const { user } = useAuth();

    const puedeVerTelefonia =
      ["ADMIN", "ADMINISTRACION", "TECNICO"].includes(
        String(user?.rol ?? "")
      );

    const [exportandoPdf, setExportandoPdf] =
      React.useState(false);

    const exportarPdf = async () => {
      const empresaId =
        localData?.empresa?.id_empresa ??
        empresa?.id_empresa;

      if (!empresaId) {
        return;
      }

      setExportandoPdf(true);

      try {
        const res = await http.get(
          `/ficha-empresa/${empresaId}/pdf`,
          { responseType: "blob" }
        );

        /* Nombre que manda el backend; si CORS no expone el header, se arma aquí */
        const disposition = String(
          res.headers?.["content-disposition"] ?? ""
        );

        const nombreEmpresa = String(
          localData?.empresa?.nombre ??
          empresa?.nombre ??
          empresaId
        )
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]+/g, "_");

        const nombreArchivo =
          /filename="([^"]+)"/.exec(disposition)?.[1] ??
          `Ficha_${nombreEmpresa}_${new Date().toISOString().slice(0, 10)}.pdf`;

        const url = URL.createObjectURL(
          new Blob([res.data], { type: "application/pdf" })
        );

        const link = document.createElement("a");
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error exportando ficha a PDF:", error);
        message.error("No se pudo generar el PDF de la ficha");
      } finally {
        setExportandoPdf(false);
      }
    };

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

    React.useEffect(() => {
      if (
        open &&
        tabInicial &&
        TABS_FICHA.includes(tabInicial) &&
        (tabInicial !== "telefonia" || puedeVerTelefonia)
      ) {
        setActiveTab(tabInicial);
      }
    }, [open, tabInicial, puedeVerTelefonia]);

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

    const canManageEntidadRelationLocal =
      canManageEntidadRelation &&
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
        extra={
          <Button
            icon={<FilePdfOutlined />}
            loading={exportandoPdf}
            disabled={!localData}
            onClick={() => void exportarPdf()}
          >
            Exportar PDF
          </Button>
        }
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
                  para consulta, pero no se permiten
                  modificaciones hasta reactivar la
                  empresa.
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

                ...(canViewEntidadRelation
                  ? [
                    {
                      key: "relacion-comercial",
                      label: "Relación comercial",
                      children: (
                        <EmpresaEntidadTab
                          key={
                            localData.empresa.id_empresa
                          }

                          empresaId={
                            localData.empresa.id_empresa
                          }

                          empresaNombre={
                            localData.empresa.nombre
                          }

                          canManage={
                            canManageEntidadRelationLocal
                          }
                        />
                      ),
                    },
                  ]
                  : []),

                /* =====================================================
                   SUSCRIPCIONES Y CONTRATOS
                ===================================================== */

                {
                  key: "suscripciones",
                  label: "Suscripciones y Contratos",
                  children: (
                    <SuscripcionesContratosTab
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

                ...(puedeVerTelefonia
                  ? [
                    {
                      key: "telefonia",
                      label: "Telefonía",
                      children: (
                        <TelefoniaTab
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
                  ]
                  : []),

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