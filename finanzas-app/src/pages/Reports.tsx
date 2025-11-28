import React, { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Download, BrainCircuit, Activity } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useFinancial } from '../context/FinancialContext';

const Reports = () => {
    const { analysisData } = useFinancial();
    const reportRef = useRef<HTMLDivElement>(null);

    if (!analysisData || !analysisData.ratios) return <Navigate to="/entry" replace />;

    const { ratios, flujo_efectivo, conclusion, financial_statements, proforma } = analysisData;
    const years = Object.keys(financial_statements).map(Number).sort();
    const lastYear = years[years.length - 1];
    const statement = financial_statements[lastYear];
    const ultimoFlujo = flujo_efectivo[flujo_efectivo.length - 1];
    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        setTimeout(async () => {
            const canvas = await html2canvas(reportRef.current!, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Reporte_Financiero_${lastYear}.pdf`);
        }, 100);
    };

    return (
        <div className="p-8 bg-slate-100 min-h-screen">
            <header className="flex justify-between items-center no-print mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Vista de Impresión</h1>
                <button onClick={handleDownloadPDF} className="bg-red-600 text-white px-4 py-2 rounded flex gap-2"><Download /> PDF</button>
            </header>

            <div className="flex justify-center overflow-auto pb-10">
                <div ref={reportRef} className="bg-white p-12 shadow-2xl text-slate-800" style={{ width: '210mm', minHeight: '297mm' }}>

                    <h1 className="text-3xl font-extrabold text-center mb-1">INFORME EJECUTIVO {lastYear}</h1>
                    <p className="text-center text-slate-500 mb-6 text-sm">FinAnalyzer Pro 360</p>

                    {/* DIAGNÓSTICO */}
                    <div className="bg-blue-50 p-4 border-l-4 border-blue-600 mb-6 text-sm text-justify whitespace-pre-line">
                        <h3 className="font-bold mb-2 flex gap-2"><BrainCircuit size={16} /> Diagnóstico IA</h3>
                        {conclusion}
                    </div>

                    {/* ESTADOS FINANCIEROS RESUMEN */}
                    <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                        <div className="border p-3 rounded bg-gray-50">
                            <h3 className="font-bold border-b pb-1 mb-2">Estado de Resultados</h3>
                            <div className="flex justify-between"><span>Ventas:</span> <b>{fmt(statement.income_statement.net_sales)}</b></div>
                            <div className="flex justify-between"><span>Utilidad Bruta:</span> <span>{fmt(statement.income_statement.gross_profit)}</span></div>
                            <div className="flex justify-between font-bold text-green-700 mt-1"><span>Utilidad Neta:</span> <span>{fmt(statement.income_statement.net_income)}</span></div>
                        </div>
                        <div className="border p-3 rounded bg-gray-50">
                            <h3 className="font-bold border-b pb-1 mb-2">Balance General</h3>
                            <div className="flex justify-between"><span>Total Activos:</span> <b>{fmt(statement.balance_sheet.assets.total)}</b></div>
                            <div className="flex justify-between"><span>Total Pasivos:</span> <span>{fmt(statement.balance_sheet.liabilities.total)}</span></div>
                            <div className="flex justify-between font-bold text-blue-700 mt-1"><span>Patrimonio:</span> <span>{fmt(statement.balance_sheet.equity.total)}</span></div>
                        </div>
                    </div>

                    {/* FLUJO DE EFECTIVO */}
                    {ultimoFlujo && (
                        <div className="mb-6 p-3 border rounded">
                            <h3 className="font-bold border-b pb-1 mb-2">Flujo de Efectivo {ultimoFlujo.year}</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500">Método Indirecto:</span> <b>{fmt(ultimoFlujo.indirecto.flujo_neto)}</b></div>
                                <div><span className="text-slate-500">Método Directo:</span> <b>{fmt(ultimoFlujo.directo.flujo_neto)}</b></div>
                            </div>
                        </div>
                    )}

                    {/* RATIOS & DUPONT */}
                    <div className="mb-6">
                        <h3 className="font-bold border-b pb-1 mb-2 flex gap-2 items-center"><Activity size={16} /> Indicadores Clave</h3>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="bg-slate-100 p-2 rounded">
                                <div className="text-slate-500">ROE</div>
                                <div className="font-bold text-lg">{ratios[ratios.length - 1].rentabilidad.roe.toFixed(1)}%</div>
                            </div>
                            <div className="bg-slate-100 p-2 rounded">
                                <div className="text-slate-500">Liquidez</div>
                                <div className="font-bold text-lg">{ratios[ratios.length - 1].liquidez.razon_circulante.toFixed(2)}</div>
                            </div>
                            <div className="bg-slate-100 p-2 rounded">
                                <div className="text-slate-500">Días Cobro</div>
                                <div className="font-bold text-lg">{ratios[ratios.length - 1].actividad.periodo_cobro.toFixed(0)}</div>
                            </div>
                            <div className="bg-slate-100 p-2 rounded">
                                <div className="text-slate-500">Apalancamiento</div>
                                <div className="font-bold text-lg">{ratios[ratios.length - 1].rentabilidad.dupont.multiplicador.toFixed(2)}x</div>
                            </div>
                        </div>
                    </div>

                    {/* PROFORMA */}
                    {proforma && (
                        <div className="p-3 border-2 border-dashed border-purple-200 bg-purple-50 rounded text-sm">
                            <h3 className="font-bold text-purple-800 mb-1">Proyección {proforma.year_proj}</h3>
                            <div className="flex justify-between">
                                <span>Crecimiento Ventas: <b>{proforma.growth_rate.toFixed(1)}%</b></span>
                                <span>Utilidad Est: <b>{fmt(proforma.proforma.utilidad_neta)}</b></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;