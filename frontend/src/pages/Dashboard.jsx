import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  LayoutDashboard, DollarSign, TrendingUp, ShoppingBag, AlertTriangle, 
  PackageX, CheckCircle, Printer, History, FileText, ShieldAlert, ShieldCheck 
} from 'lucide-react';

export default function Dashboard() {
  const { token } = useAuth();
  
  const [report, setReport] = useState({ total_revenue: 0, total_cost: 0, gross_profit: 0, sales_count: 0 });
  const [replenishment, setReplenishment] = useState([]);
  const [stagnant, setStagnant] = useState([]);
  const [todayClosure, setTodayClosure] = useState(null);
  const [closureHistory, setClosureHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [allowCashierEdit, setAllowCashierEdit] = useState(false);
  const [updatingPerm, setUpdatingPerm] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  const loadDashboardData = async () => {
    try {
      const rep = await api.getDailyReport(token).catch(() => null);
      const repl = await api.getReplenishmentList(token).catch(() => []);
      const stag = await api.getStagnantProducts(token).catch(() => []);
      const tc = await api.getTodayClosure(token).catch(() => null);
      const ch = await api.getClosureHistory(token).catch(() => []);
      const rateSetting = await api.getSetting('exchange_rate', token).catch(() => ({ value: '' }));
      const permSetting = await api.getSetting('allow_cashier_inventory_edit', token).catch(() => ({ value: 'false' }));
      
      setReport(rep || { total_revenue: 0, total_cost: 0, gross_profit: 0, sales_count: 0 });
      setReplenishment(repl || []);
      setStagnant(stag || []);
      setTodayClosure(tc || null);
      setClosureHistory(ch || []);
      setExchangeRate(rateSetting.value || '');
      setAllowCashierEdit(permSetting.value === 'true');
    } catch (err) {
      console.error(err);
      alert('Error al cargar datos del Dashboard');
    }
  };

  const handleSaveRate = async () => {
    if (!exchangeRate || isNaN(parseFloat(exchangeRate))) return alert('Tasa de cambio inválida');
    setSavingRate(true);
    try {
      await api.updateSetting('exchange_rate', parseFloat(exchangeRate).toString(), token);
      alert('Tasa de cambio actualizada correctamente');
    } catch (err) {
      alert('Error al actualizar la tasa de cambio');
    }
    setSavingRate(false);
  };

  const handleToggleCashierPermission = async () => {
    const newValue = !allowCashierEdit ? 'true' : 'false';
    setUpdatingPerm(true);
    try {
      await api.updateSetting('allow_cashier_inventory_edit', newValue, token);
      setAllowCashierEdit(!allowCashierEdit);
      alert(newValue === 'true' 
        ? '✅ Permiso OTORGADO: Los empleados ahora pueden modificar el inventario.' 
        : '🔒 Permiso REVOCADO: El inventario vuelve a ser de solo lectura para los empleados.');
    } catch (err) {
      alert('Error al actualizar permiso de inventario para empleados');
    }
    setUpdatingPerm(false);
  };

  const handleClosure = async () => {
    if (!confirm('¿Estás seguro de realizar el cierre diario? Se guardará el resumen financiero oficial del día.')) return;
    
    setLoading(true);
    try {
      await api.performDailyClosure(token);
      alert('¡Cierre diario realizado y guardado exitosamente!');
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Error al realizar el cierre');
    }
    setLoading(false);
  };

  const handlePrintClosure = (closureData) => {
    const rate = parseFloat(exchangeRate) || 0;
    const rev = parseFloat(closureData.total_revenue || 0);
    const cost = parseFloat(closureData.total_cost || 0);
    const profit = parseFloat(closureData.gross_profit || 0);
    const withdr = parseFloat(closureData.suggested_withdrawal || 0);
    const reinv = parseFloat(closureData.suggested_reinvestment || 0);

    const printWindow = window.open('', '_blank', 'width=600,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Cierre Diario - ${closureData.date}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; color: #111; line-height: 1.5; }
            h2 { text-align: center; margin-bottom: 5px; }
            p { text-align: center; margin-top: 0; color: #555; }
            .divider { border-bottom: 2px dashed #000; margin: 15px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .bold { font-weight: bold; }
            .highlight { background: #eee; padding: 8px; border-left: 4px solid #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h2>SISTEMA POS</h2>
          <p>REPORTE DE CIERRE DIARIO OFICIAL</p>
          <div class="divider"></div>
          <div class="row"><span>Fecha:</span> <span class="bold">${closureData.date}</span></div>
          <div class="row"><span>Generado por:</span> <span class="bold">Administración</span></div>
          <div class="divider"></div>
          <div class="row"><span>Ingresos Brutos:</span> <span class="bold">$${rev.toFixed(2)} USD</span></div>
          ${rate > 0 ? `<div class="row" style="color:#555"><span>Ref. Bolívares:</span> <span>Bs. ${(rev * rate).toFixed(2)}</span></div>` : ''}
          <div class="row"><span>Costo de Venta:</span> <span class="bold">-$${cost.toFixed(2)} USD</span></div>
          <div class="divider"></div>
          <div class="row bold" style="font-size: 1.2em"><span>GANANCIA BRUTA:</span> <span>$${profit.toFixed(2)} USD</span></div>
          ${rate > 0 ? `<div class="row bold" style="color:#16a34a"><span>Ganancia en Bs:</span> <span>Bs. ${(profit * rate).toFixed(2)}</span></div>` : ''}
          <div class="divider"></div>
          <div class="highlight">
            <div class="row bold"><span>Retiro Sugerido (20%):</span> <span>$${withdr.toFixed(2)} USD</span></div>
            <div class="row bold"><span>Reinversión Sugerida (80%):</span> <span>$${reinv.toFixed(2)} USD</span></div>
          </div>
          <div class="divider"></div>
          <p style="margin-top: 30px; font-size: 0.8em;">*** Fin del Reporte Oficial ***</p>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LayoutDashboard size={32} color="var(--primary)" />
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0 }}>Dashboard del Dueño</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Control financiero, reporte diario y gestión de inventario.</p>
          </div>
        </div>
        <button className="btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={loadDashboardData}>
          🔄 Actualizar Datos
        </button>
      </div>

      {/* Configuración de Tasa de Cambio */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <DollarSign size={24} color="#16a34a" />
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Tasa de Cambio del Día (Dólar / Bs.)</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Ingresa la tasa oficial para convertir ventas y ganancias a bolívares en tiempo real.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="number" 
            step="0.01" 
            className="form-input" 
            placeholder="Ej. 40.50" 
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            style={{ width: '130px', fontWeight: '700' }}
          />
          <button className="btn btn-primary" onClick={handleSaveRate} disabled={savingRate}>
            {savingRate ? 'Guardando...' : 'Guardar Tasa'}
          </button>
        </div>
      </div>

      {/* Control de Permisos de Empleados */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: allowCashierEdit ? '#f0fdf4' : '#fffbebf' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {allowCashierEdit ? <ShieldCheck size={26} color="#16a34a" /> : <ShieldAlert size={26} color="#d97706" />}
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#0f172a' }}>Permiso de Edición de Inventario para Empleados</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
              {allowCashierEdit 
                ? '🟢 Los empleados (cajeros) TIENEN PERMISO para agregar o eliminar productos en el inventario.'
                : '🔴 Los empleados (cajeros) TIENEN BLOQUEADA la modificación del inventario (Solo Lectura).'}
            </p>
          </div>
        </div>
        <button 
          className="btn" 
          onClick={handleToggleCashierPermission} 
          disabled={updatingPerm}
          style={{ 
            background: allowCashierEdit ? '#dc2626' : '#16a34a', 
            color: 'white', 
            fontWeight: '700',
            whiteSpace: 'nowrap'
          }}
        >
          {updatingPerm ? 'Actualizando...' : (allowCashierEdit ? '🔒 Revocar Permiso' : '🔓 Otorgar Permiso')}
        </button>
      </div>

      {/* KPIs del Día */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#e0e7ff', borderRadius: '50%', color: '#4f46e5' }}><DollarSign size={24} /></div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Ingresos del Día</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '800' }}>
              ${parseFloat(report?.total_revenue || 0).toFixed(2)}
            </p>
            {exchangeRate && !isNaN(parseFloat(exchangeRate)) && (
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Bs. {(parseFloat(report?.total_revenue || 0) * parseFloat(exchangeRate)).toFixed(2)}
              </p>
            )}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '50%', color: '#dc2626' }}><ShoppingBag size={24} /></div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Costo de Venta</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '800' }}>
              ${parseFloat(report?.total_cost || 0).toFixed(2)}
            </p>
            {exchangeRate && !isNaN(parseFloat(exchangeRate)) && (
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Bs. {(parseFloat(report?.total_cost || 0) * parseFloat(exchangeRate)).toFixed(2)}
              </p>
            )}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '50%', color: '#16a34a' }}><TrendingUp size={24} /></div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Ganancia Bruta</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a' }}>
              ${parseFloat(report?.gross_profit || 0).toFixed(2)}
            </p>
            {exchangeRate && !isNaN(parseFloat(exchangeRate)) && (
              <p style={{ fontSize: '0.75rem', color: '#15803d' }}>
                Bs. {(parseFloat(report?.gross_profit || 0) * parseFloat(exchangeRate)).toFixed(2)}
              </p>
            )}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '50%', color: '#4b5563' }}><CheckCircle size={24} /></div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Ventas del Día</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '800' }}>{report?.sales_count || 0}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Transacciones realizadas</p>
          </div>
        </div>
      </div>

      {/* Cierre del Día Oficial */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: todayClosure ? '6px solid #16a34a' : '6px solid #2563eb' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={22} color={todayClosure ? '#16a34a' : '#2563eb'} />
          Cierre de Caja y Finanzas del Día
        </h2>

        {todayClosure ? (
          <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span style={{ background: '#166534', color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ✅ CIERRE COMPLETADO HOY
                </span>
                <p style={{ margin: '0.5rem 0 0', color: '#166534', fontSize: '0.9rem' }}>
                  Registrado el {todayClosure.date} | Cierre oficial guardado en base de datos.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => handlePrintClosure(todayClosure)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#15803d' }}
              >
                <Printer size={18} /> Imprimir / Exportar Reporte
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #dcfce7' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Ingresos Totales</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>${parseFloat(todayClosure.total_revenue).toFixed(2)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Ganancia Bruta</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a', margin: 0 }}>${parseFloat(todayClosure.gross_profit).toFixed(2)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: 0 }}>Sugerencia Retiro (20%)</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0284c7', margin: 0 }}>${parseFloat(todayClosure.suggested_withdrawal).toFixed(2)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: '#15803d', margin: 0 }}>Reinversión Stock (80%)</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#16a34a', margin: 0 }}>${parseFloat(todayClosure.suggested_reinvestment).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem' }}>
            <div>
              <p style={{ fontWeight: '600', margin: '0 0 0.25rem', color: '#1e293b' }}>El cierre diario aún no se ha ejecutado el día de hoy.</p>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>
                Al ejecutar el cierre, el sistema congelará los totales del día, calculará la sugerencia de retiro (20%) vs reinversión (80%) y enviará el reporte por correo.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleClosure} disabled={loading} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', whiteSpace: 'nowrap' }}>
              ⚡ {loading ? 'Procesando Cierre...' : 'Ejecutar Cierre Oficial'}
            </button>
          </div>
        )}
      </div>

      {/* Historial de Cierres Anteriores */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={22} color="var(--primary)" /> Historial de Cierres Diarios Guardados
        </h2>
        {closureHistory.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
            Aún no hay cierres guardados en el historial. Al ejecutar tu primer cierre aparecerá listado aquí.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ingresos (USD)</th>
                  <th>Costo (USD)</th>
                  <th>Ganancia (USD)</th>
                  <th>Retiro (20%)</th>
                  <th>Reinversión (80%)</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {closureHistory.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '700' }}>📅 {item.date}</td>
                    <td style={{ fontWeight: '600' }}>${parseFloat(item.total_revenue).toFixed(2)}</td>
                    <td style={{ color: '#dc2626' }}>-${parseFloat(item.total_cost).toFixed(2)}</td>
                    <td style={{ color: '#16a34a', fontWeight: '800' }}>${parseFloat(item.gross_profit).toFixed(2)}</td>
                    <td style={{ color: '#0284c7', fontWeight: '600' }}>${parseFloat(item.suggested_withdrawal).toFixed(2)}</td>
                    <td style={{ color: '#16a34a', fontWeight: '600' }}>${parseFloat(item.suggested_reinvestment).toFixed(2)}</td>
                    <td>
                      <button 
                        className="btn" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#f1f5f9' }}
                        onClick={() => handlePrintClosure(item)}
                      >
                        <Printer size={14} style={{ display: 'inline', marginRight: '4px' }} /> Ver / Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Alertas de Reposición y Productos Estancados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Productos a Reponer */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c' }}>
            <AlertTriangle size={20} /> Productos a Reponer (Bajo Stock)
          </h2>
          {replenishment.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Todo el inventario tiene buen stock disponible.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Producto</th><th>Stock Actual</th><th>Mínimo Requerido</th></tr></thead>
                <tbody>
                  {replenishment.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>{p.name}</td>
                      <td style={{ color: '#dc2626', fontWeight: '800' }}>{p.current_stock}</td>
                      <td>{p.min_stock_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Productos Estancados */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
            <PackageX size={20} /> Productos Estancados (+7 Días sin Venta)
          </h2>
          {stagnant.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No hay productos estancados en los últimos 7 días.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Producto</th><th>Última Venta</th></tr></thead>
                <tbody>
                  {stagnant.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>{p.name}</td>
                      <td>{p.last_sold_at ? new Date(p.last_sold_at).toLocaleDateString() : 'Sin ventas registradas'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
