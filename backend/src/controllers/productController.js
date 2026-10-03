const db = require('../config/db');

// Obtener todos los productos y además traer el nombre de su categoría
exports.getAllProducts = (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Crear un producto
exports.createProduct = (req, res) => {
  const { name, category_id, sku, barcode, unit_type, cost_price, selling_price, current_stock, min_stock_level } = req.body;
  
  if (!name || !unit_type || cost_price === undefined || selling_price === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para crear el producto.' });
  }

  const query = `
    INSERT INTO products 
    (name, category_id, sku, barcode, unit_type, cost_price, selling_price, current_stock, min_stock_level) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  // Si no nos mandan stock inicial, por defecto es 0
  const params = [
    name, 
    category_id ? parseInt(category_id, 10) : null, 
    sku || null, 
    barcode || null, 
    unit_type, 
    cost_price, 
    selling_price, 
    current_stock || 0, 
    min_stock_level || 0
  ];

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Producto creado exitosamente' });
  });
};

// Eliminar un producto
exports.deleteProduct = (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Producto eliminado', changes: this.changes });
  });
};
