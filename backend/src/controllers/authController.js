const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_123';

// Consulta si ya existen usuarios registrados en el sistema
exports.getAuthStatus = (req, res) => {
  db.get("SELECT COUNT(id) as count FROM users", [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ hasUsers: row ? row.count > 0 : false, count: row ? row.count : 0 });
  });
};

// Registro de usuario (Para crear administradores o cajeros iniciales)
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Hasheamos la contraseña para no guardarla en texto plano
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    db.run(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role],
      function(err) {
        if (err) return res.status(400).json({ error: 'El correo ya existe o hubo un error.' });
        res.status(201).json({ message: 'Usuario creado exitosamente', id: this.lastID });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Iniciar sesión (Login)
exports.login = (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Comparamos la contraseña enviada con el hash guardado en BD
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Generamos el "Gafete" (Token) que le dará acceso al usuario por 12 horas
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email }
    });
  });
};
