import React, { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Download, BrainCircuit } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useFinancial } from '../context/FinancialContext';

const Reports = () => {
    const { analysisData } = useFinancial();
    const reportRef = useRef<HTMLDivElement>(null);

    if (!analysisData) return <Navigate to="/entry" replace />;

    const { ratios, conclusion, financial_statements } = analysisData;
    const years = Object.keys(financial_statements || {}).sort();
    const lastYear = years[years.length - 1];
    const statement = financial_statements[lastYear];

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        try {
            // Esperar un poco para asegurar renderizado
            setTimeout(async () => {
                const canvas = await html2canvas(reportRef.current!, {
                    scale: 2, // Mejor calidad
                    useCORS: true,
                    logging: true
                });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save('Reporte_Financiero.pdf');
            }, 500);
        } catch (e) { alert("Error al generar PDF"); }
    };

    return (
        <div className="p-8 space-y-6 bg-gray-100 min-h-screen">
            <header className="flex justify-between no-print">
                <h1 className="text-2xl font-bold">Vista Previa Reporte</h1>
                <button onClick={handleDownloadPDF} className="bg-red-600 text-white px-4 py-2 rounded shadow flex gap-2"><Download /> Descargar PDF</button>
            </header>

            <div className="flex justify-center overflow-auto pb-10">
                <div ref={reportRef} className="bg-white p-12 shadow-2xl text-slate-800" style={{ width: '210mm', minHeight: '297mm' }}>
                    <div className="border-b-4 border-slate-900 pb-4 mb-8 flex justify-between">
                        <div><h1 className="text-3xl font-extrabold">INFORME FINANCIERO</h1><p>Generado automáticamente</p></div>
                        <div className="text-right font-bold text-xl">{lastYear}</div>
                    </div>

                    <div className="bg-blue-50 p-6 border-l-4 border-blue-600 mb-8 text-sm text-justify">
                        <h3 className="font-bold mb-2 flex gap-2"><BrainCircuit size={16} /> Conclusión</h3>
                        {conclusion}
                    </div>

                    {statement && (
                        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                            <div>
                                <h3 className="font-bold border-b mb-2">Resumen Balance</h3>
                                <div className="flex justify-between"><span>Total Activos:</span> <b>{statement.balance_sheet.assets.total.toLocaleString()}</b></div>
                                <div className="flex justify-between"><span>Total Pasivos:</span> <b>{statement.balance_sheet.liabilities.total.toLocaleString()}</b></div>
                                <div className="flex justify-between"><span>Total Patrimonio:</span> <b>{statement.balance_sheet.equity.total.toLocaleString()}</b></div>
                            </div>
                            <div>
                                <h3 className="font-bold border-b mb-2">Resumen Resultados</h3>
                                <div className="flex justify-between"><span>Ventas Totales:</span> <b>{statement.income_statement.gross_profit + statement.income_statement.cogs.reduce((acc: number, c: any) => acc + c.value, 0)}</b></div>
                                <div className="flex justify-between"><span>Utilidad Bruta:</span> <b>{statement.income_statement.gross_profit.toLocaleString()}</b></div>
                                <div className="flex justify-between font-bold text-blue-600"><span>Utilidad Neta:</span> <b>{statement.income_statement.net_income.toLocaleString()}</b></div>
                            </div>
                        </div>
                    )}

                    <h3 className="font-bold border-b mb-4">Indicadores Clave</h3>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        {ratios.map((r: any) => (
                            <div key={r.year} className="border p-2 rounded bg-gray-50">
                                <div className="font-bold">{r.year}</div>
                                <div>ROE: {r.rentabilidad.roe.toFixed(1)}%</div>
                                <div>Liq: {r.liquidez.razon_circulante.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Reports;