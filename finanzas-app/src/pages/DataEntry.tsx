import React, { useState, useRef } from 'react';
import { Upload, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext'; // <--- CONEXIÓN A MEMORIA
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import type { FinancialRecord } from '../types/finance';

const DataEntry = () => {
    // Usamos 'useFinancial' para que los datos se guarden en la memoria global
    const { records, saveRecords, saveAnalysis } = useFinancial();

    const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const [newLine, setNewLine] = useState<Partial<FinancialRecord>>({
        year: new Date().getFullYear(), type: 'asset', value: 0, accountName: ''
    });

    const handleAddRow = () => {
        if (!newLine.accountName || !newLine.value) return;
        const newRecord: FinancialRecord = {
            id: crypto.randomUUID(),
            accountName: newLine.accountName,
            value: Number(newLine.value),
            year: newLine.year || 2024,
            type: newLine.type as any,
        };
        saveRecords([...records, newRecord]); // Guardar en global
        setNewLine({ ...newLine, accountName: '', value: 0 });
    };

    const handleDeleteRow = (id: string) => {
        saveRecords(records.filter(r => r.id !== id));
    };

    const handleSaveAndAnalyze = async () => {
        setLoading(true);
        try {
            console.log("Enviando...", records);
            const resultado = await api.analyzeData(records);
            console.log("Recibido:", resultado);

            saveAnalysis(resultado); // <--- GUARDAR EN MEMORIA ANTES DE SALIR
            navigate('/analysis');   // <--- YA NO NECESITAMOS PASAR 'STATE'

        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message || "Revisa la terminal de Python"}`);
        } finally {
            setLoading(false);
        }
    };

    // Subir CSV
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const res = await api.uploadCSV(file);
            const nuevos = res.data.map((d: any) => ({ ...d, id: crypto.randomUUID() }));
            saveRecords([...records, ...nuevos]); // Guardar en global
            setActiveTab('manual');
            alert(`✅ ${nuevos.length} registros importados.`);
        } catch (e) { alert("Error al procesar CSV"); }
        finally { setLoading(false); }
    };

    return (
        <div className="p-8 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Carga de Datos</h1>
                <div className="bg-white p-1 rounded border flex">
                    <button onClick={() => setActiveTab('manual')} className={`px-4 py-2 rounded ${activeTab === 'manual' ? 'bg-blue-100 text-blue-700' : ''}`}>Manual</button>
                    <button onClick={() => setActiveTab('csv')} className={`px-4 py-2 rounded ${activeTab === 'csv' ? 'bg-blue-100 text-blue-700' : ''}`}>CSV</button>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                {activeTab === 'manual' && (
                    <>
                        <div className="grid grid-cols-12 gap-4 mb-6 bg-slate-50 p-4 rounded items-end">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Año</label>
                                <input type="number" placeholder="Año" className="w-full border p-2 rounded" value={newLine.year} onChange={e => setNewLine({ ...newLine, year: +e.target.value })} />
                            </div>
                            <div className="col-span-4">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre de Cuenta</label>
                                <input type="text" placeholder="Ej. Caja General" className="w-full border p-2 rounded" value={newLine.accountName} onChange={e => setNewLine({ ...newLine, accountName: e.target.value })} />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Tipo</label>
                                <select className="w-full border p-2 rounded" value={newLine.type} onChange={e => setNewLine({ ...newLine, type: e.target.value as any })}>
                                    <option value="asset">Activo</option>
                                    <option value="liability">Pasivo</option>
                                    <option value="equity">Patrimonio</option>
                                    <option value="revenue">Ingreso</option>
                                    <option value="expense">Gasto</option>
                                </select>
                            </div>
                            <div className="col-span-3">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Monto</label>
                                {/* AQUÍ ESTÁ EL CAMBIO: value={newLine.value || ''} */}
                                {/* Esto hace que si es 0, se vea vacío en vez de "0" */}
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full border p-2 rounded"
                                    value={newLine.value || ''}
                                    onChange={e => setNewLine({ ...newLine, value: +e.target.value })}
                                />
                            </div>
                            <button onClick={handleAddRow} className="col-span-1 bg-blue-600 text-white p-2 rounded h-10 mt-6 flex justify-center items-center hover:bg-blue-700"><Plus size={20} /></button>
                        </div>

                        <table className="w-full text-sm mb-6">
                            <thead className="bg-gray-100 text-slate-600">
                                <tr>
                                    <th className="px-4 py-2 text-left">Año</th>
                                    <th className="px-4 py-2 text-left">Cuenta</th>
                                    <th className="px-4 py-2 text-left">Tipo</th>
                                    <th className="px-4 py-2 text-right">Monto</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id} className="border-b hover:bg-slate-50">
                                        <td className="px-4 py-2">{r.year}</td>
                                        <td className="px-4 py-2 font-medium">{r.accountName}</td>
                                        <td className="px-4 py-2"><span className="bg-slate-200 px-2 py-1 rounded text-xs">{r.type}</span></td>
                                        <td className="px-4 py-2 text-right font-mono">{r.value.toLocaleString()}</td>
                                        <td className="text-center"><button onClick={() => handleDeleteRow(r.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button></td>
                                    </tr>
                                ))}
                                {records.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay registros. Agrega cuentas arriba.</td></tr>
                                )}
                            </tbody>
                        </table>

                        <div className="flex justify-end">
                            <button onClick={handleSaveAndAnalyze} disabled={loading || records.length === 0} className="bg-slate-900 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin" /> : <Save />} {loading ? 'Procesando...' : 'Analizar Todo'}
                            </button>
                        </div>
                    </>
                )}
                {activeTab === 'csv' && (
                    <div className="p-12 text-center border-2 border-dashed m-6 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelect} />
                        <Upload className="mx-auto text-blue-500 mb-2" size={40} />
                        <p className="text-slate-600 font-medium">Haz clic para subir archivo CSV</p>
                        <p className="text-xs text-slate-400 mt-1">Formato: año, cuenta, valor, tipo</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default DataEntry;