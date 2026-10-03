const db = require('../config/db');

// Obtener todas las categorías
exports.getAllCategories = (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Crear una categoría nueva
exports.createCategory = (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
  }
  
  // Usamos ? para evitar inyección SQL (Seguridad)
  db.run("INSERT INTO categories (name, description) VALUES (?, ?)", [name, description], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // this.lastID nos devuelve el ID recién creado en SQLite
    res.status(201).json({ id: this.lastID, name, description });
  });
};

// Eliminar una categoría
exports.deleteCategory = (req, res) => {
  const { id } = req.params; // Extraemos el ID de la URL
  db.run("DELETE FROM categories WHERE id = ?", id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Categoría eliminada exitosamente.', changes: this.changes });
  });
};
