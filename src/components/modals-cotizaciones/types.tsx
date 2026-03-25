export const ORIGEN_MAP = {
  RIDS: "RIDS",
  ECONNET: "ECONNET",
  OTRO: "OTRO",
};

export const EstadoCotizacionGestioo = {
  BORRADOR: "BORRADOR",
  APROBADA: "APROBADA",
  RECHAZADA: "RECHAZADA",
  FACTURADA: "FACTURADA",
} as const;


export const TipoCotizacionGestioo = {
  CLIENTE: "CLIENTE",
  INTERNA: "INTERNA",
  PROVEEDOR: "PROVEEDOR"
} as const;

export const ItemTipoGestioo = {
  PRODUCTO: "PRODUCTO",
  SERVICIO: "SERVICIO",
  ADICIONAL: "ADICIONAL"
} as const;

export const MonedaCotizacion = {
  CLP: "CLP",
  USD: "USD",
} as const;

export type MonedaCotizacion = typeof MonedaCotizacion[keyof typeof MonedaCotizacion];
export type EstadoCotizacionGestioo = typeof EstadoCotizacionGestioo[keyof typeof EstadoCotizacionGestioo];
export type TipoCotizacionGestioo = typeof TipoCotizacionGestioo[keyof typeof TipoCotizacionGestioo];
export type ItemTipoGestioo = typeof ItemTipoGestioo[keyof typeof ItemTipoGestioo];

export interface EntidadGestioo {
  id: number;
  nombre: string;
  rut?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  origen?: string;
  createdAt?: string;
}

export interface CotizacionItemGestioo {
  id: number;
  cotizacionId: number;
  tipo: ItemTipoGestioo;

  nombre: string;          // 👈 nombre visible
  descripcion: string;     // 👈 descripción larga

  cantidad: number;
  precio: number;
  precioCosto?: number;
  porcGanancia?: number;
  porcentaje?: number | null;
  tieneDescuento?: boolean;
  createdAt: string;
  tieneIVA?: boolean;
  sku?: string;
  seccionId: number;
  imagen?: string | null;
  precioOriginalCLP?: number;
  productoId?: number | null;

  servicioId?: number;

  equipoId?: number | null;
  equipo?: {
    id_equipo: number;
    serial: string | null;
    marca: string;
    modelo: string;
  } | null;
}

export interface CotizacionGestioo {
  id: number;
  fecha: string;
  estado: EstadoCotizacionGestioo;
  tipo: TipoCotizacionGestioo;
  entidadId: number | null;
  entidad: EntidadGestioo | null;
  subtotal?: number;      // ✅ agrega esto
  descuentos?: number;    // ✅ agrega esto
  iva?: number;           // ✅ agrega esto
  total: number;
  secciones?: SeccionCotizacion[];
  moneda: MonedaCotizacion;
  tasaCambio: number | null;
  items: CotizacionItemGestioo[];
  createdAt: string;
  updatedAt: string;
  comentariosCotizacion?: string | null;
  personaResponsable?: string | null;
  imagen?: string | null;
  ordenGenerada?: boolean;
}

export interface ItemCotizacionFrontend {
  tipo: ItemTipoGestioo;
  descripcion: string;
  cantidad: number;
  precio: number;

  precioCosto?: number | null;
  porcGanancia?: number | null;

  porcentaje?: number | null;
  tieneDescuento?: boolean;

  tieneIVA?: boolean;
  sku?: string | null;
  seccionId?: number;

  imagen?: string | null;

  precioOriginalCLP?: number | null;
}

export interface ProductoForm {
  nombre: string;
  descripcion: string;
  precio: number;
  porcGanancia: number;
  precioTotal: number;
  categoria: string;
  stock: number;
  serie: string;

  imagen: string | null;
  imagenFile: File | null;
}

export interface EmpresaForm {
  nombre: string;
  rut: string;
  correo: string;
  telefono: string;
  direccion: string;
  origen: string;
}

export interface FormData {
  tipoEntidad: "EMPRESA" | "PERSONA";
  origenEntidad: string;
  entidadId: string;
  moneda: MonedaCotizacion;
  tasaCambio: number;

  secciones: SeccionCotizacion[];
  seccionActiva: number;

  comentariosCotizacion: string;

  personaResponsable?: string;

  estadoCotizacion: EstadoCotizacionGestioo;

  imagenFile?: File;
  imagen?: string;
}

export interface Toast {
  type: "success" | "error";
  message: string;
}

export interface FiltrosProductos {
  texto: string;
  codigo: string;
  precioMin: string;
  precioMax: string;
  categoria: string;
}

export interface FiltrosServicios {
  texto: string;
  codigo: string;
  precioMin: string;
  precioMax: string;
  categoria: string;
}

export interface FiltrosHistorial {
  origen: string;
  estado: string;
  tipo: string;
  tecnico?: string;
}

export interface SeccionCotizacion {
  id: number;
  nombre: string;
  descripcion?: string;
  items: any[];
  orden: number;
}
