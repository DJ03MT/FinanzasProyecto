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
    try:
        return float(val)
    except:
        return 0.0

def es_cuenta_total(nombre):
    n = nombre.upper()
    palabras_clave = ['TOTAL', 'SUMA', 'RESULTADO DEL', 'UTILIDAD BRUTA', 'UTILIDAD NETA', 'UTILIDAD OPERATIVA']
    if any(n.startswith(k) for k in palabras_clave):
        return True
    return False

def clasificar_cuenta(nombre, tipo_principal):
    n = nombre.upper()
    
    # GASTOS
    if tipo_principal == 'expense':
        if 'COSTO' in n or 'VENTAS' in n: return 'cogs'
        if 'INTERES' in n or 'FINANCIERO' in n: return 'interest'
        if 'IMPUESTO' in n or 'RENTA' in n: return 'tax'
        # Detectar depreciación para el flujo de efectivo
        if 'DEPREC' in n or 'AMORTIZ' in n: return 'depreciation'
        return 'operating_expense'

    # ACTIVOS
    if tipo_principal == 'asset':
        if any(x in n for x in ['CAJA', 'BANCO', 'EFECTIVO', 'DISPONIBLE']): return 'cash'
        if any(x in n for x in ['CLIENTE', 'COBRAR', 'DEUDORES']): return 'receivables'
        if any(x in n for x in ['INVENTARIO', 'ALMACEN', 'MERCADERIA', 'EXISTENCIA']): return 'inventory'
        if any(x in n for x in ['CORRIENTE', 'CIRCULANTE', 'CORTO PLAZO']): return 'current_asset'
        if any(x in n for x in ['FIJO', 'MAQUINARIA', 'EDIFICIO', 'EQUIPO', 'TERRENO', 'VEHICULO', 'PROPIEDAD']): return 'fixed_asset'
        return 'non_current_asset'

    # PASIVOS
    if tipo_principal == 'liability':
        if any(x in n for x in ['PROVEEDOR', 'PAGAR', 'ACREEDORES']): return 'payables'
        if any(x in n for x in ['CORRIENTE', 'CORTO PLAZO']): return 'current_liability'
        return 'non_current_liability'
        
    return tipo_principal

def generar_estados_financieros(df):
    years = [int(y) for y in sorted(df['year'].unique())]
    statements = {}
    
    for year in years:
        df_year = df[df['year'] == year]
        
        # --- ESTADO DE RESULTADOS ---
        revenues = df_year[df_year['type'] == 'revenue'].to_dict('records')
        net_sales = to_float(sum(x['value'] for x in revenues))
        
        expenses = df_year[df_year['type'] == 'expense'].to_dict('records')
        
        cogs_recs = [x for x in expenses if x['sub_class'] == 'cogs']
        cogs = to_float(sum(x['value'] for x in cogs_recs))
        
        # Separar depreciación de otros gastos operativos
        deprec_recs = [x for x in expenses if x['sub_class'] == 'depreciation']
        depreciation = to_float(sum(x['value'] for x in deprec_recs))

        op_exps_recs = [x for x in expenses if x['sub_class'] == 'operating_expense']
        op_exps = to_float(sum(x['value'] for x in op_exps_recs))
        
        interest_recs = [x for x in expenses if x['sub_class'] == 'interest']
        interest = to_float(sum(x['value'] for x in interest_recs))
        
        tax_recs = [x for x in expenses if x['sub_class'] == 'tax']
        taxes = to_float(sum(x['value'] for x in tax_recs))
        
        gross_profit = net_sales - cogs
        operating_income = gross_profit - op_exps - depreciation
        net_income = operating_income - interest - taxes
        
        # --- BALANCE GENERAL ---
        assets = df_year[df_year['type'] == 'asset'].to_dict('records')
        ac_accounts = [x for x in assets if x['sub_class'] in ['cash', 'receivables', 'inventory', 'current_asset']]
        total_ac = to_float(sum(x['value'] for x in ac_accounts))
        anc_accounts = [x for x in assets if x['sub_class'] in ['fixed_asset', 'non_current_asset']]
        total_anc = to_float(sum(x['value'] for x in anc_accounts))
        total_assets = total_ac + total_anc
        
        liabs = df_year[df_year['type'] == 'liability'].to_dict('records')
        pc_accounts = [x for x in liabs if x['sub_class'] in ['payables', 'current_liability']]
        total_pc = to_float(sum(x['value'] for x in pc_accounts))
        pnc_accounts = [x for x in liabs if x['sub_class'] in ['non_current_liability']]
        total_pnc = to_float(sum(x['value'] for x in pnc_accounts))
        total_liabs = total_pc + total_pnc
        
        equity_recs = df_year[df_year['type'] == 'equity'].to_dict('records')
        total_equity_social = to_float(sum(x['value'] for x in equity_recs))
        total_equity_final = total_equity_social + net_income
        
        statements[int(year)] = {
            "balance_sheet": {
                "assets": {
                    "current": {"accounts": ac_accounts, "total": total_ac},
                    "non_current": {"accounts": anc_accounts, "total": total_anc},
                    "total": total_assets
                },
                "liabilities": {
                    "current": {"accounts": pc_accounts, "total": total_pc},
                    "non_current": {"accounts": pnc_accounts, "total": total_pnc},
                    "total": total_liabs
                },
                "equity": {
                    "accounts": equity_recs,
                    "retained_earnings": net_income,
                    "total": total_equity_final
                },
                "total_liab_equity": total_liabs + total_equity_final
            },
            "income_statement": {
                "net_sales": net_sales,
                "cogs": cogs,
                "gross_profit": gross_profit,
                "operating_expenses": op_exps,
                "depreciation": depreciation,
                "operating_income": operating_income,
                "interest_expense": interest,
                "taxes": taxes,
                "net_income": net_income,
                "revenues_list": revenues, # Para detalles si se necesita
                "expenses_list": expenses
            }
        }
    return statements

def generar_flujo_efectivo(curr_stmt, prev_stmt, year):
    """Calcula el flujo de efectivo Método Indirecto y Directo (Estimado)"""
    
    # Datos actuales
    inc = curr_stmt['income_statement']
    bs_curr = curr_stmt['balance_sheet']
    bs_prev = prev_stmt['balance_sheet']

    # Variaciones (Actual - Anterior)
    def get_total(group, subclass):
        return sum(x['value'] for x in group if x['sub_class'] == subclass)

    # Activos Corrientes
    cxc_curr = get_total(bs_curr['assets']['current']['accounts'], 'receivables')
    cxc_prev = get_total(bs_prev['assets']['current']['accounts'], 'receivables')
    var_cxc = cxc_curr - cxc_prev

    inv_curr = get_total(bs_curr['assets']['current']['accounts'], 'inventory')
    inv_prev = get_total(bs_prev['assets']['current']['accounts'], 'inventory')
    var_inv = inv_curr - inv_prev

    # Pasivos Corrientes
    cxp_curr = get_total(bs_curr['liabilities']['current']['accounts'], 'payables')
    cxp_prev = get_total(bs_prev['liabilities']['current']['accounts'], 'payables')
    var_cxp = cxp_curr - cxp_prev

    # --- MÉTODO INDIRECTO ---
    # Actividades de Operación
    utilidad_neta = inc['net_income']
    depreciacion = inc['depreciation']
    
    # Ajustes por cambios en capital de trabajo
    # Aumento de Activo = Resta flujos
    # Aumento de Pasivo = Suma flujos
    flujo_operativo = utilidad_neta + depreciacion - var_cxc - var_inv + var_cxp

    # Actividades de Inversión
    af_curr = bs_curr['assets']['non_current']['total']
    af_prev = bs_prev['assets']['non_current']['total']
    # Aumento en Activos Fijos es salida de dinero (Compra)
    flujo_inversion = -(af_curr - af_prev) # Asumiendo no hubo ventas significativas de activos

    # Actividades de Financiamiento
    pnc_curr = bs_curr['liabilities']['non_current']['total']
    pnc_prev = bs_prev['liabilities']['non_current']['total']
    var_deuda_lp = pnc_curr - pnc_prev
    
    # Patrimonio (Sin contar utilidad retenida del año actual para ver aportes/retiros reales)
    eq_curr_social = sum(x['value'] for x in bs_curr['equity']['accounts'])
    eq_prev_social = sum(x['value'] for x in bs_prev['equity']['accounts'])
    var_capital = eq_curr_social - eq_prev_social # Aportes de capital o pago dividendos extras
    
    flujo_financiamiento = var_deuda_lp + var_capital

    flujo_neto = flujo_operativo + flujo_inversion + flujo_financiamiento
    saldo_inicial = get_total(bs_prev['assets']['current']['accounts'], 'cash')
    saldo_final_calc = saldo_inicial + flujo_neto

    indirecto = {
        "operacion": [
            {"concepto": "Utilidad Neta", "valor": utilidad_neta},
            {"concepto": "(+) Depreciación y Amortización", "valor": depreciacion},
            {"concepto": "(-) Aumento Cuentas por Cobrar" if var_cxc > 0 else "(+) Dism. Cuentas por Cobrar", "valor": -var_cxc},
            {"concepto": "(-) Aumento Inventarios" if var_inv > 0 else "(+) Dism. Inventarios", "valor": -var_inv},
            {"concepto": "(+) Aumento Cuentas por Pagar" if var_cxp > 0 else "(-) Dism. Cuentas por Pagar", "valor": var_cxp},
        ],
        "total_operacion": flujo_operativo,
        "inversion": [
            {"concepto": "Variación Activos Fijos (Neto)", "valor": flujo_inversion}
        ],
        "total_inversion": flujo_inversion,
        "financiamiento": [
            {"concepto": "Variación Deuda Largo Plazo", "valor": var_deuda_lp},
            {"concepto": "Variación Capital Social", "valor": var_capital}
        ],
        "total_financiamiento": flujo_financiamiento,
        "resumen": {
            "flujo_neto_periodo": flujo_neto,
            "saldo_inicial": saldo_inicial,
            "saldo_final_calculado": saldo_final_calc
        }
    }

    # --- MÉTODO DIRECTO (ESTIMADO) ---
    # Cobros a Clientes = Ventas - Aumento CxC
    cobros_clientes = inc['net_sales'] - var_cxc
    
    # Pagos a Proveedores = Costo Ventas + Aumento Inventario - Aumento CxP
    pagos_proveedores = -(inc['cogs'] + var_inv - var_cxp)
    
    # Pagos Gastos Operativos = Gastos Op (sin Deprec)
    # Asumimos que los otros pasivos corrientes absorben parte, pero simplificamos aquí
    pagos_gastos = -inc['operating_expenses'] 
    
    pagos_intereses = -inc['interest_expense']
    pagos_impuestos = -inc['taxes']

    directo = [
        {"concepto": "(+) Cobros a Clientes", "valor": cobros_clientes},
        {"concepto": "(-) Pagos a Proveedores", "valor": pagos_proveedores},
        {"concepto": "(-) Pagos de Gastos Operativos", "valor": pagos_gastos},
        {"concepto": "(-) Intereses Pagados", "valor": pagos_intereses},
        {"concepto": "(-) Impuestos Pagados", "valor": pagos_impuestos},
    ]
    # Nota: El directo a menudo no cuadra exacto con el indirecto si hay cuentas "otras" no mapeadas,
    # pero es la mejor aproximación analítica.
    total_directo = sum(x['valor'] for x in directo)

    return {
        "year": year,
        "indirecto": indirecto,
        "directo": {
            "items": directo,
            "flujo_operativo": total_directo
        }
    }

def calcular_ratios_completos(statements, year, prev_stmt=None):
    st_curr = statements[year]
    bs = st_curr['balance_sheet']
    income = st_curr['income_statement']
    
    ac = bs['assets']['current']['total']
    pc = bs['liabilities']['current']['total']
    
    def sum_sub(group_list, subclass):
        return sum(x['value'] for x in group_list if x['sub_class'] == subclass)

    inv_curr = sum_sub(bs['assets']['current']['accounts'], 'inventory')
    cxc_curr = sum_sub(bs['assets']['current']['accounts'], 'receivables')
    af_curr = bs['assets']['non_current']['total']
    at_curr = bs['assets']['total']
    
    pasivo_total = bs['liabilities']['total']
    patrimonio = bs['equity']['total']
    
    ventas = income['net_sales']
    costo_ventas = income['cogs']
    utilidad_bruta = income['gross_profit']
    utilidad_op = income['operating_income']
    utilidad_neta = income['net_income']
    intereses = income['interest_expense']
    
    prom_inv = inv_curr
    prom_cxc = cxc_curr
    prom_af = af_curr
    prom_at = at_curr
    
    if prev_stmt:
        bs_prev = prev_stmt['balance_sheet']
        inv_prev = sum_sub(bs_prev['assets']['current']['accounts'], 'inventory')
        cxc_prev = sum_sub(bs_prev['assets']['current']['accounts'], 'receivables')
        af_prev = bs_prev['assets']['non_current']['total']
        at_prev = bs_prev['assets']['total']
        
        prom_inv = (inv_curr + inv_prev) / 2
        prom_cxc = (cxc_curr + cxc_prev) / 2
        prom_af = (af_curr + af_prev) / 2
        prom_at = (at_curr + at_prev) / 2

    if prom_inv == 0: prom_inv = inv_curr if inv_curr > 0 else 1
    if prom_cxc == 0: prom_cxc = cxc_curr if cxc_curr > 0 else 1
    if prom_af == 0: prom_af = af_curr if af_curr > 0 else 1
    if prom_at == 0: prom_at = at_curr if at_curr > 0 else 1

    dupont_margen = safe_div(utilidad_neta, ventas)
    dupont_rotacion = safe_div(ventas, at_curr)
    dupont_multiplicador = safe_div(at_curr, patrimonio)
    
    return {
        "year": int(year),
        "liquidez": {
            "cnt": float(ac - pc),
            "razon_circulante": safe_div(ac, pc),
            "razon_rapida": safe_div(ac - inv_curr, pc)
        },
        "actividad": {
            "rotacion_inventarios": safe_div(costo_ventas, prom_inv),
            "rotacion_cxc": safe_div(ventas, prom_cxc),
            "periodo_cobro": safe_div(360, safe_div(ventas, prom_cxc)),
            "rotacion_activos_fijos": safe_div(ventas, prom_af),
            "rotacion_activos_totales": safe_div(ventas, prom_at)
        },
        "endeudamiento": {
            "razon_endeudamiento": safe_div(pasivo_total, at_curr) * 100,
            "razon_pasivo_capital": safe_div(pasivo_total, patrimonio),
            "cobertura_intereses": safe_div(utilidad_op, intereses)
        },
        "rentabilidad": {
            "margen_bruto": safe_div(utilidad_bruta, ventas) * 100,
            "margen_operativo": safe_div(utilidad_op, ventas) * 100,
            "margen_neto": safe_div(utilidad_neta, ventas) * 100,
            "roa": safe_div(utilidad_neta, at_curr) * 100,
            "roe": safe_div(utilidad_neta, patrimonio) * 100,
            "dupont": {
                "margen": dupont_margen * 100,
                "rotacion": dupont_rotacion,
                "multiplicador": dupont_multiplicador,
                "sistema": (dupont_margen * dupont_rotacion * dupont_multiplicador) * 100
            }
        }
    }

def generar_proforma(statements, year_base):
    years = sorted(statements.keys())
    if len(years) < 2: return None
    y_curr = years[-1]
    y_prev = years[-2]
    
    v_curr = statements[y_curr]['income_statement']['net_sales']
    v_prev = statements[y_prev]['income_statement']['net_sales']
    
    if v_prev == 0: return None
    growth_rate = (v_curr - v_prev) / v_prev
    v_proj = v_curr * (1 + growth_rate)
    
    st = statements[y_curr]['income_statement']
    
    costos_pct = safe_div(st['cogs'], v_curr)
    gastos_pct = safe_div(st['operating_expenses'], v_curr)
    
    costos_proj = v_proj * costos_pct
    gastos_proj = v_proj * gastos_pct
    
    return {
        "year_base": int(y_curr),
        "year_proj": int(y_curr + 1),
        "growth_rate": float(growth_rate * 100),
        "proforma": {
            "ventas": float(v_proj),
            "costo_ventas": float(costos_proj),
            "gastos_operativos": float(gastos_proj),
            "utilidad_operativa": float(v_proj - costos_proj - gastos_proj)
        }
    }

def generar_conclusion_experta(ratios, proforma):
    if not ratios: return "Sin datos."
    ult = ratios[-1]
    
    reporte = f"DIAGNÓSTICO {ult['year']}:\n"
    reporte += f"• Rentabilidad (ROE): {ult['rentabilidad']['roe']:.2f}%. "
    
    roe = ult['rentabilidad']['roe']
    if roe > 20: reporte += "Excelente rendimiento sobre el patrimonio."
    elif roe > 10: reporte += "Rendimiento aceptable."
    else: reporte += "Rendimiento bajo, revisar margen y rotación."
    
    rc = ult['liquidez']['razon_circulante']
    reporte += f"\n• Liquidez (Razón Circulante): {rc:.2f}. "
    if rc > 2: reporte += "Exceso de liquidez o inventario ocioso."
    elif rc >= 1: reporte += "Liquidez suficiente para cubrir obligaciones CP."
    else: reporte += "Problemas potenciales de liquidez."
    
    return reporte

@app.post("/analyze")
def analyze_financials(data: AnalysisRequest):
    try:
        raw_df = pd.DataFrame([r.dict() for r in data.records])
        if raw_df.empty: return {"message": "Sin datos"}

        raw_df['accountName'] = raw_df['accountName'].str.strip()
        df = raw_df[~raw_df['accountName'].apply(es_cuenta_total)].copy()
        df['sub_class'] = df.apply(lambda x: clasificar_cuenta(x['accountName'], x['type']), axis=1)

        years = [int(y) for y in sorted(df['year'].unique())]
        financial_statements = generar_estados_financieros(df)
        
        ratios_res = []
        vertical_res = []
        flujos_res = []
        
        for i, year in enumerate(years):
            prev_stmt = financial_statements[years[i-1]] if i > 0 else None
            
            # Ratios
            ratios_res.append(calcular_ratios_completos(financial_statements, year, prev_stmt))
            
            # Flujos (Requiere año anterior)
            if prev_stmt:
                flujo = generar_flujo_efectivo(financial_statements[year], prev_stmt, year)
                flujos_res.append(flujo)
            
            stmt = financial_statements[year]
            base_act = stmt['balance_sheet']['assets']['total']
            base_ven = stmt['income_statement']['net_sales']
            
            df_year = df[df['year'] == year]
            for _, r in df_year.iterrows():
                base = base_act if r['type'] in ['asset', 'liability', 'equity'] else base_ven
                vertical_res.append({
                    **r.to_dict(), 
                    "value": float(r['value']),
                    "year": int(r['year']),
                    "pct": safe_div(r['value'], base)*100
                })

        horizontal_res = []
        if len(years) >= 2:
            base_year = years[0]
            piv = df.pivot_table(index='accountName', columns='year', values='value', aggfunc='sum').fillna(0)
            
            for acc in piv.index:
                val_base = to_float(piv.loc[acc, base_year])
                for year in years[1:]:
                    val_curr = to_float(piv.loc[acc, year])
                    var_abs = val_curr - val_base
                    var_pct = safe_div(var_abs, val_base) * 100
                    
                    horizontal_res.append({
                        "period": f"{year} vs {base_year}", 
                        "account": acc, 
                        "val_base": val_base,
                        "val_curr": val_curr,
                        "var_abs": var_abs, 
                        "var_pct": var_pct
                    })

        proforma_res = generar_proforma(financial_statements, years[0])

        return {
            "ratios": ratios_res,
            "vertical": vertical_res,
            "horizontal": horizontal_res,
            "flujo_efectivo": flujos_res, # Ahora enviamos esto
            "financial_statements": financial_statements,
            "proforma": proforma_res,
            "conclusion": generar_conclusion_experta(ratios_res, proforma_res)
        }
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    return {"data": df.to_dict(orient='records')}