// pages/ReportesPage.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DownloadOutlined,
    FileExcelOutlined,
    TeamOutlined,
    LaptopOutlined,
    CalendarOutlined,
    WarningOutlined,
    BuildOutlined,
    LoadingOutlined,
    HomeOutlined,
    BarChartOutlined,
    FilterOutlined,
    SearchOutlined
} from "@ant-design/icons";
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import * as XLSX from 'xlsx-js-style';

// Interfaces
interface ExportStatus {
    exporting: boolean;
    error: string | null;
    progress?: number;
}

interface Empresa {
    id_empresa: number;
    nombre: string;
}

interface ReporteGeneralData {
    solicitantes: any[];
    equipos: any[];
    visitas: any[];
    tickets: any[];
    empresaFiltro?: string;
}

const ReportesPage: React.FC = () => {
    const navigate = useNavigate();
    const [exportStatus, setExportStatus] = useState<ExportStatus>({ exporting: false, error: null });
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [empresaFiltro, setEmpresaFiltro] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Cargar empresas al montar el componente
    useEffect(() => {
        const cargarEmpresas = async () => {
            try {
                const token = localStorage.getItem("accessToken");
                const response = await fetch('http://localhost:4000/api/empresas?pageSize=1000', {
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                });

                if (!response.ok) throw new Error('Error al cargar empresas');
                const result = await response.json();
                setEmpresas(result.data || result.items || []);
            } catch (error) {
                console.error('Error cargando empresas:', error);
                setGlobalError('No se pudieron cargar las empresas');
            }
        };
        cargarEmpresas();
    }, []);

    // Función para aplicar estilos a las hojas
    const applyBasicStyles = (worksheet: XLSX.WorkSheet, data: any[]) => {
        if (!worksheet['!ref']) return worksheet;

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "2E5BFF" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            }
        };

        const cellStyle = {
            border: {
                top: { style: "thin", color: { rgb: "E5E7EB" } },
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                left: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
        };

        const range = XLSX.utils.decode_range(worksheet['!ref']);

        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = headerStyle;
            }
        }

        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (worksheet[cellAddress]) {
                    worksheet[cellAddress].s = cellStyle;
                }
            }
        }

        if (!worksheet['!cols']) {
            worksheet['!cols'] = [];
            const maxCols = range.e.c - range.s.c + 1;
            for (let i = 0; i < maxCols; i++) {
                worksheet['!cols'].push({ wch: 20 });
            }
        }

        return worksheet;
    };

    // Función optimizada para obtener datos con estructura real
    const obtenerDatosConPaginacion = async (endpoint: string, empresaId?: string) => {
        const token = localStorage.getItem("accessToken");
        const API_URL = 'http://localhost:4000/api';

        // Ajustar pageSize según el endpoint
        const getPageSize = () => {
            switch (endpoint) {
                case 'visitas': return 100;
                case 'solicitantes': return 100;
                default: return 200;
            }
        };

        const MAX_PAGE_SIZE = getPageSize();

        try {
            console.log(`🔍 Obteniendo ${endpoint} para empresa:`, empresaId);

            const firstU = new URL(`${API_URL}/${endpoint}`);
            firstU.searchParams.set("page", "1");
            firstU.searchParams.set("pageSize", String(MAX_PAGE_SIZE));

            // CORRECCIÓN: Para tickets usar parámetro "empresa" (nombre) en lugar de "empresaId"
            if (empresaId && empresaId !== '') {
                if (endpoint === 'tickets') {
                    // Para tickets, usar el parámetro "empresa" con el nombre
                    const empresaSeleccionada = empresas.find(e => e.id_empresa === parseInt(empresaId));
                    if (empresaSeleccionada) {
                        firstU.searchParams.set("empresa", empresaSeleccionada.nombre);
                        console.log(`🎯 Filtro tickets por empresa: ${empresaSeleccionada.nombre}`);
                    }
                } else {
                    // Para otros endpoints, usar "empresaId" normalmente
                    firstU.searchParams.set("empresaId", empresaId);
                }
            }

            firstU.searchParams.set("_ts", String(Date.now()));

            console.log(`📡 URL de ${endpoint}:`, firstU.toString());

            const firstR = await fetch(firstU.toString(), {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: "include",
                cache: "no-store",
            });

            if (!firstR.ok) {
                console.error(`❌ Error HTTP ${firstR.status} para ${endpoint}`);
                throw new Error(`HTTP ${firstR.status}`);
            }

            const first = await firstR.json();
            console.log(`✅ Respuesta ${endpoint}:`, first);

            // Extraer datos basado en la estructura real de cada endpoint
            let all = [];
            if (endpoint === 'tickets') {
                all = [...(first.rows || [])];
            } else {
                all = [...(first.items || first.data || [])];
            }

            // Paginación si es necesario
            const totalPages = first.totalPages || 1;
            console.log(`📄 ${endpoint} - Total páginas: ${totalPages}, items en primera página: ${all.length}`);

            for (let p = 2; p <= totalPages; p++) {
                const u = new URL(`${API_URL}/${endpoint}`);
                u.searchParams.set("page", String(p));
                u.searchParams.set("pageSize", String(MAX_PAGE_SIZE));

                // Aplicar el mismo filtro para las páginas siguientes
                if (empresaId && empresaId !== '') {
                    if (endpoint === 'tickets') {
                        const empresaSeleccionada = empresas.find(e => e.id_empresa === parseInt(empresaId));
                        if (empresaSeleccionada) {
                            u.searchParams.set("empresa", empresaSeleccionada.nombre);
                        }
                    } else {
                        u.searchParams.set("empresaId", empresaId);
                    }
                }

                u.searchParams.set("_ts", String(Date.now()));

                const r = await fetch(u.toString(), {
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    credentials: "include",
                    cache: "no-store",
                });

                if (!r.ok) throw new Error(`HTTP ${r.status} en página ${p}`);
                const pj = await r.json();

                if (endpoint === 'tickets') {
                    all.push(...(pj.rows || []));
                } else {
                    all.push(...(pj.items || pj.data || []));
                }
            }

            console.log(`📊 Total ${endpoint} obtenidos:`, all.length);
            return all;
        } catch (error) {
            console.error(`💥 Error obteniendo ${endpoint}:`, error);
            return [];
        }
    };

    // Obtener todos los datos para el reporte general
    const obtenerDatosReporteGeneral = async (): Promise<ReporteGeneralData> => {
        const empresaId = empresaFiltro || '';

        console.log('🚀 Iniciando obtención de datos para reporte general...');

        const [solicitantes, equipos, visitas, tickets] = await Promise.all([
            obtenerDatosConPaginacion('solicitantes', empresaId),
            obtenerDatosConPaginacion('equipos', empresaId),
            obtenerDatosConPaginacion('visitas', empresaId),
            obtenerDatosConPaginacion('tickets', empresaId)
        ]);

        console.log('📋 Resumen de datos obtenidos:');
        console.log('- Solicitantes:', solicitantes.length);
        console.log('- Equipos:', equipos.length);
        console.log('- Visitas:', visitas.length);
        console.log('- Tickets:', tickets.length);

        // DEBUG: Ver estructura de datos
        if (solicitantes.length > 0) {
            console.log('🔍 Ejemplo de solicitante:', JSON.stringify(solicitantes[0], null, 2));
        }
        if (tickets.length > 0) {
            console.log('🔍 Ejemplo de ticket:', JSON.stringify(tickets[0], null, 2));
        }

        return {
            solicitantes,
            equipos,
            visitas,
            tickets,
            empresaFiltro: empresaId
        };
    };

    // Función optimizada para crear hojas basada en estructuras reales
    const crearHojaConDatos = (wb: XLSX.WorkBook, datos: any[], nombreHoja: string, mapeoFunc: (item: any) => any) => {
        if (datos.length > 0) {
            try {
                const datosMapeados = datos.map(mapeoFunc);
                console.log(`📝 Creando hoja ${nombreHoja} con ${datosMapeados.length} filas`);
                const ws = XLSX.utils.json_to_sheet(datosMapeados);
                applyBasicStyles(ws, datosMapeados);
                XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
            } catch (error) {
                console.error(`❌ Error creando hoja ${nombreHoja}:`, error);
                const ws = XLSX.utils.json_to_sheet([{ 'Error': `No se pudieron cargar los datos para ${nombreHoja}` }]);
                XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
            }
        } else {
            console.log(`📭 No hay datos para la hoja ${nombreHoja}, creando hoja vacía`);
            const datosVacios = [{ 'Mensaje': 'No hay datos disponibles' }];
            const ws = XLSX.utils.json_to_sheet(datosVacios);
            applyBasicStyles(ws, datosVacios);
            XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
        }
    };

    // Mapeadores específicos basados en las estructuras reales de JSON
    const mapeadorSolicitantes = (solicitante: any) => {
        // CORRECCIÓN: El email viene en el campo 'email' pero puede ser null
        // Según el JSON: "email": null
        return {
            'ID': solicitante.id_solicitante,
            'Nombre': solicitante.nombre || '',
            'Email': solicitante.email || 'No disponible en sistema', // Muestra mensaje cuando es null
            'Empresa': solicitante.empresa?.nombre || '',
            'Cantidad de Equipos': Array.isArray(solicitante.equipos) ? solicitante.equipos.length : 0,
            'Estado': 'Activo'
        };
    };

    const mapeadorEquipos = (equipo: any) => {
        return {
            'ID': equipo.id_equipo,
            'Serial': equipo.serial || '',
            'Marca': equipo.marca || '',
            'Modelo': equipo.modelo || '',
            'Procesador': equipo.procesador || '',
            'RAM': equipo.ram || '',
            'Disco': equipo.disco || '',
            'Propiedad': equipo.propiedad || '',
            'Solicitante ID': equipo.idSolicitante || '',
            'Estado': 'Activo'
        };
    };

    const mapeadorVisitas = (visita: any) => {
        return {
            'ID': visita.id_visita,
            'Técnico': visita.tecnico?.nombre || 'No asignado',
            'Empresa': visita.empresa?.nombre || '',
            'Solicitante': visita.solicitante || visita.solicitanteRef?.nombre || '',
            'Fecha Inicio': visita.inicio ? new Date(visita.inicio).toLocaleString('es-CL') : '',
            'Fecha Fin': visita.fin ? new Date(visita.fin).toLocaleString('es-CL') : '',
            'Estado': visita.status || '',
            'Checklist Completado': visita.status === 'COMPLETADA' ? 'Sí' : 'No',
            'Actualizaciones': visita.actualizaciones ? 'Sí' : 'No',
            'Antivirus': visita.antivirus ? 'Sí' : 'No',
            'CCleaner': visita.ccleaner ? 'Sí' : 'No',
            'Estado Disco': visita.estadoDisco ? 'Sí' : 'No',
            'Licencia Office': visita.licenciaOffice ? 'Sí' : 'No',
            'Licencia Windows': visita.licenciaWindows ? 'Sí' : 'No',
            'Mantenimiento Reloj': visita.mantenimientoReloj ? 'Sí' : 'No',
            'Rendimiento Equipo': visita.rendimientoEquipo ? 'Sí' : 'No',
            'Config. Impresoras': visita.confImpresoras ? 'Sí' : 'No',
            'Config. Teléfonos': visita.confTelefonos ? 'Sí' : 'No',
            'Config. Pie Página': visita.confPiePagina ? 'Sí' : 'No',
            'Otros': visita.otros ? 'Sí' : 'No',
            'Detalle Otros': visita.otrosDetalle || ''
        };
    };

    const mapeadorTickets = (ticket: any) => {
        return {
            'ID Ticket': ticket.ticket_id,
            'Solicitante': ticket.solicitante_email || '',
            'Empresa': ticket.empresa || 'Sin empresa asignada',
            'Asunto': ticket.subject || '',
            'Tipo': ticket.type || '',
            'Fecha': ticket.fecha ? new Date(ticket.fecha).toLocaleString('es-CL') : '',
            'Estado': 'Abierto' // No viene en el JSON, asumimos abierto
        };
    };

    // Exportar Reporte General CORREGIDO
    const exportReporteGeneral = async () => {
        try {
            setExportStatus({ exporting: true, error: null });
            setGlobalError(null);

            console.log('🎯 Iniciando exportación de reporte general...');

            // Obtener todos los datos
            const data = await obtenerDatosReporteGeneral();

            // Crear workbook
            const wb = XLSX.utils.book_new();

            // ========== HOJA DE RESUMEN EJECUTIVO ==========
            const empresaNombre = empresaFiltro
                ? empresas.find(e => e.id_empresa === parseInt(empresaFiltro))?.nombre || 'Empresa seleccionada'
                : 'Todas las empresas';

            const resumenData = [
                { 'Métrica': 'Empresa', 'Valor': empresaNombre },
                { 'Métrica': 'Total Solicitantes', 'Valor': data.solicitantes.length },
                { 'Métrica': 'Total Equipos', 'Valor': data.equipos.length },
                { 'Métrica': 'Total Visitas', 'Valor': data.visitas.length },
                { 'Métrica': 'Total Tickets', 'Valor': data.tickets.length },
                { 'Métrica': 'Fecha de Reporte', 'Valor': new Date().toLocaleDateString('es-CL') },
                { 'Métrica': 'Hora de Generación', 'Valor': new Date().toLocaleTimeString('es-CL') }
            ];

            const wsResumen = XLSX.utils.json_to_sheet(resumenData);
            applyBasicStyles(wsResumen, resumenData);
            XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Ejecutivo");

            // ========== HOJA DE SOLICITANTES ==========
            crearHojaConDatos(wb, data.solicitantes, "Solicitantes", mapeadorSolicitantes);

            // ========== HOJA DE EQUIPOS ==========
            crearHojaConDatos(wb, data.equipos, "Equipos", mapeadorEquipos);

            // ========== HOJA DE VISITAS TÉCNICAS ==========
            crearHojaConDatos(wb, data.visitas, "Visitas Técnicas", mapeadorVisitas);

            // ========== HOJA DE TICKETS ==========
            crearHojaConDatos(wb, data.tickets, "Tickets", mapeadorTickets);

            // ========== HOJA DE ESTADÍSTICAS DETALLADAS ==========
            const visitasCompletadas = data.visitas.filter((v: any) =>
                v.status === 'COMPLETADA'
            ).length;

            const estadisticasData = [
                { 'Categoría': 'Total Equipos', 'Valor': data.equipos.length },
                { 'Categoría': 'Total Solicitantes', 'Valor': data.solicitantes.length },
                { 'Categoría': 'Visitas Completadas', 'Valor': visitasCompletadas },
                { 'Categoría': 'Visitas Pendientes', 'Valor': data.visitas.length - visitasCompletadas },
                { 'Categoría': 'Total Tickets', 'Valor': data.tickets.length },
                { 'Categoría': 'Empresa del Reporte', 'Valor': empresaNombre }
            ];

            const wsEstadisticas = XLSX.utils.json_to_sheet(estadisticasData);
            applyBasicStyles(wsEstadisticas, estadisticasData);
            XLSX.utils.book_append_sheet(wb, wsEstadisticas, "Estadísticas");

            // Generar nombre del archivo
            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            let fileName = `Reporte_General_${timestamp}.xlsx`;

            if (empresaFiltro) {
                const empresaSeleccionada = empresas.find(e => e.id_empresa === parseInt(empresaFiltro));
                if (empresaSeleccionada) {
                    const nombreEmpresa = empresaSeleccionada.nombre.replace(/\s+/g, '_').replace(/[^\w]/g, '');
                    fileName = `Reporte_${nombreEmpresa}_${timestamp}.xlsx`;
                }
            }

            console.log('💾 Guardando archivo:', fileName);
            XLSX.writeFile(wb, fileName);
            setExportStatus({ exporting: false, error: null });

        } catch (error) {
            console.error('💥 Error en exportación general:', error);
            setExportStatus({
                exporting: false,
                error: `Error al exportar reporte general: ${error instanceof Error ? error.message : 'Error desconocido'}`
            });
        }
    };

    // Filtrar empresas para el buscador
    const empresasFiltradas = empresas.filter(empresa =>
        empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Navegación
    const goToDashboard = () => navigate('/');
    const goToAnalytics = () => navigate('/empresas');

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
            <Header />

            {/* Botones de navegación */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-6 py-3">
                    <div className="flex gap-4">
                        <button
                            onClick={goToDashboard}
                            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                        >
                            <HomeOutlined />
                            Dashboard
                        </button>
                        <button
                            onClick={goToAnalytics}
                            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                        >
                            <BarChartOutlined />
                            Analytics
                        </button>
                    </div>
                </div>
            </div>

            <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
                {/* Header principal */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-extrabold text-slate-800 mb-4">
                        <FileExcelOutlined className="mr-4 text-green-600" />
                        Reporte General del Sistema
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Genera un reporte completo unificado con todos los datos del sistema
                    </p>
                </motion.div>

                {/* Error Global */}
                {globalError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"
                    >
                        {globalError}
                    </motion.div>
                )}

                {/* Panel de Filtros */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FilterOutlined className="text-blue-600" />
                            Filtros del Reporte
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Buscador de Empresas */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Buscar Empresa
                            </label>
                            <div className="relative">
                                <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar empresa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                                />
                            </div>
                        </div>

                        {/* Selector de Empresa */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Filtrar por Empresa
                            </label>
                            <select
                                value={empresaFiltro}
                                onChange={(e) => setEmpresaFiltro(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todas las empresas</option>
                                {empresasFiltradas.map(empresa => (
                                    <option key={empresa.id_empresa} value={empresa.id_empresa.toString()}>
                                        {empresa.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Información del Filtro */}
                    {empresaFiltro && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                            <p className="text-sm text-blue-700">
                                <strong>Filtro activo:</strong> {empresas.find(e => e.id_empresa === parseInt(empresaFiltro))?.nombre}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                El reporte incluirá SOLO datos relacionados con esta empresa
                            </p>
                        </motion.div>
                    )}
                </motion.div>

                {/* Botón de Exportación */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-center mb-8"
                >
                    <button
                        onClick={exportReporteGeneral}
                        disabled={exportStatus.exporting}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                        {exportStatus.exporting ? (
                            <>
                                <LoadingOutlined className="animate-spin mr-3" />
                                Generando Reporte...
                            </>
                        ) : (
                            <>
                                <DownloadOutlined className="mr-3" />
                                Generar Reporte General
                            </>
                        )}
                    </button>

                    {exportStatus.error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
                        >
                            {exportStatus.error}
                        </motion.div>
                    )}

                    <div className="mt-4 text-xs text-slate-500">
                        <p>Revisa la consola del navegador para ver detalles de la exportación</p>
                    </div>
                </motion.div>

                {/* Información del Reporte */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-8"
                >
                    <h3 className="font-bold text-slate-800 mb-6 text-xl flex items-center justify-center">
                        <BuildOutlined className="mr-3 text-slate-600" />
                        Contenido del Reporte General
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <FileExcelOutlined className="text-blue-600 text-2xl mb-2" />
                            <h4 className="font-semibold text-slate-700">Resumen</h4>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <TeamOutlined className="text-green-600 text-2xl mb-2" />
                            <h4 className="font-semibold text-slate-700">Solicitantes</h4>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <LaptopOutlined className="text-purple-600 text-2xl mb-2" />
                            <h4 className="font-semibold text-slate-700">Equipos</h4>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <CalendarOutlined className="text-orange-600 text-2xl mb-2" />
                            <h4 className="font-semibold text-slate-700">Visitas</h4>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <WarningOutlined className="text-red-600 text-2xl mb-2" />
                            <h4 className="font-semibold text-slate-700">Tickets</h4>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-600 text-center">
                            <strong>Nota:</strong> {empresaFiltro
                                ? `El reporte incluirá SOLO datos de "${empresas.find(e => e.id_empresa === parseInt(empresaFiltro))?.nombre}"`
                                : `El reporte incluirá datos de TODAS las empresas del sistema.`
                            }
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default ReportesPage;