import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileText, ArrowUpRight, ArrowDownRight, BrainCircuit, Activity, DollarSign, PieChart } from 'lucide-react';

const Analysis = () => {
    const { analysisData } = useFinancial();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('estados');

    if (!analysisData || !analysisData.ratios) return <Navigate to="/entry" replace />;

    const { ratios, flujo_efectivo, vertical, horizontal, conclusion, financial_statements } = analysisData;
    const years = Object.keys(financial_statements).map(Number).sort();
    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    return (
        <div className="p-8 pb-20 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Análisis Financiero 360</h1>
                <button onClick={() => navigate('/reports')} className="bg-slate-900 text-white px-4 py-2 rounded flex gap-2 shadow hover:bg-slate-700">
                    <FileText size={18} /> Ver Reporte PDF
                </button>
            </header>

            {/* Diagnóstico IA */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="font-bold text-blue-800 flex gap-2 mb-2"><BrainCircuit /> Diagnóstico Inteligente</h3>
                <p className="text-slate-700 text-justify">{conclusion}</p>
            </div>

            {/* Menú */}
            <div className="flex gap-2 border-b overflow-x-auto">
                {['estados', 'ratios', 'flujos', 'vertical', 'horizontal'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 capitalize font-medium ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>
                        {t === 'estados' ? 'Estados Financieros' : t === 'ratios' ? 'Indicadores & DuPont' : t}
                    </button>
                ))}
            </div>

            {/* --- 1. ESTADOS FINANCIEROS (COMPARATIVO MULTI-AÑO) --- */}
            {activeTab === 'estados' && (
                <div className="space-y-8 animate-in fade-in">
                    {/* Balance General Comparativo */}
                    <div className="bg-white p-6 rounded-xl shadow border overflow-x-auto">
                        <h3 className="text-xl font-bold mb-4 bg-slate-100 p-2 rounded text-center">Balance General Comparativo</h3>
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="text-left p-3">Cuenta</th>
                                    {years.map(y => <th key={y} className="text-right p-3">{y}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Activos Corrientes */}
                                <tr className="bg-blue-50"><td colSpan={years.length + 1} className="p-2 font-bold text-blue-800">ACTIVO CORRIENTE</td></tr>
                                {financial_statements[years[0]].balance_sheet.assets.current.map((acc: any, i: number) => (
                                    <tr key={i} className="border-b hover:bg-gray-50">
                                        <td className="p-2 pl-4">{acc.accountName}</td>
                                        {years.map(y => {
                                            const item = financial_statements[y].balance_sheet.assets.current.find((x: any) => x.accountName === acc.accountName);
                                            return <td key={y} className="text-right p-2">{fmt(item?.value || 0)}</td>
                                        })}
                                    </tr>
                                ))}

                                {/* Activos No Corrientes */}
                                <tr className="bg-blue-50"><td colSpan={years.length + 1} className="p-2 font-bold text-blue-800 mt-4">ACTIVO NO CORRIENTE</td></tr>
                                {financial_statements[years[0]].balance_sheet.assets.non_current.map((acc: any, i: number) => (
                                    <tr key={i} className="border-b hover:bg-gray-50">
                                        <td className="p-2 pl-4">{acc.accountName}</td>
                                        {years.map(y => {
                                            const item = financial_statements[y].balance_sheet.assets.non_current.find((x: any) => x.accountName === acc.accountName);
                                            return <td key={y} className="text-right p-2">{fmt(item?.value || 0)}</td>
                                        })}
                                    </tr>
                                ))}
                                <tr className="font-bold bg-blue-100 border-t-2 border-blue-200">
                                    <td className="p-2">TOTAL ACTIVOS</td>
                                    {years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.assets.total)}</td>)}
                                </tr>

                                {/* Pasivos */}
                                <tr className="bg-red-50"><td colSpan={years.length + 1} className="p-2 font-bold text-red-800 mt-4">PASIVOS</td></tr>
                                {financial_statements[years[0]].balance_sheet.liabilities.current.map((acc: any, i: number) => (
                                    <tr key={i} className="border-b hover:bg-gray-50">
                                        <td className="p-2 pl-4">{acc.accountName}</td>
                                        {years.map(y => {
                                            const item = financial_statements[y].balance_sheet.liabilities.current.find((x: any) => x.accountName === acc.accountName);
                                            return <td key={y} className="text-right p-2">{fmt(item?.value || 0)}</td>
                                        })}
                                    </tr>
                                ))}
                                <tr className="font-bold bg-red-100 border-t-2 border-red-200">
                                    <td className="p-2">TOTAL PASIVOS</td>
                                    {years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.liabilities.total)}</td>)}
                                </tr>

                                {/* Patrimonio */}
                                <tr className="bg-green-50"><td colSpan={years.length + 1} className="p-2 font-bold text-green-800 mt-4">PATRIMONIO</td></tr>
                                {financial_statements[years[0]].balance_sheet.equity.accounts.map((acc: any, i: number) => (
                                    <tr key={i} className="border-b hover:bg-gray-50">
                                        <td className="p-2 pl-4">{acc.accountName}</td>
                                        {years.map(y => {
                                            const item = financial_statements[y].balance_sheet.equity.accounts.find((x: any) => x.accountName === acc.accountName);
                                            return <td key={y} className="text-right p-2">{fmt(item?.value || 0)}</td>
                                        })}
                                    </tr>
                                ))}
                                <tr className="italic text-gray-600">
                                    <td className="p-2 pl-4">Utilidad Neta (Calculada)</td>
                                    {years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].income_statement.net_income)}</td>)}
                                </tr>
                                <tr className="font-bold bg-green-100 border-t-2 border-green-200">
                                    <td className="p-2">TOTAL PATRIMONIO + PASIVO</td>
                                    {years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.total_liab_equity)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- 2. INDICADORES Y DUPONT --- */}
            {activeTab === 'ratios' && (
                <div className="space-y-6 animate-in fade-in">
                    {ratios.map((r: any) => (
                        <div key={r.year} className="space-y-4">
                            <h3 className="text-lg font-bold border-b border-slate-300 pb-2">Resultados {r.year}</h3>

                            {/* DUPONT VISUAL */}
                            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                                <h4 className="text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                    <PieChart size={16} /> Sistema DuPont
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center text-center">
                                    <div className="bg-slate-800 p-3 rounded-lg">
                                        <p className="text-xs text-slate-400">Margen Neto</p>
                                        <p className="text-xl font-bold text-blue-400">{r.rentabilidad.componentes_dupont.margen.toFixed(2)}%</p>
                                    </div>
                                    <div className="text-slate-500 font-bold">X</div>
                                    <div className="bg-slate-800 p-3 rounded-lg">
                                        <p className="text-xs text-slate-400">Rotación Activos</p>
                                        <p className="text-xl font-bold text-purple-400">{r.rentabilidad.componentes_dupont.rotacion.toFixed(2)}</p>
                                    </div>
                                    <div className="text-slate-500 font-bold">X</div>
                                    <div className="bg-slate-800 p-3 rounded-lg">
                                        <p className="text-xs text-slate-400">Apalancamiento</p>
                                        <p className="text-xl font-bold text-orange-400">{r.rentabilidad.componentes_dupont.multiplicador.toFixed(2)}</p>
                                    </div>
                                    <div className="text-slate-500 font-bold">=</div>
                                    <div className="bg-blue-600 p-3 rounded-lg shadow-blue-500/50 shadow-lg transform scale-110">
                                        <p className="text-xs text-white/80">ROE</p>
                                        <p className="text-2xl font-bold text-white">{r.rentabilidad.roe.toFixed(2)}%</p>
                                    </div>
                                </div>
                            </div>

                            {/* TARJETAS DE INDICADORES (CON CNT Y CNO) */}
                            <div className="grid md:grid-cols-3 gap-4">
                                {/* Liquidez */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><DollarSign size={16} /> Liquidez</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>CNT (Capital Trabajo):</span> <b>{fmt(r.liquidez.cnt)}</b></div>
                                        <div className="flex justify-between"><span>CNO (Operativo):</span> <b>{fmt(r.liquidez.cno)}</b></div>
                                        <div className="flex justify-between"><span>Razón Circulante:</span> <b>{r.liquidez.razon_circulante.toFixed(2)}</b></div>
                                        <div className="flex justify-between"><span>Prueba Ácida:</span> <b>{r.liquidez.razon_rapida.toFixed(2)}</b></div>
                                    </div>
                                </div>

                                {/* Actividad */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Activity size={16} /> Actividad</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Rotación Inventario:</span> <b>{r.actividad?.rotacion_inventarios.toFixed(2)}x</b></div>
                                        <div className="flex justify-between"><span>Periodo Cobro:</span> <b>{r.actividad?.periodo_cobro.toFixed(0)} días</b></div>
                                        <div className="flex justify-between"><span>Rotación Activos Totales:</span> <b>{r.actividad?.rotacion_activos_totales.toFixed(2)}x</b></div>
                                    </div>
                                </div>

                                {/* Rentabilidad */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><PieChart size={16} /> Rentabilidad</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Margen Bruto:</span> <b>{r.rentabilidad.margen_bruto.toFixed(2)}%</b></div>
                                        <div className="flex justify-between"><span>Margen Neto:</span> <b>{r.rentabilidad.margen_neto.toFixed(2)}%</b></div>
                                        <div className="flex justify-between"><span>ROA:</span> <b>{r.rentabilidad.roa.toFixed(2)}%</b></div>
                                        <div className="flex justify-between"><span>ROE:</span> <b>{r.rentabilidad.roe.toFixed(2)}%</b></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- 3. OTRAS PESTAÑAS (FLUJO, VERTICAL, HORIZONTAL) --- */}
            {/* Se mantienen igual, ya funcionan bien */}
            {activeTab === 'flujos' && (
                <div className="space-y-6 animate-in fade-in">
                    {flujo_efectivo?.map((f: any) => (
                        <div key={f.year} className="bg-white p-6 rounded-xl shadow border">
                            <h3 className="font-bold mb-4">Flujo de Efectivo {f.year}</h3>
                            <div className="grid md:grid-cols-2 gap-8 text-sm">
                                <div><h4 className="font-bold text-blue-600">Indirecto</h4> <div className="flex justify-between border-t mt-2 pt-1 font-bold"><span>Flujo Neto:</span> <span>{fmt(f.indirecto?.flujo_neto)}</span></div></div>
                                <div><h4 className="font-bold text-green-600">Directo (Est.)</h4> <div className="flex justify-between border-t mt-2 pt-1 font-bold"><span>Flujo Neto:</span> <span>{fmt(f.directo?.flujo_neto)}</span></div></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'vertical' && (
                <div className="bg-white p-4 rounded-xl shadow border overflow-auto animate-in fade-in">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50"><tr><th>Año</th><th>Cuenta</th><th className="text-right">%</th></tr></thead>
                        <tbody>{vertical?.map((v: any, i: number) => (<tr key={i} className="border-b"><td>{v.year}</td><td>{v.accountName}</td><td className="text-right font-bold">{v.pct.toFixed(2)}%</td></tr>))}</tbody>
                    </table>
                </div>
            )}

            {activeTab === 'horizontal' && (
                <div className="bg-white p-4 rounded-xl shadow border overflow-auto animate-in fade-in">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50"><tr><th>Periodo</th><th>Cuenta</th><th className="text-right">Var %</th><th></th></tr></thead>
                        <tbody>{horizontal?.map((h: any, i: number) => (
                            <tr key={i} className="border-b">
                                <td className="text-slate-500 text-xs">{h.period}</td>
                                <td>{h.account}</td>
                                <td className="text-right font-bold">{h.var_pct.toFixed(2)}%</td>
                                <td className="text-center">{h.var_abs > 0 ? <ArrowUpRight className="text-green-500 inline" /> : <ArrowDownRight className="text-red-500 inline" />}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Analysis;