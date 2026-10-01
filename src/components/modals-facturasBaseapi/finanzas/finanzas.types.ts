// src/components/models-facturasBaseapi/finanzas/finanzas.types.ts
export type EmpresaFinanzas =
    | "econnet"
    | "rids";

export type FinanzasResumen = {
    montoFacturado: number;
    totalDocumentos: number;

    montoPorVencer: number;
    documentosPorVencer: number;

    montoVencido: number;
    documentosVencidos: number;

    montoPagado: number;
    documentosPagados: number;

    recordatoriosEnviados: number;

    montoCompras: number;
    totalDocumentosCompras: number;
};

export type FinanzasMes = {
    mes: number;
    label: string;

    facturadoBruto: number;
    facturadoNeto: number;
    documentosVentas: number;

    pagado: number;
    documentosPagados: number;

    porVencer: number;
    documentosPorVencer: number;

    vencido: number;
    documentosVencidos: number;

    recordatorios: number;

    comprasBruto: number;
    comprasNeto: number;
    documentosCompras: number;
};

export type FinanzasDashboardData = {
    empresa: EmpresaFinanzas;
    ano: number;

    resumen: FinanzasResumen;

    meses: FinanzasMes[];

    ultimaActualizacion:
    string |
    null;

    mesesConCache:
    string[];

    mesesConCompras:
    string[];

    clientes:
    FinanzasClientesData;
};

export type FinanzasDashboardResponse = {
    ok: boolean;

    data:
    FinanzasDashboardData;
};

export type FinanzasChartTab =
    | "ventas"
    | "compras"
    | "pagos"
    | "recordatorios"
    | "vencimientos";

export type FinanzasVentaMode =
    | "bruta"
    | "neta";

export type EstadoPuntualidadCliente =
    | "SIN_HISTORIAL"
    | "EXCELENTE"
    | "BUEN_PAGADOR"
    | "IRREGULAR"
    | "RIESGO_MORA";

export type FinanzasClientePago = {
    rut:
    string;

    razonSocial:
    string;

    estado:
    EstadoPuntualidadCliente;

    score:
    number | null;

    totalConciliadas:
    number;

    conVencimientoRegistrado:
    number;

    aTiempo:
    number;

    atrasadas:
    number;

    porcentajeATiempo:
    number;

    promedioDiasAtraso:
    number;

    montoPagado:
    number;

    ultimaFechaPago:
    string | null;
};

export type FinanzasClientesResumen = {
    excelente:
    number;

    buenPagador:
    number;

    irregular:
    number;

    riesgoMora:
    number;

    sinHistorial:
    number;
};

export type FinanzasClientesData = {
    totalClientes:
    number;

    resumen:
    FinanzasClientesResumen;

    mejoresPagadores:
    FinanzasClientePago[];

    mayorRiesgo:
    FinanzasClientePago[];

    clientes:
    FinanzasClientePago[];
};