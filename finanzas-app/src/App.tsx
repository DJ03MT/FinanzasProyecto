import React from 'react';
import DataEntry from './pages/DataEntry';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, FileSpreadsheet, BarChart3, FileText } from 'lucide-react';
import Analysis from './pages/Analysis';
// Componentes placeholder (luego los crearemos bien)
const Dashboard = () => <div className="p-8"><h1>Dashboard General</h1></div>;
const Reports = () => <div className="p-8"><h1>Reportes y Conclusiones IA</h1></div>;

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar Lateral */}
        <aside className="w-64 bg-slate-900 text-white">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-blue-400">App Web Finanzas Antoni Gay</h2>
          </div>
          <nav className="mt-6 flex flex-col gap-2 px-4">
            <Link to="/" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link to="/entry" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg">
              <FileSpreadsheet size={20} /> Carga de Datos
            </Link>
            <Link to="/analysis" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg">
              <BarChart3 size={20} /> Análisis Profundo
            </Link>
            <Link to="/reports" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg">
              <FileText size={20} /> Reportes IA
            </Link>
          </nav>
        </aside>

        {/* Área Principal */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/entry" element={<DataEntry />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;