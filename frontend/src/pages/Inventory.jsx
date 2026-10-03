import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Plus, Trash2, Package, ScanLine, X, AlertTriangle } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// Modal del escáner de código de barras (html5-qrcode)
// ──────────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const scannerInstance = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    // Importamos dinámicamente para evitar problemas de SSR
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (!mounted || !scannerRef.current) return;

      const scanner = new Html5QrcodeScanner(
        'barcode-reader',
        {
          fps: 10,
          qrbox: { width: 260, height: 140 },
          aspectRatio: 1.5,
          supportedScanTypes: [0], // 0 = SCAN_TYPE_CAMERA
          formatsToSupport: [
            1, 2, 3, 4, 5, 6, 7, 8,   // Formatos 1D (EAN-13, UPC-A, Code-128, etc.)
            9, 10, 11,                  // Más formatos 1D
          ],
        },
        /* verbose */ false
      );

      scanner.render(
        (decodedText) => {
          scanner.clear().catch(() => {});
          onDetected(decodedText);
        },
        (err) => {
          // Errores rutinarios de escaneo — no mostrar al usuario
          if (!String(err).includes('No MultiFormat Readers')) {
            setError('Cámara no disponible o permiso denegado. Verifica los permisos.');
          }
        }
      );

      scannerInstance.current = scanner;
    }).catch(() => {
      setError('Error al cargar el módulo de escaneo.');
    });

    return () => {
      mounted = false;
      if (scannerInstance.current) {
        scannerInstance.current.clear().catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div style={overlay}>
      <div style={modalBox}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScanLine size={22} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Escanear Código de Barras</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={22} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
          Apunta la cámara al código de barras del producto. El sistema lo detectará automáticamente.
        </p>

        {error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem', color: '#b91c1c' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        ) : (
          <div id="barcode-reader" ref={scannerRef} style={{ borderRadius: '0.75rem', overflow: 'hidden' }} />
        )}

        <button onClick={onClose} className="btn" style={{ marginTop: '1rem', width: '100%' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)',
};
const modalBox = {
  background: 'var(--card-bg, #fff)', borderRadius: '1.25rem',
  padding: '1.5rem', width: '95%', maxWidth: '480px',
  boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
};

// ──────────────────────────────────────────────────────────────
// Página principal de Inventario
// ──────────────────────────────────────────────────────────────
export default function Inventory() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [canEditInventory, setCanEditInventory] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unit_type: 'unit',
    cost_price: '',
    selling_price: '',
    current_stock: '',
    barcode: '',
  });
  const [exchangeRate, setExchangeRate] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const prods = await api.getProducts(token);
      const cats = await api.getCategories(token);
      const rateSetting = await api.getSetting('exchange_rate', token).catch(() => ({ value: 0 }));
      const editSetting = await api.getSetting('allow_cashier_inventory_edit', token).catch(() => ({ value: 'false' }));

      setProducts(prods);
      setCategories(cats);
      setExchangeRate(parseFloat(rateSetting.value) || 0);
      setCanEditInventory(user?.role === 'admin' || editSetting.value === 'true');
    } catch (error) {
      console.error(error);
      alert('Error cargando los datos del servidor');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Callback estable para que el scanner no re-monte en cada render
  const handleBarcodeDetected = useCallback((code) => {
    setFormData((prev) => ({ ...prev, barcode: code, name: prev.name || code }));
    setShowScanner(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct({
        ...formData,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        current_stock: parseFloat(formData.current_stock) || 0,
      }, token);
      alert('Producto agregado');
      loadData();
      setFormData({ name: '', category_id: '', unit_type: 'unit', cost_price: '', selling_price: '', current_stock: '', barcode: '' });
    } catch {
      alert('Error al guardar el producto');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await api.deleteProduct(id, token);
        loadData();
      } catch {
        alert('Error al eliminar');
      }
    }
  };

  return (
    <div className="container">
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Package size={32} color="var(--primary)" />
        <h1 style={{ fontSize: '2rem' }}>Gestión de Inventario</h1>
      </div>

      {!canEditInventory && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.85rem 1.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          🔒 <strong>Vista de Solo Lectura:</strong> La creación y eliminación de productos está restringida. El Administrador (Dueño) debe habilitar el permiso desde su equipo.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* ── Formulario ── */}
        <div className="card" style={{ opacity: canEditInventory ? 1 : 0.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Agregar Producto</h2>
            {canEditInventory && (
              <button
                id="open-scanner-btn"
                onClick={() => setShowScanner(true)}
                title="Escanear código de barras con la cámara"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: 'white', border: 'none', borderRadius: '0.6rem',
                  padding: '0.5rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem',
                  fontWeight: '600', boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                  transition: 'opacity 0.2s',
                }}
              >
                <ScanLine size={16} />
                Escanear
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <fieldset disabled={!canEditInventory} style={{ border: 'none', padding: 0, margin: 0 }}>

              {/* Código de barras (rellenado automáticamente por el scanner) */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ScanLine size={14} /> Código de Barras
                  <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.78rem' }}>(opcional — usa el botón Escanear)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  placeholder="Escaneado automáticamente o escribe aquí"
                  style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                />
              </div>

              <div className="form-group">
                <label>Nombre del Producto</label>
                <input required type="text" className="form-input" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ej. Queso Gouda" />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select className="form-input" name="category_id" value={formData.category_id} onChange={handleInputChange}>
                  <option value="">-- Seleccionar --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de Venta</label>
                <select className="form-input" name="unit_type" value={formData.unit_type} onChange={handleInputChange}>
                  <option value="unit">Por Unidad Entera</option>
                  <option value="weight">Por Peso / Fracción (Ej. Kg)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Stock Inicial</label>
                  <input required type="number" step="0.01" className="form-input" name="current_stock" value={formData.current_stock} onChange={handleInputChange} placeholder="Ej. 10" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Costo ($)</label>
                  <input required type="number" step="0.01" className="form-input" name="cost_price" value={formData.cost_price} onChange={handleInputChange} />
                  {exchangeRate > 0 && formData.cost_price && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Aprox. {(parseFloat(formData.cost_price) * exchangeRate).toFixed(2)} Bs
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Precio Venta ($)</label>
                  <input required type="number" step="0.01" className="form-input" name="selling_price" value={formData.selling_price} onChange={handleInputChange} />
                  {exchangeRate > 0 && formData.selling_price && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Aprox. {(parseFloat(formData.selling_price) * exchangeRate).toFixed(2)} Bs
                    </p>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={!canEditInventory}>
                <Plus size={18} /> Guardar Producto
              </button>
            </fieldset>
          </form>
        </div>

        {/* ── Tabla de Productos ── */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Lista de Productos</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Precio Venta</th>
                  <th>Stock</th>
                  {canEditInventory && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={canEditInventory ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay productos registrados.
                    </td>
                  </tr>
                ) : (
                  products.map(prod => (
                    <tr key={prod.id}>
                      <td style={{ fontWeight: '500' }}>{prod.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {prod.barcode || '—'}
                      </td>
                      <td>{prod.category_name || '-'}</td>
                      <td>{prod.unit_type === 'weight' ? '⚖️ Peso' : '📦 Unidad'}</td>
                      <td>${prod.selling_price.toFixed(2)}</td>
                      <td>{prod.current_stock}</td>
                      {canEditInventory && (
                        <td>
                          <button onClick={() => handleDelete(prod.id)} className="btn btn-danger" style={{ padding: '0.4rem' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
