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

def safe_div(a, b):
    return a / b if b != 0 else 0

def clasificar_cuenta(nombre, tipo_principal):
    n = nombre.upper()
    # ACTIVOS
    if tipo_principal == 'asset':
        if any(x in n for x in ['CAJA', 'BANCO', 'EFECTIVO', 'DISPONIBLE']): return 'cash'
        if any(x in n for x in ['CLIENTE', 'COBRAR', 'DEUDORES']): return 'receivables'
        if any(x in n for x in ['INVENTARIO', 'ALMACEN', 'MERCADERIA']): return 'inventory'
        if any(x in n for x in ['FIJO', 'MAQUINARIA', 'EDIFICIO', 'EQUIPO', 'TERRENO', 'VEHICULO', 'DEPRECIACION']): return 'fixed_asset'
        # Si dice corriente o circulante explícitamente
        if any(x in n for x in ['CORRIENTE', 'CIRCULANTE']): return 'current_asset'
        # Por defecto, si no es fijo, asumimos corriente si no se especifica "NO CORRIENTE"
        if 'NO CORRIENTE' in n or 'LARGO PLAZO' in n: return 'non_current_asset'
        return 'current_asset' # Default conservador
        
    # PASIVOS
    if tipo_principal == 'liability':
        if any(x in n for x in ['PROVEEDOR', 'PAGAR', 'ACREEDORES']): return 'payables'
        if any(x in n for x in ['NO CORRIENTE', 'LARGO PLAZO', 'HIPOTECA']): return 'non_current_liability'
        return 'current_liability'
        
    # GASTOS
    if tipo_principal == 'expense':
        if 'COSTO' in n: return 'cogs'
        if 'INTERES' in n or 'FINANCIERO' in n: return 'interest'
        if 'IMPUESTO' in n: return 'tax'
        
    return tipo_principal

def generar_estados_financieros(df):
    """Genera la estructura del Balance y Estado de Resultados"""
    years = sorted(df['year'].unique())
    statements = {}
    
    for year in years:
        df_year = df[df['year'] == year]
        
        # --- BALANCE GENERAL ---
        # Activos
        assets_curr = df_year[df_year['sub_class'].isin(['cash', 'receivables', 'inventory', 'current_asset'])].to_dict('records')
        assets_non_curr = df_year[df_year['sub_class'].isin(['fixed_asset', 'non_current_asset'])].to_dict('records')
        total_assets = sum(x['value'] for x in assets_curr) + sum(x['value'] for x in assets_non_curr)
        
        # Pasivos
        liab_curr = df_year[df_year['sub_class'].isin(['payables', 'current_liability'])].to_dict('records')
        liab_non_curr = df_year[df_year['sub_class'].isin(['non_current_liability'])].to_dict('records')
        total_liab = sum(x['value'] for x in liab_curr) + sum(x['value'] for x in liab_non_curr)
        
        # Patrimonio
        equity = df_year[df_year['type'] == 'equity'].to_dict('records')
        total_equity = sum(x['value'] for x in equity)
        
        # --- ESTADO DE RESULTADOS ---
        revenues = df_year[df_year['type'] == 'revenue'].to_dict('records')
        total_rev = sum(x['value'] for x in revenues)
        
        cogs = df_year[df_year['sub_class'] == 'cogs'].to_dict('records')
        total_cogs = sum(x['value'] for x in cogs)
        
        # Gastos operativos (todo lo que es expense pero NO costo de ventas ni intereses ni impuestos)
        expenses = df_year[(df_year['type'] == 'expense') & (~df_year['sub_class'].isin(['cogs', 'interest', 'tax']))].to_dict('records')
        total_exp = sum(x['value'] for x in expenses)
        
        # Cálculos de utilidad
        gross_profit = total_rev - total_cogs
        operating_profit = gross_profit - total_exp
        
        # Restar intereses e impuestos si los hubiera (aquí simplificado en operating para ROE base)
        other_exp = df_year[df_year['sub_class'].isin(['interest', 'tax'])].to_dict('records')
        total_other = sum(x['value'] for x in other_exp)
        net_income = operating_profit - total_other

        statements[int(year)] = {
            "balance_sheet": {
                "assets": {"current": assets_curr, "non_current": assets_non_curr, "total": total_assets},
                "liabilities": {"current": liab_curr, "non_current": liab_non_curr, "total": total_liab},
                "equity": {"accounts": equity, "total": total_equity}
            },
            "income_statement": {
                "revenues": revenues,
                "cogs": cogs,
                "expenses": expenses + other_exp,
                "gross_profit": gross_profit,
                "operating_profit": operating_profit,
                "net_income": net_income
            }
        }
    return statements

def calcular_ratios_avanzados(df_year, df_prev=None):
    # (Misma lógica de antes, pero asegurando que usemos los valores calculados)
    # Totales
    activos = df_year[df_year['type'] == 'asset']['value'].sum()
    pasivos = df_year[df_year['type'] == 'liability']['value'].sum()
    patrimonio = df_year[df_year['type'] == 'equity']['value'].sum()
    ventas = df_year[df_year['type'] == 'revenue']['value'].sum()
    gastos = df_year[df_year['type'] == 'expense']['value'].sum()
    
    # Subtotales
    act_cte = df_year[df_year['sub_class'].isin(['cash', 'receivables', 'inventory', 'current_asset'])]['value'].sum()
    pas_cte = df_year[df_year['sub_class'].isin(['payables', 'current_liability'])]['value'].sum()
    
    inventarios = df_year[df_year['sub_class'] == 'inventory']['value'].sum()
    cxc = df_year[df_year['sub_class'] == 'receivables']['value'].sum()
    costo_ventas = df_year[df_year['sub_class'] == 'cogs']['value'].sum()
    
    utilidad_neta = ventas - gastos
    
    # Promedios
    prom_inv = inventarios
    prom_cxc = cxc
    if df_prev is not None:
        prev_inv = df_prev[df_prev['sub_class'] == 'inventory']['value'].sum()
        prom_inv = (inventarios + prev_inv) / 2 if prev_inv > 0 else inventarios
        prev_cxc = df_prev[df_prev['sub_class'] == 'receivables']['value'].sum()
        prom_cxc = (cxc + prev_cxc) / 2 if prev_cxc > 0 else cxc

    return {
        "year": int(df_year['year'].iloc[0]),
        "liquidez": {
            "cnt": act_cte - pas_cte,
            "razon_circulante": safe_div(act_cte, pas_cte),
            "razon_rapida": safe_div(act_cte - inventarios, pas_cte),
            "cno": (cxc + inventarios) - df_year[df_year['sub_class'] == 'payables']['value'].sum()
        },
        "actividad": {
            "rotacion_inventarios": safe_div(costo_ventas, prom_inv),
            "periodo_cobro": safe_div(360, safe_div(ventas, prom_cxc)),
            "rotacion_activos_totales": safe_div(ventas, activos)
        },
        "endeudamiento": {
            "razon_total": safe_div(pasivos, activos) * 100
        },
        "rentabilidad": {
            "margen_neto": safe_div(utilidad_neta, ventas) * 100,
            "roe": safe_div(utilidad_neta, patrimonio) * 100,
            "componentes_dupont": {
                "margen": safe_div(utilidad_neta, ventas) * 100,
                "rotacion": safe_div(ventas, activos),
                "multiplicador": safe_div(activos, patrimonio)
            }
        }
    }

def calcular_flujos(df_curr, df_prev):
    if df_prev is None: return None
    def get_val(df, sc): return df[df['sub_class'] == sc]['value'].sum()
    
    ventas = df_curr[df_curr['type'] == 'revenue']['value'].sum()
    gastos = df_curr[df_curr['type'] == 'expense']['value'].sum()
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
            "ajustes": {"var_cxc": var_cxc, "var_inv": var_inv, "var_cxp": var_cxp},
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
    rc = ult['liquidez']['razon_circulante']
    dias_cobro = ult['actividad'].get('periodo_cobro', 0)
    
    txt = f"El ejercicio {ult['year']} cerró con un ROE del {roe:.1f}%. "
    if roe > 15: txt += "Excelente rentabilidad. "
    elif roe < 0: txt += "Pérdidas detectadas. "
    
    txt += f"La liquidez (Razón: {rc:.2f}) es "
    txt += "sólida. " if rc > 1.5 else "ajustada. "
    
    if dias_cobro > 60: txt += f"Cobro lento ({dias_cobro:.0f} días). "
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
        
        # Generar Estados Financieros
        financial_statements = generar_estados_financieros(df)
        
        for i, year in enumerate(years):
            df_curr = df[df['year'] == year]
            df_prev = df[df['year'] == years[i-1]] if i > 0 else None
            
            ratios_res.append(calcular_ratios_avanzados(df_curr, df_prev))
            if df_prev is not None:
                flujos_res.append(calcular_flujos(df_curr, df_prev))
            
            # Vertical
            act_tot = df_curr[df_curr['type'] == 'asset']['value'].sum()
            ventas = df_curr[df_curr['type'] == 'revenue']['value'].sum()
            for _, r in df_curr.iterrows():
                base = act_tot if r['type'] in ['asset', 'liability', 'equity'] else ventas
                vertical_res.append({**r.to_dict(), "pct": safe_div(r['value'], base)*100})

        # Horizontal
        horizontal_res = []
        if len(years) >= 2:
            piv = df.pivot_table(index='accountName', columns='year', values='value', aggfunc='sum').fillna(0)
            y_c, y_p = years[-1], years[-2]
            for acc in piv.index:
                horizontal_res.append({
                    "account": acc, 
                    "var_abs": piv.loc[acc, y_c] - piv.loc[acc, y_p], 
                    "var_pct": safe_div(piv.loc[acc, y_c] - piv.loc[acc, y_p], piv.loc[acc, y_p])*100
                })

        return {
            "ratios": ratios_res,
            "flujo_efectivo": flujos_res,
            "vertical": vertical_res,
            "horizontal": horizontal_res,
            "conclusion": generar_conclusion(ratios_res),
            "financial_statements": financial_statements # <--- ¡AQUÍ ESTÁ LA MAGIA!
        }
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    return {"data": df.to_dict(orient='records')}