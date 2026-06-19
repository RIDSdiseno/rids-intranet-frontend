export type PdfOrigenKey = "RIDS" | "ECONNET" | "OTRO";

export type PdfOrigenData = {
    nombre: string;
    direccion: string;
    correo: string;
    telefono: string;
    rut: string;
    logo: string;
};

export const PDF_ORIGEN_DATA: Record<PdfOrigenKey, PdfOrigenData> = {
    RIDS: {
        nombre: "RIDS LTDA",
        direccion: "Santiago - Providencia, La Concepción 65",
        correo: "soporte@rids.cl",
        telefono: "+56 9 8823 1976",
        rut: "76.758.352-4",
        logo: "/img/splash.png",
    },
    ECONNET: {
        nombre: "ECONNET SPA",
        direccion: "Santiago - Providencia, La Concepción 65",
        correo: "ventas@econnet.cl",
        telefono: "+56 9 8807 6593",
        rut: "76.758.352-4",
        logo: "/img/ecconetlogo.png",
    },
    OTRO: {
        nombre: "Empresa",
        direccion: "",
        correo: "",
        telefono: "",
        rut: "",
        logo: "/img/splash.png",
    },
};

export function normalizarPdfOrigen(value?: string | null): PdfOrigenKey {
    if (value === "RIDS" || value === "ECONNET" || value === "OTRO") {
        return value;
    }

    return "RIDS";
}

export function getPdfOrigenInfo(
    origen: PdfOrigenKey,
    fallback?: {
        nombre?: string | null;
        direccion?: string | null;
        correo?: string | null;
        telefono?: string | null;
        rut?: string | null;
    }
): PdfOrigenData {
    if (origen !== "OTRO") {
        return PDF_ORIGEN_DATA[origen];
    }

    return {
        ...PDF_ORIGEN_DATA.OTRO,
        nombre: fallback?.nombre ?? "Empresa",
        direccion: fallback?.direccion ?? "",
        correo: fallback?.correo ?? "",
        telefono: fallback?.telefono ?? "",
        rut: fallback?.rut ?? "",
    };
}