// src/host/Mailer.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ReloadOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  MailOutlined,
  UserOutlined,
  BankOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  FileImageOutlined,
  EditOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

import {
  Modal,
  notification,
} from "antd";

import {
  getCache,
  setCache,
} from "../lib/localCache";

import {
  enviarCorreoMasivo,
  getEmpresasMailer,
  getEstadoEnvioMasivo,
  getSolicitantesMailer,
  getTecnicosMailer,
  getFirmaRemitente
} from "../components/modals-mailer/mailer.api";

import type {
  EmpresaMailer,
  MailerAttachment,
  MailerContentMode,
  MailerTarget,
  PlantillaCorreoDetalle,
  SendMode,
  SolicitanteMailer,
  TecnicoMailer,
  FirmaRemitenteMailer
} from "../components/modals-mailer/mailer.types";

import MailerPlantillasModal from "../components/modals-mailer/MailerPlantillasModal";


// =====================================================
// HELPERS
// =====================================================

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isValidEmail = (
  email?:
    string |
    null
) =>
  typeof email ===
  "string" &&
  EMAIL_RE.test(
    email.trim()
  );


const EXCLUDED_EMPRESAS =
  /infinet|vprime|v\.?prime|t[-\s]?sales/i;


const DEFAULT_CONTENT =
  "<p>Escribe aquí el contenido de tu mensaje...</p>";


// =====================================================
// LOGO
// =====================================================

async function embedLogoInHtml(
  html: string
): Promise<string> {

  try {

    if (
      !html.includes(
        "/img/splash.png"
      )
    ) {
      return html;
    }

    const response =
      await fetch(
        "/img/splash.png"
      );

    if (
      !response.ok
    ) {
      return html;
    }

    const blob =
      await response.blob();

    const dataUrl =
      await new Promise<string>(
        (
          resolve,
          reject
        ) => {

          const reader =
            new FileReader();

          reader.onloadend =
            () =>
              resolve(
                reader.result as string
              );

          reader.onerror =
            reject;

          reader.readAsDataURL(
            blob
          );
        }
      );

    return html.replace(
      /src=["']\/img\/splash\.png["']/g,
      `src="${dataUrl}"`
    );

  } catch {

    return html;
  }
}


// =====================================================
// TEMPLATE RIDS
// =====================================================

function wrapInTemplate(
  contentHtml: string
): string {

  const safeLogoUrl =
    "/img/splash.png";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width,initial-scale=1.0"
    >
    <title>Mensaje RIDS</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background-color:#f0f6f9;
        font-family:Arial,Helvetica,sans-serif;
    "
>
<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color:#f0f6f9;"
>
    <tr>
        <td
            align="center"
            style="padding:28px 16px;"
        >
            <table
                width="600"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:600px;
                    width:100%;
                    background-color:#ffffff;
                    border-radius:12px;
                    overflow:hidden;
                    border:1px solid #e2f0f5;
                "
            >

                <tr>
                    <td
                        style="
                            background-color:#0891b2;
                            padding:22px 28px;
                        "
                    >
                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                        >
                            <tr>
                                <td
                                    width="52"
                                    valign="middle"
                                >
                                    <img
                                        src="${safeLogoUrl}"
                                        alt="RIDS"
                                        width="44"
                                        height="44"
                                        style="
                                            display:block;
                                            width:44px;
                                            height:44px;
                                            object-fit:contain;
                                            border-radius:6px;
                                            background:#fff;
                                            padding:3px;
                                        "
                                    />
                                </td>

                                <td
                                    valign="middle"
                                    style="padding-left:12px;"
                                >
                                    <div
                                        style="
                                            font-size:17px;
                                            font-weight:700;
                                            color:#ffffff;
                                            line-height:1.2;
                                        "
                                    >
                                        RIDS
                                    </div>

                                    <div
                                        style="
                                            font-size:11px;
                                            color:rgba(255,255,255,0.85);
                                            margin-top:2px;
                                        "
                                    >
                                        Plataforma de gestión
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td
                        style="
                            padding:28px 28px 20px;
                            color:#374151;
                            font-size:14px;
                            line-height:1.65;
                        "
                    >
                        ${contentHtml}

                    </td>
                </tr>

                <tr>
                    <td
                        style="
                            border-top:1px solid #e2f0f5;
                            background-color:#f8fbfd;
                            padding:14px 28px;
                        "
                    >
                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                        >
                            <tr>
                                <td
                                    style="
                                        font-size:11px;
                                        color:#94a3b8;
                                    "
                                >
                                    © RIDS · Plataforma de gestión
                                </td>

                                <td
                                    align="right"
                                    style="
                                        font-size:11px;
                                        color:#cbd5e1;
                                    "
                                >
                                    Si no esperabas este mensaje, ignóralo.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>
</body>
</html>
`.trim();
}


// =====================================================
// COMPONENTE
// =====================================================

export default function Mailer() {

  const [
    modal,
    contextHolder,
  ] =
    Modal.useModal();

  // =================================================
  // DESTINATARIOS
  // =================================================

  const [
    solicitantes,
    setSolicitantes,
  ] =
    useState<
      SolicitanteMailer[]
    >(
      []
    );

  const [
    empresas,
    setEmpresas,
  ] =
    useState<
      EmpresaMailer[]
    >(
      []
    );

  const [
    tecnicos,
    setTecnicos,
  ] =
    useState<
      TecnicoMailer[]
    >(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    selected,
    setSelected,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >(
      {}
    );

  const [
    selectAll,
    setSelectAll,
  ] =
    useState(
      false
    );

  const [
    empresaId,
    setEmpresaId,
  ] =
    useState<
      number |
      null
    >(
      null
    );

  const [
    showTecnicos,
    setShowTecnicos,
  ] =
    useState(
      false
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  // =================================================
  // COMPOSICIÓN
  // =================================================

  const [
    firmaRemitente,
    setFirmaRemitente,
  ] =
    useState<
      FirmaRemitenteMailer |
      null
    >(
      null
    );


  const [
    loadingFirmaRemitente,
    setLoadingFirmaRemitente,
  ] =
    useState(
      false
    );

  const [
    subject,
    setSubject,
  ] =
    useState(
      "Mensaje desde RIDS"
    );

  const [
    content,
    setContent,
  ] =
    useState(
      DEFAULT_CONTENT
    );

  const [
    editHtml,
    setEditHtml,
  ] =
    useState(
      false
    );

  const [
    contentMode,
    setContentMode,
  ] =
    useState<MailerContentMode>(
      "EDITOR"
    );

  const editorRef =
    useRef<
      HTMLDivElement |
      null
    >(
      null
    );

  const isTypingRef =
    useRef(
      false
    );

  const [
    showPreview,
    setShowPreview,
  ] =
    useState(
      false
    );

  const [
    isSending,
    setIsSending,
  ] =
    useState(
      false
    );

  const [
    sendingJobId,
    setSendingJobId,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    sendingProgress,
    setSendingProgress,
  ] =
    useState({
      total: 0,
      completed: 0,
      successes: 0,
      failures: 0,
    });

  const [
    sendingMessage,
    setSendingMessage,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  // =================================================
  // ADJUNTOS
  // =================================================

  const [
    attachments,
    setAttachments,
  ] =
    useState<
      MailerAttachment[]
    >(
      []
    );

  const fileInputRef =
    useRef<
      HTMLInputElement |
      null
    >(
      null
    );


  // =================================================
  // PLANTILLAS
  // =================================================

  const [
    plantillasModalOpen,
    setPlantillasModalOpen,
  ] =
    useState(
      false
    );

  const [
    plantillaSeleccionada,
    setPlantillaSeleccionada,
  ] =
    useState<
      PlantillaCorreoDetalle |
      null
    >(
      null
    );

  // =================================================
  // HTML RIDS
  // =================================================

  const fullHtml =
    useMemo(
      () =>
        wrapInTemplate(
          content
        ),
      [
        content,
      ]
    );


  // =================================================
  // SOLICITANTES
  // =================================================

  const loadSolicitantes =
    useCallback(
      async (
        empresaFilter?:
          number |
          null
      ) => {

        setLoading(
          true
        );

        setError(
          null
        );

        try {

          const items =
            await getSolicitantesMailer(
              empresaFilter
            );

          const cleaned =
            items
              .filter(
                (
                  item
                ) =>
                  item.isActive !==
                  false
              )
              .filter(
                (
                  item
                ) =>
                  typeof item.nombre ===
                  "string" &&
                  item.nombre
                    .trim() !==
                  ""
              )
              .filter(
                (
                  item
                ) =>
                  isValidEmail(
                    item.email
                  )
              )
              .filter(
                (
                  item
                ) =>
                  !EXCLUDED_EMPRESAS
                    .test(
                      item.empresa
                        ?.nombre ??
                      ""
                    )
              );

          setSolicitantes(
            cleaned
          );

          const selection:
            Record<
              number,
              boolean
            > =
            {};

          cleaned.forEach(
            (
              item
            ) => {

              selection[
                item.id_solicitante
              ] =
                false;
            }
          );

          setSelected(
            selection
          );

          setSelectAll(
            false
          );

        } catch (
        err: any
        ) {

          setError(
            err?.response
              ?.data
              ?.error ??
            err?.response
              ?.data
              ?.message ??
            err?.message ??
            String(
              err
            )
          );

        } finally {

          setLoading(
            false
          );
        }
      },
      []
    );


  // =================================================
  // EMPRESAS
  // =================================================

  const loadEmpresas =
    useCallback(
      async (
        force =
          false
      ) => {

        if (
          !force
        ) {

          const cached =
            getCache<
              EmpresaMailer[]
            >(
              "empresas"
            );

          if (
            cached &&
            Array.isArray(
              cached
            )
          ) {

            setEmpresas(
              cached
            );

            return;
          }
        }

        const items =
          await getEmpresasMailer();

        const cleaned =
          items.filter(
            (
              empresa
            ) =>
              !EXCLUDED_EMPRESAS
                .test(
                  empresa.nombre
                )
          );

        setEmpresas(
          cleaned
        );

        setCache(
          "empresas",
          cleaned,
          24 *
          60 *
          60 *
          1000
        );
      },
      []
    );


  // =================================================
  // TÉCNICOS
  // =================================================

  const loadTecnicos =
    useCallback(
      async () => {

        const items =
          await getTecnicosMailer();

        setTecnicos(
          items
        );
      },
      []
    );

  // =================================================
  // FIRMA REMITENTE
  // =================================================

  const loadFirmaRemitente =
    useCallback(
      async () => {

        try {

          setLoadingFirmaRemitente(
            true
          );


          const firma =
            await getFirmaRemitente();


          setFirmaRemitente(
            firma
          );

        } catch (
        error: any
        ) {

          console.error(
            "[Mailer] Error cargando firma:",
            error
          );


          setFirmaRemitente(
            null
          );

        } finally {

          setLoadingFirmaRemitente(
            false
          );
        }
      },
      []
    );

  const previewEditorHtml =
    useMemo(
      () => {

        if (
          !firmaRemitente?.html
        ) {
          return fullHtml;
        }

        return fullHtml.replace(
          "</body>",
          `${firmaRemitente.html}</body>`
        );

      },
      [
        fullHtml,
        firmaRemitente,
      ]
    );


  // =================================================
  // CARGA INICIAL
  // =================================================

  useEffect(
    () => {

      void loadEmpresas()
        .catch(
          () =>
            undefined
        );

      void loadTecnicos()
        .catch(
          () =>
            undefined
        );

      void loadFirmaRemitente()
        .catch(
          () =>
            undefined
        );

    },
    [
      loadEmpresas,
      loadTecnicos,
      loadFirmaRemitente,
    ]
  );

  useEffect(
    () => {

      void loadSolicitantes(
        empresaId
      );

    },
    [
      loadSolicitantes,
      empresaId,
    ]
  );


  // =================================================
  // RELOAD
  // =================================================

  const reload =
    async () => {

      await Promise.allSettled([
        loadSolicitantes(
          empresaId
        ),

        loadEmpresas(
          true
        ),

        loadTecnicos(),

        loadFirmaRemitente(),

      ]);
    };


  // =================================================
  // SELECCIÓN
  // =================================================

  const selectedCount =
    useMemo(
      () =>
        Object
          .values(
            selected
          )
          .filter(
            Boolean
          )
          .length,
      [
        selected,
      ]
    );


  const filtered =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();

        if (
          !query
        ) {
          return solicitantes;
        }

        return solicitantes.filter(
          (
            item
          ) =>
            String(
              item.nombre ??
              ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||

            String(
              item.email ??
              ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||

            String(
              item.empresa
                ?.nombre ??
              ""
            )
              .toLowerCase()
              .includes(
                query
              )
        );
      },
      [
        search,
        solicitantes,
      ]
    );


  const rows =
    useMemo(
      () => {

        if (
          showTecnicos
        ) {

          return tecnicos
            .filter(
              (
                tecnico
              ) =>
                isValidEmail(
                  tecnico.email
                )
            )
            .map(
              (
                tecnico
              ) => ({
                id:
                  -tecnico.id_tecnico,

                nombre:
                  tecnico.nombre,

                email:
                  tecnico.email ??
                  null,

                empresa:
                  null,

                isActive:
                  true,
              })
            );
        }

        return filtered.map(
          (
            solicitante
          ) => ({
            id:
              solicitante
                .id_solicitante,

            nombre:
              solicitante
                .nombre,

            email:
              solicitante
                .email ??
              null,

            empresa:
              solicitante
                .empresa ??
              null,

            isActive:
              solicitante
                .isActive,
          })
        );
      },
      [
        showTecnicos,
        tecnicos,
        filtered,
      ]
    );


  function toggleOne(
    id: number
  ) {

    setSelected(
      (
        current
      ) => ({
        ...current,

        [id]:
          !current[id],
      })
    );
  }


  function toggleAll() {

    setSelectAll(
      (
        current
      ) => {

        const next =
          !current;

        const output:
          Record<
            number,
            boolean
          > =
          {};

        rows.forEach(
          (
            row
          ) => {

            output[
              row.id
            ] =
              next;
          }
        );

        setSelected(
          output
        );

        return next;
      }
    );
  }


  // =================================================
  // LIMPIAR
  // =================================================

  function handleClear() {

    setSearch(
      ""
    );

    const output:
      Record<
        number,
        boolean
      > =
      {};

    rows.forEach(
      (
        row
      ) => {

        output[
          row.id
        ] =
          false;
      }
    );

    setSelected(
      output
    );

    setSelectAll(
      false
    );

    setSubject(
      "Mensaje desde RIDS"
    );

    setContent(
      DEFAULT_CONTENT
    );

    setAttachments(
      []
    );

    setContentMode(
      "EDITOR"
    );

    setPlantillaSeleccionada(
      null
    );

    if (
      editorRef.current
    ) {
      editorRef.current.innerHTML =
        DEFAULT_CONTENT;
    }

  }


  // =================================================
  // EDITOR
  // =================================================

  function insertList(
    ordered: boolean
  ) {

    const editor =
      editorRef.current;

    if (
      !editor
    ) {
      return;
    }

    const tag =
      ordered
        ? "ol"
        : "ul";

    const selection =
      window.getSelection();

    if (
      selection &&
      selection.rangeCount >
      0
    ) {

      let node:
        Node |
        null =
        selection
          .getRangeAt(
            0
          )
          .commonAncestorContainer;

      while (
        node &&
        node !== editor
      ) {

        if (
          node.nodeName ===
          tag.toUpperCase()
        ) {

          const list =
            node as HTMLElement;

          const fragment =
            document
              .createDocumentFragment();

          list
            .querySelectorAll(
              "li"
            )
            .forEach(
              (
                item
              ) => {

                const paragraph =
                  document
                    .createElement(
                      "p"
                    );

                paragraph.innerHTML =
                  item.innerHTML ||
                  "<br>";

                fragment.appendChild(
                  paragraph
                );
              }
            );

          list
            .parentNode
            ?.replaceChild(
              fragment,
              list
            );

          setContent(
            editor.innerHTML
          );

          return;
        }

        node =
          node.parentNode;
      }
    }

    const list =
      document
        .createElement(
          tag
        );

    const item =
      document
        .createElement(
          "li"
        );

    item.appendChild(
      document
        .createElement(
          "br"
        )
    );

    list.appendChild(
      item
    );

    editor.appendChild(
      list
    );

    editor.focus();

    const range =
      document
        .createRange();

    range.setStart(
      item,
      0
    );

    range.collapse(
      true
    );

    const selectionNext =
      window.getSelection();

    if (
      selectionNext
    ) {

      selectionNext
        .removeAllRanges();

      selectionNext
        .addRange(
          range
        );
    }

    setContent(
      editor.innerHTML
    );
  }


  useEffect(
    () => {

      const element =
        editorRef.current;

      if (
        !element ||
        isTypingRef.current
      ) {
        return;
      }

      if (
        element.innerHTML !==
        content
      ) {
        element.innerHTML =
          content;
      }

    },
    [
      content,
      showPreview,
      contentMode,
    ]
  );


  // =================================================
  // DESTINATARIOS FINALES
  // =================================================

  const selectedTargets =
    useMemo<
      MailerTarget[]
    >(
      () => {

        const allCandidates = [
          ...solicitantes.map(
            (
              item
            ) => ({
              id:
                item.id_solicitante,

              nombre:
                item.nombre,

              email:
                item.email ??
                null,
            })
          ),

          ...tecnicos.map(
            (
              item
            ) => ({
              id:
                -item.id_tecnico,

              nombre:
                item.nombre,

              email:
                item.email ??
                null,
            })
          ),
        ];

        return allCandidates
          .filter(
            (
              candidate
            ) =>
              selected[
              candidate.id
              ] &&
              isValidEmail(
                candidate.email
              )
          )
          .map(
            (
              candidate
            ) => ({
              id:
                candidate.id,

              nombre:
                candidate.nombre,

              email:
                candidate.email!,
            })
          );
      },
      [
        solicitantes,
        tecnicos,
        selected,
      ]
    );

  function mostrarResultadoEnvio({
    successes,
    failures,
  }: {
    successes: number;
    failures: Array<{
      to?: string;
      error: string;
    }>;
  }) {

    const total =
      successes +
      failures.length;

    if (
      failures.length ===
      0
    ) {

      modal.success({
        title:
          "Envío completado",

        content: (
          <div className="mt-3 space-y-2">

            <p className="text-sm text-slate-600">
              El proceso de envío terminó correctamente.
            </p>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

              <p className="text-sm font-semibold text-emerald-700">
                ✓ {successes} correo
                {successes !== 1
                  ? "s"
                  : ""} enviado
                {successes !== 1
                  ? "s"
                  : ""} correctamente
              </p>

            </div>

          </div>
        ),

        okText:
          "Aceptar",

        centered:
          true,
      });

      return;
    }


    if (
      successes >
      0
    ) {

      const detalle =
        failures
          .slice(
            0,
            5
          )
          .map(
            (
              failure
            ) =>
              `${failure.to ?? "Sin destinatario"}: ${failure.error}`
          );

      modal.warning({
        title:
          "Envío completado con observaciones",

        content: (
          <div className="mt-3 space-y-3">

            <p className="text-sm text-slate-600">
              El envío terminó, pero algunos destinatarios presentaron errores.
            </p>


            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

                <p className="text-xs font-medium text-emerald-600">
                  Enviados
                </p>

                <p className="mt-1 text-xl font-black text-emerald-700">
                  {successes}
                </p>

              </div>


              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

                <p className="text-xs font-medium text-amber-600">
                  Fallidos
                </p>

                <p className="mt-1 text-xl font-black text-amber-700">
                  {failures.length}
                </p>

              </div>

            </div>


            {detalle.length >
              0 && (

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                    Detalle
                  </p>

                  <div className="space-y-1">

                    {detalle.map(
                      (
                        item,
                        index
                      ) => (
                        <p
                          key={
                            `${item}-${index}`
                          }
                          className="break-all text-xs text-red-600"
                        >
                          {item}
                        </p>
                      )
                    )}

                  </div>

                  {failures.length >
                    5 && (

                      <p className="mt-2 text-xs text-slate-400">
                        Y {failures.length - 5} error(es) adicional(es).
                      </p>

                    )}

                </div>

              )}

          </div>
        ),

        okText:
          "Aceptar",

        centered:
          true,
      });

      return;
    }


    modal.error({
      title:
        "No fue posible completar el envío",

      content: (
        <div className="mt-3 space-y-3">

          <p className="text-sm text-slate-600">
            Ninguno de los {total} correo
            {total !== 1
              ? "s"
              : ""} pudo enviarse.
          </p>


          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">

            <p className="text-sm font-semibold text-red-700">
              ✕ {failures.length} envío
              {failures.length !== 1
                ? "s"
                : ""} fallido
              {failures.length !== 1
                ? "s"
                : ""}
            </p>

          </div>


          <div className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">

            {failures
              .slice(
                0,
                5
              )
              .map(
                (
                  failure,
                  index
                ) => (
                  <p
                    key={
                      index
                    }
                    className="mb-1 break-all text-xs text-red-600"
                  >
                    {failure.to ??
                      "Sin destinatario"}
                    :{" "}
                    {failure.error}
                  </p>
                )
              )}

          </div>

        </div>
      ),

      okText:
        "Aceptar",

      centered:
        true,
    });
  }

  async function esperarFinalizacionJob(
    jobId: string
  ) {

    setSendingJobId(
      jobId
    );

    setSendingMessage(
      "Enviando correos..."
    );

    try {

      while (true) {

        const job =
          await getEstadoEnvioMasivo(
            jobId
          );

        setSendingProgress({
          total:
            job.total,

          completed:
            job.completed,

          successes:
            job.successes.length,

          failures:
            job.failures.length,
        });

        if (
          job.status ===
          "done"
        ) {

          setSendingProgress({
            total:
              job.total,

            completed:
              job.total,

            successes:
              job.successes.length,

            failures:
              job.failures.length,
          });

          setSendingMessage(
            "Envío finalizado"
          );


          // Cerramos primero el modal de envío
          setShowPreview(
            false
          );


          // Mostramos el resultado final
          mostrarResultadoEnvio({
            successes:
              job.successes.length,

            failures:
              job.failures,
          });

          return;
        }


        setSendingMessage(
          `Enviando ${job.completed} de ${job.total}...`
        );

        await new Promise(
          (
            resolve
          ) =>
            setTimeout(
              resolve,
              1200
            )
        );
      }

    } catch (
    error: any
    ) {

      setShowPreview(
        false
      );

      modal.error({
        title:
          "Error consultando el envío",

        content:
          error?.response
            ?.data
            ?.message ??
          error?.message ??
          "No fue posible consultar el estado final del envío.",

        okText:
          "Aceptar",

        centered:
          true,
      });

    } finally {

      setSendingJobId(
        null
      );

      setSendingMessage(
        null
      );
    }
  }


  // =================================================
  // ENVÍO
  // =================================================

  async function handleSend(
    mode: SendMode
  ) {

    if (
      selectedTargets.length ===
      0
    ) {

      notification.warning({
        message:
          "Sin destinatarios",

        description:
          "Selecciona al menos un destinatario con email válido.",
      });

      return;
    }

    if (
      !subject.trim()
    ) {

      notification.warning({
        message:
          "Asunto requerido",

        description:
          "Debes ingresar un asunto para el correo.",
      });

      return;
    }


    if (
      contentMode ===
      "PLANTILLA" &&
      !plantillaSeleccionada
    ) {

      notification.warning({
        message:
          "Plantilla requerida",

        description:
          "Selecciona una plantilla antes de enviar.",
      });

      return;
    }

    setSendingProgress({
      total:
        selectedTargets.length,

      completed:
        0,

      successes:
        0,

      failures:
        0,
    });

    setSendingMessage(
      "Preparando envío..."
    );


    setIsSending(
      true
    );

    try {

      if (
        contentMode ===
        "PLANTILLA" &&
        plantillaSeleccionada
      ) {

        const data =
          await enviarCorreoMasivo({
            targets:
              selectedTargets,

            subject:
              subject.trim(),

            plantillaId:
              plantillaSeleccionada.id,

            attachments,
          });

        if (
          data?.queued &&
          data?.jobId
        ) {

          notification.info({
            message:
              "Envío iniciado",

            description:
              `${data.queuedCount ?? selectedTargets.length} correo(s) fueron agregados a la cola.`,

            duration:
              4,
          });

          await esperarFinalizacionJob(
            data.jobId
          );

          return;
        }

        handleSendResponse(
          data
        );

        return;

      }


      const rawHtml =
        mode ===
          "html"
          ? fullHtml
          : `
<p
    style="
        font-family:Arial,sans-serif;
        font-size:14px;
        color:#374151;
        line-height:1.65;
    "
>
    ${content.replace(
            /\n/g,
            "<br/>"
          )}
</p>
`.trim();

      const bodyHtml =
        mode ===
          "html"
          ? await embedLogoInHtml(
            rawHtml
          )
          : rawHtml;

      const data =
        await enviarCorreoMasivo({
          targets:
            selectedTargets,

          subject:
            subject.trim(),

          bodyHtml,

          attachments,
        });

      if (
        data?.queued &&
        data?.jobId
      ) {

        notification.info({
          message:
            "Envío iniciado",

          description:
            `${data.queuedCount ?? selectedTargets.length} correo(s) fueron agregados a la cola.`,

          duration:
            4,
        });

        await esperarFinalizacionJob(
          data.jobId
        );

        return;
      }

      handleSendResponse(
        data
      );

    } catch (
    err: any
    ) {

      setShowPreview(
        false
      );

      modal.error({
        title:
          "No fue posible iniciar el envío",

        content:
          err?.response
            ?.data
            ?.message ??
          err?.response
            ?.data
            ?.error ??
          err?.message ??
          "Ocurrió un error inesperado al enviar los correos.",

        okText:
          "Aceptar",

        centered:
          true,
      });

    } finally {

      setIsSending(
        false
      );
    }
  }


  function handleSendResponse(
    data: any
  ) {

    if (
      data?.ok
    ) {

      const failures =
        Array.isArray(
          data.failures
        )
          ? data.failures
          : [];

      const successes =
        Number(
          data.sent ??
          0
        );

      setShowPreview(
        false
      );

      mostrarResultadoEnvio({
        successes,
        failures,
      });

      return;
    }


    setShowPreview(
      false
    );

    modal.error({
      title:
        "Error en el envío",

      content:
        String(
          data?.message ??
          "No fue posible completar el envío."
        ),

      okText:
        "Aceptar",

      centered:
        true,
    });
  }


  // =================================================
  // ADJUNTOS
  // =================================================

  const fileToBase64 =
    (
      file: File
    ):
      Promise<string> =>
      new Promise(
        (
          resolve,
          reject
        ) => {

          const reader =
            new FileReader();

          reader.onloadend =
            () => {

              const result =
                reader.result as
                string |
                null;

              if (
                !result
              ) {

                resolve(
                  ""
                );

                return;
              }

              const comma =
                result.indexOf(
                  ","
                );

              resolve(
                comma >=
                  0
                  ? result.slice(
                    comma +
                    1
                  )
                  : result
              );
            };

          reader.onerror =
            reject;

          reader.readAsDataURL(
            file
          );
        }
      );


  const onFilesPicked =
    async (
      files:
        FileList |
        null
    ) => {

      if (
        !files ||
        files.length ===
        0
      ) {
        return;
      }

      const output = [
        ...attachments,
      ];

      for (
        const file
        of Array.from(
          files
        )
      ) {

        if (
          file.size >
          5 *
          1024 *
          1024
        ) {

          notification.warning({
            message:
              "Archivo omitido",

            description:
              `${file.name} excede 5 MB`,
          });

          continue;
        }

        try {

          const contentBytes =
            await fileToBase64(
              file
            );

          output.push({
            name:
              file.name,

            contentType:
              file.type ||
              "application/octet-stream",

            contentBytes,

            size:
              file.size,
          });

        } catch {

          notification.error({
            message:
              "Error leyendo archivo",

            description:
              file.name,
          });
        }
      }

      setAttachments(
        output
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    };


  // =================================================
  // PREVIEW PLANTILLA
  // =================================================

  const plantillaPreview =
    useMemo(
      () => {

        if (
          !plantillaSeleccionada
        ) {
          return null;
        }

        if (
          plantillaSeleccionada
            .tipo ===
          "IMAGEN"
        ) {

          if (
            !plantillaSeleccionada
              .previewUrl
          ) {
            return (
              <div className="py-16 text-center text-sm text-slate-400">
                No fue posible cargar la vista previa.
              </div>
            );
          }

          return (
            <img
              src={
                plantillaSeleccionada
                  .previewUrl
              }
              alt={
                plantillaSeleccionada
                  .nombre
              }
              className="mx-auto block h-auto max-h-[70vh] max-w-full object-contain"
            />
          );
        }

        if (
          plantillaSeleccionada
            .htmlProcesado
        ) {

          return (
            <div
              className="mx-auto max-w-[600px]"
              dangerouslySetInnerHTML={{
                __html:
                  plantillaSeleccionada
                    .htmlProcesado,
              }}
            />
          );
        }

        return (
          <div className="py-16 text-center text-sm text-slate-400">
            La plantilla no posee contenido previsualizable.
          </div>
        );
      },
      [
        plantillaSeleccionada,
      ]
    );


  const showSpamWarning =
    selectedCount >
    80;


  // =================================================
  // RENDER
  // =================================================

  return (
    <>
      {contextHolder}
      <div className="flex flex-col gap-5 p-6">

        {/* HEADER */}

        <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 px-6 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <MailOutlined
                  style={{
                    fontSize:
                      18,
                  }}
                />
              </div>

              <div>
                <h1 className="text-xl font-black leading-tight text-slate-900">
                  Mailer
                </h1>

                <p className="text-xs text-slate-400">
                  Envíos masivos y notificaciones
                </p>
              </div>

            </div>


            <div className="flex items-center gap-2">

              <button
                onClick={
                  handleClear
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <CloseCircleOutlined />

                Limpiar
              </button>

              <button
                onClick={
                  reload
                }
                disabled={
                  loading
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-60"
              >
                <ReloadOutlined
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                Recargar
              </button>

            </div>

          </div>


          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">

              <div className="relative flex-1 sm:max-w-xs">

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Buscar por nombre, email o empresa..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                />

                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />

              </div>


              <select
                value={
                  showTecnicos
                    ? "tecnicos"
                    : empresaId
                      ? `company:${empresaId}`
                      : ""
                }
                onChange={
                  (
                    event
                  ) => {

                    const value =
                      event
                        .target
                        .value;

                    if (
                      value ===
                      "tecnicos"
                    ) {

                      setShowTecnicos(
                        true
                      );

                      setEmpresaId(
                        null
                      );

                      return;
                    }

                    if (
                      value.startsWith(
                        "company:"
                      )
                    ) {

                      setEmpresaId(
                        Number(
                          value.split(
                            ":"
                          )[1]
                        )
                      );

                      setShowTecnicos(
                        false
                      );

                      return;
                    }

                    setEmpresaId(
                      null
                    );

                    setShowTecnicos(
                      false
                    );
                  }
                }
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 sm:w-56"
              >

                <option value="">
                  Todas las empresas
                </option>

                <optgroup label="Empresas">

                  {empresas.map(
                    (
                      empresa
                    ) => (
                      <option
                        key={
                          `c-${empresa.id_empresa}`
                        }
                        value={
                          `company:${empresa.id_empresa}`
                        }
                      >
                        {
                          empresa.nombre
                        }
                      </option>
                    )
                  )}

                </optgroup>

                <optgroup label="Técnicos RIDS">
                  <option value="tecnicos">
                    RIDS (ver todos)
                  </option>
                </optgroup>

              </select>

            </div>

          </div>

        </div>


        {/* ERROR */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <span className="font-semibold">
              Error cargando datos:
            </span>

            {" "}

            {error}

          </div>
        )}


        {/* STATS */}

        <div className="grid grid-cols-3 gap-3">

          {[
            {
              label:
                "Solicitantes",

              value:
                solicitantes.length,

              icon:
                <UserOutlined />,

              iconBg:
                "bg-slate-100 text-slate-500",

              bar:
                "bg-slate-200",
            },

            {
              label:
                "Empresas",

              value:
                empresas.length,

              icon:
                <BankOutlined />,

              iconBg:
                "bg-cyan-100 text-cyan-600",

              bar:
                "bg-cyan-300",
            },

            {
              label:
                "Seleccionados",

              value:
                selectedCount,

              icon:
                <MailOutlined />,

              iconBg:
                selectedCount >
                  0
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-400",

              bar:
                selectedCount >
                  0
                  ? "bg-emerald-400"
                  : "bg-slate-200",
            },
          ].map(
            ({
              label,
              value,
              icon,
              iconBg,
              bar,
            }) => (
              <div
                key={
                  label
                }
                className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
              >

                <div className="mb-3 flex items-center justify-between gap-2">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {
                      label
                    }
                  </p>

                  <div
                    className={
                      `flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs ${iconBg}`
                    }
                  >
                    {
                      icon
                    }
                  </div>

                </div>

                <p className="text-3xl font-black leading-none text-slate-900">
                  {
                    value.toLocaleString()
                  }
                </p>

                <div className="mt-3 h-1 w-full rounded-full bg-slate-100">

                  <div
                    className={
                      `h-1 rounded-full transition-all ${bar}`
                    }
                    style={{
                      width:
                        value >
                          0
                          ? "100%"
                          : "0%",
                    }}
                  />

                </div>

              </div>
            )
          )}

        </div>


        {/* INFO SPAM */}

        <div
          className={
            `flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${showSpamWarning
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-cyan-100 bg-cyan-50/60 text-cyan-800"
            }`
          }
        >

          <span className="shrink-0">

            {showSpamWarning
              ? (
                <WarningOutlined className="text-amber-500" />
              )
              : (
                <InfoCircleOutlined className="text-cyan-500" />
              )}

          </span>

          <span>

            {showSpamWarning
              ? (
                <>
                  <span className="font-semibold">
                    Precaución:
                  </span>

                  {" "}

                  Más de 80 destinatarios puede aumentar el riesgo de spam. Considera segmentar por empresa.
                </>
              )
              : (
                <>
                  Envío inmediato a todos los seleccionados. Solo contactos activos con correo válido.

                  {selectedCount >
                    0 && (
                      <span className="ml-1 font-semibold text-cyan-700">
                        {selectedCount} seleccionado
                        {selectedCount !==
                          1
                          ? "s"
                          : ""}
                        .
                      </span>
                    )}
                </>
              )}

          </span>

        </div>


        {/* DESTINATARIOS */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">

            <div>

              <p className="text-sm font-bold text-slate-800">
                Lista de destinatarios
              </p>

              <p className="text-xs text-slate-400">
                {loading
                  ? "Cargando..."
                  : `${rows.length.toLocaleString()} contactos activos`}
              </p>

            </div>


            <div className="flex items-center gap-2">

              <button
                onClick={
                  toggleAll
                }
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                {selectAll
                  ? "Deseleccionar"
                  : "Seleccionar todos"}
              </button>

              <button
                onClick={
                  () =>
                    setShowPreview(
                      true
                    )
                }
                disabled={
                  selectedCount ===
                  0
                }
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ver previsualización

                {selectedCount >
                  0 && (
                    <span className="ml-1 rounded-full bg-white/25 px-1.5">
                      {
                        selectedCount
                      }
                    </span>
                  )}
              </button>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead>

                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">

                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        selectAll
                      }
                      onChange={
                        toggleAll
                      }
                      className="rounded accent-cyan-600"
                    />
                  </th>

                  <th className="w-10 px-3 py-3">
                    #
                  </th>

                  <th className="px-3 py-3">
                    Nombre
                  </th>

                  <th className="px-3 py-3">
                    Empresa
                  </th>

                  <th className="px-3 py-3">
                    Email
                  </th>

                  <th className="px-3 py-3 text-right">
                    Estado
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading
                  ? (
                    <tr>
                      <td
                        colSpan={
                          6
                        }
                        className="px-4 py-12 text-center text-sm text-slate-400"
                      >
                        Cargando contactos...
                      </td>
                    </tr>
                  )
                  : rows.length ===
                    0
                    ? (
                      <tr>
                        <td
                          colSpan={
                            6
                          }
                          className="px-4 py-12 text-center text-sm text-slate-400"
                        >
                          Sin resultados para esta búsqueda
                        </td>
                      </tr>
                    )
                    : rows.map(
                      (
                        row,
                        index
                      ) => {

                        const initials =
                          row.nombre
                            .trim()
                            .split(
                              /\s+/
                            )
                            .slice(
                              0,
                              2
                            )
                            .map(
                              (
                                word
                              ) =>
                                word[
                                0
                                ]
                            )
                            .join(
                              ""
                            )
                            .toUpperCase();

                        const isSelected =
                          !!selected[
                          row.id
                          ];

                        return (
                          <tr
                            key={
                              row.id
                            }
                            onClick={
                              () =>
                                toggleOne(
                                  row.id
                                )
                            }
                            className={
                              `cursor-pointer border-b border-slate-50 transition-colors ${isSelected
                                ? "bg-cyan-50/70"
                                : "hover:bg-slate-50/80"
                              }`
                            }
                          >

                            <td
                              className="px-4 py-2.5"
                              onClick={
                                (
                                  event
                                ) =>
                                  event
                                    .stopPropagation()
                              }
                            >
                              <input
                                type="checkbox"
                                checked={
                                  isSelected
                                }
                                onChange={
                                  () =>
                                    toggleOne(
                                      row.id
                                    )
                                }
                                className="rounded accent-cyan-600"
                              />
                            </td>

                            <td className="px-3 py-2.5 text-xs tabular-nums text-slate-400">
                              {
                                index +
                                1
                              }
                            </td>

                            <td className="px-3 py-2.5">

                              <div className="flex items-center gap-2.5">

                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-700">
                                  {
                                    initials
                                  }
                                </div>

                                <span className="text-sm font-medium text-slate-800">
                                  {
                                    row.nombre
                                  }
                                </span>

                              </div>

                            </td>

                            <td className="px-3 py-2.5">

                              {row.empresa
                                ?.nombre
                                ? (
                                  <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                    {
                                      row
                                        .empresa
                                        .nombre
                                    }
                                  </span>
                                )
                                : (
                                  <span className="text-xs text-slate-300">
                                    —
                                  </span>
                                )}

                            </td>

                            <td className="px-3 py-2.5 text-xs text-slate-500">
                              {
                                row.email ??
                                "—"
                              }
                            </td>

                            <td className="px-3 py-2.5 text-right">

                              <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700">
                                Activo
                              </span>

                            </td>

                          </tr>
                        );
                      }
                    )}

              </tbody>

            </table>

          </div>

        </div>


        {/* PREVIEW / COMPOSICIÓN */}

        {showPreview && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 xl:p-5">

            <div className="flex max-h-[100vh] w-[96vw] max-w-[1300px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5">

                <div>

                  <h3 className="text-lg font-black text-slate-900">
                    Previsualización de correo
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Configura contenido, plantilla y adjuntos antes del envío.
                  </p>

                </div>


                <button
                  onClick={
                    () => {

                      if (
                        isSending
                      ) {
                        return;
                      }

                      setShowPreview(
                        false
                      );
                    }
                  }
                  disabled={
                    isSending
                  }
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cerrar
                </button>

              </div>


              <div className="flex flex-1 flex-col gap-6 overflow-auto px-6 py-5 xl:px-8 xl:py-6">

                {/* ASUNTO */}

                <div>

                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Asunto
                  </label>

                  <input
                    value={
                      subject
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setSubject(
                          event
                            .target
                            .value
                        )
                    }
                    className="h-11 w-full rounded-xl border border-cyan-200 px-3 text-base text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />

                </div>


                {/* DESTINATARIOS */}

                <div>

                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Para ({selectedCount} destinatario
                    {selectedCount !==
                      1
                      ? "s"
                      : ""}
                    )
                  </label>

                  <div className="max-h-28 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">

                    {selectedTargets.map(
                      (
                        target
                      ) => (
                        <div
                          key={
                            target.id
                          }
                        >
                          {
                            target.nombre
                          }{" "}
                          &lt;
                          {
                            target.email ??
                            "—"
                          }
                          &gt;
                        </div>
                      )
                    )}

                  </div>

                </div>


                {/* MODO DE CONTENIDO */}

                <div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Contenido del correo
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={
                        () =>
                          setContentMode(
                            "EDITOR"
                          )
                      }
                      className={
                        `flex items-center gap-3 rounded-2xl border p-4 text-left transition ${contentMode ===
                          "EDITOR"
                          ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                        }`
                      }
                    >

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                        <EditOutlined />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Editor RIDS
                        </p>

                        <p className="text-xs text-slate-400">
                          Diseña el contenido directamente.
                        </p>
                      </div>

                    </button>


                    <button
                      type="button"
                      onClick={
                        () => {

                          setContentMode(
                            "PLANTILLA"
                          );

                          if (
                            !plantillaSeleccionada
                          ) {
                            setPlantillasModalOpen(
                              true
                            );
                          }
                        }
                      }
                      className={
                        `flex items-center gap-3 rounded-2xl border p-4 text-left transition ${contentMode ===
                          "PLANTILLA"
                          ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                        }`
                      }
                    >

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <AppstoreOutlined />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Plantilla
                        </p>

                        <p className="text-xs text-slate-400">
                          Usa HTML o una imagen guardada.
                        </p>
                      </div>

                    </button>

                  </div>

                </div>


                {/* EDITOR */}

                {contentMode ===
                  "EDITOR" && (
                    <>

                      {/* ADJUNTOS */}

                      <div>

                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Adjuntos
                        </label>

                        <div className="flex flex-wrap gap-2">

                          {attachments.map(
                            (
                              attachment,
                              index
                            ) => (
                              <div
                                key={
                                  `${attachment.name}-${index}`
                                }
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm"
                              >

                                <span>
                                  {
                                    attachment.name
                                  }{" "}
                                  (
                                  {
                                    Math.round(
                                      attachment.size /
                                      1024
                                    )
                                  }{" "}
                                  KB)
                                </span>

                                <button
                                  type="button"
                                  onClick={
                                    () =>
                                      setAttachments(
                                        (
                                          current
                                        ) =>
                                          current.filter(
                                            (
                                              _,
                                              attachmentIndex
                                            ) =>
                                              attachmentIndex !==
                                              index
                                          )
                                      )
                                  }
                                  className="font-bold text-red-400 hover:text-red-600"
                                >
                                  ×
                                </button>

                              </div>
                            )
                          )}

                          <button
                            type="button"
                            onClick={
                              () =>
                                fileInputRef
                                  .current
                                  ?.click()
                            }
                            className="rounded-xl border border-dashed border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-600 transition hover:bg-cyan-50"
                          >
                            + Adjuntar archivo
                          </button>

                          <input
                            ref={
                              fileInputRef
                            }
                            type="file"
                            multiple
                            className="hidden"
                            onChange={
                              (
                                event
                              ) =>
                                void onFilesPicked(
                                  event
                                    .target
                                    .files
                                )
                            }
                          />

                        </div>

                      </div>


                      {/* MENSAJE */}

                      <div>

                        <div className="mb-1.5 flex items-center justify-between">

                          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Mensaje
                          </label>

                          <button
                            type="button"
                            onClick={
                              () =>
                                setEditHtml(
                                  (
                                    current
                                  ) =>
                                    !current
                                )
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
                          >
                            {editHtml
                              ? "WYSIWYG"
                              : "HTML"}
                          </button>

                        </div>


                        {editHtml
                          ? (
                            <textarea
                              value={
                                content
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  setContent(
                                    event
                                      .target
                                      .value
                                  )
                              }
                              rows={
                                14
                              }
                              className="w-full rounded-xl border border-cyan-200 px-3 py-2 font-mono text-xs text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                          )
                          : (
                            <div>

                              <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-sm">

                                {[
                                  {
                                    cmd:
                                      "bold",

                                    title:
                                      "Negrita",

                                    label:
                                      <b>
                                        B
                                      </b>,
                                  },

                                  {
                                    cmd:
                                      "italic",

                                    title:
                                      "Cursiva",

                                    label:
                                      <i>
                                        I
                                      </i>,
                                  },

                                  {
                                    cmd:
                                      "underline",

                                    title:
                                      "Subrayado",

                                    label:
                                      <u>
                                        U
                                      </u>,
                                  },
                                ].map(
                                  (
                                    action
                                  ) => (
                                    <button
                                      key={
                                        action.cmd
                                      }
                                      type="button"
                                      title={
                                        action.title
                                      }
                                      onMouseDown={
                                        (
                                          event
                                        ) => {

                                          event.preventDefault();

                                          document.execCommand(
                                            action.cmd
                                          );
                                        }
                                      }
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-slate-600 transition hover:bg-white hover:shadow-sm"
                                    >
                                      {
                                        action.label
                                      }
                                    </button>
                                  )
                                )}

                                <div className="mx-1 h-5 border-l border-slate-200" />

                                <button
                                  type="button"
                                  title="Lista"
                                  onMouseDown={
                                    (
                                      event
                                    ) => {

                                      event.preventDefault();

                                      insertList(
                                        false
                                      );
                                    }
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-slate-600 transition hover:bg-white hover:shadow-sm"
                                >
                                  •
                                </button>

                                <button
                                  type="button"
                                  title="Lista numerada"
                                  onMouseDown={
                                    (
                                      event
                                    ) => {

                                      event.preventDefault();

                                      insertList(
                                        true
                                      );
                                    }
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-slate-600 transition hover:bg-white hover:shadow-sm"
                                >
                                  1.
                                </button>

                                <div className="flex-1" />

                                <button
                                  type="button"
                                  title="Limpiar formato"
                                  onMouseDown={
                                    (
                                      event
                                    ) => {

                                      event.preventDefault();

                                      document.execCommand(
                                        "removeFormat"
                                      );
                                    }
                                  }
                                  className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-white"
                                >
                                  Limpiar
                                </button>

                              </div>


                              <div
                                ref={
                                  editorRef
                                }
                                contentEditable
                                suppressContentEditableWarning
                                onInput={
                                  () => {

                                    if (
                                      editorRef.current
                                    ) {
                                      setContent(
                                        editorRef
                                          .current
                                          .innerHTML
                                      );
                                    }
                                  }
                                }
                                onFocus={
                                  () => {

                                    isTypingRef.current =
                                      true;
                                  }
                                }
                                onBlur={
                                  () => {

                                    isTypingRef.current =
                                      false;

                                    if (
                                      editorRef.current
                                    ) {
                                      setContent(
                                        editorRef
                                          .current
                                          .innerHTML
                                      );
                                    }
                                  }
                                }
                                className="min-h-[260px] rounded-xl border border-cyan-200 px-4 py-3 text-sm outline-none transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                              />

                            </div>
                          )}

                      </div>


                      {/* PREVIEW EDITOR */}

                      <div>

                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Vista previa del correo
                        </label>

                        <div className="max-h-[760px] overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-8">

                          <div
                            className="mx-auto max-w-[600px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                            dangerouslySetInnerHTML={{
                              __html:
                                previewEditorHtml,
                            }}
                          />

                        </div>

                      </div>

                    </>
                  )}


                {/* =================================================
                PLANTILLAS
                 ================================================= */}

                {contentMode ===
                  "PLANTILLA" && (
                    <>

                      {/* SELECCIÓN / ADMINISTRACIÓN */}

                      <div>

                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Plantilla
                        </label>


                        {!plantillaSeleccionada ? (

                          <button
                            type="button"
                            onClick={
                              () =>
                                setPlantillasModalOpen(
                                  true
                                )
                            }
                            className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 px-5 py-5 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                          >

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                                <AppstoreOutlined />
                              </div>

                              <div>

                                <p className="font-bold text-cyan-700">
                                  Seleccionar plantilla
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Selecciona una plantilla existente o crea una nueva.
                                </p>

                              </div>

                            </div>


                            <span className="text-2xl font-light text-cyan-500">
                              +
                            </span>

                          </button>

                        ) : (

                          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                              <div className="flex min-w-0 items-start gap-3">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                                  <FileImageOutlined />
                                </div>


                                <div className="min-w-0">

                                  <p className="font-bold text-slate-800">
                                    {
                                      plantillaSeleccionada.nombre
                                    }
                                  </p>


                                  <p className="mt-0.5 text-xs text-slate-400">

                                    {
                                      plantillaSeleccionada.tipo
                                    }

                                    {plantillaSeleccionada
                                      .nombreArchivo
                                      ? ` · ${plantillaSeleccionada.nombreArchivo}`
                                      : ""}

                                    {plantillaSeleccionada
                                      .bytes
                                      ? ` · ${Math.round(
                                        plantillaSeleccionada.bytes /
                                        1024
                                      )} KB`
                                      : ""}

                                  </p>


                                  {plantillaSeleccionada
                                    .descripcion && (

                                      <p className="mt-2 text-xs text-slate-500">
                                        {
                                          plantillaSeleccionada.descripcion
                                        }
                                      </p>

                                    )}

                                </div>

                              </div>


                              <div className="flex shrink-0 flex-wrap gap-2">

                                <button
                                  type="button"
                                  onClick={
                                    () =>
                                      setPlantillasModalOpen(
                                        true
                                      )
                                  }
                                  className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
                                >
                                  Cambiar / administrar
                                </button>


                                <button
                                  type="button"
                                  onClick={
                                    () =>
                                      setPlantillaSeleccionada(
                                        null
                                      )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
                                >
                                  Quitar
                                </button>

                              </div>

                            </div>

                          </div>

                        )}

                      </div>

                      {/* PREVIEW DE LA PLANTILLA SELECCIONADA */}

                      {plantillaSeleccionada && (

                        <div>

                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Vista previa de la plantilla
                          </label>

                          <div className="max-h-[78vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-5">

                            <div className="mx-auto w-full max-w-[1000px] rounded-xl bg-white p-5 shadow-sm">

                              {
                                plantillaPreview
                              }

                              {firmaRemitente?.html && (

                                <div
                                  className="mt-6 border-t border-slate-100 pt-5"
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      firmaRemitente.html,
                                  }}
                                />

                              )}

                            </div>

                          </div>

                        </div>

                      )}


                      {/* ADJUNTOS ADICIONALES */}

                      <div>

                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Adjuntos adicionales
                        </label>


                        <div className="flex flex-wrap gap-2">

                          {attachments.map(
                            (
                              attachment,
                              index
                            ) => (

                              <div
                                key={
                                  `${attachment.name}-${index}`
                                }
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm"
                              >

                                <span>

                                  {
                                    attachment.name
                                  }

                                  {" ("}

                                  {
                                    Math.round(
                                      attachment.size /
                                      1024
                                    )
                                  }

                                  {" KB)"}

                                </span>


                                <button
                                  type="button"
                                  onClick={
                                    () =>
                                      setAttachments(
                                        (
                                          current
                                        ) =>
                                          current.filter(
                                            (
                                              _,
                                              attachmentIndex
                                            ) =>
                                              attachmentIndex !==
                                              index
                                          )
                                      )
                                  }
                                  className="font-bold text-red-400 hover:text-red-600"
                                >
                                  ×
                                </button>

                              </div>

                            )
                          )}


                          <button
                            type="button"
                            onClick={
                              () =>
                                fileInputRef
                                  .current
                                  ?.click()
                            }
                            className="rounded-xl border border-dashed border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-600 transition hover:bg-cyan-50"
                          >
                            + Adjuntar archivo
                          </button>


                          <input
                            ref={
                              fileInputRef
                            }
                            type="file"
                            multiple
                            className="hidden"
                            onChange={
                              (
                                event
                              ) =>
                                void onFilesPicked(
                                  event
                                    .target
                                    .files
                                )
                            }
                          />

                        </div>

                      </div>

                    </>
                  )}

                {/* =================================================
    FIRMA CORPORATIVA
================================================= */}

                <div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Firma del correo
                  </label>


                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <UserOutlined />
                      </div>


                      <div className="flex-1">

                        <p className="text-sm font-bold text-slate-800">
                          Firma corporativa
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Todos los correos masivos utilizan automáticamente
                          la firma de Soporte RIDS.
                        </p>


                        <div className="mt-4">

                          {loadingFirmaRemitente ? (

                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-xs text-slate-400">
                              Cargando firma de Soporte RIDS...
                            </div>

                          ) : firmaRemitente ? (

                            <div className="rounded-xl border border-emerald-100 bg-white p-4">

                              {firmaRemitente.tecnico && (

                                <div className="mb-3">

                                  <p className="text-sm font-bold text-slate-800">
                                    {
                                      firmaRemitente
                                        .tecnico
                                        .nombre ??
                                      "Soporte RIDS"
                                    }
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {
                                      [
                                        firmaRemitente
                                          .tecnico
                                          .cargo,

                                        firmaRemitente
                                          .tecnico
                                          .area,

                                        firmaRemitente
                                          .tecnico
                                          .email,
                                      ]
                                        .filter(
                                          Boolean
                                        )
                                        .join(
                                          " · "
                                        )
                                    }
                                  </p>

                                </div>

                              )}


                              <div
                                dangerouslySetInnerHTML={{
                                  __html:
                                    firmaRemitente.html,
                                }}
                              />

                            </div>

                          ) : (

                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                              <p className="text-xs text-red-700">
                                No fue posible cargar la firma de Soporte RIDS.
                              </p>

                            </div>

                          )}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* FOOTER */}

              <div className="border-t border-slate-100 px-8 py-5">

                {isSending && (

                  <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">

                    <div className="flex items-center justify-between gap-4">

                      <div>

                        <p className="text-sm font-semibold text-cyan-800">
                          {
                            sendingMessage ??
                            "Procesando envío..."
                          }
                        </p>

                        <p className="mt-0.5 text-xs text-cyan-600">
                          No cierres esta ventana mientras se completa el envío.
                        </p>

                      </div>


                      {sendingProgress.total > 0 && (

                        <div className="shrink-0 text-right">

                          <p className="text-sm font-bold text-cyan-800">
                            {sendingProgress.completed}
                            /
                            {sendingProgress.total}
                          </p>

                          <div className="mt-1 flex justify-end gap-3 text-xs">

                            <span className="text-emerald-600">
                              ✓ {sendingProgress.successes}
                            </span>

                            <span className="text-red-500">
                              ✕ {sendingProgress.failures}
                            </span>

                          </div>

                        </div>

                      )}

                    </div>


                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-cyan-100">

                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                        style={{
                          width:
                            sendingProgress.total > 0
                              ? `${Math.min(
                                100,
                                (
                                  sendingProgress.completed /
                                  sendingProgress.total
                                ) *
                                100
                              )}%`
                              : "5%",
                        }}
                      />

                    </div>

                  </div>

                )}


                <div className="flex items-center justify-end gap-3">

                  <button
                    onClick={
                      () => {

                        if (
                          isSending
                        ) {
                          return;
                        }

                        setShowPreview(
                          false
                        );
                      }
                    }
                    disabled={
                      isSending
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cancelar
                  </button>


                  {contentMode ===
                    "EDITOR" && (

                      <button
                        disabled={
                          isSending
                        }
                        onClick={
                          () =>
                            void handleSend(
                              "plain"
                            )
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Enviar texto plano
                      </button>

                    )}


                  <button
                    disabled={
                      isSending ||
                      (
                        contentMode ===
                        "PLANTILLA" &&
                        !plantillaSeleccionada
                      )
                    }
                    onClick={
                      () =>
                        void handleSend(
                          "html"
                        )
                    }
                    className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending
                      ? "Enviando..."
                      : contentMode ===
                        "PLANTILLA"
                        ? "Enviar con plantilla"
                        : "Enviar con diseño HTML"}
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

        <MailerPlantillasModal
          open={
            plantillasModalOpen
          }

          uso="CONTENIDO"

          selectedId={
            plantillaSeleccionada
              ?.id ??
            null
          }

          onClose={
            () =>
              setPlantillasModalOpen(
                false
              )
          }

          onSelect={
            (
              plantilla
            ) => {

              setPlantillaSeleccionada(
                plantilla
              );

              setContentMode(
                "PLANTILLA"
              );

              setPlantillasModalOpen(
                false
              );
            }
          }
        />

      </div>

    </>


  );
}