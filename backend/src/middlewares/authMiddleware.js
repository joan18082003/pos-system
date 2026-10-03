const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_123';

// Este middleware actuará como un guardia de seguridad en nuestras rutas
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'Se requiere iniciar sesión (Token no proporcionado)' });
  
  const token = authHeader.split(" ")[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
};

// Middleware para restringir rutas exclusivamente al Administrador (Dueño)
exports.verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: Esta función es exclusiva del Administrador (Dueño).' });
  }
  next();
};

// Middleware para verificar permiso de edición de inventario (Dueño o Cajero con permiso activo)
exports.checkInventoryPermission = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  const db = require('../config/db');
  db.get("SELECT value FROM settings WHERE key = 'allow_cashier_inventory_edit'", [], (err, row) => {
    if (err || !row || row.value !== 'true') {
      return res.status(403).json({ error: '🔒 La modificación de inventario está restringida por el Administrador.' });
    }
    next();
  });
};
