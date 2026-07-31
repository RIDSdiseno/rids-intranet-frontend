// src/components/modals-cotizaciones/utils.tsx
import type {
  CotizacionItemGestioo,
  ItemCotizacionFrontend
} from "./types";
import { EstadoCotizacionGestioo, TipoCotizacionGestioo } from "./types";

import { ItemTipoGestioo } from "./types";

// =====================================================
//  CÁLCULO DE TOTALES
// =====================================================
type ItemParaTotales = CotizacionItemGestioo | ItemCotizacionFrontend;

// IVA fijo 19%
const IVA_RATE = 0.19;

/**
 * Redondea un número manteniendo la cantidad
 * de decimales indicada.
 */
export function redondearDecimal(
  valor: number,
  decimales = 2
): number {
  if (!Number.isFinite(valor)) {
    return 0;
  }

  const factor =
    10 ** decimales;

  return Math.round(
    (valor + Number.EPSILON) *
    factor
  ) / factor;
}

/**
 * Convierte valores escritos con formato
 * chileno o formato decimal de JavaScript.
 *
 * Ejemplos:
 * 140       -> 140
 * 140.5     -> 140.5
 * 140,5     -> 140.5
 * 1.250     -> 1250
 * 1.250,50  -> 1250.50
 */
export function normalizarCLP(
  valor: unknown
): number {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return 0;
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor)
      ? valor
      : 0;
  }

  let texto =
    String(valor)
      .trim()
      .replace(/\s/g, "");

  if (!texto) {
    return 0;
  }

  if (
    texto.includes(".") &&
    texto.includes(",")
  ) {
    /*
     * Formato chileno completo:
     * 1.250,50 -> 1250.50
     */
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (
    texto.includes(",")
  ) {
    /*
     * Decimal con coma:
     * 140,5 -> 140.5
     */
    texto =
      texto.replace(",", ".");
  } else if (
    /^\d{1,3}(\.\d{3})+$/.test(
      texto
    )
  ) {
    /*
     * Separador de miles:
     * 1.250 -> 1250
     * 1.250.000 -> 1250000
     */
    texto =
      texto.replace(/\./g, "");
  }

  const numero =
    Number(texto);

  if (!Number.isFinite(numero)) {
    console.warn(
      "Precio inválido:",
      valor
    );

    return 0;
  }

  return numero;
}

export const calcularTotales = (
  items: ItemParaTotales[]
) => {
  let subtotalBruto = 0;
  let descuentosItems = 0;
  let descuentoGlobal = 0;
  let subtotalAntesGlobal = 0;
  let ivaAntesGlobal = 0;

  /*
   * 1. Calcular subtotal bruto de todos
   * los productos y servicios.
   */
  items.forEach((item) => {
    if (
      item.tipo ===
      ItemTipoGestioo.ADICIONAL
    ) {
      return;
    }

    const precioCLP =
      normalizarCLP(
        item.precioOriginalCLP
      );

    const cantidad =
      normalizarCLP(
        item.cantidad
      ) || 1;

    subtotalBruto +=
      precioCLP * cantidad;
  });

  /*
   * 2. Procesar descuentos individuales,
   * bases finales e IVA.
   */
  items.forEach((item) => {
    if (
      item.tipo ===
      ItemTipoGestioo.ADICIONAL
    ) {
      return;
    }

    const precioCLP =
      normalizarCLP(
        item.precioOriginalCLP
      );

    const cantidad =
      normalizarCLP(
        item.cantidad
      ) || 1;

    const porcentaje =
      normalizarCLP(
        item.porcentaje
      );

    const base =
      precioCLP * cantidad;

    const descuentoItem =
      item.tieneDescuento &&
        porcentaje > 0
        ? (
          base *
          porcentaje
        ) / 100
        : 0;

    const baseFinal =
      Math.max(
        0,
        base -
        descuentoItem
      );

    descuentosItems +=
      descuentoItem;

    subtotalAntesGlobal +=
      baseFinal;

    if (item.tieneIVA) {
      ivaAntesGlobal +=
        baseFinal * IVA_RATE;
    }
  });

  /*
   * 3. Calcular descuentos globales representados
   * mediante ítems de tipo ADICIONAL.
   */
  items.forEach((item) => {
    if (
      item.tipo !==
      ItemTipoGestioo.ADICIONAL
    ) {
      return;
    }

    const porcentaje =
      normalizarCLP(
        item.porcentaje
      );

    if (porcentaje <= 0) {
      return;
    }

    descuentoGlobal +=
      (
        subtotalBruto *
        porcentaje
      ) / 100;
  });

  /*
   * Evitar que los descuentos globales produzcan
   * un subtotal negativo.
   */
  descuentoGlobal =
    Math.min(
      descuentoGlobal,
      subtotalAntesGlobal
    );

  const subtotal =
    Math.max(
      0,
      subtotalAntesGlobal -
      descuentoGlobal
    );

  /*
   * Reducir proporcionalmente el IVA cuando
   * existe un descuento global.
   */
  const factorGlobal =
    subtotalAntesGlobal > 0
      ? subtotal /
      subtotalAntesGlobal
      : 0;

  const iva =
    ivaAntesGlobal *
    factorGlobal;

  const descuentos =
    descuentosItems +
    descuentoGlobal;

  const total =
    subtotal + iva;

  return {
    subtotalBruto:
      redondearDecimal(
        subtotalBruto,
        2
      ),

    descuentos:
      redondearDecimal(
        descuentos,
        2
      ),

    subtotal:
      redondearDecimal(
        subtotal,
        2
      ),

    iva:
      redondearDecimal(
        iva,
        2
      ),

    total:
      redondearDecimal(
        total,
        2
      ),
  };
};

/**
 * Calcula el precio final aplicando
 * un porcentaje de ganancia.
 */
export const calcularPrecioTotal = (
  precio: number,
  porcGanancia: number
): number => {
  const costo =
    normalizarCLP(precio);

  const porcentaje =
    normalizarCLP(porcGanancia);

  if (costo <= 0) {
    return 0;
  }

  return redondearDecimal(
    costo *
    (1 + porcentaje / 100),
    2
  );
};

/**
 * Calcula el porcentaje de ganancia a partir
 * del costo y el precio de venta.
 */
export const calcularPorcGanancia = (
  precio: number,
  precioTotal: number
): number => {
  const costo =
    normalizarCLP(precio);

  const total =
    normalizarCLP(precioTotal);

  if (costo <= 0) {
    return 0;
  }

  return redondearDecimal(
    (
      (total - costo) /
      costo
    ) * 100,
    2
  );
};

// =====================================================
//  VALIDACIONES GENERALES
// =====================================================
export const validarCotizacion = (cotizacion: any): string[] => {
  const errores: string[] = [];

  if (!cotizacion.entidad?.nombre?.trim()) {
    errores.push("El nombre de la entidad es obligatorio");
  }

  if (!cotizacion.entidad?.origen) {
    errores.push("El origen de la entidad es obligatorio");
  }

  if (!cotizacion.items || cotizacion.items.length === 0) {
    errores.push("Debe agregar al menos un item");
  }

  cotizacion.items.forEach((item: any, index: number) => {
    const tieneNombre = item.nombre && item.nombre.trim() !== "";
    const tieneDescripcion =
      item.descripcion && item.descripcion.trim() !== "";

    // 🔥 CLAVE: nombre O descripción
    if (!tieneNombre && !tieneDescripcion) {
      errores.push(
        `Item ${index + 1}: Debe tener nombre o descripción`
      );
    }

    if (Number(item.cantidad) <= 0) {
      errores.push(
        `Item ${index + 1}: La cantidad debe ser mayor a 0`
      );
    }

    if (Number(item.precio) < 0) {
      errores.push(
        `Item ${index + 1}: El precio no puede ser negativo`
      );
    }
  });

  return errores;
};

// =====================================================
//  VALIDACIONES ESPECÍFICAS
// =====================================================
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

// Formatea un RUT chileno (agrega puntos y guion)
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

// Validar que el nombre tenga al menos 3 caracteres
export const validarNombre = (nombre: string) =>
  nombre.trim().length >= 3;

export const validarEmail = (email: string) => {
  if (!email) return true; // opcional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.toLowerCase());
};

// Validar teléfono chileno (9 dígitos, puede incluir +56 y espacios)
export const validarTelefono = (telefono: string) => {
  if (!telefono) return true; // opcional
  const regex = /^(\+?56)?\s?9\d{8}$/;
  return regex.test(telefono.replace(/\s+/g, ""));
};

// Validar que la dirección tenga al menos 5 caracteres
export const validarDireccion = (direccion: string) => {
  if (!direccion) return true; // opcional
  return direccion.trim().length >= 5;
};

// =====================================================
//  FORMATEO DE ESTADO Y TIPO
// =====================================================
export const formatEstado = (estado: EstadoCotizacionGestioo) => {
  const estados: { [key in EstadoCotizacionGestioo]: string } = {
    [EstadoCotizacionGestioo.BORRADOR]: "Borrador",
    [EstadoCotizacionGestioo.APROBADA]: "Aprobada",
    [EstadoCotizacionGestioo.RECHAZADA]: "Rechazada",
    [EstadoCotizacionGestioo.FACTURADA]: "Facturada", // 👈 FALTABA ESTO
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

/**
 * Formatea montos CLP o USD conservando
 * hasta dos decimales.
 */
export function formatearPrecio(
  valorCLP: number,
  moneda: "CLP" | "USD",
  tasa: number
) {
  const valorSeguro =
    redondearDecimal(
      Number(valorCLP) || 0,
      2
    );

  if (moneda === "USD") {
    const tasaSegura =
      Number(tasa) > 0
        ? Number(tasa)
        : 1;

    const valorUSD =
      redondearDecimal(
        valorSeguro /
        tasaSegura,
        2
      );

    return `US$ ${valorUSD.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  return `$ ${valorSeguro.toLocaleString(
    "es-CL",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

// =====================================================
//  NORMALIZAR ITEM COTIZACIÓN
// =====================================================
export const normalizarItemCotizacion = (
  item: any,
  moneda: "CLP" | "USD",
  tasaCambio: number
) => {
  const precioCosto =
    normalizarCLP(
      item.precioCosto
    );

  const porcGanancia =
    normalizarCLP(
      item.porcGanancia
    );

  const precioOriginalCLP =
    item.precioOriginalCLP !== null &&
      item.precioOriginalCLP !== undefined
      ? redondearDecimal(
        normalizarCLP(
          item.precioOriginalCLP
        ),
        2
      )
      : calcularPrecioTotal(
        precioCosto,
        porcGanancia
      );

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
        ? redondearDecimal(
          precioOriginalCLP /
          (tasaCambio || 1),
          2
        )
        : redondearDecimal(
          precioOriginalCLP,
          2
        ),

    cantidad: item.cantidad ?? 1,
    porcentaje: item.porcentaje ?? 0,
    tieneIVA: item.tieneIVA ?? true,
    tieneDescuento: item.tieneDescuento ?? false,
  };
};

// =====================================================
//  CÁLCULO DE VALORES POR ÍTEM
// =====================================================
export const calcularDescuentoItem = (
  item: any
) => {
  if (
    !item.tieneDescuento ||
    !item.porcentaje
  ) {
    return 0;
  }

  const precio =
    normalizarCLP(
      item.precio
    );

  const cantidad =
    normalizarCLP(
      item.cantidad
    ) || 1;

  const porcentaje =
    normalizarCLP(
      item.porcentaje
    );

  return redondearDecimal(
    precio *
    cantidad *
    (porcentaje / 100),
    2
  );
};

// Calcula los valores base, descuento, neto, iva y total de un ítem
export const calcularValoresItem = (
  item: CotizacionItemGestioo
) => {
  const precioCLP =
    normalizarCLP(
      item.precioOriginalCLP ??
      item.precio
    );

  const cantidad =
    Math.max(
      1,
      Math.trunc(
        normalizarCLP(
          item.cantidad
        ) || 1
      )
    );

  const porcentaje =
    Math.min(
      100,
      Math.max(
        0,
        normalizarCLP(
          item.porcentaje
        )
      )
    );

  const base =
    precioCLP *
    cantidad;

  const descuento =
    item.tieneDescuento &&
      porcentaje > 0
      ? (
        base *
        porcentaje
      ) / 100
      : 0;

  const neto =
    Math.max(
      0,
      base -
      descuento
    );

  const iva =
    item.tieneIVA &&
      item.tipo !==
      ItemTipoGestioo.ADICIONAL
      ? neto *
      IVA_RATE
      : 0;

  return {
    base:
      redondearDecimal(
        base,
        2
      ),

    descuento:
      redondearDecimal(
        descuento,
        2
      ),

    neto:
      redondearDecimal(
        neto,
        2
      ),

    iva:
      redondearDecimal(
        iva,
        2
      ),

    total:
      redondearDecimal(
        neto + iva,
        2
      ),
  };
};

// Calcula los valores detallados de un ítem para mostrar en la UI
export const calcularLineaItem = (item: any) => {
  const precioCLP =
    normalizarCLP(
      item.precioOriginalCLP ??
      item.precio
    );

  const cantidad =
    Math.max(
      1,
      Math.trunc(
        normalizarCLP(
          item.cantidad
        ) || 1
      )
    );

  const porcentaje =
    Math.min(
      100,
      Math.max(
        0,
        normalizarCLP(
          item.porcentaje
        )
      )
    );

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
    base:
      redondearDecimal(
        base,
        2
      ),

    descuento:
      redondearDecimal(
        descuento,
        2
      ),

    neto:
      redondearDecimal(
        neto,
        2
      ),

    iva:
      redondearDecimal(
        iva,
        2
      ),

    total:
      redondearDecimal(
        neto + iva,
        2
      ),

    porcentajeMostrar:
      item.tieneDescuento
        ? porcentaje
        : 0,

    ivaPorcentajeMostrar:
      item.tieneIVA
        ? 19
        : 0,
  };
};

export const estadoConfig: Record<
  EstadoCotizacionGestioo,
  {
    label: string;
    color: string;
    active: string;
  }
> = {
  BORRADOR: {
    label: "Borrador",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    active: "bg-slate-600 text-white border-slate-600",
  },
  APROBADA: {
    label: "Aprobada",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    active: "bg-emerald-600 text-white border-emerald-600",
  },
  RECHAZADA: {
    label: "Rechazada",
    color: "bg-rose-100 text-rose-700 border-rose-300",
    active: "bg-rose-600 text-white border-rose-600",
  },
  FACTURADA: {
    label: "Facturada",
    color: "bg-purple-100 text-purple-700 border-purple-300",
    active: "bg-purple-600 text-white border-purple-600",
  },
};

export function formatearMontoFinal(
  valorCLP: number,
  moneda: "CLP" | "USD",
  tasa: number
): string {
  const valorSeguro = Number(valorCLP) || 0;

  if (moneda === "USD") {
    const tasaSegura =
      Number(tasa) > 0
        ? Number(tasa)
        : 1;

    const valorUSD =
      redondearDecimal(
        valorSeguro / tasaSegura,
        2
      );

    return `US$ ${valorUSD.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  const montoEntero =
    Math.round(valorSeguro);

  return `$ ${montoEntero.toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}