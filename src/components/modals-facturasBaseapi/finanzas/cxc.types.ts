// src/components/modals-facturasBaseapi/finanzas/cxc.types.ts
// Respuesta de GET /baseapi/finanzas/cxc/resumen (cxc-documentos.service + baseapi-finanzas-cxc.controller)

export type EstadoCxc = "PAGADO" | "PENDIENTE" | "VENCIDO" | "COMPENSADO";

export type TramoAntiguedad = "AL_DIA" | "1_30" | "31_60" | "61_90" | "MAS_90";

export type MontoCxc = {
    monto: number;
    documentos: number;
};

export type DocumentoCxc = {
    key: string;
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial: string | null;
    periodo: string;
    fechaEmision: string | null;
    montoOriginal: number;
    montoNotasCredito: number;
    saldo: number;
    notasCredito: string[];
    estado: EstadoCxc;
    fechaVencimiento: string | null;
    origenVencimiento: string;
    diasDiferencia: number | null;
    tramo: TramoAntiguedad | null;
    pagadoAt: string | null;
    formaPago: string | null;
    vencimientoPactado?: string | null;
    montoAbonado?: number;
    abonos?: number;
};

export type ResumenCxc = {
    empresaKey: "rids" | "econnet";
    hoy: string;
    generadoAt: string;
    desdeCache: boolean;
    tarjetas: {
        pagosMes: MontoCxc;
        porVencer: MontoCxc;
        vencido: MontoCxc;
        sinVencimiento: MontoCxc;
        total: MontoCxc;
    };
    antiguedad: Array<{ tramo: TramoAntiguedad; etiqueta: string } & MontoCxc>;
    porMesEmision: Array<{ periodo: string; pagado: number; porVencer: number; vencido: number }>;
    proyeccion: Array<{ periodo: string } & MontoCxc>;
    documentos: DocumentoCxc[];
    diagnostico: {
        periodosLeidos: number;
        primerPeriodo: string | null;
        ultimoPeriodo: string | null;
        sinVencimiento: number;
        plazoEmpresa: number;
        ncInferidas: number;
        ncSinAplicar: number;
    };
};

export type ResumenCxcResponse = {
    ok: boolean;
    data: ResumenCxc;
};

/** Nota de crédito o débito del RCV y cómo se aplicó (GET /baseapi/finanzas/cxc/documentos). */
export type NotaCxc = {
    tipoDoc: "61" | "56";
    folio: string;
    rutContraparte: string;
    razonSocial: string | null;
    periodo: string;
    fechaEmision: string | null;
    monto: number;
    aplicadaA: string | null;
    metodo: "XML" | "INFERIDA" | "SIN_APLICAR" | "ND_REVERSA" | "ND_COBRABLE";
};

export type RespuestaDocumentosCxc = {
    empresaKey: "rids" | "econnet";
    hoy: string;
    generadoAt: string;
    desdeCache: boolean;
    documentos: DocumentoCxc[];
    notas: NotaCxc[];
};

export type DocumentosCxcResponse = {
    ok: boolean;
    data: RespuestaDocumentosCxc;
};

/** Filtro de la tabla de documentos (tarjeta o tramo seleccionado). */
export type FiltroCxc = "ABIERTOS" | "POR_VENCER" | "VENCIDO" | "SIN_VENCIMIENTO" | "PAGOS_MES" | TramoAntiguedad;

/* ---------- Fase 2b: envíos manuales (GET/POST /baseapi/finanzas/cxc/envios/...) ---------- */

export type TipoEnvioCxc = "factura" | "recordatorio";

export type OpcionesEnvioCxc = {
    tipo: TipoEnvioCxc;
    modo: { modo: "PRUEBA" | "REAL" | "BLOQUEADO"; destinoPrueba: string | null; variables: string };
    receptor: { configurado: boolean; activo: boolean; recibeAutomatico: boolean };
    contactos: Array<{ email: string; nombre: string | null; principal: boolean; habilitado: boolean }>;
    historial: Array<{
        email: string;
        estado: string;
        automatico: boolean;
        tipoRecordatorio: string | null;
        enviadoAt: string | null;
        actualizadoAt: string;
        error: string | null;
    }>;
};

export type ResultadoEnvioCxc = {
    tipo: TipoEnvioCxc;
    modo: "PRUEBA" | "REAL" | "BLOQUEADO";
    enviados: number;
    errores: number;
    resultados: Array<{ email: string; ok: boolean; registrado: boolean; error: string | null }>;
};

/* ---------- Fase 3a: Clientes unificado (GET /baseapi/finanzas/cxc/clientes...) ---------- */

export type EmpresaCxc = "rids" | "econnet";

export type ResumenEmpresaCliente = {
    facturas: number;
    abiertos: number;
    porCobrar: number;
    vencidos: number;
    vencido: number;
    porVencer: number;
    maxDiasVencido: number;
    ultimaEmision: string | null;
    ultimoPago: string | null;
};

export type EstadoModuloCliente = {
    receptorId: number | null;
    activo: boolean;
    /** Envíos automáticos (recibeFacturas / recibeCobranza del receptor). */
    recibe: boolean;
    /** Contactos activos que reciben. */
    contactos: number;
};

export type ClienteCxcFila = {
    rut: string;
    razonSocial: string | null;
    empresa: { id: number; nombre: string } | null;
    diasCredito: number | null;
    facturacion: EstadoModuloCliente;
    cobranza: EstadoModuloCliente;
    porEmpresa: Record<EmpresaCxc, ResumenEmpresaCliente | null>;
    porCobrar: number;
    vencido: number;
    totalContactos: number;
    maxDiasVencido: number;
    puntualidad: {
        estado: EstadoPuntualidad;
        score: number | null;
        totalEvaluados: number;
        porcentajeATiempo: number;
        promedioDiasAtraso: number;
    } | null;
};

export type ContactoClienteModulo = { id: number; recibe: boolean; principal: boolean };

export type ContactoClienteCxc = {
    email: string;
    nombre: string | null;
    facturas: ContactoClienteModulo | null;
    cobranza: ContactoClienteModulo | null;
};

export type EnvioClienteCxc = {
    tipo: "FACTURA" | "RECORDATORIO";
    empresaKey: string;
    documento: string;
    email: string;
    estado: string;
    automatico: boolean;
    tipoRecordatorio: string | null;
    enviadoAt: string | null;
    fecha: string;
    error: string | null;
};

export type EstadoPuntualidad = "SIN_HISTORIAL" | "EXCELENTE" | "BUEN_PAGADOR" | "IRREGULAR" | "RIESGO_MORA";

export type ComportamientoGrupo = {
    estado: EstadoPuntualidad;
    score: number | null;
    totalEvaluados: number;
    aTiempo: number;
    atrasadas: number;
    porcentajeATiempo: number;
    promedioDiasAtraso: number;
    documentosInvalidos: number;
    promedioDiasPago: number | null;
    montoPagado: number;
};

export type ComportamientoClienteCxc = {
    desde: string;
    hasta: string;
    total: ComportamientoGrupo | null;
    porEmpresa: Record<EmpresaCxc, ComportamientoGrupo | null>;
    excluidos: number;
    documentos: Array<{
        empresaKey: EmpresaCxc;
        tipoDoc: string;
        folio: string;
        fechaEmision: string | null;
        vencimiento: string;
        pagadoAt: string;
        diasAtraso: number;
        monto: number;
        formaPago: string | null;
    }>;
};

export type FichaClienteCxc = ClienteCxcFila & {
    plazos: Record<EmpresaCxc, string>;
    contactos: ContactoClienteCxc[];
    documentos: Array<DocumentoCxc & { empresaKey: EmpresaCxc }>;
    comportamiento: ComportamientoClienteCxc;
    historial: EnvioClienteCxc[];
};

export type ClientesCxcResponse = { ok: boolean; data: { generadoAt: string; clientes: ClienteCxcFila[] } };
export type FichaClienteCxcResponse = { ok: boolean; data: FichaClienteCxc };

/* ---------- Fase 4a: pagos y abonos (GET /baseapi/finanzas/cxc/pagos) ---------- */

export type AbonoCxc = {
    id: number;
    monto: number;
    fechaPago: string;
    formaPago: string | null;
    observacion: string | null;
    origen: string;
    responsable: string | null;
    createdAt: string;
};

export type PagosDocumentoCxc = {
    montoOriginal: number;
    montoNotasCredito: number;
    saldoNc: number;
    montoAbonado: number;
    pendiente: number;
    conciliada: boolean;
    conciliadaSinAbonos: boolean;
    conciliadoAt: string | null;
    formaPagoConciliacion: string | null;
    abonos: AbonoCxc[];
};