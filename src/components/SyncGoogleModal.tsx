// src/components/SyncGoogleModal.tsx
import React, { useEffect, useState } from "react";

type Empresa = { id_empresa: number; nombre: string };

type Props = {
  open: boolean;
  empresas: Empresa[];
  syncing?: boolean;
  onClose: () => void;
  onSubmit: (payload: { empresaId: number; domain: string; email?: string }) => void;
};

const SyncGoogleModal: React.FC<Props> = ({
  open,
  empresas,
  syncing = false,
  onClose,
  onSubmit,
}) => {
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) {
      setEmpresaId("");
      setDomain("");
      setEmail("");
    }
  }, [open]);

  if (!open) return null;

  const handleOk = () => {
    const d = domain.trim();
    const e = email.trim();
    if (!empresaId) {
      alert("Selecciona una empresa.");
      return;
    }
    if (!d) {
      alert("Dominio requerido (ej: midominio.cl).");
      return;
    }
    onSubmit({ empresaId: Number(empresaId), domain: d, ...(e ? { email: e } : {}) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg">
        <div className="mb-3 text-lg font-semibold">Actualizar cuentas desde Google</div>

        <div className="space-y-3">
          <label className="block text-sm">
            Empresa (obligatorio)
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecciona…</option>
              {empresas.map((e) => (
                <option key={e.id_empresa} value={e.id_empresa}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Dominio (obligatorio)
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="midominio.cl"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            Email (opcional, para sincronizar solo 1 usuario)
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="usuario@midominio.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="rounded-xl border px-4 py-2 text-sm" onClick={onClose} disabled={syncing}>
            Cancelar
          </button>
          <button
            className={
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white " +
              (syncing ? "bg-cyan-400 cursor-wait" : "bg-cyan-600 hover:bg-cyan-700")
            }
            onClick={handleOk}
            disabled={syncing}
          >
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncGoogleModal;
