import type {
  CotizacionItemGestioo,
  MonedaCotizacion,
} from "./types";
import { EstadoCotizacionGestioo, TipoCotizacionGestioo } from "./types";

import { ItemTipoGestioo } from "./types";

export const calcularTotales = (items: CotizacionItemGestioo[]) => {
  let subtotalBruto = 0;
  let descuentos = 0;
  let subtotal = 0;
  let iva = 0;
  let total = 0;

  items.forEach(item => {
    const base = Number(item.precio || 0) * Number(item.cantidad || 1);
    subtotalBruto += base;

    // Calcular porcentaje seguro
    const porcentaje = item.porcentaje ? Number(item.porcentaje) : 0;

    // Descuento solo si aplica
    const descuentoItem =
      (item.tieneDescuento && porcentaje > 0 && item.tipo !== ItemTipoGestioo.ADICIONAL)
        ? (base * porcentaje) / 100
        : 0;

    descuentos += descuentoItem;
    const baseConDescuento = base - descuentoItem;

    // Calcular IVA
    const ivaItem =
      (item.tieneIVA && item.tipo !== ItemTipoGestioo.ADICIONAL)
        ? baseConDescuento * 0.19
        : 0;

    iva += ivaItem;
    const totalItem = baseConDescuento + ivaItem;

    subtotal += baseConDescuento;
    total += totalItem;
  });

  return { subtotalBruto, descuentos, subtotal, iva, total };
};

export const calcularPrecioTotal = (precio: number, porcGanancia: number): number => {
  if (!precio || precio <= 0) return 0;
  const total = precio * (1 + porcGanancia / 100);
  return Number(total.toFixed(2));
};

export const calcularPorcGanancia = (precio: number, precioTotal: number): number => {
  if (!precio || precio <= 0) return 0;
  const ganancia = ((precioTotal - precio) / precio) * 100;
  return Number(ganancia.toFixed(2));
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

export const formatearPrecio = (precioCLP: number, moneda: MonedaCotizacion, tasaCambio: number = 1): string => {
  if (moneda === "USD") {
    const precioUSD = precioCLP / tasaCambio;
    return `US$ ${precioUSD.toFixed(2)}`;
  }
  return `$ ${Math.round(precioCLP).toLocaleString("es-CL")}`;
};