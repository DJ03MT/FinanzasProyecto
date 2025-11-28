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
                            <input type="number" placeholder="Año" className="col-span-2 border p-2 rounded" value={newLine.year} onChange={e => setNewLine({ ...newLine, year: +e.target.value })} />
                            <input type="text" placeholder="Cuenta" className="col-span-4 border p-2 rounded" value={newLine.accountName} onChange={e => setNewLine({ ...newLine, accountName: e.target.value })} />
                            <select className="col-span-2 border p-2 rounded" value={newLine.type} onChange={e => setNewLine({ ...newLine, type: e.target.value as any })}>
                                <option value="asset">Activo</option><option value="liability">Pasivo</option><option value="equity">Patrimonio</option><option value="revenue">Ingreso</option><option value="expense">Gasto</option>
                            </select>
                            <input type="number" placeholder="Monto" className="col-span-3 border p-2 rounded" value={newLine.value} onChange={e => setNewLine({ ...newLine, value: +e.target.value })} />
                            <button onClick={handleAddRow} className="col-span-1 bg-blue-600 text-white p-2 rounded"><Plus /></button>
                        </div>

                        <table className="w-full text-sm mb-6">
                            <thead className="bg-gray-100"><tr><th>Año</th><th>Cuenta</th><th>Monto</th><th></th></tr></thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id} className="border-b">
                                        <td>{r.year}</td><td>{r.accountName}</td><td className="text-right">{r.value}</td>
                                        <td className="text-center"><button onClick={() => handleDeleteRow(r.id)} className="text-red-500"><Trash2 size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end">
                            <button onClick={handleSaveAndAnalyze} disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded flex items-center gap-2">
                                {loading ? <Loader2 className="animate-spin" /> : <Save />} {loading ? 'Procesando...' : 'Analizar Todo'}
                            </button>
                        </div>
                    </>
                )}
                {activeTab === 'csv' && (
                    <div className="p-12 text-center border-2 border-dashed m-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelect} />
                        <p>Click para subir CSV</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default DataEntry;