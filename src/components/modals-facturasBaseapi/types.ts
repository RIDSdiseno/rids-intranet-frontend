export type TabRCV = "ventas" | "compras";
export type EmpresaKey = "econnet" | "rids";

export interface Toast {
    type: "success" | "error";
    message: string;
}

export interface DashboardData {
    exists: boolean;
    empresa: string;
    mes: string;
    ano: string;
    tipo: string;
    cacheTipo: string;
    cacheUpdatedAt: string | null;
    kpis: {
        totalDocumentos: number;
        montoNeto: number;
        montoIva: number;
        montoTotal: number;
        promedioDocumento: number;
        contrapartesUnicas: number;
        deltaPctVsMesAnterior: number | null;
    };
    porTipoDocumento: {
        tipoDocumento: string;
        cantidad: number;
        montoNeto: number;
        montoIva: number;
        montoTotal: number;
    }[];
    topContrapartesMonto: {
        rut: string;
        nombre: string;
        cantidad: number;
        montoNeto: number;
        montoIva: number;
        montoTotal: number;
    }[];
    topContrapartesCantidad: {
        rut: string;
        nombre: string;
        cantidad: number;
        montoNeto: number;
        montoIva: number;
        montoTotal: number;
    }[];
    porDia: {
        fecha: string;
        cantidad: number;
        montoTotal: number;
    }[];
    documentos: any[];
}

export type EmpresaPDFConfig = {
    nombre: string;
    rut: string;
    direccion: string;
    correo: string;
    telefono: string;
    logo: string;
};