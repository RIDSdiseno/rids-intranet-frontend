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