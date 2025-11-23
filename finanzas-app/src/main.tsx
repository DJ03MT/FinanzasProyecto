import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FinancialProvider } from './context/FinancialContext' // <--- IMPORTAR

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FinancialProvider> {/* <--- ENVOLVER LA APP */}
      <App />
    </FinancialProvider>
  </StrictMode>,
)