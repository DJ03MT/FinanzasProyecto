import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, ArrowUpRight, ArrowDownRight, BrainCircuit, Table } from 'lucide-react';


const Analysis = () => {
    const { analysisData } = useFinancial();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('estados'); // Por defecto mostramos los Estados

    if (!analysisData || !analysisData.ratios) return <Navigate to="/entry" replace />;

    const { ratios, flujo_efectivo, vertical, horizontal, conclusion, financial_statements } = analysisData;
    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    // Obtener años disponibles
    const years = Object.keys(financial_statements || {}).map(Number).sort();
    const lastYear = years[years.length - 1];
    const statement = financial_statements[lastYear];

    return (
        <div className="p-8 pb-20 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Resultados {lastYear}</h1>
                <button onClick={() => navigate('/reports')} className="bg-slate-900 text-white px-4 py-2 rounded flex gap-2 shadow hover:bg-slate-700">
                    <FileText size={18} /> Ver Reporte PDF
                </button>
            </header>

            {/* Diagnóstico */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                <h3 className="font-bold text-blue-800 flex gap-2 mb-2"><BrainCircuit /> Diagnóstico Inteligente</h3>
                <p className="text-slate-700 text-justify">{conclusion}</p>
            </div>

            {/* Menú de Pestañas */}
            <div className="flex gap-2 border-b overflow-x-auto">
                {['estados', 'ratios', 'flujos', 'vertical', 'horizontal'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 capitalize font-medium ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>
                        {t === 'estados' ? 'Estados Financieros' : t}
                    </button>
                ))}
            </div>

            {/* --- PESTAÑA 1: ESTADOS FINANCIEROS (NUEVA) --- */}
            {activeTab === 'estados' && statement && (
                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
                    {/* BALANCE GENERAL */}
                    <div className="bg-white p-6 rounded-xl shadow border">
                        <h3 className="text-xl font-bold text-center bg-slate-100 p-2 rounded mb-4">Balance General</h3>

                        <div className="space-y-4 text-sm">
                            <div>
                                <h4 className="font-bold text-blue-600 border-b">Activos Corrientes</h4>
                                {statement.balance_sheet.assets.current.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between pl-2"><span>{a.accountName}</span> <span>{fmt(a.value)}</span></div>
                                ))}
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-600 border-b">Activos No Corrientes</h4>
                                {statement.balance_sheet.assets.non_current.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between pl-2"><span>{a.accountName}</span> <span>{fmt(a.value)}</span></div>
                                ))}
                                <div className="flex justify-between font-bold bg-blue-50 p-1 mt-1"><span>TOTAL ACTIVOS</span> <span>{fmt(statement.balance_sheet.assets.total)}</span></div>
                            </div>

                            <div className="pt-4">
                                <h4 className="font-bold text-red-600 border-b">Pasivos</h4>
                                {statement.balance_sheet.liabilities.current.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between pl-2"><span>{a.accountName}</span> <span>{fmt(a.value)}</span></div>
                                ))}
                                {statement.balance_sheet.liabilities.non_current.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between pl-2"><span>{a.accountName}</span> <span>{fmt(a.value)}</span></div>
                                ))}
                                <div className="flex justify-between font-bold bg-red-50 p-1 mt-1"><span>TOTAL PASIVOS</span> <span>{fmt(statement.balance_sheet.liabilities.total)}</span></div>
                            </div>

                            <div>
                                <h4 className="font-bold text-green-600 border-b">Patrimonio</h4>
                                {statement.balance_sheet.equity.accounts.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between pl-2"><span>{a.accountName}</span> <span>{fmt(a.value)}</span></div>
                                ))}
                                <div className="flex justify-between font-bold bg-green-50 p-1 mt-1"><span>TOTAL PATRIMONIO</span> <span>{fmt(statement.balance_sheet.equity.total)}</span></div>
                            </div>

                            <div className="text-center text-xs text-gray-500 mt-2">
                                Ecuación Contable: {fmt(statement.balance_sheet.assets.total)} = {fmt(statement.balance_sheet.liabilities.total + statement.balance_sheet.equity.total)}
                            </div>
                        </div>
                    </div>

                    {/* ESTADO DE RESULTADOS */}
                    <div className="bg-white p-6 rounded-xl shadow border h-fit">
                        <h3 className="text-xl font-bold text-center bg-slate-100 p-2 rounded mb-4">Estado de Resultados</h3>
                        <div className="space-y-2 text-sm">
                            {statement.income_statement.revenues.map((a: any, i: number) => (
                                <div key={i} className="flex justify-between font-bold"><span>+ {a.accountName}</span> <span>{fmt(a.value)}</span></div>
                            ))}
                            {statement.income_statement.cogs.map((a: any, i: number) => (
                                <div key={i} className="flex justify-between text-red-500 pl-2"><span>- {a.accountName}</span> <span>{fmt(a.value)}</span></div>
                            ))}
                            <div className="flex justify-between font-bold border-t border-dashed pt-1"><span>= Utilidad Bruta</span> <span>{fmt(statement.income_statement.gross_profit)}</span></div>

                            <div className="py-2">
                                <p className="text-gray-500 text-xs uppercase mb-1">Gastos Operativos</p>
                                {statement.income_statement.expenses.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between pl-2"><span>- {a.accountName}</span> <span>{fmt(a.value)}</span></div>
                                ))}
                            </div>

                            <div className="flex justify-between font-bold bg-gray-100 p-2 rounded"><span>= Utilidad Neta</span> <span className={statement.income_statement.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(statement.income_statement.net_income)}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PESTAÑA 2: RATIOS Y GRÁFICAS --- */}
            {activeTab === 'ratios' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="grid md:grid-cols-2 gap-4">
                        {ratios.map(r => (
                            <div key={r.year} className="bg-white p-4 rounded shadow border">
                                <h3 className="font-bold border-b mb-2">Indicadores {r.year}</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span>ROE:</span> <b className="text-blue-600">{r.rentabilidad.roe.toFixed(2)}%</b>
                                    <span>Razón Circulante:</span> <b>{r.liquidez.razon_circulante.toFixed(2)}</b>
                                    <span>Endeudamiento:</span> <b>{r.endeudamiento.razon_total.toFixed(2)}%</b>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* GRÁFICA */}
                    <div className="bg-white p-6 rounded-xl shadow border h-80">
                        <h3 className="font-bold mb-4">Evolución Rentabilidad vs Deuda</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ratios}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="rentabilidad.roe" name="ROE %" fill="#2563eb" />
                                <Bar dataKey="endeudamiento.razon_total" name="Deuda %" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* --- OTRAS PESTAÑAS (FLUJO, VERTICAL, HORIZONTAL) IGUAL QUE ANTES --- */}
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
                        <thead className="bg-slate-50"><tr><th>Cuenta</th><th className="text-right">Var %</th><th></th></tr></thead>
                        <tbody>{horizontal?.map((h: any, i: number) => (<tr key={i} className="border-b"><td>{h.account}</td><td className="text-right font-bold">{h.var_pct.toFixed(2)}%</td><td className="text-center">{h.var_abs > 0 ? <ArrowUpRight className="text-green-500 inline" /> : <ArrowDownRight className="text-red-500 inline" />}</td></tr>))}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
export default Analysis;