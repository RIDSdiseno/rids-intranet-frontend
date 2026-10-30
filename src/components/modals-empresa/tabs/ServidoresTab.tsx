// ./../modals-empresa/tabs/ServidoresTab.tsx

import React, {
  useEffect,
  useState,
} from "react";

import {
  Table,
  Button,
  Switch,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Col,
  Alert,
  Spin,
} from "antd";

import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  UserOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

import type {
  ColumnsType,
} from "antd/es/table";

import UsuariosServidorTable
  from "./UsuariosServidorTab";

import {
  http,
} from "../../../service/http";


interface Servidor {
  id:
  number;

  nombre:
  string;

  nombreUsuario:
  string;

  contrasena:
  string;

  ipExterna:
  string;

  probado:
  boolean;
}


interface Props {
  empresaId:
  number;

  canEdit?:
  boolean;
}


const ServidoresTab:
  React.FC<Props> = ({
    empresaId,
    canEdit = true,
  }) => {

    const [
      servidores,
      setServidores,
    ] =
      useState<
        Servidor[]
      >([]);

    const [
      loading,
      setLoading,
    ] =
      useState(false);

    const [
      open,
      setOpen,
    ] =
      useState(false);

    const [
      editing,
      setEditing,
    ] =
      useState<
        Servidor |
        null
      >(null);

    const [
      servidoresAplica,
      setServidoresAplica,
    ] =
      useState(true);

    const [
      loadingConfig,
      setLoadingConfig,
    ] =
      useState(true);

    const [
      savingConfig,
      setSavingConfig,
    ] =
      useState(false);

    const [
      form,
    ] =
      Form.useForm();


    /* =====================================================
       CARGAR CONFIGURACIÓN
    ===================================================== */

    const fetchConfiguracionServidores =
      async () => {

        try {

          setLoadingConfig(
            true
          );

          const {
            data,
          } =
            await http.get(
              `/ficha-empresa/${empresaId}/servidores-config`
            );

          setServidoresAplica(
            data?.data
              ?.servidoresAplica ??
            true
          );

        } catch (
        error
        ) {

          console.error(
            "Error cargando configuración de servidores:",
            error
          );

          message.error(
            "No se pudo cargar la configuración de servidores"
          );

          /*
           * Comportamiento conservador:
           * si hay error, se considera que aplica.
           */
          setServidoresAplica(
            true
          );

        } finally {

          setLoadingConfig(
            false
          );
        }
      };


    /* =====================================================
       CARGAR SERVIDORES
    ===================================================== */

    const fetchServidores =
      async () => {

        try {

          setLoading(
            true
          );

          const {
            data,
          } =
            await http.get(
              `/ficha-empresa/${empresaId}/servidores`
            );

          if (
            data.success
          ) {
            setServidores(
              data.data
            );
          }

        } catch {

          message.error(
            "Error cargando servidores"
          );

        } finally {

          setLoading(
            false
          );
        }
      };


    /* =====================================================
       EFECTOS
    ===================================================== */

    useEffect(
      () => {

        if (
          !empresaId
        ) {
          return;
        }

        void Promise.all([
          fetchConfiguracionServidores(),
          fetchServidores(),
        ]);

      },
      [
        empresaId,
      ]
    );


    /* =====================================================
       CAMBIAR SI SERVIDORES APLICA
    ===================================================== */

    const handleServidoresAplicaChange =
      async (
        checked:
          boolean
      ) => {

        if (
          !canEdit
        ) {
          return;
        }

        const valorAnterior =
          servidoresAplica;

        /*
         * Actualización optimista.
         */
        setServidoresAplica(
          checked
        );

        try {

          setSavingConfig(
            true
          );

          await http.patch(
            `/ficha-empresa/${empresaId}/servidores-config`,
            {
              servidoresAplica:
                checked,
            }
          );

          message.success(
            checked
              ? "La sección Servidores será considerada en la completitud de la ficha"
              : "La sección Servidores quedó marcada como No aplica"
          );

        } catch (
        error
        ) {

          console.error(
            "Error actualizando configuración de servidores:",
            error
          );

          /*
           * Revertir si falla.
           */
          setServidoresAplica(
            valorAnterior
          );

          message.error(
            "No se pudo actualizar la configuración de servidores"
          );

        } finally {

          setSavingConfig(
            false
          );
        }
      };


    /* =====================================================
       GUARDAR SERVIDOR
    ===================================================== */

    const handleSubmit =
      async () => {

        if (
          !canEdit
        ) {
          message.warning(
            "No tienes permisos para editar servidores"
          );

          return;
        }

        if (
          !servidoresAplica
        ) {
          message.warning(
            "La sección Servidores está marcada como No aplica"
          );

          return;
        }

        try {

          const values =
            await form
              .validateFields();

          if (
            editing
          ) {

            await http.put(
              `/ficha-empresa/servidores/${editing.id}`,
              values
            );

            message.success(
              "Servidor actualizado"
            );

          } else {

            await http.post(
              `/ficha-empresa/servidores`,
              {
                ...values,
                empresaId,
              }
            );

            message.success(
              "Servidor creado"
            );
          }

          setOpen(
            false
          );

          setEditing(
            null
          );

          form.resetFields();

          await fetchServidores();

        } catch {

          message.error(
            "Error guardando servidor"
          );
        }
      };


    /* =====================================================
       ELIMINAR
    ===================================================== */

    const handleDelete =
      async (
        id:
          number
      ) => {

        if (
          !canEdit
        ) {
          return;
        }

        try {

          await http.delete(
            `/ficha-empresa/servidores/${id}`
          );

          message.success(
            "Servidor eliminado"
          );

          await fetchServidores();

        } catch {

          message.error(
            "Error eliminando servidor"
          );
        }
      };


    /* =====================================================
       TOGGLE PROBADO
    ===================================================== */

    const toggleProbado =
      async (
        id:
          number
      ) => {

        if (
          !canEdit
        ) {
          return;
        }

        try {

          await http.patch(
            `/ficha-empresa/servidores/${id}/probado`
          );

          await fetchServidores();

        } catch {

          message.error(
            "Error actualizando estado"
          );
        }
      };


    /* =====================================================
       COLUMNAS
    ===================================================== */

    const columns:
      ColumnsType<Servidor> =
      [
        {
          title:
            "Servidor",

          dataIndex:
            "nombre",
        },

        {
          title:
            "Usuario Acceso",

          dataIndex:
            "nombreUsuario",
        },

        {
          title:
            "Contraseña",

          dataIndex:
            "contrasena",

          render:
            () =>
              "••••••••",
        },

        {
          title:
            "IP Externa",

          dataIndex:
            "ipExterna",
        },

        {
          title:
            "Probado",

          render:
            (
              _,
              record
            ) => (
              <Switch
                checked={
                  record.probado
                }

                disabled={
                  !canEdit
                }

                onChange={
                  () =>
                    toggleProbado(
                      record.id
                    )
                }
              />
            ),
        },

        ...(canEdit
          ? [
            {
              title:
                "Acciones",

              render:
                (
                  _:
                    unknown,

                  record:
                    Servidor
                ) => (
                  <div className="flex gap-2">
                    <Button
                      size="small"

                      icon={
                        <EditOutlined />
                      }

                      onClick={
                        () => {
                          setEditing(
                            record
                          );

                          form.setFieldsValue(
                            record
                          );

                          setOpen(
                            true
                          );
                        }
                      }
                    />

                    <Popconfirm
                      title="¿Eliminar servidor?"

                      onConfirm={
                        () =>
                          handleDelete(
                            record.id
                          )
                      }
                    >
                      <Button
                        size="small"

                        icon={
                          <DeleteOutlined />
                        }

                        danger
                      />
                    </Popconfirm>
                  </div>
                ),
            },
          ]
          : []),
      ];


    /* =====================================================
       RENDER
    ===================================================== */

    if (
      loadingConfig
    ) {
      return (
        <div className="flex min-h-[180px] items-center justify-center">
          <Spin />
        </div>
      );
    }


    return (
      <>
        {/* =================================================
            CONFIGURACIÓN DE LA SECCIÓN
        ================================================= */}

        <div
          className="
            mb-4
            flex
            flex-col
            gap-3
            rounded-xl
            border
            border-slate-200
            bg-slate-50/60
            p-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DesktopOutlined className="text-cyan-700" />

              <span className="font-medium text-slate-800">
                Servidores dedicados
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Indica si esta empresa utiliza servidores dedicados.
              Si seleccionas "No aplica", esta sección no se considerará
              en la completitud de la ficha.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`
                text-xs
                font-medium
                ${servidoresAplica
                  ? "text-emerald-700"
                  : "text-slate-500"
                }
              `}
            >
              {servidoresAplica
                ? "Sí aplica"
                : "No aplica"}
            </span>

            <Switch
              checked={
                servidoresAplica
              }

              disabled={
                !canEdit ||
                savingConfig
              }

              loading={
                savingConfig
              }

              onChange={
                handleServidoresAplicaChange
              }
            />
          </div>
        </div>


        {/* =================================================
            NO APLICA
        ================================================= */}

        {!servidoresAplica ? (
          <Alert
            type="info"
            showIcon

            icon={
              <InfoCircleOutlined />
            }

            message="Servidores no aplica"

            description="
              Esta empresa no utiliza servidores dedicados.
              La sección Servidores no será considerada
              en el porcentaje ni en los datos faltantes
              de la ficha.
            "
          />
        ) : (
          <>
            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-4 flex justify-between">
              <h3 className="text-lg font-semibold">
                Servidores
              </h3>

              {canEdit && (
                <Button
                  type="primary"

                  icon={
                    <PlusOutlined />
                  }

                  onClick={
                    () => {
                      setEditing(
                        null
                      );

                      form.resetFields();

                      setOpen(
                        true
                      );
                    }
                  }
                >
                  Nuevo servidor
                </Button>
              )}
            </div>


            {/* =================================================
                TABLA
            ================================================= */}

            <Table
              rowKey="id"

              columns={
                columns
              }

              dataSource={
                servidores
              }

              loading={
                loading
              }

              pagination={
                false
              }

              expandable={{
                expandedRowRender:
                  (
                    record
                  ) => (
                    <UsuariosServidorTable
                      servidorId={
                        record.id
                      }

                      canEdit={
                        canEdit
                      }
                    />
                  ),
              }}
            />
          </>
        )}


        {/* =================================================
            MODAL
        ================================================= */}

        {canEdit && (
          <Modal
            title={
              <span>
                <DesktopOutlined
                  style={{
                    marginRight:
                      8,
                  }}
                />

                {editing
                  ? "Editar Servidor"
                  : "Nuevo Servidor"}
              </span>
            }

            open={
              open
            }

            onCancel={
              () => {
                setOpen(
                  false
                );

                setEditing(
                  null
                );

                form.resetFields();
              }
            }

            footer={[
              <Button
                key="cancel"

                onClick={
                  () => {
                    setOpen(
                      false
                    );

                    setEditing(
                      null
                    );

                    form.resetFields();
                  }
                }
              >
                Cancelar
              </Button>,

              <Button
                key="submit"

                type="primary"

                icon={
                  <CheckCircleOutlined />
                }

                onClick={
                  handleSubmit
                }
              >
                {editing
                  ? "Actualizar"
                  : "Crear"}
              </Button>,
            ]}

            width={
              600
            }
          >
            <Form
              form={
                form
              }

              layout="vertical"
            >
              <Row
                gutter={
                  16
                }
              >
                <Col
                  span={
                    12
                  }
                >
                  <Form.Item
                    name="nombre"

                    label="Nombre del Servidor"

                    rules={[
                      {
                        required:
                          true,

                        message:
                          "Campo obligatorio",
                      },
                    ]}
                  >
                    <Input
                      prefix={
                        <DesktopOutlined />
                      }

                      placeholder="Ej: Servidor Principal"
                    />
                  </Form.Item>
                </Col>

                <Col
                  span={
                    12
                  }
                >
                  <Form.Item
                    name="nombreUsuario"

                    label="Nombre Usuario"

                    rules={[
                      {
                        required:
                          true,

                        message:
                          "Campo obligatorio",
                      },
                    ]}
                  >
                    <Input
                      prefix={
                        <UserOutlined />
                      }

                      placeholder="Ej: admin"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row
                gutter={
                  16
                }
              >
                <Col
                  span={
                    12
                  }
                >
                  <Form.Item
                    name="contrasena"

                    label="Contraseña"

                    rules={[
                      {
                        required:
                          true,

                        message:
                          "Campo obligatorio",
                      },
                    ]}
                  >
                    <Input.Password
                      placeholder="••••••••"
                    />
                  </Form.Item>
                </Col>

                <Col
                  span={
                    12
                  }
                >
                  <Form.Item
                    name="ipExterna"

                    label="IP Externa"

                    rules={[
                      {
                        required:
                          true,

                        message:
                          "Campo obligatorio",
                      },
                    ]}
                  >
                    <Input
                      prefix={
                        <GlobalOutlined />
                      }

                      placeholder="Ej: 192.168.1.100"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>
        )}
      </>
    );
  };


export default ServidoresTab;