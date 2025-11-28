import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { BrainCircuit, TrendingUp, ArrowRightLeft } from 'lucide-react';

const Analysis = () => {
    const { analysisData } = useFinancial();
    const [activeTab, setActiveTab] = useState('balance');

    if (!analysisData || !analysisData.ratios) return <Navigate to="/entry" replace />;

    const { ratios, vertical, horizontal, conclusion, financial_statements, proforma, flujo_efectivo } = analysisData;
    const years = Object.keys(financial_statements).map(Number).sort();
    const lastYear = years[years.length - 1];
    const fmt = (n: number) => n?.toLocaleString('es-NI', { style: 'currency', currency: 'NIO' });

    // Agrupación para tabla V/H
    const groupedVertical: Record<string, Record<number, number>> = {};
    vertical.forEach((v: any) => {
        if (!groupedVertical[v.accountName]) groupedVertical[v.accountName] = {};
        groupedVertical[v.accountName][v.year] = v.pct;
    });

    const RenderAccountGroup = ({ title, accounts, total, color = "text-slate-700" }: any) => (
        <div className="mb-4">
            <div className={`font-bold flex justify-between border-b ${color} bg-slate-50 p-1`}>
                <span>{title}</span>
                <span>{fmt(total)}</span>
            </div>
            <div className="pl-2 text-sm">
                {accounts.map((acc: any, i: number) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-100 hover:bg-slate-50">
                        <span className="capitalize">{acc.accountName.toLowerCase()}</span>
                        <span>{fmt(acc.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-8 pb-20 space-y-6 bg-slate-50 min-h-screen">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Resultados Financieros {lastYear}</h1>
            </header>

            <div className="bg-white p-6 rounded-xl border-l-8 border-indigo-600 shadow-sm">
                <h3 className="font-bold flex gap-2 mb-2 text-indigo-800"><BrainCircuit /> Diagnóstico Inteligente</h3>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">{conclusion}</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'balance', label: 'Balance General' },
                    { id: 'income', label: 'Estado Resultados' },
                    { id: 'cashflow', label: 'Flujo Efectivo' },
                    { id: 'ratios', label: 'Ratios & DuPont' },
                    { id: 'horizontal', label: 'Análisis Horizontal' },
                    { id: 'vertical', label: 'Análisis Vertical' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === t.id
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* BALANCE GENERAL */}
            {activeTab === 'balance' && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {years.map(year => {
                        const bs = financial_statements[year].balance_sheet;
                        return (
                            <div key={year} className="bg-white p-6 rounded-xl shadow border border-slate-200">
                                <h3 className="text-xl font-bold text-center mb-4 bg-slate-100 py-2 rounded">Año {year}</h3>

                                <h4 className="font-bold text-green-700 mt-4 mb-2 uppercase text-xs tracking-wider">Activos</h4>
                                <RenderAccountGroup title="Activo Corriente (AC)" accounts={bs.assets.current.accounts} total={bs.assets.current.total} />
                                <RenderAccountGroup title="Activo No Corriente (AF)" accounts={bs.assets.non_current.accounts} total={bs.assets.non_current.total} />
                                <div className="flex justify-between font-bold text-lg border-t-2 border-green-600 pt-2 mt-2">
                                    <span>TOTAL ACTIVOS</span>
                                    <span>{fmt(bs.assets.total)}</span>
                                </div>

                                <h4 className="font-bold text-red-700 mt-8 mb-2 uppercase text-xs tracking-wider">Pasivos y Patrimonio</h4>
                                <RenderAccountGroup title="Pasivo Corriente (PC)" accounts={bs.liabilities.current.accounts} total={bs.liabilities.current.total} />
                                <RenderAccountGroup title="Pasivo No Corriente (PNC)" accounts={bs.liabilities.non_current.accounts} total={bs.liabilities.non_current.total} />
                                <div className="flex justify-between font-bold border-t border-red-200 pt-1 mb-4">
                                    <span>Total Pasivos</span>
                                    <span>{fmt(bs.liabilities.total)}</span>
                                </div>

                                <RenderAccountGroup title="Patrimonio" accounts={bs.equity.accounts} total={bs.equity.total - bs.equity.retained_earnings} />
                                <div className="flex justify-between py-1 border-b text-sm">
                                    <span>Utilidad del Ejercicio</span>
                                    <span>{fmt(bs.equity.retained_earnings)}</span>
                                </div>

                                <div className="flex justify-between font-bold text-lg border-t-2 border-slate-800 pt-2 mt-4 bg-slate-50 p-2 rounded">
                                    <span>PASIVO + PATRIMONIO</span>
                                    <span>{fmt(bs.total_liab_equity)}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ESTADO DE RESULTADOS */}
            {activeTab === 'income' && (
                <div className="bg-white p-6 rounded-xl shadow border overflow-x-auto animate-in fade-in">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-slate-50">
                            <tr><th className="text-left p-3">Cuenta</th>{years.map(y => <th key={y} className="text-right p-3">{y}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr><td className="p-3 font-bold">Ventas Netas</td>{years.map(y => <td key={y} className="text-right p-3">{fmt(financial_statements[y].income_statement.net_sales)}</td>)}</tr>
                            <tr><td className="p-3 text-red-600 pl-6">(-) Costo de Ventas</td>{years.map(y => <td key={y} className="text-right p-3 text-red-600">{fmt(financial_statements[y].income_statement.cogs)}</td>)}</tr>
                            <tr className="bg-gray-50 font-bold"><td className="p-3">Utilidad Bruta</td>{years.map(y => <td key={y} className="text-right p-3">{fmt(financial_statements[y].income_statement.gross_profit)}</td>)}</tr>
                            <tr><td className="p-3 text-red-600 pl-6">(-) Gastos Operativos</td>{years.map(y => <td key={y} className="text-right p-3 text-red-600">{fmt(financial_statements[y].income_statement.operating_expenses)}</td>)}</tr>
                            <tr><td className="p-3 text-red-600 pl-6">(-) Depreciación</td>{years.map(y => <td key={y} className="text-right p-3 text-red-600">{fmt(financial_statements[y].income_statement.depreciation)}</td>)}</tr>
                            <tr className="bg-gray-50 font-bold"><td className="p-3">Utilidad Operativa</td>{years.map(y => <td key={y} className="text-right p-3">{fmt(financial_statements[y].income_statement.operating_income)}</td>)}</tr>
                            <tr><td className="p-3 text-red-600 pl-6">(-) Intereses e Impuestos</td>{years.map(y => {
                                const st = financial_statements[y].income_statement;
                                return <td key={y} className="text-right p-3 text-red-600">{fmt(st.interest_expense + st.taxes)}</td>
                            })}</tr>
                            <tr className="bg-green-50 font-bold text-green-800 text-base"><td className="p-3">Utilidad Neta</td>{years.map(y => <td key={y} className="text-right p-3">{fmt(financial_statements[y].income_statement.net_income)}</td>)}</tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* FLUJO DE EFECTIVO */}
            {activeTab === 'cashflow' && (
                <div className="space-y-8 animate-in fade-in">
                    {flujo_efectivo && flujo_efectivo.length > 0 ? (
                        flujo_efectivo.map((f: any) => (
                            <div key={f.year} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                <div className="bg-emerald-800 text-white p-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <ArrowRightLeft className="w-5 h-5" /> Flujo de Efectivo {f.year}
                                    </h3>
                                </div>
                                <div className="grid md:grid-cols-2 divide-x divide-slate-100">
                                    {/* INDIRECTO */}
                                    <div className="p-6">
                                        <h4 className="font-bold text-emerald-700 mb-4 border-b pb-2">Método Indirecto</h4>

                                        <div className="space-y-1 mb-6">
                                            <p className="font-bold text-sm text-slate-500 mb-2">Actividades de Operación</p>
                                            {f.indirecto.operacion.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm py-1 border-b border-dashed border-slate-200">
                                                    <span>{item.concepto}</span>
                                                    <span className={item.valor < 0 ? 'text-red-500' : 'text-slate-700'}>{fmt(item.valor)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between font-bold pt-2">
                                                <span>Flujo Operativo Neto</span>
                                                <span>{fmt(f.indirecto.total_operacion)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1 mb-6">
                                            <p className="font-bold text-sm text-slate-500 mb-2">Actividades de Inversión</p>
                                            {f.indirecto.inversion.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm py-1">
                                                    <span>{item.concepto}</span>
                                                    <span>{fmt(item.valor)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-1 mb-6">
                                            <p className="font-bold text-sm text-slate-500 mb-2">Actividades de Financiamiento</p>
                                            {f.indirecto.financiamiento.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm py-1">
                                                    <span>{item.concepto}</span>
                                                    <span>{fmt(item.valor)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-emerald-50 p-4 rounded text-sm font-bold">
                                            <div className="flex justify-between mb-1">
                                                <span>Saldo Inicial Efectivo</span>
                                                <span>{fmt(f.indirecto.resumen.saldo_inicial)}</span>
                                            </div>
                                            <div className="flex justify-between mb-1 text-emerald-700">
                                                <span>(+) Flujo Neto Periodo</span>
                                                <span>{fmt(f.indirecto.resumen.flujo_neto_periodo)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-emerald-200 pt-2 text-base">
                                                <span>Saldo Final Efectivo</span>
                                                <span>{fmt(f.indirecto.resumen.saldo_final_calculado)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DIRECTO */}
                                    <div className="p-6 bg-slate-50">
                                        <h4 className="font-bold text-blue-700 mb-4 border-b pb-2">Método Directo (Estimado)</h4>
                                        <div className="space-y-2">
                                            {f.directo.items.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm py-2 border-b border-white">
                                                    <span>{item.concepto}</span>
                                                    <span className="font-mono">{fmt(item.valor)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between font-bold text-lg pt-4 text-blue-800">
                                                <span>Flujo Neto Operativo</span>
                                                <span>{fmt(f.directo.flujo_operativo)}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-4 italic">
                                                * El método directo es una estimación basada en las variaciones del balance y estado de resultados.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 bg-white rounded-xl shadow border border-dashed">
                            <p className="text-slate-500">Se necesitan al menos dos años de datos para generar el flujo de efectivo comparativo.</p>
                        </div>
                    )}
                </div>
            )}

            {/* RATIOS */}
            {activeTab === 'ratios' && (
                <div className="space-y-8 animate-in fade-in">
                    {ratios.map((r: any) => (
                        <div key={r.year} className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                <h3 className="font-bold text-lg">Indicadores Financieros {r.year}</h3>
                                <span className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold">ROE: {r.rentabilidad.roe.toFixed(2)}%</span>
                            </div>

                            {/* DUPONT VISUAL */}
                            <div className="bg-slate-800 p-6 text-white text-center">
                                <h4 className="text-sm text-slate-400 mb-4 uppercase tracking-widest font-bold">Análisis DuPont</h4>
                                <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 text-sm md:text-base">
                                    <div className="bg-slate-700 p-3 rounded-lg w-32">
                                        <div className="text-blue-400 font-bold text-xl">{r.rentabilidad.dupont.margen.toFixed(2)}%</div>
                                        <div className="text-xs text-slate-400">Margen Neto</div>
                                    </div>
                                    <span className="text-slate-500">×</span>
                                    <div className="bg-slate-700 p-3 rounded-lg w-32">
                                        <div className="text-purple-400 font-bold text-xl">{r.rentabilidad.dupont.rotacion.toFixed(2)}</div>
                                        <div className="text-xs text-slate-400">Rotación Activos</div>
                                    </div>
                                    <span className="text-slate-500">×</span>
                                    <div className="bg-slate-700 p-3 rounded-lg w-32">
                                        <div className="text-orange-400 font-bold text-xl">{r.rentabilidad.dupont.multiplicador.toFixed(2)}</div>
                                        <div className="text-xs text-slate-400">Apalancamiento</div>
                                    </div>
                                    <span className="text-slate-500">=</span>
                                    <div className="bg-green-700 p-3 rounded-lg w-32 ring-2 ring-green-500">
                                        <div className="text-white font-bold text-xl">{r.rentabilidad.dupont.sistema.toFixed(2)}%</div>
                                        <div className="text-xs text-green-200">ROE (Sistema)</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y border-t">
                                <div className="p-4">
                                    <h4 className="font-bold text-indigo-600 mb-3 border-b pb-1">Liquidez</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Razón Circulante</span> <b>{r.liquidez.razon_circulante.toFixed(2)}</b></div>
                                        <div className="flex justify-between"><span>Prueba Ácida</span> <b>{r.liquidez.razon_rapida.toFixed(2)}</b></div>
                                        <div className="flex justify-between"><span>CNT</span> <b>{fmt(r.liquidez.cnt)}</b></div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-orange-600 mb-3 border-b pb-1">Actividad</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Rot. Inventario</span> <b>{r.actividad.rotacion_inventarios.toFixed(2)}</b></div>
                                        <div className="flex justify-between"><span>Rot. Activos</span> <b>{r.actividad.rotacion_activos_totales.toFixed(2)}</b></div>
                                        <div className="flex justify-between"><span>Días Cobro</span> <b>{r.actividad.periodo_cobro.toFixed(0)}</b></div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-red-600 mb-3 border-b pb-1">Endeudamiento</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Nivel Deuda</span> <b>{r.endeudamiento.razon_endeudamiento.toFixed(2)}%</b></div>
                                        <div className="flex justify-between"><span>Pasivo/Capital</span> <b>{r.endeudamiento.razon_pasivo_capital.toFixed(2)}</b></div>
                                        <div className="flex justify-between"><span>Cob. Intereses</span> <b>{r.endeudamiento.cobertura_intereses.toFixed(2)}</b></div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-green-600 mb-3 border-b pb-1">Rentabilidad</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Margen Bruto</span> <b>{r.rentabilidad.margen_bruto.toFixed(2)}%</b></div>
                                        <div className="flex justify-between"><span>Margen Operativo</span> <b>{r.rentabilidad.margen_operativo.toFixed(2)}%</b></div>
                                        <div className="flex justify-between"><span>ROA</span> <b>{r.rentabilidad.roa.toFixed(2)}%</b></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* HORIZONTAL */}
            {activeTab === 'horizontal' && (
                <div className="bg-white p-6 rounded-xl shadow border overflow-auto animate-in fade-in">
                    <h3 className="font-bold mb-4">Análisis Horizontal (Base: {years[0]})</h3>
                    {horizontal.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-3 text-left">Cuenta</th>
                                    <th className="p-3 text-right">Base ({years[0]})</th>
                                    <th className="p-3 text-left">Periodo</th>
                                    <th className="p-3 text-right">Valor Año</th>
                                    <th className="p-3 text-right">Var. Absoluta</th>
                                    <th className="p-3 text-right">Var. Relativa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {horizontal.map((h: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium">{h.account}</td>
                                        <td className="p-3 text-right text-slate-500">{fmt(h.val_base)}</td>
                                        <td className="p-3 text-blue-600 font-bold">{h.period}</td>
                                        <td className="p-3 text-right font-bold">{fmt(h.val_curr)}</td>
                                        <td className={`p-3 text-right ${h.var_abs >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(h.var_abs)}</td>
                                        <td className={`p-3 text-right font-bold ${h.var_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {h.var_pct.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="text-center p-4 text-slate-500">Se necesitan al menos 2 años para el análisis horizontal.</p>}
                </div>
            )}

            {/* VERTICAL */}
            {activeTab === 'vertical' && (
                <div className="bg-white p-6 rounded-xl shadow border overflow-auto animate-in fade-in">
                    <h3 className="font-bold mb-4">Análisis Vertical (Porcentaje Integral)</h3>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-2 text-left">Cuenta</th>
                                {years.map(y => <th key={y} className="p-2 text-right">{y}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {Object.keys(groupedVertical).sort().map((acc, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-2 font-medium">{acc}</td>
                                    {years.map(y => (
                                        <td key={y} className="p-2 text-right font-mono text-slate-600">
                                            {groupedVertical[acc][y] !== undefined ? groupedVertical[acc][y].toFixed(2) + '%' : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PROFORMA */}
            {activeTab === 'ratios' && proforma && (
                <div className="mt-8 bg-purple-50 p-6 rounded-xl border border-purple-200">
                    <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5" /> Proyección {proforma.year_proj} (Método % Ventas)
                    </h3>
                    <div className="grid md:grid-cols-4 gap-6 text-center">
                        <div className="bg-white p-4 rounded shadow-sm">
                            <div className="text-sm text-slate-500">Crecimiento Ventas</div>
                            <div className="font-bold text-xl text-purple-600">{proforma.growth_rate.toFixed(2)}%</div>
                        </div>
                        <div className="bg-white p-4 rounded shadow-sm">
                            <div className="text-sm text-slate-500">Ventas Proyectadas</div>
                            <div className="font-bold text-lg">{fmt(proforma.proforma.ventas)}</div>
                        </div>
                        <div className="bg-white p-4 rounded shadow-sm">
                            <div className="text-sm text-slate-500">Costo Ventas Est.</div>
                            <div className="font-bold text-lg text-red-500">{fmt(proforma.proforma.costo_ventas)}</div>
                        </div>
                        <div className="bg-white p-4 rounded shadow-sm ring-1 ring-purple-200">
                            <div className="text-sm text-slate-500">Utilidad Operativa Est.</div>
                            <div className="font-bold text-lg text-green-600">{fmt(proforma.proforma.utilidad_operativa)}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analysis;