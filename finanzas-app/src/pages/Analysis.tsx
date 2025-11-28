import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BrainCircuit, Activity, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Analysis = () => {
    const { analysisData } = useFinancial();
    const [activeTab, setActiveTab] = useState('dashboard');

    if (!analysisData || !analysisData.ratios) return <Navigate to="/entry" replace />;

    const { ratios, vertical, horizontal, conclusion, financial_statements, proforma } = analysisData;
    const years = Object.keys(financial_statements).map(Number).sort();
    const lastYear = years[years.length - 1];
    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    // --- CORRECCIÓN DEL ERROR DE TYPESCRIPT ---
    // Definimos explícitamente que es un objeto de objetos de números
    const groupedVertical: Record<string, Record<number, number>> = {};

    vertical.forEach((v: any) => {
        if (!groupedVertical[v.accountName]) {
            groupedVertical[v.accountName] = {};
        }
        groupedVertical[v.accountName][v.year] = v.pct;
    });
    // ------------------------------------------

    // Datos para Gráficos
    const chartData = years.map(y => ({
        year: y,
        Ingresos: financial_statements[y].income_statement.net_sales,
        Utilidad: financial_statements[y].income_statement.net_income
    }));

    // Datos Pie Chart (Activos Último Año)
    const currentAssets = financial_statements[lastYear].balance_sheet.assets.current.reduce((a: any, b: any) => a + b.value, 0);
    const nonCurrentAssets = financial_statements[lastYear].balance_sheet.assets.non_current.reduce((a: any, b: any) => a + b.value, 0);

    const assetsData = [
        { name: 'Corriente', value: currentAssets },
        { name: 'No Corriente', value: nonCurrentAssets }
    ];
    const COLORS = ['#3b82f6', '#94a3b8'];

    return (
        <div className="p-8 pb-20 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Análisis Financiero 360</h1>
                    <p className="text-slate-500">Resultados del periodo {lastYear}</p>
                </div>
            </header>

            <div className="bg-white p-6 rounded-xl border-l-8 border-blue-600 shadow">
                <h3 className="font-bold text-xl mb-2 flex gap-2"><BrainCircuit className="text-blue-600" /> Diagnóstico Inteligente</h3>
                <div className="text-slate-700 whitespace-pre-line leading-relaxed">{conclusion}</div>
            </div>

            <div className="flex gap-2 border-b overflow-x-auto">
                {['dashboard', 'estados', 'proforma', 'analisis_vh'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 capitalize font-medium ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>
                        {t === 'dashboard' ? 'Gráficos y Ratios' : t === 'analisis_vh' ? 'Análisis V/H' : t}
                    </button>
                ))}
            </div>

            {/* --- DASHBOARD (GRÁFICAS) --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border h-80">
                            <h3 className="font-bold mb-4 flex gap-2"><TrendingUp size={18} /> Evolución Resultados</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis />
                                    <Tooltip formatter={(v: any) => fmt(v)} />
                                    <Legend />
                                    <Bar dataKey="Ingresos" fill="#3b82f6" />
                                    <Bar dataKey="Utilidad" fill="#22c55e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border h-80">
                            <h3 className="font-bold mb-4 flex gap-2"><Activity size={18} /> Estructura Activos ({lastYear})</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={assetsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label>
                                        {assetsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => fmt(v)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* DUPONT Y RATIOS */}
                    {ratios.map((r: any) => (
                        <div key={r.year} className="bg-white p-6 rounded-xl shadow border">
                            <h3 className="font-bold border-b pb-2 mb-4 text-lg">Indicadores Financieros {r.year}</h3>
                            <div className="grid md:grid-cols-4 gap-4 text-center">
                                <div className="p-3 bg-blue-50 rounded">
                                    <div className="text-xs text-blue-600 font-bold uppercase">ROE (Rentabilidad)</div>
                                    <div className="text-2xl font-bold text-blue-800">{r.rentabilidad.roe.toFixed(2)}%</div>
                                </div>
                                <div className="p-3 bg-green-50 rounded">
                                    <div className="text-xs text-green-600 font-bold uppercase">Margen Neto</div>
                                    <div className="text-2xl font-bold text-green-800">{r.rentabilidad.margen_neto.toFixed(2)}%</div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded">
                                    <div className="text-xs text-purple-600 font-bold uppercase">Rotación Activos</div>
                                    <div className="text-2xl font-bold text-purple-800">{r.actividad?.rotacion_activos_totales.toFixed(2)}x</div>
                                </div>
                                <div className="p-3 bg-orange-50 rounded">
                                    <div className="text-xs text-orange-600 font-bold uppercase">Apalancamiento</div>
                                    <div className="text-2xl font-bold text-orange-800">{r.rentabilidad.dupont.multiplicador.toFixed(2)}x</div>
                                </div>
                            </div>
                            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm text-left">
                                <div><span className="text-slate-500">CNT:</span> <b>{fmt(r.liquidez.cnt)}</b></div>
                                <div><span className="text-slate-500">CNO:</span> <b>{fmt(r.liquidez.cno)}</b></div>
                                <div><span className="text-slate-500">Razón Circulante:</span> <b>{r.liquidez.razon_circulante.toFixed(2)}</b></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- ESTADOS FINANCIEROS --- */}
            {activeTab === 'estados' && (
                <div className="bg-white p-6 rounded-xl shadow border overflow-auto animate-in fade-in">
                    <h3 className="font-bold mb-4 bg-slate-100 p-2 rounded">Balance General Comparativo</h3>
                    <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-slate-50"><tr><th className="text-left p-2">Cuenta</th>{years.map(y => <th key={y} className="text-right p-2">{y}</th>)}</tr></thead>
                        <tbody>
                            <tr className="bg-blue-50 font-bold"><td colSpan={years.length + 1} className="p-2">ACTIVOS</td></tr>
                            {financial_statements[years[0]].balance_sheet.assets.current.map((acc: any, i: number) => (
                                <tr key={i} className="border-b"><td className="p-2 pl-4">{acc.accountName}</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.assets.current.find((x: any) => x.accountName === acc.accountName)?.value || 0)}</td>)}</tr>
                            ))}
                            <tr className="font-bold bg-blue-100"><td className="p-2">TOTAL ACTIVOS</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.total_assets)}</td>)}</tr>

                            <tr className="bg-red-50 font-bold"><td colSpan={years.length + 1} className="p-2">PASIVOS</td></tr>
                            {financial_statements[years[0]].balance_sheet.liabilities.current.map((acc: any, i: number) => (
                                <tr key={i} className="border-b"><td className="p-2 pl-4">{acc.accountName}</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.liabilities.current.find((x: any) => x.accountName === acc.accountName)?.value || 0)}</td>)}</tr>
                            ))}

                            <tr className="bg-green-50 font-bold"><td colSpan={years.length + 1} className="p-2">PATRIMONIO</td></tr>
                            {financial_statements[years[0]].balance_sheet.equity.accounts.map((acc: any, i: number) => (
                                <tr key={i} className="border-b"><td className="p-2 pl-4">{acc.accountName}</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.equity.accounts.find((x: any) => x.accountName === acc.accountName)?.value || 0)}</td>)}</tr>
                            ))}
                            <tr className="italic"><td className="p-2 pl-4">Utilidad Neta</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].income_statement.net_income)}</td>)}</tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- PROFORMA --- */}
            {activeTab === 'proforma' && proforma && (
                <div className="bg-white p-6 rounded-xl shadow border animate-in fade-in border-l-4 border-purple-500">
                    <h3 className="text-xl font-bold mb-2 text-purple-700">Proyección Financiera {proforma.year_proj}</h3>
                    <p className="mb-4 text-sm text-slate-500">Basado en crecimiento de ventas del <b>{proforma.growth_rate.toFixed(2)}%</b></p>
                    <table className="w-full text-sm">
                        <thead className="bg-purple-50"><tr><th className="text-left p-2">Concepto</th><th className="text-right p-2">Proyectado</th></tr></thead>
                        <tbody>
                            <tr><td className="p-2">Ventas Estimadas</td><td className="text-right p-2 font-bold">{fmt(proforma.proforma.ventas)}</td></tr>
                            <tr><td className="p-2">Costo Ventas Est.</td><td className="text-right p-2 text-red-500">{fmt(proforma.proforma.costo_ventas)}</td></tr>
                            <tr className="border-t font-bold text-lg text-purple-800"><td className="p-2">Utilidad Neta Estimada</td><td className="text-right p-2">{fmt(proforma.proforma.utilidad_neta)}</td></tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- ANÁLISIS V/H (CORREGIDO) --- */}
            {activeTab === 'analisis_vh' && (
                <div className="bg-white p-6 rounded-xl shadow border animate-in fade-in overflow-auto">
                    <h3 className="font-bold mb-4">Análisis Vertical y Horizontal</h3>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-2 text-left">Cuenta</th>
                                {years.map(y => <th key={y} className="p-2 text-right">Vert. {y}</th>)}
                                <th className="p-2 text-right bg-slate-100">Var. Horizontal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(groupedVertical).map((acc, i) => {
                                const hItem = horizontal.find((h: any) => h.account === acc);
                                return (
                                    <tr key={i} className="border-b hover:bg-slate-50">
                                        <td className="p-2 font-medium">{acc}</td>
                                        {years.map(y => (
                                            <td key={y} className="p-2 text-right font-mono text-slate-600">
                                                {/* USO SEGURO DEL DICCIONARIO */}
                                                {groupedVertical[acc] && groupedVertical[acc][y] !== undefined
                                                    ? groupedVertical[acc][y].toFixed(2) + '%'
                                                    : '-'}
                                            </td>
                                        ))}
                                        <td className="p-2 text-right font-bold bg-slate-50">
                                            {hItem ? (
                                                <span className={hItem.var_pct > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {hItem.var_pct.toFixed(2)}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Analysis;