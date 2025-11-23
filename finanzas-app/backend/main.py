from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import io

app = FastAPI(title="FinAnalyzer Pro 360")

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FinancialRecord(BaseModel):
    id: str
    accountName: str
    value: float
    year: int
    type: str 

class AnalysisRequest(BaseModel):
    records: List[FinancialRecord]

# --- UTILIDADES ---
def safe_div(a, b):
    return a / b if b != 0 else 0

def clasificar_cuenta(nombre, tipo_principal):
    n = nombre.upper()
    if tipo_principal == 'asset':
        if any(x in n for x in ['CAJA', 'BANCO', 'EFECTIVO', 'DISPONIBLE']): return 'cash'
        if any(x in n for x in ['CLIENTE', 'COBRAR', 'DEUDORES']): return 'receivables'
        if any(x in n for x in ['INVENTARIO', 'ALMACEN', 'MERCADERIA']): return 'inventory'
        if any(x in n for x in ['CORRIENTE', 'CIRCULANTE']): return 'current_asset'
        return 'non_current_asset'
    if tipo_principal == 'liability':
        if any(x in n for x in ['PROVEEDOR', 'PAGAR', 'ACREEDORES']): return 'payables'
        if any(x in n for x in ['CORRIENTE', 'CORTO PLAZO']): return 'current_liability'
        return 'non_current_liability'
    if tipo_principal == 'expense':
        if 'COSTO' in n: return 'cogs'
    return tipo_principal

def calcular_flujos(df_curr, df_prev):
    """Calcula Indirecto y estima Directo"""
    if df_prev is None: return None
    
    def get_sum(df, sub_class):
        return df[df['sub_class'] == sub_class]['value'].sum()
    
    # Datos básicos
    ventas = df_curr[df_curr['type'] == 'revenue']['value'].sum()
    costo_ventas = get_sum(df_curr, 'cogs')
    gastos = df_curr[df_curr['type'] == 'expense']['value'].sum()
    utilidad = ventas - gastos # Simplificado
    
    # Variaciones (Actual - Anterior)
    var_cxc = get_sum(df_curr, 'receivables') - get_sum(df_prev, 'receivables')
    var_inv = get_sum(df_curr, 'inventory') - get_sum(df_prev, 'inventory')
    var_cxp = get_sum(df_curr, 'payables') - get_sum(df_prev, 'payables')
    
    # --- MÉTODO INDIRECTO ---
    flujo_operativo_indirecto = utilidad - var_cxc - var_inv + var_cxp
    
    # --- MÉTODO DIRECTO (ESTIMADO) ---
    # Cobro a Clientes = Ventas + (CxC Inicial - CxC Final) -> Ventas - Var_CxC
    cobro_clientes = ventas - var_cxc
    
    # Pago a Proveedores = Costo Ventas + (Inv Final - Inv Inicial) + (CxP Inicial - CxP Final) -> Costo + Var_Inv - Var_CxP
    pago_proveedores = costo_ventas + var_inv - var_cxp
    
    # Pago Gastos (Asumimos que resto de gastos se pagan efectivo si no hay pasivos relacionados)
    otros_gastos = gastos - costo_ventas
    pago_gastos = otros_gastos
    
    flujo_operativo_directo = cobro_clientes - pago_proveedores - pago_gastos

    return {
        "year": int(df_curr['year'].iloc[0]),
        "indirecto": {
            "utilidad_neta": utilidad,
            "ajustes": {
                "var_cxc": var_cxc,
                "var_inv": var_inv,
                "var_cxp": var_cxp
            },
            "flujo_neto": flujo_operativo_indirecto
        },
        "directo": {
            "recibido_clientes": cobro_clientes,
            "pagado_proveedores": pago_proveedores,
            "pagado_gastos": pago_gastos,
            "flujo_neto": flujo_operativo_directo
        }
    }

def generar_conclusion(ratios):
    if not ratios: return "Sin datos."
    ult = ratios[-1]
    roe = ult['rentabilidad']['roe']
    rc = ult['liquidez']['razon_circulante']
    
    txt = f"El ejercicio cerró con un ROE del {roe:.1f}%. "
    if roe > 15: txt += "Rentabilidad excelente. "
    elif roe > 0: txt += "Rentabilidad positiva pero mejorable. "
    else: txt += "Rentabilidad negativa, situación crítica. "
    
    txt += f"La liquidez (Razón Circulante: {rc:.2f}) es "
    if rc > 1.5: txt += "sólida."
    elif rc >= 1: txt += "ajustada."
    else: txt += "insuficiente para cubrir deudas corto plazo."
    
    return txt

@app.post("/analyze")
def analyze_financials(data: AnalysisRequest):
    try:
        df = pd.DataFrame([r.dict() for r in data.records])
        if df.empty: return {"message": "Sin datos"}

        df['accountName'] = df['accountName'].str.upper().str.strip()
        df['sub_class'] = df.apply(lambda x: clasificar_cuenta(x['accountName'], x['type']), axis=1)

        years = sorted(df['year'].unique())
        ratios_res = []
        flujos_res = []
        vertical_res = []
        
        # Procesar por año
        for i, year in enumerate(years):
            df_curr = df[df['year'] == year]
            df_prev = df[df['year'] == years[i-1]] if i > 0 else None
            
            # --- RATIOS ---
            act_cte = df_curr[df_curr['sub_class'].isin(['cash', 'receivables', 'inventory', 'current_asset'])]['value'].sum()
            pas_cte = df_curr[df_curr['sub_class'].isin(['payables', 'current_liability'])]['value'].sum()
            patrimonio = df_curr[df_curr['type'] == 'equity']['value'].sum()
            act_tot = df_curr[df_curr['type'] == 'asset']['value'].sum()
            ventas = df_curr[df_curr['type'] == 'revenue']['value'].sum()
            utilidad = ventas - df_curr[df_curr['type'] == 'expense']['value'].sum()
            
            ratios_res.append({
                "year": int(year),
                "liquidez": {"razon_circulante": safe_div(act_cte, pas_cte), "cnt": act_cte - pas_cte},
                "rentabilidad": {"roe": safe_div(utilidad, patrimonio) * 100, "margen": safe_div(utilidad, ventas) * 100},
                "endeudamiento": {"total": safe_div(df_curr[df_curr['type']=='liability']['value'].sum(), act_tot) * 100}
            })
            
            # --- FLUJOS ---
            if df_prev is not None:
                flujos_res.append(calcular_flujos(df_curr, df_prev))

            # --- VERTICAL ---
            base_act = act_tot
            base_res = ventas
            for _, row in df_curr.iterrows():
                base = base_act if row['type'] in ['asset', 'liability', 'equity'] else base_res
                vertical_res.append({**row.to_dict(), "pct": safe_div(row['value'], base) * 100})

        # --- HORIZONTAL ---
        horizontal_res = []
        if len(years) >= 2:
            df_piv = df.pivot_table(index='accountName', columns='year', values='value', aggfunc='sum').fillna(0)
            y_curr, y_prev = years[-1], years[-2]
            for acc in df_piv.index:
                v_c, v_p = df_piv.loc[acc, y_curr], df_piv.loc[acc, y_prev]
                horizontal_res.append({
                    "account": acc, "var_abs": v_c - v_p, "var_pct": safe_div((v_c - v_p), v_p) * 100
                })

        return {
            "ratios": ratios_res,
            "flujo_efectivo": flujos_res,
            "vertical": vertical_res,
            "horizontal": horizontal_res,
            "conclusion": generar_conclusion(ratios_res)
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    # ... (Mantener tu código de CSV actual aquí, no cambia)
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    return {"data": df.to_dict(orient='records')}