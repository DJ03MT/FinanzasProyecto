import React, { useState, useRef, useEffect } from 'react';
import { Upload, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext'; // <--- USAR CONTEXTO
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import type { FinancialRecord } from '../types/finance';

const DataEntry = () => {
    const { records, saveRecords, saveAnalysis } = useFinancial(); // <--- DATOS GLOBALES
    const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Estado local solo para el input de nueva linea
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
        saveRecords([...records, newRecord]); // GUARDAR EN GLOBAL
        setNewLine({ ...newLine, accountName: '', value: 0 });
    };

    const handleDeleteRow = (id: string) => {
        saveRecords(records.filter(r => r.id !== id));
    };

    const handleSaveAndAnalyze = async () => {
        setLoading(true);
        try {
            const resultado = await api.analyzeData(records);
            saveAnalysis(resultado); // GUARDAR RESULTADOS EN GLOBAL
            navigate('/analysis');
        } catch (error) {
            alert("Error al analizar. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    };

    // ... (El resto del renderizado es igual, solo asegúrate de usar 'records' del context)
    // Aquí te pongo el return resumido para que veas dónde va lo importante:
    return (
        <div className="p-8 space-y-6">
            <header><h1 className="text-3xl font-bold">Carga de Datos</h1></header>

            <div className="bg-white p-6 rounded shadow">
                {/* FORMULARIO DE INPUTS (Igual que antes) */}
                <div className="grid grid-cols-12 gap-4 mb-4">
                    <input type="number" placeholder="Año" className="col-span-2 border p-2 rounded" value={newLine.year} onChange={e => setNewLine({ ...newLine, year: +e.target.value })} />
                    <input type="text" placeholder="Cuenta" className="col-span-4 border p-2 rounded" value={newLine.accountName} onChange={e => setNewLine({ ...newLine, accountName: e.target.value })} />
                    <select className="col-span-2 border p-2 rounded" value={newLine.type} onChange={e => setNewLine({ ...newLine, type: e.target.value as any })}>
                        <option value="asset">Activo</option><option value="liability">Pasivo</option><option value="equity">Patrimonio</option><option value="revenue">Ingreso</option><option value="expense">Gasto</option>
                    </select>
                    <input type="number" placeholder="Monto" className="col-span-3 border p-2 rounded" value={newLine.value} onChange={e => setNewLine({ ...newLine, value: +e.target.value })} />
                    <button onClick={handleAddRow} className="col-span-1 bg-blue-600 text-white p-2 rounded"><Plus /></button>
                </div>

                {/* TABLA QUE NO SE BORRA */}
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

                <button onClick={handleSaveAndAnalyze} disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : <Save />} Analizar Todo
                </button>
            </div>
        </div>
    );
};
export default DataEntry;