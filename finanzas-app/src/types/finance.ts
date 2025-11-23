// src/types/finance.ts

export interface FinancialRecord {
    id: string;
    accountName: string; // Ej: "Caja y Bancos"
    value: number;       // Ej: 15000.00
    year: number;        // Ej: 2023
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    subType?: 'current' | 'non-current'; // Corriente o No Corriente
}

export interface BalanceSheet {
    year: number;
    assets: FinancialRecord[];
    liabilities: FinancialRecord[];
    equity: FinancialRecord[];
}

export interface IncomeStatement {
    year: number;
    revenues: FinancialRecord[];
    expenses: FinancialRecord[];
}