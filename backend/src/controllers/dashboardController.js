const db = require('../config/db');

exports.getDailyReport = (req, res) => {
  const query = `
    SELECT 
      IFNULL(SUM(total_revenue), 0) as total_revenue,
      IFNULL(SUM(total_cost), 0) as total_cost,
      IFNULL(SUM(gross_profit), 0) as gross_profit,
      COUNT(id) as sales_count
    FROM sales 
    WHERE date(created_at, 'localtime') = date('now', 'localtime')
  `;

  db.get(query, [], (err, row) => {
    if (err) return res.status(500).json({ message: 'Error al obtener reporte del día' });
    res.json(row);
  });
};

exports.getStagnantProducts = (req, res) => {
  const query = `
    SELECT * FROM products 
    WHERE last_sold_at IS NULL 
       OR date(last_sold_at, 'localtime') < date('now', 'localtime', '-7 days')
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error al obtener productos estancados' });
    res.json(rows);
  });
};

exports.getReplenishmentList = (req, res) => {
  const query = `
    SELECT * FROM products 
    WHERE current_stock <= min_stock_level
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error al obtener lista de reposición' });
    res.json(rows);
  });
};

exports.getTodayClosure = (req, res) => {
  const query = `SELECT * FROM daily_closures WHERE date = date('now', 'localtime')`;
  db.get(query, [], (err, row) => {
    if (err) return res.status(500).json({ message: 'Error al consultar cierre de hoy' });
    res.json(row || null);
  });
};

exports.getClosureHistory = (req, res) => {
  const query = `SELECT * FROM daily_closures ORDER BY date DESC LIMIT 30`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error al obtener historial de cierres' });
    res.json(rows || []);
  });
};

exports.performDailyClosure = (req, res) => {
  // Primero revisamos si ya se hizo el cierre hoy
  const checkQuery = `SELECT id FROM daily_closures WHERE date = date('now', 'localtime')`;
  
  db.get(checkQuery, [], (err, row) => {
    if (err) return res.status(500).json({ message: 'Error en la base de datos' });
    if (row) return res.status(400).json({ message: 'El cierre diario ya fue realizado el día de hoy' });

    // Calculamos los totales del día
    const sumQuery = `
      SELECT 
        IFNULL(SUM(total_revenue), 0) as total_revenue,
        IFNULL(SUM(total_cost), 0) as total_cost,
        IFNULL(SUM(gross_profit), 0) as gross_profit
      FROM sales 
      WHERE date(created_at, 'localtime') = date('now', 'localtime')
    `;

    db.get(sumQuery, [], (err, totals) => {
      if (err) return res.status(500).json({ message: 'Error al calcular totales del día' });

      // Calcular sugerencias (80% reinversión, 20% retiro de la ganancia bruta)
      const reinvestment = totals.gross_profit * 0.80;
      const withdrawal = totals.gross_profit * 0.20;

      // Insertamos el cierre
      const insertQuery = `
        INSERT INTO daily_closures (date, total_revenue, total_cost, gross_profit, suggested_withdrawal, suggested_reinvestment)
        VALUES (date('now', 'localtime'), ?, ?, ?, ?, ?)
      `;

      db.run(insertQuery, [totals.total_revenue, totals.total_cost, totals.gross_profit, withdrawal, reinvestment], function(err) {
        if (err) return res.status(500).json({ message: 'Error al guardar el cierre diario' });
        
        // Disparar envío de correo mediante Python si la petición viene del frontend
        if (!req.headers['x-from-python']) {
          const { spawn } = require('child_process');
          const path = require('path');
          const scriptPath = path.resolve(__dirname, '../../../automation/scripts/daily_closure.py');
          const proc = spawn('python', [scriptPath]);
          proc.stdout.on('data', (d) => console.log(`[Python Closure Notifier] ${d}`));
          proc.stderr.on('data', (d) => console.error(`[Python Closure Error] ${d}`));
        }

        res.json({
          message: 'Cierre diario completado con éxito',
          closure_id: this.lastID,
          totals,
          suggestions: {
            withdrawal,
            reinvestment
          }
        });
      });
    });
  });
};

exports.getSetting = (req, res) => {
  const { key } = req.params;
  const query = `SELECT value FROM settings WHERE key = ?`;
  db.get(query, [key], (err, row) => {
    if (err) return res.status(500).json({ message: 'Error al obtener configuración' });
    if (!row) return res.status(404).json({ message: 'Configuración no encontrada' });
    res.json({ key, value: row.value });
  });
};

exports.updateSetting = (req, res) => {
  const { key, value } = req.body;
  const query = `
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `;
  db.run(query, [key, value], function(err) {
    if (err) return res.status(500).json({ message: 'Error al guardar configuración' });
    res.json({ message: 'Configuración guardada exitosamente' });
  });
};
