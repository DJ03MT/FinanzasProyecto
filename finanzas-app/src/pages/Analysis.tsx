import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext'; // <--- USAR CONTEXTO

const Analysis = () => {
    const { analysisData, records } = useFinancial(); // LEER DE GLOBAL
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ratios');

    // Si no hay datos analizados, mandar a cargar
    if (!analysisData || records.length === 0) return <Navigate to="/entry" replace />;

    const { ratios, flujo_efectivo, vertical, horizontal, conclusion } = analysisData;
    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    return (
        <div className="p-8 pb-20 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Análisis Financiero 360</h1>
                <button onClick={() => navigate('/reports')} className="bg-slate-900 text-white px-4 py-2 rounded flex gap-2">
                    <FileText size={18} /> Reporte PDF
                </button>
            </header>

            {/* Diagnóstico IA */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-slate-700">
                <h3 className="font-bold flex gap-2">🤖 Diagnóstico IA</h3>
                <p>{conclusion}</p>
            </div>

            {/* Pestañas */}
            <div className="flex gap-2 border-b">
                {['ratios', 'flujos', 'vertical', 'horizontal'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 capitalize ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}>
                        {t}
                    </button>
                ))}
            </div>

            {/* --- VISTAS --- */}

            {activeTab === 'ratios' && (
                <div className="grid grid-cols-2 gap-4">
                    {ratios.map(r => (
                        <div key={r.year} className="bg-white p-4 rounded shadow">
                            <h3 className="font-bold border-b mb-2">Año {r.year}</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span>ROE:</span> <b>{r.rentabilidad.roe.toFixed(2)}%</b>
                                <span>Razón Circulante:</span> <b>{r.liquidez.razon_circulante.toFixed(2)}</b>
                                <span>CNT:</span> <b>{fmt(r.liquidez.cnt)}</b>
                                <span>Endeudamiento:</span> <b>{r.endeudamiento.total.toFixed(2)}%</b>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'flujos' && (
                <div className="space-y-6">
                    {flujo_efectivo?.map((f: any) => (
                        <div key={f.year} className="bg-white p-6 rounded shadow">
                            <h3 className="font-bold text-lg mb-4 text-center bg-gray-100 p-2">Flujo de Efectivo {f.year}</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h4 className="font-bold text-blue-600 border-b mb-2">Método Indirecto</h4>
                                    <div className="flex justify-between"><span>Utilidad:</span> <b>{fmt(f.indirecto?.utilidad_neta)}</b></div>
                                    <div className="flex justify-between text-sm text-gray-500"><span>(-) Aum. CxC:</span> <span>{fmt(f.indirecto?.ajustes?.var_cxc * -1)}</span></div>
                                    <div className="flex justify-between text-sm text-gray-500"><span>(-) Aum. Inv:</span> <span>{fmt(f.indirecto?.ajustes?.var_inv * -1)}</span></div>
                                    <div className="flex justify-between text-sm text-gray-500"><span>(+) Aum. CxP:</span> <span>{fmt(f.indirecto?.ajustes?.var_cxp)}</span></div>
                                    <div className="flex justify-between border-t mt-2 pt-1 font-bold"><span>Flujo Neto:</span> <span>{fmt(f.indirecto?.flujo_neto)}</span></div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-green-600 border-b mb-2">Método Directo (Est.)</h4>
                                    <div className="flex justify-between"><span>+ Recibido Clientes:</span> <span className="text-green-600">{fmt(f.directo?.recibido_clientes)}</span></div>
                                    <div className="flex justify-between"><span>- Pagado Proveedores:</span> <span className="text-red-500">{fmt(f.directo?.pagado_proveedores)}</span></div>
                                    <div className="flex justify-between"><span>- Pagado Gastos:</span> <span className="text-red-500">{fmt(f.directo?.pagado_gastos)}</span></div>
                                    <div className="flex justify-between border-t mt-2 pt-1 font-bold"><span>Flujo Neto:</span> <span>{fmt(f.directo?.flujo_neto)}</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!flujo_efectivo || flujo_efectivo.length === 0) && <p className="text-center text-gray-500">Se necesitan 2 años para calcular flujos.</p>}
                </div>
            )}

            {activeTab === 'vertical' && (
                <div className="bg-white p-4 rounded shadow overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr><th>Año</th><th>Cuenta</th><th className="text-right">Monto</th><th className="text-right">%</th></tr></thead>
                        <tbody>
                            {vertical?.map((v: any, i: number) => (
                                <tr key={i} className="border-b">
                                    <td>{v.year}</td><td>{v.accountName}</td>
                                    <td className="text-right">{fmt(v.value)}</td>
                                    <td className="text-right font-bold">{v.pct.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'horizontal' && (
                <div className="bg-white p-4 rounded shadow overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr><th>Cuenta</th><th className="text-right">Var $</th><th className="text-right">Var %</th><th>Tendencia</th></tr></thead>
                        <tbody>
                            {horizontal?.map((h: any, i: number) => (
                                <tr key={i} className="border-b">
                                    <td>{h.account}</td>
                                    <td className={`text-right ${h.var_abs >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(h.var_abs)}</td>
                                    <td className="text-right font-bold">{h.var_pct.toFixed(2)}%</td>
                                    <td className="text-center">{h.var_abs > 0 ? <ArrowUpRight className="text-green-500 inline" /> : <ArrowDownRight className="text-red-500 inline" />}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
export default Analysis;