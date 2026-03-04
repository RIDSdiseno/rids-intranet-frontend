// components/reportes/WizardSelector.tsx
import React from "react";
import {
    ApartmentOutlined,
    CalendarOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import type { Empresa } from "../modals-reportes/typesReportes";

const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface WizardSelectorProps {
    empresas: Empresa[];
    empresaFiltro: string;
    selectedYear: string;
    selectedMonth: string;
    searchTerm: string;
    onSearchChange: (v: string) => void;
    onEmpresaChange: (id: string) => void;
    onYearChange: (y: string) => void;
    onMonthChange: (m: string) => void;
}

export const WizardSelector: React.FC<WizardSelectorProps> = ({
    empresas,
    empresaFiltro,
    selectedYear,
    selectedMonth,
    searchTerm,
    onSearchChange,
    onEmpresaChange,
    onYearChange,
    onMonthChange,
}) => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 8 }, (_, i) => String(currentYear - i));

    const canSelectYear = !!empresaFiltro;
    const canSelectMonth = canSelectYear && !!selectedYear;

    const empresasFiltradas = empresas.filter((e) =>
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectClass =
        "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Paso 1: Empresa */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
                    <ApartmentOutlined />
                    Paso 1 · Empresa
                </div>

                <label className="block text-sm text-slate-600 mb-2">Buscar</label>
                <div className="relative mb-3">
                    <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar empresa..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                    />
                </div>

                <label className="block text-sm text-slate-600 mb-2">
                    Seleccionar empresa
                </label>
                <select
                    value={empresaFiltro}
                    onChange={(e) => onEmpresaChange(e.target.value)}
                    className={selectClass}
                >
                    <option value="">— Selecciona —</option>
                    {empresasFiltradas.map((emp) => (
                        <option key={emp.id_empresa} value={String(emp.id_empresa)}>
                            {emp.nombre}
                        </option>
                    ))}
                </select>
            </div>

            {/* Paso 2: Año */}
            <div
                className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${!canSelectYear ? "opacity-50 pointer-events-none" : ""
                    }`}
            >
                <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
                    <CalendarOutlined />
                    Paso 2 · Año
                </div>
                <label className="block text-sm text-slate-600 mb-2">
                    Seleccionar año
                </label>
                <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(e.target.value)}
                    className={selectClass}
                    disabled={!canSelectYear}
                >
                    <option value="">— Selecciona —</option>
                    {years.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            {/* Paso 3: Mes */}
            <div
                className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${!canSelectMonth ? "opacity-50 pointer-events-none" : ""
                    }`}
            >
                <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
                    <CalendarOutlined />
                    Paso 3 · Mes
                </div>
                <label className="block text-sm text-slate-600 mb-2">
                    Seleccionar mes
                </label>
                <select
                    value={selectedMonth}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className={selectClass}
                    disabled={!canSelectMonth}
                >
                    <option value="">— Selecciona —</option>
                    {MONTHS.map((m, i) => (
                        <option key={m} value={String(i + 1)}>
                            {m}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};