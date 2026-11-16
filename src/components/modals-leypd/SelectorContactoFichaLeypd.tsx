// src/components/modals-leypd/SelectorContactoFichaLeypd.tsx

import {
    UserOutlined,
} from "@ant-design/icons";

import {
    Select,
    Tag,
} from "antd";

import type {
    ContactoEmpresaFichaLeypd,
    ContactoFichaLeypd,
} from "./leypd.types";

/* =====================================================
   QUÉ PREGUNTAS LO USAN Y CÓMO ARMAN EL TEXTO
===================================================== */

type DatoContacto =
    | "nombre"
    | "cargo"
    | "telefono"
    | "email";

/**
 * Preguntas con selector y qué datos del contacto
 * se copian, en el orden de su placeholder.
 */
const FORMATO_POR_CAMPO: Record<string, DatoContacto[]> = {
    /* 4. Contacto oficial: se publica en el aviso legal */
    contactoOficialEmpresa: [
        "email",
        "telefono",
    ],

    /* 9. Nombre, cargo y teléfono */
    responsableDerechosTitulares: [
        "nombre",
        "cargo",
        "telefono",
    ],

    /* 10. Nombre, cargo, teléfono y correo */
    responsableIncidentesSeguridad: [
        "nombre",
        "cargo",
        "telefono",
        "email",
    ],

    /* 11. Nombre y cargo */
    responsableRegistroConsentimientos: [
        "nombre",
        "cargo",
    ],
};

export function campoUsaSelectorContacto(
    key: string
): boolean {
    return key in FORMATO_POR_CAMPO;
}

const VALOR_EMPRESA =
    "empresa";

function unir(
    partes: Array<string | null | undefined>
): string {
    return partes
        .map((p) => p?.trim())
        .filter(Boolean)
        .join(" · ");
}

interface Props {
    campoKey: string;

    contactos:
    ContactoFichaLeypd[];

    contactoEmpresa:
    ContactoEmpresaFichaLeypd | null;

    disabled?: boolean;

    /** Texto armado para la pregunta (se puede editar después). */
    onSelect: (
        texto: string
    ) => void;
}

/**
 * «Usar contacto del CRM»: completa la pregunta con un contacto
 * de la ficha de empresa. No guarda nada por sí solo; el valor
 * queda como cambio pendiente hasta «Guardar cambios».
 */
export default function SelectorContactoFichaLeypd({
    campoKey,
    contactos,
    contactoEmpresa,
    disabled = false,
    onSelect,
}: Props) {
    const formato =
        FORMATO_POR_CAMPO[
        campoKey
        ];

    if (!formato) {
        return null;
    }

    const esContactoOficial =
        campoKey ===
        "contactoOficialEmpresa";

    const textoContacto =
        (
            contacto: ContactoFichaLeypd
        ) =>
            unir(
                formato.map(
                    (dato) =>
                        contacto[dato]
                )
            );

    const opciones = [
        /* Solo en la pregunta 4: el correo y teléfono de la empresa */
        ...(esContactoOficial &&
            contactoEmpresa
            ? [
                {
                    value:
                        VALOR_EMPRESA,

                    texto:
                        unir([
                            contactoEmpresa.email,
                            contactoEmpresa.telefono,
                        ]),

                    label: (
                        <div className="flex flex-col py-0.5">
                            <span className="text-xs font-medium">
                                Correo y teléfono de la empresa{" "}
                                <Tag color="green" className="ml-1">
                                    Recomendado
                                </Tag>
                            </span>

                            <span className="text-[11px] text-slate-500">
                                {unir([
                                    contactoEmpresa.email,
                                    contactoEmpresa.telefono,
                                ])}
                            </span>
                        </div>
                    ),

                    busqueda:
                        "empresa",
                },
            ]
            : []),

        ...contactos.map(
            (contacto) => ({
                value:
                    String(
                        contacto.id
                    ),

                texto:
                    textoContacto(
                        contacto
                    ),

                label: (
                    <div className="flex flex-col py-0.5">
                        <span className="text-xs font-medium">
                            {contacto.nombre}
                            {contacto.cargo
                                ? ` · ${contacto.cargo}`
                                : ""}

                            {contacto.principal && (
                                <Tag color="blue" className="ml-2">
                                    Principal
                                </Tag>
                            )}
                        </span>

                        <span className="text-[11px] text-slate-500">
                            {unir([
                                contacto.email,
                                contacto.telefono,
                                contacto.sucursal,
                            ]) ||
                                "Sin correo ni teléfono"}
                        </span>
                    </div>
                ),

                busqueda:
                    unir([
                        contacto.nombre,
                        contacto.cargo,
                        contacto.email,
                    ]).toLowerCase(),
            })
        ),
    ];

    const sinOpciones =
        opciones.length ===
        0;

    return (
        <div className="mb-2">
            <Select<string>
                size="small"
                className="w-full"
                showSearch
                disabled={
                    disabled ||
                    sinOpciones
                }
                /* Siempre vacío: es una acción, no un valor */
                value={null}
                suffixIcon={<UserOutlined />}
                placeholder={
                    sinOpciones
                        ? "Sin contactos en la ficha de empresa"
                        : "Usar contacto del CRM…"
                }
                filterOption={(
                    input,
                    option
                ) =>
                    (
                        option?.busqueda ??
                        ""
                    ).includes(
                        input.toLowerCase()
                    )
                }
                options={opciones}
                onSelect={(
                    value: string
                ) => {
                    const opcion =
                        opciones.find(
                            (o) =>
                                o.value ===
                                value
                        );

                    if (opcion?.texto) {
                        onSelect(
                            opcion.texto
                        );
                    }
                }}
            />

            {esContactoOficial && (
                <p className="mb-0 mt-1 text-[11px] leading-4 text-amber-600">
                    Se publica en el aviso legal del sitio: prefiera el correo y teléfono de la empresa o un correo genérico, no el personal.
                </p>
            )}
        </div>
    );
}