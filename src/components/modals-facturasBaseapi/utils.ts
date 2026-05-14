import type { EmpresaKey, EmpresaPDFConfig, TabRCV } from "./types";

export const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const EMPRESAS_PDF: Record<EmpresaKey, EmpresaPDFConfig> = {
    rids: {
        nombre: "ASESORÍAS RIDS LTDA.",
        rut: "77.825.186-8",
        direccion: "Santiago, Chile",
        correo: "soporte@rids.cl",
        telefono: "+56 9 8823 1976",
        logo: "/img/splash.png",
    },
    econnet: {
        nombre: "ECONNET",
        rut: "76.758.352-4",
        direccion: "Santiago, Chile",
        correo: "contacto@econnet.cl",
        telefono: "",
        logo: "/img/ecconetlogo.png",
    },
};

export function formatCLP(valor: any) {
    const limpio = String(valor ?? "0").replace(/\./g, "").replace(",", ".");
    const numero = Number(limpio);
    return new Intl.NumberFormat("es-CL", {
        style: "currency", currency: "CLP", maximumFractionDigits: 0,
    }).format(Number.isFinite(numero) ? numero : 0);
}

export function formatFechaVista(value?: any) {
    if (!value) return "—";

    const raw = String(value).trim();

    if (!raw || raw === "—") return "—";

    // Si viene como YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split("-");
        return `${day}/${month}/${year}`;
    }

    // Si viene como YYYY-MM-DDTHH:mm:ss.sssZ
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        const date = new Date(raw);

        if (Number.isNaN(date.getTime())) return raw;

        return date.toLocaleDateString("es-CL", {
            timeZone: "America/Santiago",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    // Si ya viene como DD/MM/YYYY o DD/MM/YYYY HH:mm:ss
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
        return raw.slice(0, 10);
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleDateString("es-CL", {
        timeZone: "America/Santiago",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function getValue(doc: any, keys: string[], fallback: any = "—") {
    for (const key of keys) {
        const value = doc?.[key];
        if (value !== undefined && value !== null && value !== "") return value;
    }
    return fallback;
}

export function getRutContraparte(doc: any, tipo: TabRCV) {
    return tipo === "ventas"
        ? getValue(doc, ["Rut cliente", "RUT Cliente", "rutCliente", "rutReceptor"], "Sin RUT")
        : getValue(doc, ["RUT Proveedor", "Rut Proveedor", "rutProveedor"], "Sin RUT");
}

export function getNombreContraparte(doc: any) {
    return getValue(doc, [
        "Razon Social", "Razón Social", "Razon Social Receptor", "Razón Social Receptor",
        "Razon Social Proveedor", "Razón Social Proveedor", "razonSocial",
        "razonSocialProveedor", "razonSocialReceptor",
    ], "Sin razón social");
}

export function getMontoTotalDoc(doc: any) {
    return toNumberCL(getValue(doc, ["Monto total", "Monto Total", "montoTotal"], 0));
}

export function getTipoDoc(doc: any) {
    return String(getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "Sin tipo"));
}

export function getFechaDoc(doc: any) {
    return String(getValue(doc, ["Fecha Docto", "Fecha Recepcion", "fechaDocto", "fechaEmision"], "Sin fecha"));
}

export function toNumberCL(value: any) {
    const raw = String(value ?? "0").replace(/\./g, "").replace(",", ".");
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
}

export function getBaseApiPayload(json: any) {
    return json?.data?.data ?? json?.data ?? {};
}

export function getDocumentos(json: any): any[] {
    const payload = getBaseApiPayload(json);
    if (Array.isArray(payload?.datos)) return payload.datos;
    if (Array.isArray(payload?.documentos)) return payload.documentos;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

export function getResumenPorTipo(json: any): any[] {
    const payload = getBaseApiPayload(json);
    if (Array.isArray(payload?.resumenPorTipo)) return payload.resumenPorTipo;
    return [];
}

export function safeParseUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export function decodeBase64Utf8(base64?: string) {
    if (!base64) return "";
    try {
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder("utf-8").decode(bytes);
    } catch { return ""; }
}

export function getXmlBase64FromDteResponse(detalleDte: any): string {
    return detalleDte?.data?.data?.documento?.xml_base64
        ?? detalleDte?.data?.documento?.xml_base64
        ?? detalleDte?.documento?.xml_base64
        ?? "";
}

export function getDocumentoDte(detalleDte: any) {
    return detalleDte?.data?.data?.documento
        ?? detalleDte?.data?.documento
        ?? detalleDte?.documento
        ?? null;
}

export function getItemsFromDteResponse(detalleDte: any): any[] {
    const documento =
        detalleDte?.data?.data?.documento ??
        detalleDte?.data?.documento ??
        detalleDte?.documento ??
        null;

    if (Array.isArray(documento?.items)) return documento.items;
    if (Array.isArray(documento?.detalles)) return documento.detalles;
    if (Array.isArray(detalleDte?.data?.items)) return detalleDte.data.items;

    return [];
}

export function escapeHtml(value?: string | number | null) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function formatFechaPDF(value?: any) {
    if (!value) return "—";

    const raw = String(value);

    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
        return raw.slice(0, 10);
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleDateString("es-CL");
}

export function formatFechaHoraVista(value?: any) {
    if (!value) return "—";

    const raw = String(value).trim();

    if (!raw || raw === "—") return "—";

    // Si ya viene como DD/MM/YYYY HH:mm:ss, la dejamos como está
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
        return raw;
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleString("es-CL", {
        timeZone: "America/Santiago",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

export function formatFechaHoraPDF(value?: any) {
    if (!value) return "—";

    const raw = String(value).trim();

    if (!raw || raw === "—") return "—";

    // Si viene como "06/05/2026 12:06:28", mantener fecha y hora.
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
        return raw;
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

export function getNombreDtePDF(tipoDTE?: string | number, tipoDTEString?: string) {
    if (tipoDTEString) return String(tipoDTEString).toUpperCase();

    const tipo = Number(tipoDTE);

    if (tipo === 33) return "FACTURA ELECTRÓNICA";
    if (tipo === 34) return "FACTURA NO AFECTA O EXENTA ELECTRÓNICA";
    if (tipo === 39) return "BOLETA ELECTRÓNICA";
    if (tipo === 41) return "BOLETA EXENTA ELECTRÓNICA";
    if (tipo === 56) return "NOTA DE DÉBITO ELECTRÓNICA";
    if (tipo === 61) return "NOTA DE CRÉDITO ELECTRÓNICA";

    return `DTE ${tipoDTE ?? ""}`;
}

export function getTituloResumenPDF(tipoDTE?: string | number) {
    const tipo = Number(tipoDTE);

    if (tipo === 33) return "RESUMEN DE FACTURA ELECTRÓNICA";
    if (tipo === 34) return "RESUMEN DE FACTURA EXENTA";
    if (tipo === 61) return "RESUMEN DE NOTA DE CRÉDITO";

    return "RESUMEN DE DOCUMENTO TRIBUTARIO";
}

export function getNombreArchivoPDF(empresa: EmpresaKey, tipoDTE: any, folio: any) {
    const tipo = Number(tipoDTE);

    if (tipo === 34) return `Resumen-Factura-Exenta-${empresa}-${folio}.pdf`;
    if (tipo === 33) return `Resumen-Factura-${empresa}-${folio}.pdf`;
    if (tipo === 61) return `Resumen-Nota-Credito-${empresa}-${folio}.pdf`;

    return `Resumen-DTE-${empresa}-${folio}.pdf`;
}

export async function imageUrlToBase64(url: string): Promise<string> {
    try {
        const finalUrl = url.startsWith("http")
            ? url
            : `${window.location.origin}${url}`;

        const response = await fetch(finalUrl);
        const blob = await response.blob();

        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return "";
    }
}

export async function esperarImagenes(root: HTMLElement) {
    const images = Array.from(root.querySelectorAll("img"));

    await Promise.all(
        images.map(
            (img) =>
                new Promise<void>((resolve) => {
                    if ((img as HTMLImageElement).complete) {
                        resolve();
                        return;
                    }

                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                })
        )
    );
}

export function parseDteXml(xmlString: string) {
    if (!xmlString) return null;

    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlString, "text/xml");

        const parserError = getFirstElementByLocalName(xml, "parsererror");
        if (parserError) return null;

        const documento = getFirstElementByLocalName(xml, "Documento");
        if (!documento) return null;

        const encabezado = getFirstElementByLocalName(documento, "Encabezado");
        const idDoc = encabezado ? getFirstElementByLocalName(encabezado, "IdDoc") : null;
        const emisor = encabezado ? getFirstElementByLocalName(encabezado, "Emisor") : null;
        const receptor = encabezado ? getFirstElementByLocalName(encabezado, "Receptor") : null;
        const totales = encabezado ? getFirstElementByLocalName(encabezado, "Totales") : null;

        const detalles = getElementsByLocalName(documento, "Detalle").map((detalle, index) => {
            const cdgItem = getFirstElementByLocalName(detalle, "CdgItem");

            return {
                nroLinDet: getDirectTextByLocalName(detalle, "NroLinDet") || index + 1,
                codigo: cdgItem ? getFirstTextByLocalName(cdgItem, "VlrCodigo") : "",
                nombre: getDirectTextByLocalName(detalle, "NmbItem"),
                descripcion: getDirectTextByLocalName(detalle, "DscItem"),
                cantidad: getDirectTextByLocalName(detalle, "QtyItem"),
                unidad: getDirectTextByLocalName(detalle, "UnmdItem"),
                precio: getDirectTextByLocalName(detalle, "PrcItem"),
                monto: getDirectTextByLocalName(detalle, "MontoItem"),
            };
        });

        const referencias = getElementsByLocalName(documento, "Referencia").map((ref) => ({
            nroLinRef: getDirectTextByLocalName(ref, "NroLinRef"),
            tipoDocRef: getDirectTextByLocalName(ref, "TpoDocRef"),
            folioRef: getDirectTextByLocalName(ref, "FolioRef"),
            fechaRef: getDirectTextByLocalName(ref, "FchRef"),
            razonRef: getDirectTextByLocalName(ref, "RazonRef"),
        }));

        return {
            idDoc: {
                tipoDte: idDoc ? getFirstTextByLocalName(idDoc, "TipoDTE") : "",
                folio: idDoc ? getFirstTextByLocalName(idDoc, "Folio") : "",
                fechaEmision: idDoc ? getFirstTextByLocalName(idDoc, "FchEmis") : "",
                formaPago: idDoc ? getFirstTextByLocalName(idDoc, "FmaPago") : "",
                fechaVencimiento: idDoc ? getFirstTextByLocalName(idDoc, "FchVenc") : "",
            },
            emisor: {
                rut: emisor ? getFirstTextByLocalName(emisor, "RUTEmisor") : "",
                razonSocial: emisor ? getFirstTextByLocalName(emisor, "RznSoc") : "",
                giro: emisor ? getFirstTextByLocalName(emisor, "GiroEmis") : "",
                direccion: emisor ? getFirstTextByLocalName(emisor, "DirOrigen") : "",
                comuna: emisor ? getFirstTextByLocalName(emisor, "CmnaOrigen") : "",
                ciudad: emisor ? getFirstTextByLocalName(emisor, "CiudadOrigen") : "",
            },
            receptor: {
                rut: receptor ? getFirstTextByLocalName(receptor, "RUTRecep") : "",
                razonSocial: receptor ? getFirstTextByLocalName(receptor, "RznSocRecep") : "",
                giro: receptor ? getFirstTextByLocalName(receptor, "GiroRecep") : "",
                direccion: receptor ? getFirstTextByLocalName(receptor, "DirRecep") : "",
                comuna: receptor ? getFirstTextByLocalName(receptor, "CmnaRecep") : "",
                ciudad: receptor ? getFirstTextByLocalName(receptor, "CiudadRecep") : "",
            },
            totales: {
                montoNeto: totales ? getFirstTextByLocalName(totales, "MntNeto") : "",
                montoExento: totales ? getFirstTextByLocalName(totales, "MntExe") : "",
                tasaIva: totales ? getFirstTextByLocalName(totales, "TasaIVA") : "",
                iva: totales ? getFirstTextByLocalName(totales, "IVA") : "",
                montoTotal: totales ? getFirstTextByLocalName(totales, "MntTotal") : "",
            },
            detalles,
            referencias,
        };
    } catch {
        return null;
    }
}

export function getTextFromXml(parent: Element | Document, selector: string): string {
    const node = parent.querySelector(selector);
    return node?.textContent?.trim() ?? "";
}

export function getFirstTextByLocalName(parent: Element | Document, localName: string): string {
    const nodes = Array.from(parent.getElementsByTagName("*"));
    const node = nodes.find((n) => n.localName === localName);
    return node?.textContent?.trim() ?? "";
}

export function getDirectTextByLocalName(parent: Element, localName: string): string {
    const children = Array.from(parent.children);
    const node = children.find((n) => n.localName === localName);
    return node?.textContent?.trim() ?? "";
}

export function getFirstElementByLocalName(parent: Element | Document, localName: string): Element | null {
    const nodes = Array.from(parent.getElementsByTagName("*"));
    return nodes.find((n) => n.localName === localName) ?? null;
}

export function getElementsByLocalName(parent: Element | Document, localName: string): Element[] {
    return Array.from(parent.getElementsByTagName("*")).filter((n) => n.localName === localName);
}

export function getItemsVisualesParaPdf(detalleDte: any): any[] {
    const xmlBase64 = getXmlBase64FromDteResponse(detalleDte);
    const xmlDecodificado = decodeBase64Utf8(xmlBase64);
    const dteVisual = parseDteXml(xmlDecodificado);

    if (dteVisual?.detalles && dteVisual.detalles.length > 0) {
        return dteVisual.detalles.map((item: any, index: number) => ({
            nroLinDet: item.nroLinDet || index + 1,
            codigo: item.codigo || "",
            nombre: item.nombre || "Ítem",
            descripcion: item.descripcion || "",
            cantidad: item.cantidad || "",
            unidad: item.unidad || "",
            precio: item.precio || 0,
            monto: item.monto || 0,
        }));
    }

    const documentoDte = getDocumentoDte(detalleDte);

    const posiblesItems =
        Array.isArray(documentoDte?.items)
            ? documentoDte.items
            : Array.isArray(documentoDte?.detalles)
                ? documentoDte.detalles
                : Array.isArray(detalleDte?.data?.items)
                    ? detalleDte.data.items
                    : [];

    return posiblesItems.map((item: any, index: number) => ({
        nroLinDet:
            item.nroLinDet ??
            item.NroLinDet ??
            item.linea ??
            index + 1,

        codigo:
            item.codigo ??
            item.Codigo ??
            item.vlrCodigo ??
            item.VlrCodigo ??
            "",

        nombre:
            item.nombre ??
            item.NmbItem ??
            item.nmbItem ??
            item.descripcion ??
            item.Descripcion ??
            "Ítem",

        descripcion:
            item.descripcion ??
            item.DscItem ??
            item.dscItem ??
            "",

        cantidad:
            item.cantidad ??
            item.QtyItem ??
            item.qtyItem ??
            "",

        unidad:
            item.unidad ??
            item.unidadMedida ??
            item.UnmdItem ??
            item.unmdItem ??
            "",

        precio:
            item.precio ??
            item.precioUnitario ??
            item.PrcItem ??
            item.prcItem ??
            0,

        monto:
            item.monto ??
            item.montoItem ??
            item.MontoItem ??
            item.monto_item ??
            0,
    }));
}