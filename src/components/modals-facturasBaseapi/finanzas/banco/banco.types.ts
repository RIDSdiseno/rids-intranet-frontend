// src/components/modals-facturasBaseapi/finanzas/banco/banco.types.ts
// Respuestas de /baseapi/finanzas/banco/* (Fase 4b, conciliacion-bancaria.service).

export type TipoPropuesta = "PERFECTO" | "COMBINADO" | "YA_PAGADA" | "SUGERIDO" | "SIN_MATCH";

export type EstadoMovimiento = "PENDIENTE" | "CONCILIADO" | "DESCARTADO";

export type MotivoDescarte = "TRASPASO_EMPRESAS" | "PASARELA" | "NO_ES_CLIENTE" | "DUPLICADO" | "OTRO";

export type AsignacionPropuesta = {
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial: string | null;
    fechaEmision: string | null;
    estado: "PAGADO" | "PENDIENTE" | "VENCIDO" | "COMPENSADO";
    saldo: number;
    monto: number;
    accion: "ABONO" | "VINCULO";
};

export type Propuesta = {
    tipo: TipoPropuesta;
    motivo: string;
    asignaciones: AsignacionPropuesta[];
};

export type MovimientoBanco = {
    id: number;
    empresaKey: string;
    fecha: string;
    hora: string | null;
    rutPagador: string | null;
    nombrePagador: string | null;
    producto: string | null;
    referencia: string | null;
    medioPago: string | null;
    monto: number;
    estado: EstadoMovimiento;
    motivoDescarte: MotivoDescarte | null;
    observacion: string | null;
    archivo: string | null;
    responsable: string | null;
    conciliadoAt: string | null;
    propuesta: Propuesta | null;
    asignaciones: Array<{
        id: number;
        tipoDoc: string;
        folio: string;
        rutContraparte: string;
        razonSocial: string | null;
        monto: number;
        tipo: "ABONO" | "VINCULO" | string;
    }>;
};

export type MovimientosResponse = {
    ok: boolean;
    data: { movimientos: MovimientoBanco[]; resumen: Record<string, number> };
};

export type FilaImportacion = {
    fila: number;
    fecha: string;
    hora: string | null;
    rutPagador: string | null;
    nombrePagador: string | null;
    producto: string | null;
    referencia: string | null;
    medioPago: string | null;
    estado: string | null;
    monto: number;
    duplicado: boolean;
    descarteAuto: string | null;
    posibleDuplicado: { origen: "CARGADO" | "ARCHIVO"; detalle: string } | null;

};

export type ResultadoImportacion = {
    aplicado: boolean;
    titular: string | null;
    leidos: number;
    nuevos: number;
    duplicados: number;
    noPagados: number;
    descartadosAuto: number;
    posiblesDuplicados: number;
    omitidos: number;
    total: number;
    advertencias: string[];
    filas: FilaImportacion[];
};

export const MOTIVOS_DESCARTE: Array<{ id: MotivoDescarte; label: string }> = [
    { id: "TRASPASO_EMPRESAS", label: "Traspaso entre empresas" },
    { id: "PASARELA", label: "Pasarela de pago / no es factura" },
    { id: "NO_ES_CLIENTE", label: "No es un cliente" },
    { id: "DUPLICADO", label: "Pago duplicado (ya estaba cargado)" },
    { id: "OTRO", label: "Otro" },
];

/** Prefijo que pone el backend en la observación de los movimientos importados como posible duplicado. */
export const PREFIJO_POSIBLE_DUPLICADO = "Posible duplicado";