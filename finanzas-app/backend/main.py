from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
import io

app = FastAPI(title="FinAnalyzer Pro 360")

# Configuración CORS
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
    if b == 0: return 0.0
    return float(a / b)

def to_float(val):
    return float(val)

def clasificar_cuenta(nombre, tipo_principal):
    n = nombre.upper()
    # ACTIVOS
    if tipo_principal == 'asset':
        if any(x in n for x in ['CAJA', 'BANCO', 'EFECTIVO', 'DISPONIBLE']): return 'cash'
        if any(x in n for x in ['CLIENTE', 'COBRAR', 'DEUDORES']): return 'receivables'
        if any(x in n for x in ['INVENTARIO', 'ALMACEN', 'MERCADERIA']): return 'inventory'
        if any(x in n for x in ['FIJO', 'MAQUINARIA', 'EDIFICIO', 'EQUIPO', 'TERRENO', 'VEHICULO']): return 'fixed_asset'
        if any(x in n for x in ['CORRIENTE', 'CIRCULANTE']): return 'current_asset'
        return 'non_current_asset'
    # PASIVOS
    if tipo_principal == 'liability':
        if any(x in n for x in ['PROVEEDOR', 'PAGAR', 'ACREEDORES']): return 'payables'
        if any(x in n for x in ['CORRIENTE', 'CORTO PLAZO']): return 'current_liability'
        return 'non_current_liability'
    # GASTOS
    if tipo_principal == 'expense':
        if 'COSTO' in n: return 'cogs'
        if 'INTERES' in n: return 'interest'
        if 'IMPUESTO' in n: return 'tax'
    return tipo_principal

def generar_estados_financieros(df):
    """Genera la estructura del Balance y Estado de Resultados"""
    years = [int(y) for y in sorted(df['year'].unique())]
    statements = {}
    
    for year in years:
        df_year = df[df['year'] == year]
        
        # Totales
        assets = df_year[df_year['type'] == 'asset'].to_dict('records')
        total_assets = to_float(sum(x['value'] for x in assets))
        
        liabilities = df_year[df_year['type'] == 'liability'].to_dict('records')
        total_liabilities = to_float(sum(x['value'] for x in liabilities))
        
        equity = df_year[df_year['type'] == 'equity'].to_dict('records')
        total_equity_input = to_float(sum(x['value'] for x in equity))
        
        # Resultados
        revenues = df_year[df_year['type'] == 'revenue'].to_dict('records')
        total_rev = to_float(sum(x['value'] for x in revenues))
        
        expenses = df_year[df_year['type'] == 'expense'].to_dict('records')
        total_exp = to_float(sum(x['value'] for x in expenses))
        
        cogs_list = [x for x in expenses if x['sub_class'] == 'cogs']
        total_cogs = to_float(sum(x['value'] for x in cogs_list))
        
        net_income = total_rev - total_exp
        
        # Estructura final
        total_equity_final = total_equity_input + net_income # Ajuste contable
        
        statements[int(year)] = {
            "balance_sheet": {
                "assets": {"current": [x for x in assets if x['sub_class'] in ['cash','receivables','inventory','current_asset']], 
                           "non_current": [x for x in assets if x['sub_class'] in ['fixed_asset','non_current_asset']], 
                           "total": total_assets},
                "liabilities": {"current": [x for x in liabilities if x['sub_class'] in ['payables','current_liability']], 
                                "non_current": [x for x in liabilities if x['sub_class'] == 'non_current_liability'], 
                                "total": total_liabilities},
                "equity": {"accounts": equity, "total": total_equity_final}
            },
            "income_statement": {
                "revenues": revenues,
                "cogs": cogs_list,
                "expenses": [x for x in expenses if x['sub_class'] not in ['cogs']],
                "net_sales": total_rev,
                "gross_profit": total_rev - total_cogs,
                "net_income": net_income
            }
        }
    return statements

def calcular_ratios_completos(df_year, df_prev=None):
    """Calcula TODOS los indicadores requeridos por el frontend"""
    
    # Helper para sumar
    def get_sum(condition): return to_float(df_year[condition]['value'].sum())
    
    # 1. VALORES BASE
    activos = get_sum(df_year['type'] == 'asset')
    pasivos = get_sum(df_year['type'] == 'liability')
    patrimonio = get_sum(df_year['type'] == 'equity')
    ventas = get_sum(df_year['type'] == 'revenue')
    gastos = get_sum(df_year['type'] == 'expense')
    
    # 2. SUBTOTALES ESPECÍFICOS
    act_cte = get_sum(df_year['sub_class'].isin(['cash', 'receivables', 'inventory', 'current_asset']))
    pas_cte = get_sum(df_year['sub_class'].isin(['payables', 'current_liability']))
    
    inventario = get_sum(df_year['sub_class'] == 'inventory')
    cxc = get_sum(df_year['sub_class'] == 'receivables')
    cxp = get_sum(df_year['sub_class'] == 'payables')
    costo_ventas = get_sum(df_year['sub_class'] == 'cogs')
    
    utilidad_bruta = ventas - costo_ventas
    utilidad_neta = ventas - gastos
    
    # Promedios para actividad
    prom_inv = inventario
    prom_cxc = cxc
    prom_activos = activos
    
    if df_prev is not None:
        def get_prev_sum(cond): return to_float(df_prev[cond]['value'].sum())
        prev_inv = get_prev_sum(df_prev['sub_class'] == 'inventory')
        prom_inv = (inventario + prev_inv) / 2 if prev_inv > 0 else inventario
        
        prev_cxc = get_prev_sum(df_prev['sub_class'] == 'receivables')
        prom_cxc = (cxc + prev_cxc) / 2 if prev_cxc > 0 else cxc
        
        prev_act = get_prev_sum(df_prev['type'] == 'asset')
        prom_activos = (activos + prev_act) / 2

    # --- CÁLCULO DE FÓRMULAS ---
    
    return {
        "year": int(df_year['year'].iloc[0]),
        
        "liquidez": {
            "cnt": act_cte - pas_cte,
            "cno": (cxc + inventario) - cxp,
            "razon_circulante": safe_div(act_cte, pas_cte),
            "razon_rapida": safe_div(act_cte - inventario, pas_cte)
        },
        
        "actividad": {
            "rotacion_inventarios": safe_div(costo_ventas, prom_inv),
            "periodo_cobro": safe_div(360, safe_div(ventas, prom_cxc)),
            "rotacion_activos_totales": safe_div(ventas, prom_activos),
            "rotacion_cxc": safe_div(ventas, prom_cxc)
        },
        
        "endeudamiento": {
            "razon_total": safe_div(pasivos, activos) * 100,
            "pasivo_capital": safe_div(pasivos, patrimonio)
        },
        
        "rentabilidad": {
            "margen_bruto": safe_div(utilidad_bruta, ventas) * 100,
            "margen_neto": safe_div(utilidad_neta, ventas) * 100,
            "roa": safe_div(utilidad_neta, activos) * 100,
            "roe": safe_div(utilidad_neta, patrimonio) * 100,
            # ESTO ES LO QUE LE FALTABA AL FRONTEND:
            "componentes_dupont": {
                "margen": safe_div(utilidad_neta, ventas) * 100,
                "rotacion": safe_div(ventas, activos),
                "multiplicador": safe_div(activos, patrimonio)
            }
        }
    }

def calcular_flujos(df_curr, df_prev):
    """Cálculo de Flujos con seguridad de tipos"""
    if df_prev is None: return None
    def get_val(df, sc): return to_float(df[df['sub_class'] == sc]['value'].sum())
    
    ventas = to_float(df_curr[df_curr['type'] == 'revenue']['value'].sum())
    gastos = to_float(df_curr[df_curr['type'] == 'expense']['value'].sum())
    utilidad = ventas - gastos
    
    var_cxc = get_val(df_curr, 'receivables') - get_val(df_prev, 'receivables')
    var_inv = get_val(df_curr, 'inventory') - get_val(df_prev, 'inventory')
    var_cxp = get_val(df_curr, 'payables') - get_val(df_prev, 'payables')
    
    costo_ventas = get_val(df_curr, 'cogs')
    recibido = ventas - var_cxc
    pagado_prov = costo_ventas + var_inv - var_cxp
    pagado_gastos = gastos - costo_ventas
    
    return {
        "year": int(df_curr['year'].iloc[0]),
        "indirecto": {
            "utilidad_neta": utilidad,
            "flujo_neto": utilidad - var_cxc - var_inv + var_cxp
        },
        "directo": {
            "recibido_clientes": recibido,
            "pagado_proveedores": pagado_prov,
            "pagado_gastos": pagado_gastos,
            "flujo_neto": recibido - pagado_prov - pagado_gastos
        }
    }

def generar_conclusion(ratios):
    if not ratios: return "Sin datos."
    ult = ratios[-1]
    roe = ult['rentabilidad']['roe']
    return f"Análisis finalizado. El ROE del último periodo es {roe:.2f}%."

# --- ENDPOINT PRINCIPAL ---
@app.post("/analyze")
def analyze_financials(data: AnalysisRequest):
    try:
        df = pd.DataFrame([r.dict() for r in data.records])
        if df.empty: return {"message": "Sin datos"}

        df['accountName'] = df['accountName'].str.upper().str.strip()
        df['sub_class'] = df.apply(lambda x: clasificar_cuenta(x['accountName'], x['type']), axis=1)

        years = [int(y) for y in sorted(df['year'].unique())]
        ratios_res = []
        flujos_res = []
        vertical_res = []
        
        # 1. Generar Estados Financieros
        financial_statements = generar_estados_financieros(df)
        
        for i, year in enumerate(years):
            df_curr = df[df['year'] == year]
            df_prev = df[df['year'] == years[i-1]] if i > 0 else None
            
            # 2. Ratios COMPLETOS (Ahora sí incluye dupont y actividad)
            ratios_res.append(calcular_ratios_completos(df_curr, df_prev))
            
            # 3. Flujos
            if df_prev is not None:
                flujos_res.append(calcular_flujos(df_curr, df_prev))
            
            # 4. Vertical
            bases = financial_statements[year]
            base_act = bases['balance_sheet']['assets']['total']
            base_pas_pat = bases['balance_sheet']['liabilities']['total'] + bases['balance_sheet']['equity']['total']
            base_ven = bases['income_statement']['net_sales']
            
            for _, r in df_curr.iterrows():
                val = to_float(r['value'])
                pct = 0.0
                if r['type'] == 'asset': pct = safe_div(val, base_act) * 100
                elif r['type'] in ['liability', 'equity']: pct = safe_div(val, base_pas_pat) * 100
                elif r['type'] in ['revenue', 'expense']: pct = safe_div(val, base_ven) * 100
                
                vertical_res.append({**r.to_dict(), "value": val, "pct": pct, "year": int(year)})

        # 5. Horizontal
        horizontal_res = []
        if len(years) >= 2:
            piv = df.pivot_table(index='accountName', columns='year', values='value', aggfunc='sum').fillna(0)
            for i in range(1, len(years)):
                y_c, y_p = years[i], years[i-1]
                for acc in piv.index:
                    vc = to_float(piv.loc[acc, y_c])
                    vp = to_float(piv.loc[acc, y_p])
                    horizontal_res.append({
                        "period": f"{y_p} vs {y_c}",
                        "account": acc, 
                        "val_prev": vp, "val_current": vc,
                        "var_abs": vc - vp, 
                        "var_pct": safe_div(vc - vp, vp) * 100
                    })

        return {
            "ratios": ratios_res,
            "flujo_efectivo": flujos_res,
            "vertical": vertical_res,
            "horizontal": horizontal_res,
            "financial_statements": financial_statements,
            "conclusion": generar_conclusion(ratios_res)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    return {"data": df.to_dict(orient='records')}