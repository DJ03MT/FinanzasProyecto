import React, { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Download, BrainCircuit, TrendingUp, DollarSign, Activity } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useFinancial } from '../context/FinancialContext';

const Reports = () => {
    const { analysisData } = useFinancial();
    const reportRef = useRef<HTMLDivElement>(null);

    if (!analysisData || !analysisData.ratios) return <Navigate to="/entry" replace />;

    const { ratios, flujo_efectivo, horizontal, conclusion, financial_statements, proforma } = analysisData;

    // Obtener datos del último año para el resumen principal
    const years = Object.keys(financial_statements).map(Number).sort();
    const lastYear = years[years.length - 1];
    const statement = financial_statements[lastYear];
    const ultimoRatio = ratios[ratios.length - 1];
    const ultimoFlujo = flujo_efectivo.length > 0 ? flujo_efectivo[flujo_efectivo.length - 1] : null;

    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        try {
            // Esperamos un momento para asegurar que los estilos carguen
            setTimeout(async () => {
                const canvas = await html2canvas(reportRef.current!, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Reporte_Financiero_${lastYear}.pdf`);
            }, 100);
        } catch (e) { alert("Error al generar PDF"); }
    };

    return (
        <div className="p-8 space-y-6 bg-slate-100 min-h-screen">
            <header className="flex justify-between items-center no-print">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Vista Previa de Impresión</h1>
                    <p className="text-slate-500">Reporte Integral {lastYear}</p>
                </div>
                <button onClick={handleDownloadPDF} className="bg-red-600 text-white px-6 py-2 rounded shadow flex gap-2 hover:bg-red-700 transition-colors">
                    <Download size={20} /> Descargar PDF Oficial
                </button>
            </header>

            <div className="flex justify-center overflow-auto pb-10">
                {/* --- HOJA A4 --- */}
                <div ref={reportRef} className="bg-white p-12 shadow-2xl text-slate-800" style={{ width: '210mm', minHeight: '297mm' }}>

                    {/* ENCABEZADO */}
                    <div className="border-b-4 border-slate-900 pb-4 mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">INFORME EJECUTIVO</h1>
                            <p className="text-slate-500 mt-1 uppercase tracking-widest text-xs">FinAnalyzer Pro 360</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-2xl text-slate-800">{lastYear}</p>
                            <p className="text-xs text-slate-400">Confidencial</p>
                        </div>
                    </div>

                    {/* 1. DIAGNÓSTICO IA */}
                    <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600 mb-8">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-lg">
                            <BrainCircuit size={20} /> Diagnóstico Inteligente & Recomendaciones
                        </h3>
                        <div className="text-sm text-justify leading-relaxed whitespace-pre-line text-slate-800 font-medium">
                            {conclusion}
                        </div>
                    </div>

                    {/* 2. RESUMEN ESTADOS FINANCIEROS */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-bold border-b pb-2 mb-2 text-slate-700">Estado de Resultados {lastYear}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Ventas Netas:</span> <b>{fmt(statement.income_statement.net_sales)}</b></div>
                                <div className="flex justify-between"><span>Utilidad Bruta:</span> <span>{fmt(statement.income_statement.gross_profit)}</span></div>
                                <div className="flex justify-between font-bold text-green-700 pt-2 border-t"><span>Utilidad Neta:</span> <span>{fmt(statement.income_statement.net_income)}</span></div>
                            </div>
                        </div>
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-bold border-b pb-2 mb-2 text-slate-700">Balance General {lastYear}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Total Activos:</span> <b>{fmt(statement.balance_sheet.assets.total)}</b></div>
                                <div className="flex justify-between"><span>Total Pasivos:</span> <span>{fmt(statement.balance_sheet.liabilities.total)}</span></div>
                                <div className="flex justify-between font-bold text-blue-700 pt-2 border-t"><span>Patrimonio:</span> <span>{fmt(statement.balance_sheet.equity.total)}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* 3. PROFORMA (PROYECCIÓN) */}
                    {proforma && (
                        <div className="mb-8 p-4 border-2 border-dashed border-purple-200 bg-purple-50 rounded-lg">
                            <h3 className="font-bold text-lg mb-2 text-purple-800 flex items-center gap-2">
                                <TrendingUp size={18} /> Proyección Proforma {proforma.year_proj}
                            </h3>
                            <p className="text-sm mb-3 text-purple-600">
                                Escenario basado en crecimiento histórico de ventas del <b>{proforma.growth_rate.toFixed(2)}%</b>.
                            </p>
                            <div className="grid grid-cols-3 gap-4 text-sm font-mono bg-white p-3 rounded border border-purple-100">
                                <div>
                                    <span className="text-xs text-slate-400 block">Ventas Est.</span>
                                    <span className="font-bold">{fmt(proforma.proforma.ventas)}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block">Costo Vta Est.</span>
                                    <span>{fmt(proforma.proforma.costo_ventas)}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block">Utilidad Neta Est.</span>
                                    <span className="font-bold text-green-600">{fmt(proforma.proforma.utilidad_neta)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. FLUJO DE EFECTIVO Y RATIOS */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="font-bold border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
                                <DollarSign size={16} /> Flujo de Efectivo
                            </h3>
                            {ultimoFlujo ? (
                                <div className="text-sm space-y-2">
                                    <div className="flex justify-between"><span>Método Indirecto:</span> <b>{fmt(ultimoFlujo.indirecto.flujo_neto)}</b></div>
                                    <div className="flex justify-between"><span>Método Directo (Est):</span> <b>{fmt(ultimoFlujo.directo.flujo_neto)}</b></div>
                                    <p className="text-xs text-slate-400 mt-1 italic">*Flujo Operativo Neto</p>
                                </div>
                            ) : <p className="text-xs text-slate-400">Requiere 2 años de datos.</p>}
                        </div>
                        <div>
                            <h3 className="font-bold border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
                                <Activity size={16} /> Ratios Clave (DuPont)
                            </h3>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between"><span>ROE:</span> <b className="text-blue-600">{ultimoRatio.rentabilidad.roe.toFixed(2)}%</b></div>
                                <div className="flex justify-between"><span>Margen Neto:</span> <span>{ultimoRatio.rentabilidad.margen_neto.toFixed(2)}%</span></div>
                                <div className="flex justify-between"><span>Rotación Activos:</span> <span>{ultimoRatio.rentabilidad.componentes_dupont.rotacion.toFixed(2)}x</span></div>
                                <div className="flex justify-between"><span>Apalancamiento:</span> <span>{ultimoRatio.rentabilidad.componentes_dupont.multiplicador.toFixed(2)}x</span></div>
                            </div>
                        </div>
                    </div>

                    {/* 5. VARIACIONES PRINCIPALES (HORIZONTAL) */}
                    <h3 className="font-bold border-b-2 border-slate-200 pb-2 mb-4">Top Variaciones Significativas</h3>
                    <table className="w-full text-sm mb-4">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr><th className="text-left p-2">Cuenta</th><th className="text-right p-2">Variación $</th><th className="text-right p-2">Variación %</th></tr>
                        </thead>
                        <tbody>
                            {horizontal?.slice(0, 5).map((h: any, i: number) => (
                                <tr key={i} className="border-b">
                                    <td className="p-2 font-medium">{h.account}</td>
                                    <td className="p-2 text-right text-slate-500">{fmt(h.var_abs)}</td>
                                    <td className={`p-2 text-right font-bold ${h.var_pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {h.var_pct.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* PIE DE PÁGINA */}
                    <div className="mt-10 pt-4 border-t text-center text-xs text-slate-400">
                        <p>Reporte generado automáticamente por FinAnalyzer Pro 360.</p>
                        <p>Los cálculos proforma son estimaciones basadas en tendencias históricas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;