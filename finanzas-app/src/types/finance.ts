export interface FinancialRecord {
    id: string;
    accountName: string;
    value: number;
    year: number;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

// Aquí definimos la estructura completa que devuelve Python
export interface AnalysisResult {
    ratios: any[];
    flujo_efectivo: any[];
    vertical: any[];
    horizontal: any[];
    conclusion: string;
    financial_statements: any;
    proforma: any;
}
