import React, { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Download, BrainCircuit } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useFinancial } from '../context/FinancialContext'; // <--- USAR CONTEXTO

const Reports = () => {
    const { analysisData } = useFinancial(); // DATOS SIEMPRE DISPONIBLES
    const reportRef = useRef<HTMLDivElement>(null);

    if (!analysisData) return <Navigate to="/entry" replace />;

    const { ratios, conclusion, horizontal } = analysisData;

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('Reporte_Financiero.pdf');
        } catch (e) { alert("Error al generar PDF"); }
    };

    return (
        <div className="p-8 space-y-6">
            <header className="flex justify-between no-print">
                <h1 className="text-2xl font-bold">Generación de Reporte</h1>
                <button onClick={handleDownloadPDF} className="bg-red-600 text-white px-4 py-2 rounded flex gap-2"><Download /> PDF</button>
            </header>

            <div className="flex justify-center bg-gray-200 p-4 rounded overflow-auto">
                <div ref={reportRef} className="bg-white p-12 shadow-xl text-slate-800" style={{ width: '210mm', minHeight: '297mm' }}>
                    <h1 className="text-3xl font-extrabold text-center mb-2">INFORME FINANCIERO EJECUTIVO</h1>
                    <p className="text-center text-gray-500 mb-8">Generado por FinAnalyzer Pro</p>

                    <div className="bg-blue-50 p-4 border-l-4 border-blue-600 mb-6 text-sm text-justify">
                        <h3 className="font-bold flex gap-2 mb-2"><BrainCircuit size={16} /> Conclusión Automática</h3>
                        {conclusion}
                    </div>

                    <h3 className="font-bold border-b mb-4">Indicadores Clave</h3>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {ratios.map(r => (
                            <div key={r.year} className="border p-2 rounded text-center">
                                <div className="font-bold bg-gray-100 mb-1">{r.year}</div>
                                <div className="text-xs">ROE: {r.rentabilidad.roe.toFixed(1)}%</div>
                                <div className="text-xs">Liq: {r.liquidez.razon_circulante.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    <h3 className="font-bold border-b mb-4">Top Variaciones</h3>
                    <table className="w-full text-sm">
                        <tbody>
                            {horizontal?.slice(0, 8).map((h: any, i: number) => (
                                <tr key={i} className="border-b"><td className="py-1">{h.account}</td><td className="text-right font-bold">{h.var_pct.toFixed(1)}%</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default Reports;