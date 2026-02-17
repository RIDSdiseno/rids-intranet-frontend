// src/components/modals-empresa/CrearEmpresaModal.tsx

import React, { useState } from "react";
import { motion } from "framer-motion";

const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL ||
  "http://localhost:4000/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CrearEmpresaModal: React.FC<Props> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    try {
      setLoading(true);

      const body: any = { nombre };

      // Si llenan detalle, enviarlo completo
      if (rut && direccion && telefono && email) {
        body.rut = rut;
        body.direccion = direccion;
        body.telefono = telefono;
        body.email = email;
      }

      const res = await fetch(`${API_URL}/empresas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error al crear empresa");
      }

      onCreated();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre("");
    setRut("");
    setDireccion("");
    setTelefono("");
    setEmail("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
      >
        <h2 className="text-xl font-bold mb-4">
          Crear nueva empresa
        </h2>

        <div className="space-y-3">

          <input
            placeholder="Nombre de la empresa *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          />

          <hr />

          <p className="text-sm text-slate-500">
            Detalle (opcional)
          </p>

          <input
            placeholder="RUT"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          />

          <input
            placeholder="Dirección"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          />

          <input
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          />

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-white bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear empresa"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CrearEmpresaModal;
