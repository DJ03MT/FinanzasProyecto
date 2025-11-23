import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { FinancialRecord } from '../types/finance';

interface AnalysisResult {
    ratios: any[];
    flujo_efectivo: any[];
    vertical: any[];
    horizontal: any[];
    conclusion: string;
}

interface FinancialContextType {
    records: FinancialRecord[];
    saveRecords: (records: FinancialRecord[]) => void;
    analysisData: AnalysisResult | null;
    saveAnalysis: (data: AnalysisResult) => void;
    clearAll: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider = ({ children }: { children: ReactNode }) => {
    // Inicializamos con lo que haya en localStorage para que no se pierda al recargar página
    const [records, setRecords] = useState<FinancialRecord[]>(() => {
        const saved = localStorage.getItem('fin_records');
        return saved ? JSON.parse(saved) : [];
    });

    const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(() => {
        const saved = localStorage.getItem('fin_analysis');
        return saved ? JSON.parse(saved) : null;
    });

    const saveRecords = (newRecords: FinancialRecord[]) => {
        setRecords(newRecords);
        localStorage.setItem('fin_records', JSON.stringify(newRecords));
    };

    const saveAnalysis = (data: AnalysisResult) => {
        setAnalysisData(data);
        localStorage.setItem('fin_analysis', JSON.stringify(data));
    };

    const clearAll = () => {
        setRecords([]);
        setAnalysisData(null);
        localStorage.removeItem('fin_records');
        localStorage.removeItem('fin_analysis');
    };

    return (
        <FinancialContext.Provider value={{ records, saveRecords, analysisData, saveAnalysis, clearAll }}>
            {children}
        </FinancialContext.Provider>
    );
};

export const useFinancial = () => {
    const context = useContext(FinancialContext);
    if (!context) throw new Error('useFinancial debe usarse dentro de un FinancialProvider');
    return context;
};