const db = require('../config/db');
const { spawn } = require('child_process');
const path = require('path');

// Lanzar alerta de bajo stock via Python
const checkStockAlert = (productId) => {
  db.get("SELECT name, current_stock, min_stock_level FROM products WHERE id = ?", [productId], (err, product) => {
    if (err || !product) return;
    if (product.current_stock <= product.min_stock_level) {
      const scriptPath = path.resolve(__dirname, '../../../automation/scripts/inventory_alerts.py');
      const proc = spawn('python', [
        scriptPath,
        '--product', product.name,
        '--stock', product.current_stock.toString(),
        '--min', product.min_stock_level.toString()
      ]);
      proc.stdout.on('data', (d) => console.log(`[Python Alerta] ${d}`));
      proc.stderr.on('data', (d) => console.error(`[Python Alerta Error] ${d}`));
    }
  });
};

// Procesar una venta completa
exports.createSale = (req, res) => {
  // items: [{ product_id, quantity, unit_price, unit_cost }]
  const { items } = req.body;
  const userId = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'La venta no tiene productos.' });
  }

  // Calcular totales
  let totalRevenue = 0;
  let totalCost = 0;

  for (const item of items) {
    const qty = parseFloat(item.quantity);
    totalRevenue += qty * parseFloat(item.unit_price);
    totalCost    += qty * parseFloat(item.unit_cost);
  }

  const grossProfit = totalRevenue - totalCost;

  // Usamos serialize() para que todas las operaciones de BD se ejecuten en orden
  db.serialize(() => {
    // 1. Insertar la venta general
    db.run(
      "INSERT INTO sales (user_id, total_revenue, total_cost, gross_profit) VALUES (?, ?, ?, ?)",
      [userId, totalRevenue, totalCost, grossProfit],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const saleId = this.lastID;

        // 2. Insertar cada ítem del detalle
        const stmt = db.prepare(
          "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?, ?)"
        );

        for (const item of items) {
          const qty      = parseFloat(item.quantity);
          const subtotal = qty * parseFloat(item.unit_price);
          stmt.run(saleId, item.product_id, qty, item.unit_price, item.unit_cost, subtotal);

          // 3. Descontar el stock del producto
          db.run(
            "UPDATE products SET current_stock = current_stock - ?, last_sold_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [qty, item.product_id],
            () => {
              // 4. Verificar si hay alerta de bajo stock
              checkStockAlert(item.product_id);
            }
          );
        }

        stmt.finalize();

        res.status(201).json({
          message: 'Venta procesada exitosamente.',
          saleId,
          totalRevenue: totalRevenue.toFixed(2),
          totalCost: totalCost.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
        });
      }
    );
  });
};

// Obtener historial de ventas del día actual
exports.getTodaySales = (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  db.all(
    `SELECT s.*, u.name as cashier_name FROM sales s 
     JOIN users u ON s.user_id = u.id 
     WHERE DATE(s.created_at) = ?
     ORDER BY s.created_at DESC`,
    [today],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};
