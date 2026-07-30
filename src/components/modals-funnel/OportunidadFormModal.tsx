// src/components/modals-funnel/OportunidadFormModal.tsx
// Se usa ÚNICAMENTE para crear una oportunidad nueva. La edición ocurre
// inline dentro de OportunidadDrawer (ver OportunidadForm, componente compartido).
import { motion } from "framer-motion";
import type { CrearOportunidadPayload, OportunidadDetalle } from "./types";
import OportunidadForm from "./OportunidadForm";

interface OportunidadFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitCrear: (payload: CrearOportunidadPayload) => Promise<OportunidadDetalle | undefined>;
  onSuccess: (oportunidad: OportunidadDetalle) => void;
}

export default function OportunidadFormModal({ open, onClose, onSubmitCrear, onSuccess }: OportunidadFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Nueva oportunidad</h2>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <OportunidadForm
            oportunidad={null}
            onSubmitCrear={onSubmitCrear}
            onSuccess={(resultado) => {
              onSuccess(resultado);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </motion.div>
    </div>
  );
}
