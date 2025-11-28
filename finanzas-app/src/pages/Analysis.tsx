import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrainCircuit, TrendingUp, DollarSign, Activity } from 'lucide-react';

const Analysis = () => {
    const { analysisData } = useFinancial();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('estados');

    if (!analysisData || !analysisData.ratios) return <Navigate to="/entry" replace />;

    const { ratios, flujo_efectivo, vertical, horizontal, conclusion, financial_statements, proforma } = analysisData;
    const years = Object.keys(financial_statements).map(Number).sort();
    const lastYear = years[years.length - 1];
    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    // Preparar datos vertical agrupados para la tabla V/H
    const groupedVertical: Record<string, Record<number, number>> = {};
    vertical.forEach((v: any) => {
        if (!groupedVertical[v.accountName]) groupedVertical[v.accountName] = {};
        groupedVertical[v.accountName][v.year] = v.pct;
    });

    return (
        <div className="p-8 pb-20 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Resultados {lastYear}</h1>
            </header>

            <div className="bg-white p-6 rounded-xl border-l-8 border-blue-600 shadow">
                <h3 className="font-bold flex gap-2 mb-2 text-blue-800"><BrainCircuit /> Diagnóstico IA</h3>
                <p className="text-slate-700 whitespace-pre-line">{conclusion}</p>
            </div>

            <div className="flex gap-2 border-b overflow-x-auto">
                {['estados', 'flujos', 'ratios', 'proforma', 'analisis_vh'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 capitalize font-medium ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>
                        {t === 'analisis_vh' ? 'Análisis V/H' : t}
                    </button>
                ))}
            </div>

            {/* 1. ESTADOS FINANCIEROS */}
            {activeTab === 'estados' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="bg-white p-6 rounded-xl shadow border overflow-x-auto">
                        <h3 className="font-bold mb-4 bg-gray-100 p-2 text-center rounded">Estado de Resultados Comparativo</h3>
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-slate-50"><tr><th className="text-left p-2">Cuenta</th>{years.map(y => <th key={y} className="text-right p-2">{y}</th>)}</tr></thead>
                            <tbody>
                                <tr><td className="p-2 font-bold">Ventas Netas</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].income_statement.net_sales)}</td>)}</tr>
                                <tr><td className="p-2 pl-4 text-red-500">(-) Costo Ventas</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].income_statement.net_sales - financial_statements[y].income_statement.gross_profit)}</td>)}</tr>
                                <tr className="font-bold bg-gray-50"><td className="p-2">Utilidad Bruta</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].income_statement.gross_profit)}</td>)}</tr>
                                <tr><td className="p-2 pl-4 text-red-500">(-) Gastos Operativos</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].income_statement.gross_profit - financial_statements[y].income_statement.net_income)}</td>)}</tr>
                                <tr className="font-bold bg-green-100"><td className="p-2 text-green-800">Utilidad Neta</td>{years.map(y => <td key={y} className="text-right p-2 text-green-800">{fmt(financial_statements[y].income_statement.net_income)}</td>)}</tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow border overflow-x-auto">
                        <h3 className="font-bold mb-4 bg-gray-100 p-2 text-center rounded">Balance General Comparativo</h3>
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-slate-50"><tr><th className="text-left p-2">Rubro</th>{years.map(y => <th key={y} className="text-right p-2">{y}</th>)}</tr></thead>
                            <tbody>
                                <tr className="font-bold bg-blue-50"><td className="p-2">TOTAL ACTIVOS</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.assets.total)}</td>)}</tr>
                                <tr className="font-bold bg-red-50"><td className="p-2">TOTAL PASIVOS</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.liabilities.total)}</td>)}</tr>
                                <tr className="font-bold bg-green-50"><td className="p-2">TOTAL PATRIMONIO</td>{years.map(y => <td key={y} className="text-right p-2">{fmt(financial_statements[y].balance_sheet.equity.total)}</td>)}</tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. FLUJOS DE EFECTIVO */}
            {activeTab === 'flujos' && (
                <div className="space-y-6 animate-in fade-in">
                    {flujo_efectivo.length > 0 ? flujo_efectivo.map((f: any) => (
                        <div key={f.year} className="bg-white p-6 rounded-xl shadow border">
                            <h3 className="font-bold mb-4 flex gap-2 items-center"><DollarSign /> Flujo de Efectivo {f.year}</h3>
                            <div className="grid md:grid-cols-2 gap-8 text-sm">
                                <div>
                                    <h4 className="font-bold text-blue-600 border-b mb-2">Método Indirecto</h4>
                                    <div className="flex justify-between"><span>Utilidad Neta:</span> <b>{fmt(f.indirecto.utilidad_neta)}</b></div>
                                    <div className="flex justify-between text-slate-500"><span>Ajustes (Var. Capital Trabajo):</span> <span>{fmt(f.indirecto.flujo_neto - f.indirecto.utilidad_neta)}</span></div>
                                    <div className="flex justify-between border-t mt-2 pt-1 font-bold bg-blue-50 p-1"><span>Flujo Operativo Neto:</span> <span>{fmt(f.indirecto.flujo_neto)}</span></div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-green-600 border-b mb-2">Método Directo (Est.)</h4>
                                    <div className="flex justify-between"><span>+ Recibido Clientes:</span> <span className="text-green-600">{fmt(f.directo.recibido_clientes)}</span></div>
                                    <div className="flex justify-between"><span>- Pagado Proveedores:</span> <span className="text-red-500">{fmt(f.directo.pagado_proveedores)}</span></div>
                                    <div className="flex justify-between"><span>- Pagado Gastos:</span> <span className="text-red-500">{fmt(f.directo.pagado_gastos)}</span></div>
                                    <div className="flex justify-between border-t mt-2 pt-1 font-bold bg-green-50 p-1"><span>Flujo Operativo Neto:</span> <span>{fmt(f.directo.flujo_neto)}</span></div>
                                </div>
                            </div>
                        </div>
                    )) : <div className="p-8 text-center text-slate-500 bg-white rounded shadow">Se requieren al menos 2 años para calcular flujos.</div>}
                </div>
            )}

            {/* 3. RATIOS & DUPONT */}
            {activeTab === 'ratios' && (
                <div className="space-y-6 animate-in fade-in">
                    {ratios.map((r: any) => (
                        <div key={r.year} className="bg-white p-6 rounded-xl shadow border">
                            <h3 className="font-bold mb-4 border-b pb-2">Indicadores {r.year}</h3>

                            {/* DuPont Visual */}
                            <div className="bg-slate-900 text-white p-4 rounded-lg mb-6 text-center">
                                <h4 className="text-xs uppercase text-slate-400 mb-2">Análisis DuPont</h4>
                                <div className="flex justify-around items-center font-bold text-lg">
                                    <div className="text-blue-400">{r.rentabilidad.dupont.margen.toFixed(1)}% <span className="block text-xs text-white font-normal">Margen</span></div>
                                    <div>x</div>
                                    <div className="text-purple-400">{r.rentabilidad.dupont.rotacion.toFixed(2)} <span className="block text-xs text-white font-normal">Rotación</span></div>
                                    <div>x</div>
                                    <div className="text-orange-400">{r.rentabilidad.dupont.multiplicador.toFixed(2)} <span className="block text-xs text-white font-normal">Apalancamiento</span></div>
                                    <div>=</div>
                                    <div className="bg-blue-600 px-3 py-1 rounded">{r.rentabilidad.roe.toFixed(1)}% <span className="block text-xs font-normal">ROE</span></div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div className="border p-3 rounded">
                                    <h4 className="font-bold text-green-700 mb-2">Liquidez</h4>
                                    <div className="flex justify-between"><span>CNT:</span> <b>{fmt(r.liquidez.cnt)}</b></div>
                                    <div className="flex justify-between"><span>CNO:</span> <b>{fmt(r.liquidez.cno)}</b></div>
                                    <div className="flex justify-between"><span>Razón Circulante:</span> <b>{r.liquidez.razon_circulante.toFixed(2)}</b></div>
                                </div>
                                <div className="border p-3 rounded">
                                    <h4 className="font-bold text-orange-700 mb-2">Actividad</h4>
                                    <div className="flex justify-between"><span>Rotación Inv:</span> <b>{r.actividad.rotacion_inventarios.toFixed(2)}</b></div>
                                    <div className="flex justify-between"><span>Días Cobro:</span> <b>{r.actividad.periodo_cobro.toFixed(0)}</b></div>
                                </div>
                                <div className="border p-3 rounded">
                                    <h4 className="font-bold text-blue-700 mb-2">Rentabilidad</h4>
                                    <div className="flex justify-between"><span>Margen Bruto:</span> <b>{r.rentabilidad.margen_bruto.toFixed(2)}%</b></div>
                                    <div className="flex justify-between"><span>Margen Neto:</span> <b>{r.rentabilidad.margen_neto.toFixed(2)}%</b></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 4. PROFORMA */}
            {activeTab === 'proforma' && proforma && (
                <div className="bg-white p-6 rounded-xl shadow border animate-in fade-in border-l-4 border-purple-500">
                    <h3 className="text-xl font-bold mb-2 text-purple-800 flex gap-2"><TrendingUp /> Proyección {proforma.year_proj}</h3>
                    <p className="mb-4 text-sm text-slate-500">Crecimiento estimado: <b>{proforma.growth_rate.toFixed(2)}%</b></p>
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b"><td className="p-2">Ventas Est.</td><td className="text-right p-2 font-bold">{fmt(proforma.proforma.ventas)}</td></tr>
                            <tr className="border-b"><td className="p-2">Costo Vta Est.</td><td className="text-right p-2 text-red-500">{fmt(proforma.proforma.costo_ventas)}</td></tr>
                            <tr className="bg-purple-50 font-bold"><td className="p-2">Utilidad Neta Est.</td><td className="text-right p-2">{fmt(proforma.proforma.utilidad_neta)}</td></tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* 5. ANÁLISIS V/H */}
            {activeTab === 'analisis_vh' && (
                <div className="bg-white p-6 rounded-xl shadow border overflow-auto animate-in fade-in">
                    <h3 className="font-bold mb-4">Matriz de Análisis Vertical y Horizontal</h3>
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