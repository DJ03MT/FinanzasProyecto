from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
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
        if any(x in n for x in ['FIJO', 'MAQUINARIA', 'EDIFICIO', 'EQUIPO', 'TERRENO']): return 'fixed_asset'
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
    return tipo_principal

def generar_estados_financieros(df):
    """Genera Balance y Estado de Resultados estructurados"""
    years = [int(y) for y in sorted(df['year'].unique())]
    statements = {}
    
    for year in years:
        df_year = df[df['year'] == year]
        
        # --- ESTADO DE RESULTADOS ---
        revenues = df_year[df_year['type'] == 'revenue'].to_dict('records')
        total_rev = to_float(sum(x['value'] for x in revenues))
        
        expenses = df_year[df_year['type'] == 'expense'].to_dict('records')
        total_exp = to_float(sum(x['value'] for x in expenses))
        
        cogs_list = [x for x in expenses if x['sub_class'] == 'cogs']
        total_cogs = to_float(sum(x['value'] for x in cogs_list))
        
        # Gastos operativos (excluyendo costo ventas e intereses si se desea separar)
        op_exps = [x for x in expenses if x['sub_class'] != 'cogs']
        
        net_income = total_rev - total_exp
        gross_profit = total_rev - total_cogs
        
        # --- BALANCE GENERAL ---
        # Activos
        assets = df_year[df_year['type'] == 'asset'].to_dict('records')
        current_assets = [x for x in assets if x['sub_class'] in ['cash', 'receivables', 'inventory', 'current_asset']]
        non_current_assets = [x for x in assets if x['sub_class'] in ['fixed_asset', 'non_current_asset']]
        
        total_assets = to_float(sum(x['value'] for x in assets))
        
        # Pasivos
        liabs = df_year[df_year['type'] == 'liability'].to_dict('records')
        current_liabs = [x for x in liabs if x['sub_class'] in ['payables', 'current_liability']]
        non_current_liabs = [x for x in liabs if x['sub_class'] == 'non_current_liability']
        
        total_liabs = to_float(sum(x['value'] for x in liabs))
        
        # Patrimonio
        equity = df_year[df_year['type'] == 'equity'].to_dict('records')
        total_equity_input = to_float(sum(x['value'] for x in equity))
        
        # CUADRE CONTABLE: Patrimonio Total = Capital Social + Utilidad del Ejercicio
        total_equity_final = total_equity_input + net_income
        total_liab_equity = total_liabs + total_equity_final
        
        statements[int(year)] = {
            "balance_sheet": {
                "assets": {"current": current_assets, "non_current": non_current_assets, "total": total_assets},
                "liabilities": {"current": current_liabs, "non_current": non_current_liabs, "total": total_liabs},
                "equity": {"accounts": equity, "retained_earnings": net_income, "total": total_equity_final},
                "total_liab_equity": total_liab_equity
            },
            "income_statement": {
                "revenues": revenues,
                "cogs": cogs_list,
                "expenses": op_exps,
                "gross_profit": gross_profit,
                "net_income": net_income,
                "net_sales": total_rev
            }
        }
    return statements

def calcular_flujos(df_curr, df_prev):
    """Calcula Flujos Directo e Indirecto"""
    if df_prev is None: return None
    
    def get_sum(df, sc): return to_float(df[df['sub_class'] == sc]['value'].sum())
    
    # Datos ER
    ventas = to_float(df_curr[df_curr['type'] == 'revenue']['value'].sum())
    gastos = to_float(df_curr[df_curr['type'] == 'expense']['value'].sum())
    utilidad = ventas - gastos
    costo_ventas = get_sum(df_curr, 'cogs')
    
    # Variaciones Balance (Actual - Anterior)
    var_cxc = get_sum(df_curr, 'receivables') - get_sum(df_prev, 'receivables')
    var_inv = get_sum(df_curr, 'inventory') - get_sum(df_prev, 'inventory')
    var_cxp = get_sum(df_curr, 'payables') - get_sum(df_prev, 'payables')
    
    # --- MÉTODO INDIRECTO ---
    # Utilidad + (Disminución Activos) + (Aumento Pasivos) - (Aumento Activos) - (Disminución Pasivos)
    flujo_indirecto = utilidad - var_cxc - var_inv + var_cxp
    
    # --- MÉTODO DIRECTO (Estimado) ---
    # Cobros = Ventas - Aumento CxC
    cobro_clientes = ventas - var_cxc
    
    # Pagos Proveedores = Costo Ventas + Aumento Inv - Aumento CxP
    pago_proveedores = costo_ventas + var_inv - var_cxp
    
    # Pagos Operativos = Gastos (sin costo) 
    gastos_op = gastos - costo_ventas
    pago_gastos = gastos_op # Asumiendo contado si no hay pasivos relacionados
    
    flujo_directo = cobro_clientes - pago_proveedores - pago_gastos
    
    return {
        "year": int(df_curr['year'].iloc[0]),
        "indirecto": {
            "utilidad_neta": utilidad,
            "ajustes": {"var_cxc": var_cxc, "var_inv": var_inv, "var_cxp": var_cxp},
            "flujo_neto": flujo_indirecto
        },
        "directo": {
            "recibido_clientes": cobro_clientes,
            "pagado_proveedores": pago_proveedores,
            "pagado_gastos": pago_gastos,
            "flujo_neto": flujo_directo
        }
    }

def calcular_ratios_completos(df_year, df_prev=None):
    def get_sum(cond): return to_float(df_year[cond]['value'].sum())
    
    # Masas Patrimoniales
    act_cte = get_sum(df_year['sub_class'].isin(['cash', 'receivables', 'inventory', 'current_asset']))
    pas_cte = get_sum(df_year['sub_class'].isin(['payables', 'current_liability']))
    
    inventario = get_sum(df_year['sub_class'] == 'inventory')
    cxc = get_sum(df_year['sub_class'] == 'receivables')
    cxp = get_sum(df_year['sub_class'] == 'payables')
    
    activos = get_sum(df_year['type'] == 'asset')
    pasivos = get_sum(df_year['type'] == 'liability')
    patrimonio = get_sum(df_year['type'] == 'equity')
    ventas = get_sum(df_year['type'] == 'revenue')
    gastos = get_sum(df_year['type'] == 'expense')
    costo_ventas = get_sum(df_year['sub_class'] == 'cogs')
    
    utilidad = ventas - gastos
    
    # Promedios
    prom_inv = inventario
    prom_cxc = cxc
    prom_activos = activos
    if df_prev is not None:
        def get_prev(cond): return to_float(df_prev[cond]['value'].sum())
        prom_inv = (inventario + get_prev(df_prev['sub_class'] == 'inventory'))/2 or inventario
        prom_cxc = (cxc + get_prev(df_prev['sub_class'] == 'receivables'))/2 or cxc
        prom_activos = (activos + get_prev(df_prev['type'] == 'asset'))/2 or activos

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
            "rotacion_activos": safe_div(ventas, prom_activos)
        },
        "endeudamiento": {
            "razon_total": safe_div(pasivos, activos) * 100
        },
        "rentabilidad": {
            "margen_bruto": safe_div(ventas - costo_ventas, ventas) * 100,
            "margen_neto": safe_div(utilidad, ventas) * 100,
            "roa": safe_div(utilidad, activos) * 100,
            "roe": safe_div(utilidad, patrimonio) * 100,
            "dupont": {
                "margen": safe_div(utilidad, ventas) * 100,
                "rotacion": safe_div(ventas, activos),
                "multiplicador": safe_div(activos, patrimonio)
            }
        }
    }

def generar_proforma(df_curr, df_prev):
    if df_prev is None: return None
    ventas_curr = to_float(df_curr[df_curr['type']=='revenue']['value'].sum())
    ventas_prev = to_float(df_prev[df_prev['type']=='revenue']['value'].sum())
    if ventas_prev == 0: return None
    
    growth_rate = (ventas_curr - ventas_prev) / ventas_prev
    ventas_proj = ventas_curr * (1 + growth_rate)
    
    costos_curr = to_float(df_curr[df_curr['sub_class']=='cogs']['value'].sum())
    gastos_curr = to_float(df_curr[(df_curr['type']=='expense') & (df_curr['sub_class']!='cogs')]['value'].sum())
    
    costos_proj = ventas_proj * safe_div(costos_curr, ventas_curr)
    gastos_proj = ventas_proj * safe_div(gastos_curr, ventas_curr)
    
    return {
        "year_base": int(df_curr['year'].iloc[0]),
        "year_proj": int(df_curr['year'].iloc[0]) + 1,
        "growth_rate": growth_rate * 100,
        "proforma": {
            "ventas": ventas_proj,
            "costo_ventas": costos_proj,
            "gastos_operativos": gastos_proj,
            "utilidad_neta": ventas_proj - costos_proj - gastos_proj
        }
    }

def generar_conclusion_experta(ratios, proforma):
    if not ratios: return "Sin datos."
    ult = ratios[-1]
    
    reporte = f"DIAGNÓSTICO {ult['year']}:\n"
    reporte += f"• Rentabilidad (ROE): {ult['rentabilidad']['roe']:.2f}%. "
    reporte += "(Excelente)" if ult['rentabilidad']['roe'] > 15 else "(Baja)"
    reporte += f"\n• Liquidez (Razón): {ult['liquidez']['razon_circulante']:.2f}. "
    reporte += "(Sólida)" if ult['liquidez']['razon_circulante'] > 1.5 else "(Riesgo)"
    
    if proforma:
        reporte += f"\n• Proyección {proforma['year_proj']}: Se espera crecimiento del {proforma['growth_rate']:.1f}% en ventas."
    return reporte

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
        proforma_res = None
        
        financial_statements = generar_estados_financieros(df)
        
        for i, year in enumerate(years):
            df_curr = df[df['year'] == year]
            df_prev = df[df['year'] == years[i-1]] if i > 0 else None
            
            ratios_res.append(calcular_ratios_completos(df_curr, df_prev))
            
            if df_prev is not None:
                flujos_res.append(calcular_flujos(df_curr, df_prev))
                if i == len(years) - 1:
                    proforma_res = generar_proforma(df_curr, df_prev)

            # Vertical
            stmt = financial_statements[year]
            base_act = stmt['balance_sheet']['assets']['total']
            base_pas = stmt['balance_sheet']['total_liab_equity']
            base_ven = stmt['income_statement']['net_sales']
            
            for _, r in df_curr.iterrows():
                base = base_act if r['type'] == 'asset' else (base_pas if r['type'] in ['liability','equity'] else base_ven)
                vertical_res.append({**r.to_dict(), "pct": safe_div(r['value'], base)*100})

        horizontal_res = []
        if len(years) >= 2:
            piv = df.pivot_table(index='accountName', columns='year', values='value', aggfunc='sum').fillna(0)
            for acc in piv.index:
                for i in range(1, len(years)):
                    yc, yp = years[i], years[i-1]
                    vc, vp = to_float(piv.loc[acc, yc]), to_float(piv.loc[acc, yp])
                    horizontal_res.append({
                        "period": f"{yp}-{yc}", "account": acc, 
                        "var_abs": vc-vp, "var_pct": safe_div(vc-vp, vp)*100
                    })

        return {
            "ratios": ratios_res,
            "flujo_efectivo": flujos_res,
            "vertical": vertical_res,
            "horizontal": horizontal_res,
            "financial_statements": financial_statements,
            "proforma": proforma_res,
            "conclusion": generar_conclusion_experta(ratios_res, proforma_res)
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    return {"data": df.to_dict(orient='records')}