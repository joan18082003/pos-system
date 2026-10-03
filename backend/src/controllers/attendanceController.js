const db = require('../config/db');
const { spawn } = require('child_process');
const path = require('path');

// Obtener logs de asistencia de todos los empleados (solo admin)
exports.getLogs = (req, res) => {
  const { date_from, date_to } = req.query;
  let query = `
    SELECT 
      a.id,
      u.name AS employee_name,
      a.date,
      a.clock_in,
      a.clock_out
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE u.role = 'cashier'
  `;
  const params = [];

  if (date_from) {
    query += ` AND a.date >= ?`;
    params.push(date_from);
  }
  if (date_to) {
    query += ` AND a.date <= ?`;
    params.push(date_to);
  }
  query += ` ORDER BY a.date DESC, a.clock_in DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Función auxiliar para lanzar el script Python en segundo plano
const notifyOwner = (workerName, event, time) => {
  const scriptPath = path.resolve(__dirname, '../../../automation/scripts/attendance_notifier.py');
  const timeStr = new Date(time).toLocaleTimeString('es-ES');
  
  const proc = spawn('python', [scriptPath, '--name', workerName, '--event', event, '--time', timeStr]);
  
  proc.stdout.on('data', (data) => console.log(`[Python] ${data}`));
  proc.stderr.on('data', (data) => console.error(`[Python Error] ${data}`));
};


// Marcar entrada (Clock In)
exports.clockIn = (req, res) => {
  // El ID del usuario nos llega automáticamente de forma segura gracias a nuestro Guardia (Middleware JWT)
  const userId = req.user.id; 
  const date = new Date().toISOString().split('T')[0]; // Formato: YYYY-MM-DD
  const clockInTime = new Date().toISOString(); // Hora exacta actual

  // Primero verificamos si el trabajador ya marcó entrada el día de hoy
  db.get("SELECT * FROM attendance WHERE user_id = ? AND date = ?", [userId, date], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row) {
      return res.status(400).json({ error: 'Ya registraste tu entrada el día de hoy.' });
    }

    // Si no ha marcado, insertamos el registro
    db.run("INSERT INTO attendance (user_id, clock_in, date) VALUES (?, ?, ?)", [userId, clockInTime, date], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Disparamos el script Python en segundo plano (no bloqueamos la respuesta HTTP)
      db.get("SELECT name FROM users WHERE id = ?", [userId], (e, u) => {
        if (u) notifyOwner(u.name, 'clock_in', clockInTime);
      });
      res.status(201).json({ message: 'Entrada registrada exitosamente.', id: this.lastID, time: clockInTime });
    });
  });
};

// Marcar salida (Clock Out)
exports.clockOut = (req, res) => {
  const userId = req.user.id;
  const date = new Date().toISOString().split('T')[0];
  const clockOutTime = new Date().toISOString();

  // Actualizamos el registro de hoy donde la salida aún esté vacía (NULL)
  db.run("UPDATE attendance SET clock_out = ? WHERE user_id = ? AND date = ? AND clock_out IS NULL", 
    [clockOutTime, userId, date], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      if (this.changes === 0) {
        return res.status(400).json({ error: 'No tienes una entrada activa hoy o ya marcaste salida.' });
      }

      // Disparamos el script Python en segundo plano
      db.get("SELECT name FROM users WHERE id = ?", [userId], (e, u) => {
        if (u) notifyOwner(u.name, 'clock_out', clockOutTime);
      });
      res.json({ message: 'Salida registrada exitosamente.', time: clockOutTime });
  });
};
