import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

// TYPES
import type {
    Empresa,
    Solicitante,
    MarcaEquipo,
    ProcesadorEquipo,
    RamEquipo,
    DiscoEquipo,
    TipoEquipoValue,
} from "./types";

import {
    MARCAS_EQUIPO,
    MODELOS_POR_MARCA,
    PROCESADORES,
    RAMS,
    DISCOS,
    TipoEquipo,
    TipoEquipoLabel,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export interface ModalNuevoEquipoProps {
    onClose: () => void;
    onSaved: (nuevoId: number) => void;
}

export const ModalNuevoEquipo: React.FC<ModalNuevoEquipoProps> = ({
    onClose,
    onSaved,
}) => {
    // ===============================
    // Estados principales
    // ===============================
    const [marca, setMarca] = useState<MarcaEquipo | "">("");
    const [modelo, setModelo] = useState<string>("");
    const [serie, setSerie] = useState("");
    const [tipo, setTipo] = useState<TipoEquipoValue>(TipoEquipo.GENERICO);

    const [procesador, setProcesador] = useState<ProcesadorEquipo | "">("");
    const [ram, setRam] = useState<RamEquipo | "">("");
    const [disco, setDisco] = useState<DiscoEquipo | "">("");

    // ===============================
    // Empresa / Solicitante
    // ===============================
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [empresaId, setEmpresaId] = useState<string>("");

    const [solicitantes, setSolicitantes] = useState<Solicitante[]>([]);
    const [idSolicitante, setIdSolicitante] = useState<string>("");

    const [loading, setLoading] = useState(false);

    // ===============================
    // Reset modelo al cambiar marca
    // ===============================
    useEffect(() => {
        setModelo("");
    }, [marca]);

    // ===============================
    // Cargar empresas
    // ===============================
    useEffect(() => {
        fetch(`${API_URL}/empresas`, { credentials: "include" })
            .then((res) => res.json())
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : [];
                setEmpresas(list);
            })
            .catch(() => setEmpresas([]));
    }, []);

    // ===============================
    // Cargar solicitantes por empresa
    // ===============================
    useEffect(() => {
        if (!empresaId) {
            setSolicitantes([]);
            setIdSolicitante("");
            return;
        }

        fetch(
            `${API_URL}/solicitantes/by-empresa?empresaId=${empresaId}`,
            { credentials: "include" }
        )
            .then((res) => res.json())
            .then((data) => {
                setSolicitantes(data.items ?? []);
            })
            .catch(() => setSolicitantes([]));
    }, [empresaId]);

    // ===============================
    // Guardar equipo
    // ===============================
    const handleSave = async () => {
        if (!marca || !modelo || !serie.trim()) {
            alert("Marca, modelo y serie son obligatorios");
            return;
        }

        if (empresaId && !idSolicitante) {
            alert("Debe seleccionar un solicitante");
            return;
        }

        // 👉 AQUÍ VA
        const empresaSeleccionada = empresas.find(
            (e) => String(e.id_empresa) === empresaId
        );

        const propiedad = empresaSeleccionada?.nombre ?? "";

        if (!propiedad) {
            alert("Debe seleccionar una empresa válida");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                marca,
                modelo,
                serial: serie.trim(),
                tipo,
                procesador: procesador || null,
                ram: ram || null,
                disco: disco || null,
                propiedad,
                idSolicitante: idSolicitante ? Number(idSolicitante) : null,
            };

            const res = await fetch(`${API_URL}/equipos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Error al crear equipo");
            }

            const data = await res.json();
            onSaved(data.id ?? data.id_equipo);
            onClose();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // ===============================
    // Render
    // ===============================
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
            >
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">
                        Nuevo Equipo
                    </h3>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                    >
                        ✕
                    </button>

                    <div className="space-y-4">
                        {/* MARCA */}
                        <select
                            value={marca}
                            onChange={(e) => setMarca(e.target.value as MarcaEquipo)}
                            className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                        >
                            <option value="">— Seleccionar marca —</option>
                            {MARCAS_EQUIPO.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>

                        {/* MODELO */}
                        <select
                            value={modelo}
                            onChange={(e) => setModelo(e.target.value)}
                            disabled={!marca}
                            className="w-full border rounded-xl px-4 py-3 text-sm bg-white disabled:bg-slate-100"
                        >
                            <option value="">— Seleccionar modelo —</option>
                            {marca &&
                                MODELOS_POR_MARCA[marca]?.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                        </select>

                        {/* SERIE */}
                        <input
                            placeholder="Serie *"
                            value={serie}
                            onChange={(e) => setSerie(e.target.value)}
                            className="w-full border rounded-xl px-4 py-3 text-sm"
                        />

                        {/* TIPO */}
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as TipoEquipoValue)}
                            className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                        >
                            {Object.values(TipoEquipo).map((t) => (
                                <option key={t} value={t}>
                                    {TipoEquipoLabel[t]}
                                </option>
                            ))}
                        </select>

                        {/* PROCESADOR */}
                        <select
                            value={procesador}
                            onChange={(e) => setProcesador(e.target.value as ProcesadorEquipo)}
                            className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                        >
                            <option value="">— Procesador —</option>
                            {PROCESADORES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>

                        {/* RAM */}
                        <select
                            value={ram}
                            onChange={(e) => setRam(e.target.value as RamEquipo)}
                            className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                        >
                            <option value="">— RAM —</option>
                            {RAMS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>

                        {/* DISCO */}
                        <select
                            value={disco}
                            onChange={(e) => setDisco(e.target.value as DiscoEquipo)}
                            className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                        >
                            <option value="">— Disco —</option>
                            {DISCOS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>

                        {/* EMPRESA */}
                        <select
                            value={empresaId}
                            onChange={(e) => setEmpresaId(e.target.value)}
                            className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                        >
                            <option value="">— Empresa —</option>
                            {empresas.map((emp) => (
                                <option key={emp.id_empresa} value={emp.id_empresa}>
                                    {emp.nombre}
                                </option>
                            ))}
                        </select>

                        {/* SOLICITANTE */}
                        {empresaId && (
                            <select
                                value={idSolicitante}
                                onChange={(e) => setIdSolicitante(e.target.value)}
                                className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
                            >
                                <option value="">— Solicitante —</option>
                                {solicitantes.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button onClick={onClose} className="px-6 py-2 rounded-xl border">
                            Cancelar
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700"
                        >
                            {loading ? "Guardando..." : "Guardar Equipo"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
