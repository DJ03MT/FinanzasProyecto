import axios from 'axios';
import type { FinancialRecord } from '../types/finance';

// La dirección donde vive tu backend Python
const API_URL = 'http://127.0.0.1:8000';

export const api = {
    // 1. Función para enviar datos manuales
    analyzeData: async (records: FinancialRecord[]) => {
        try {
            const response = await axios.post(`${API_URL}/analyze`, { records });
            return response.data;
        } catch (error) {
            console.error("Error al contactar con Python:", error);
            throw error;
        }
    },

    // 2. Función para subir CSV
    uploadCSV: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file); // 'file' debe coincidir con el nombre en main.py

        try {
            const response = await axios.post(`${API_URL}/upload-csv`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data; // Devuelve los datos leídos del CSV
        } catch (error) {
            console.error("Error subiendo CSV:", error);
            throw error;
        }
    }
};