import type {
  CotizacionItemGestioo,
  MonedaCotizacion,
  ItemCotizacionFrontend
} from "./types";
import { EstadoCotizacionGestioo, TipoCotizacionGestioo } from "./types";

import { ItemTipoGestioo } from "./types";

type ItemParaTotales = CotizacionItemGestioo | ItemCotizacionFrontend;

const IVA_RATE = 0.19;

// =====================================================
//  NORMALIZAR CLP  (quita puntos, convierte a número)
// =====================================================
export function normalizarCLP(valor: any): number {
  if (valor == null || valor === "") return 0;

  const limpio = Number(String(valor).replace(/\./g, ""));
  if (isNaN(limpio)) {
    console.warn("⚠️ Precio CLP inválido:", valor);
    return 0;
  }

  return limpio;
}
export const calcularTotales = (
  items: ItemParaTotales[]
) => {
  let subtotalBruto = 0;
  let descuentos = 0;
  let subtotal = 0;
  let iva = 0;

  // 1️⃣ Subtotal bruto
  items.forEach(item => {
    if (item.tipo === ItemTipoGestioo.ADICIONAL) return;

    const precioCLP = Number(item.precioOriginalCLP || 0);
    subtotalBruto += precioCLP * (item.cantidad || 1);
  });

  // 2️⃣ Descuentos + IVA
  items.forEach(item => {
    const porcentaje = Number(item.porcentaje) || 0;

    // Descuento global
    if (item.tipo === ItemTipoGestioo.ADICIONAL && porcentaje > 0) {
      descuentos += (subtotalBruto * porcentaje) / 100;
      return;
    }

    const precioCLP = Number(item.precioOriginalCLP || 0);
    const cantidad = Number(item.cantidad || 1);
    const base = precioCLP * cantidad;

    const descuentoItem =
      item.tieneDescuento && porcentaje > 0
        ? (base * porcentaje) / 100
        : 0;

    descuentos += descuentoItem;

    const baseFinal = base - descuentoItem;
    subtotal += baseFinal;

    if (item.tieneIVA) {
      iva += baseFinal * IVA_RATE;
    }
  });

  const total = subtotal + iva;

  return { subtotalBruto, descuentos, subtotal, iva, total };
};


export const calcularPrecioTotal = (
  precio: number,
  porcGanancia: number
): number => {
  if (!precio || precio <= 0) return 0;
  return Number((precio * (1 + porcGanancia / 100)).toFixed(2));
};

export const calcularPorcGanancia = (
  precio: number,
  precioTotal: number
): number => {
  if (!precio || precio <= 0) return 0;
  return Number((((precioTotal - precio) / precio) * 100).toFixed(2));
};


export const validarCotizacion = (cotizacion: any): string[] => {
  const errores: string[] = [];

  if (!cotizacion.entidad?.nombre?.trim()) {
    errores.push("El nombre de la entidad es obligatorio");
  }

  if (!cotizacion.entidad?.origen) {
    errores.push("El origen de la entidad es obligatorio");
  }

  if (cotizacion.items.length === 0) {
    errores.push("Debe agregar al menos un item");
  }

  cotizacion.items.forEach((item: any, index: number) => {
    if (!item.descripcion?.trim()) {
      errores.push(`Item ${index + 1}: La descripción es obligatoria`);
    }
    if (item.cantidad <= 0) {
      errores.push(`Item ${index + 1}: La cantidad debe ser mayor a 0`);
    }
    if (item.precio < 0) {
      errores.push(`Item ${index + 1}: El precio no puede ser negativo`);
    }
  });

  return errores;
};

export const validarRut = (rut: string) => {
  if (!rut) return false;

  // Patrón estricto corregido: permite hasta 3 dígitos al inicio
  const regex = /^[0-9]{1,3}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$/;
  if (!regex.test(rut)) return false;

  // Validación DV matemática
  const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  const dvReal =
    dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();

  return dv === dvReal;
};

export const formatearRut = (rut: string) => {
  rut = rut.replace(/^0+|[^0-9kK]+/g, "").toUpperCase();
  if (rut.length <= 1) return rut;
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);
  let formateado = "";
  let i = 0;
  for (let j = cuerpo.length - 1; j >= 0; j--) {
    formateado = cuerpo.charAt(j) + formateado;
    i++;
    if (i === 3 && j !== 0) {
      formateado = "." + formateado;
      i = 0;
    }
  }
  return `${formateado}-${dv}`;
};

export const validarNombre = (nombre: string) =>
  nombre.trim().length >= 3;

export const validarEmail = (email: string) => {
  if (!email) return true; // opcional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.toLowerCase());
};

export const validarTelefono = (telefono: string) => {
  if (!telefono) return true; // opcional
  const regex = /^(\+?56)?\s?9\d{8}$/;
  return regex.test(telefono.replace(/\s+/g, ""));
};

export const validarDireccion = (direccion: string) => {
  if (!direccion) return true; // opcional
  return direccion.trim().length >= 5;
};

export const formatEstado = (estado: EstadoCotizacionGestioo) => {
  const estados: { [key in EstadoCotizacionGestioo]: string } = {
    [EstadoCotizacionGestioo.BORRADOR]: "Borrador",
    [EstadoCotizacionGestioo.GENERADA]: "Generada",
    [EstadoCotizacionGestioo.ENVIADA]: "Enviada",
    [EstadoCotizacionGestioo.APROBADA]: "Aprobada",
    [EstadoCotizacionGestioo.RECHAZADA]: "Rechazada"
  };
  return estados[estado];
};

export const formatTipo = (tipo: TipoCotizacionGestioo) => {
  const tipos: { [key in TipoCotizacionGestioo]: string } = {
    [TipoCotizacionGestioo.CLIENTE]: "Cliente",
    [TipoCotizacionGestioo.INTERNA]: "Interna",
    [TipoCotizacionGestioo.PROVEEDOR]: "Proveedor"
  };
  return tipos[tipo];
};

// =====================================================
//  FORMATEO DE PRECIO (MOSTRAR USD / CLP)
// =====================================================
export function formatearPrecio(
  valorCLP: number,
  moneda: "CLP" | "USD",
  tasa: number
) {
  const redondear = (num: number) =>
    Math.round((num + Number.EPSILON) * 100) / 100;

  if (moneda === "USD") {
    const usd = redondear(valorCLP / tasa);
    return `US$ ${usd.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `$ ${Math.round(valorCLP).toLocaleString("es-CL")}`;
}

export const normalizarItemCotizacion = (
  item: any,
  moneda: "CLP" | "USD",
  tasaCambio: number
) => {
  const precioCosto = Number(item.precioCosto || 0);
  const porcGanancia = Number(item.porcGanancia || 0);

  // 🔥 Precio real CLP (fuente de la verdad)
  const precioOriginalCLP =
    item.precioOriginalCLP ??
    Math.round(precioCosto * (1 + porcGanancia / 100));

  return {
    ...item,

    // Texto (obligatorio)
    nombre: item.nombre ?? item.descripcion ?? "",
    descripcion: item.descripcion ?? "",

    // Financieros CLAVE
    precioCosto,
    porcGanancia,
    precioOriginalCLP,

    // Precio visible según moneda
    precio:
      moneda === "USD"
        ? precioOriginalCLP / (tasaCambio || 1)
        : precioOriginalCLP,

    cantidad: item.cantidad ?? 1,
    porcentaje: item.porcentaje ?? 0,
    tieneIVA: item.tieneIVA ?? true,
    tieneDescuento: item.tieneDescuento ?? false,
  };
};

export const calcularDescuentoItem = (item: any) => {
  if (!item.tieneDescuento || !item.porcentaje) return 0;

  const precio = Number(item.precio) || 0;
  const cantidad = Number(item.cantidad) || 1;

  return Math.round(precio * cantidad * (item.porcentaje / 100));
};

export const calcularValoresItem = (
  item: CotizacionItemGestioo
) => {
  const precioCLP = Number(item.precioOriginalCLP || 0);
  const cantidad = Number(item.cantidad || 1);
  const porcentaje = Number(item.porcentaje || 0);

  const base = precioCLP * cantidad;

  const descuento =
    item.tieneDescuento && porcentaje > 0
      ? (base * porcentaje) / 100
      : 0;

  const neto = base - descuento;
  const iva =
    item.tieneIVA && item.tipo !== ItemTipoGestioo.ADICIONAL
      ? neto * 0.19
      : 0;

  return {
    base,
    descuento,
    neto,
    iva,
    total: neto + iva,
  };
};

export const calcularLineaItem = (item: any) => {
  const precioCLP =
    Number(item.precioOriginalCLP ?? item.precio) || 0;

  const cantidad = Number(item.cantidad) || 1;
  const porcentaje = Number(item.porcentaje) || 0;

  const base = precioCLP * cantidad;

  const descuento =
    item.tieneDescuento && porcentaje > 0 && item.tipo !== "ADICIONAL"
      ? (base * porcentaje) / 100
      : 0;

  const neto = base - descuento;

  const iva = item.tieneIVA && item.tipo !== "ADICIONAL"
    ? neto * 0.19
    : 0;

  return {
    base,
    descuento,
    neto,
    iva,
    total: neto + iva,
    porcentajeMostrar: item.tieneDescuento ? porcentaje : 0,
    ivaPorcentajeMostrar: item.tieneIVA ? 19 : 0,
  };
};

