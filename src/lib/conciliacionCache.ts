export type Provider = "RIDS" | "ECCONET";

export type ConciliacionRecord = {
  id: string;
  provider: Provider;
  empresa: string;
  fecha_emision?: string;
  tipo_dte?: string;
  folio?: string | number;
  cliente?: string;
  rut_cliente?: string;
  neto?: number;
  iva?: number;
  total?: number;
  estado_rcv?: string;
  estado_conciliacion?: string;
  forma_pago?: string | null;
  responsable?: string | null;
  fecha_conciliacion?: string | null;
};

const KEY = "conciliaciones_v1";
const OVERRIDE_KEY = "conciliaciones_overrides_v1";

function seedData(): ConciliacionRecord[] {
  const sample: ConciliacionRecord[] = [
    {
      id: "r1",
      provider: "RIDS",
      empresa: "COVASA",
      fecha_emision: "2026-04-26",
      tipo_dte: "33",
      folio: 619,
      cliente: "CONSTRUCTORA DANIEL SALINAS Y CIA LTDA",
      rut_cliente: "83568800-3",
      neto: 154000,
      iva: 29260,
      total: 183260,
      estado_rcv: "PENDIENTE",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
      // responsable and fecha_conciliacion intentionally omitted for RIDS test cleanup
    },
    {
      id: "r3",
      provider: "RIDS",
      empresa: "COVASA",
      fecha_emision: "2026-04-05",
      tipo_dte: "33",
      folio: 601,
      cliente: "PROVEEDORES DEL SUR SPA",
      rut_cliente: "76543210-1",
      neto: 120000,
      iva: 22800,
      total: 142800,
      estado_rcv: "CONFIRMADO",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
      // no responsable/fecha_conciliacion for RIDS
    },
    {
      id: "r4",
      provider: "RIDS",
      empresa: "COVASA",
      fecha_emision: "2026-04-12",
      tipo_dte: "33",
      folio: 602,
      cliente: "SERVICIOS INTEGRALES SPA",
      rut_cliente: "71234567-6",
      neto: 450000,
      iva: 85500,
      total: 535500,
      estado_rcv: "PENDIENTE",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
    },
    {
      id: "r5",
      provider: "RIDS",
      empresa: "COVASA",
      fecha_emision: "2026-04-20",
      tipo_dte: "34",
      folio: 603,
      cliente: "CONSTRUCTORA ALFA LIMITADA",
      rut_cliente: "70123456-0",
      neto: 98000,
      iva: 18620,
      total: 116620,
      estado_rcv: "CONFIRMADO",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
    },
    {
      id: "r2",
      provider: "RIDS",
      empresa: "COVASA",
      fecha_emision: "2026-04-26",
      tipo_dte: "33",
      folio: 617,
      cliente: "SIGMA CONSTRUCCIONES SPA",
      rut_cliente: "78505870-4",
      neto: 283000,
      iva: 53770,
      total: 336770,
      estado_rcv: "PENDIENTE",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
      // responsable and fecha_conciliacion intentionally omitted for RIDS test cleanup
    },
    {
      id: "e1",
      provider: "ECCONET",
      empresa: "ECCONET LTD",
      fecha_emision: "2026-04-23",
      tipo_dte: "33",
      folio: 607,
      cliente: "INMOBILIARIA Y CONSTRUCTORA ERRAZURIZ SPA",
      rut_cliente: "76449378-8",
      neto: 123200,
      iva: 23408,
      total: 146608,
      estado_rcv: "CONFIRMADO",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
      responsable: null,
      fecha_conciliacion: null,
    },
    {
      id: "e2",
      provider: "ECCONET",
      empresa: "ECCONET LTD",
      fecha_emision: "2026-04-02",
      tipo_dte: "33",
      folio: 600,
      cliente: "CLIENTE ECCO UNO",
      rut_cliente: "72345678-9",
      neto: 200000,
      iva: 38000,
      total: 238000,
      estado_rcv: "PENDIENTE",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
      responsable: null,
      fecha_conciliacion: null,
    },
    {
      id: "e3",
      provider: "ECCONET",
      empresa: "ECCONET LTD",
      fecha_emision: "2026-04-15",
      tipo_dte: "33",
      folio: 605,
      cliente: "CLIENTE ECCO DOS",
      rut_cliente: "73456789-0",
      neto: 310000,
      iva: 58900,
      total: 368900,
      estado_rcv: "CONFIRMADO",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
      responsable: null,
      fecha_conciliacion: null,
    },
  ];

  return sample;
}

export function getAllConciliaciones(): ConciliacionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seedData();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }

    return JSON.parse(raw) as ConciliacionRecord[];
  } catch (e) {
    const s = seedData();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
}

export function getConciliacionesByProvider(provider: Provider): ConciliacionRecord[] {
  return getAllConciliaciones().filter((r) => r.provider === provider);
}

export function updateConciliacion(id: string, patch: Partial<ConciliacionRecord>): ConciliacionRecord | null {
  const all = getAllConciliaciones();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const updated = { ...all[idx], ...patch };
  all[idx] = updated;
  localStorage.setItem(KEY, JSON.stringify(all));
  try { console.log("conciliacionCache.updateConciliacion -> saved", id, updated); } catch {}
  return updated;
}

export function saveOverride(id: string, patch: Partial<ConciliacionRecord>) {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    const map = raw ? JSON.parse(raw) as Record<string, Partial<ConciliacionRecord>> : {};
    map[id] = { ...(map[id] ?? {}), ...patch };
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map));
    try { console.log("conciliacionCache.saveOverride -> saved", id, map[id]); } catch {}
  } catch (e) {
    // ignore
  }
}

export function getOverrides(): Record<string, Partial<ConciliacionRecord>> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) as Record<string, Partial<ConciliacionRecord>> : {};
  } catch (e) {
    return {};
  }
}

export function applyOverrides(rows: ConciliacionRecord[]): ConciliacionRecord[] {
  const overrides = getOverrides();
  try { console.log("conciliacionCache.applyOverrides -> overrides keys", Object.keys(overrides)); } catch {}
  return rows.map(r => overrides[r.id] ? { ...r, ...overrides[r.id] } : r);
}

export function removeOverride(id: string) {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, Partial<ConciliacionRecord>>;
    if (map[id]) {
      delete map[id];
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map));
      try { console.log('conciliacionCache.removeOverride -> removed', id); } catch {}
    }
  } catch (e) {
    // ignore
  }
}

export function saveAllConciliaciones(rows: ConciliacionRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function resetSeed(): ConciliacionRecord[] {
  const s = seedData();
  localStorage.setItem(KEY, JSON.stringify(s));
  try { localStorage.removeItem(OVERRIDE_KEY); } catch {}
  return s;
}
