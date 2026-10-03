import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle, XCircle, BarChart2 } from 'lucide-react';

export default function POS() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [weightInputs, setWeightInputs] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);

  useEffect(() => {
    api.getProducts(token)
      .then(res => setProducts(Array.isArray(res) ? res : []))
      .catch(err => {
        console.error('Error fetching products:', err);
        setProducts([]);
      });
    api.getSetting('exchange_rate', token)
      .then(res => setExchangeRate(parseFloat(res.value)))
      .catch(() => setExchangeRate(null));
  }, [token]);

  // Filtrado de productos por búsqueda
  const safeProducts = Array.isArray(products) ? products : [];
  const filtered = safeProducts.filter(p =>
    (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  // Agregar al carrito
  const addToCart = (product) => {
    if (product.unit_type === 'weight') {
      const qty = parseFloat(weightInputs[product.id] || 0);
      if (!qty || qty <= 0) {
        alert(`Ingresa un peso/cantidad para "${product.name}" antes de agregar.`);
        return;
      }
      if (qty > product.current_stock) {
        alert(`Stock insuficiente. Disponible: ${product.current_stock}`);
        return;
      }
      const existing = cart.find(i => i.product_id === product.id);
      if (existing) {
        setCart(cart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i));
      } else {
        setCart([...cart, { product_id: product.id, name: product.name, unit_type: 'weight', quantity: qty, unit_price: product.selling_price, unit_cost: product.cost_price }]);
      }
      setWeightInputs({ ...weightInputs, [product.id]: '' });
    } else {
      if (product.current_stock < 1) { alert('Stock agotado.'); return; }
      const existing = cart.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) { alert('No hay más stock disponible.'); return; }
        setCart(cart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setCart([...cart, { product_id: product.id, name: product.name, unit_type: 'unit', quantity: 1, unit_price: product.selling_price, unit_cost: product.cost_price }]);
      }
    }
  };

  const removeFromCart = (productId) => setCart(cart.filter(i => i.product_id !== productId));
  const changeQty = (productId, delta) => {
    setCart(cart.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? null : { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const cartCost  = cart.reduce((acc, item) => acc + item.quantity * item.unit_cost, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { alert('El carrito está vacío.'); return; }
    setLoading(true);
    try {
      const result = await api.createSale({ items: cart }, token);
      setReceipt(result);
      setCart([]);
      // Refrescar stock de productos
      api.getProducts(token).then(setProducts);
    } catch (e) {
      alert('Error al procesar la venta: ' + e.message);
    }
    setLoading(false);
  };

  const closeReceipt = () => setReceipt(null);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Panel izquierdo: Catálogo */}
      <div style={styles.catalog}>
        <div style={styles.catalogHeader}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={26} color="var(--primary)" /> Punto de Venta
          </h1>
          {/* Barra de búsqueda */}
          <div style={{ position: 'relative', marginTop: '1rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              id="pos-search"
              type="text"
              className="form-input"
              placeholder="Buscar producto por nombre o SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
        </div>

        {/* Grid de Productos */}
        <div style={styles.productGrid}>
          {filtered.map(product => (
            <div key={product.id} style={{
              ...styles.productCard,
              opacity: product.current_stock <= 0 ? 0.5 : 1,
            }}>
              <div style={styles.productCardBadge}>
                {product.unit_type === 'weight' ? '⚖️ Peso' : '📦 Unidad'}
              </div>
              <p style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>{product.name}</p>
              <p style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.1rem' }}>
                ${parseFloat(product.selling_price || 0).toFixed(2)}
              </p>
              <p style={{ color: product.current_stock <= product.min_stock_level ? '#dc2626' : '#64748b', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                Stock: {product.current_stock} {product.unit_type === 'weight' ? 'kg' : 'uds'}
              </p>

              {product.unit_type === 'weight' ? (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="Kg / g"
                    value={weightInputs[product.id] || ''}
                    onChange={e => setWeightInputs({ ...weightInputs, [product.id]: e.target.value })}
                    style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
                  />
                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }} onClick={() => addToCart(product)} disabled={product.current_stock <= 0}>
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => addToCart(product)} disabled={product.current_stock <= 0}>
                  <Plus size={16} /> Agregar
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: '#94a3b8', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
              No se encontraron productos.
            </p>
          )}
        </div>
      </div>

      {/* Panel derecho: Carrito */}
      <div style={styles.cartPanel}>
        <h2 style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid var(--border)' }}>
          🛒 Carrito ({cart.length})
        </h2>

        {/* Items del carrito */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 1rem' }}>
              <ShoppingCart size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>El carrito está vacío.<br />Agrega productos desde el catálogo.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} style={styles.cartItem}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</p>
                  <p style={{ color: '#64748b', fontSize: '0.8rem' }}>${item.unit_price.toFixed(2)} / {item.unit_type === 'weight' ? 'kg' : 'ud'}</p>
                </div>
                {item.unit_type === 'unit' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button onClick={() => changeQty(item.product_id, -1)} style={styles.qtyBtn}><Minus size={12} /></button>
                    <span style={{ fontWeight: '700', minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => changeQty(item.product_id, 1)} style={styles.qtyBtn}><Plus size={12} /></button>
                  </div>
                ) : (
                  <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.quantity} kg</span>
                )}
                <p style={{ fontWeight: '700', color: 'var(--primary)', minWidth: '60px', textAlign: 'right' }}>
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </p>
                <button onClick={() => removeFromCart(item.product_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Resumen y Pago */}
        {cart.length > 0 && (
          <div style={styles.cartFooter}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
              <span>Subtotal:</span><span>${cartTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontWeight: '800', fontSize: '1.3rem' }}>
              <span>TOTAL:</span><span style={{ color: 'var(--primary)' }}>${cartTotal.toFixed(2)}</span>
            </div>
            {exchangeRate && (
              <div style={{ textAlign: 'right', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                Ref. Bs. {(cartTotal * exchangeRate).toFixed(2)} (Tasa: {exchangeRate})
              </div>
            )}
            <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#15803d' }}>
              <BarChart2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Ganancia estimada: <strong>${(cartTotal - cartCost).toFixed(2)}</strong>
            </div>
            <button id="pos-checkout-btn" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: '700' }} onClick={handleCheckout} disabled={loading}>
              <CheckCircle size={20} />
              {loading ? 'Procesando...' : 'Cobrar y Finalizar'}
            </button>
          </div>
        )}
      </div>

      {/* Modal de Recibo */}
      {receipt && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h2 style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '0.5rem' }}>¡Venta Exitosa!</h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1.5rem' }}>Venta #{receipt.saleId}</p>
            <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Total cobrado:</span>
                <strong>${parseFloat(receipt.totalRevenue).toFixed(2)}</strong>
              </div>
              {exchangeRate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>
                  <span>Equivalente en Bs:</span>
                  <strong>Bs. {(parseFloat(receipt.totalRevenue) * exchangeRate).toFixed(2)}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#dc2626' }}>
                <span>Costo de productos:</span>
                <span>-${parseFloat(receipt.totalCost).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.1rem', color: '#16a34a', borderTop: '2px solid var(--border)', paddingTop: '0.75rem' }}>
                <span>Ganancia bruta:</span>
                <span>${parseFloat(receipt.grossProfit).toFixed(2)}</span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={closeReceipt}>
              <XCircle size={18} /> Cerrar y Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  catalog: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  catalogHeader: { padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'white' },
  productGrid: { flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', alignContent: 'start' },
  productCard: { background: 'white', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s', position: 'relative' },
  productCardBadge: { position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.7rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '999px', fontWeight: '600' },
  cartPanel: { width: '360px', background: 'white', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem' },
  cartItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' },
  cartFooter: { borderTop: '2px solid var(--border)', paddingTop: '1.25rem', marginTop: '1rem' },
  qtyBtn: { width: '24px', height: '24px', border: '1px solid var(--border)', borderRadius: '4px', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: '1.25rem', padding: '2.5rem', maxWidth: '400px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' },
};
