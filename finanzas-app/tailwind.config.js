/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ¡Esta línea es la más importante!
  ],
  theme: {
    extend: {
      // Aquí extendemos el tema base. 
      // Agregué colores semánticos para finanzas.
      colors: {
        finance: {
          primary: '#1e293b',   // Un azul oscuro profesional (Slate-800)
          secondary: '#3b82f6', // Azul brillante para acciones (Blue-500)
          positive: '#22c55e',  // Verde para ganancias
          negative: '#ef4444',  // Rojo para pérdidas
        }
      }
    },
  },
  plugins: [],
}