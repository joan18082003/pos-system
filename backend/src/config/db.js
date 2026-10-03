const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crea el archivo de la base de datos en la carpeta backend
const dbPath = path.resolve(__dirname, '../../pos_database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Función para inicializar las tablas necesarias en el Sprint 1
const initDB = () => {
  db.serialize(() => {
    // 0. Tabla Users
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 0.1 Tabla Attendance
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        clock_in DATETIME NOT NULL,
        clock_out DATETIME,
        date DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 1. Tabla Categories
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT
      )
    `);

    // 2. Tabla Products
    // unit_type: 'unit' (unidades enteras), 'weight' (fracciones/peso)
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        sku TEXT UNIQUE,
        barcode TEXT UNIQUE,
        unit_type TEXT NOT NULL CHECK(unit_type IN ('unit', 'weight')),
        cost_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        current_stock REAL NOT NULL DEFAULT 0,
        min_stock_level REAL NOT NULL DEFAULT 0,
        last_sold_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )
    `);

    // 3. Tabla Sales (Cabecera de cada venta)
    db.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_revenue REAL NOT NULL,
        total_cost REAL NOT NULL,
        gross_profit REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 4. Tabla Sale Items (Detalle: qué producto y cuánto se vendió en cada venta)
    db.run(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        unit_cost REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // 5. Tabla Daily Closures
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_closures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE NOT NULL,
        total_revenue REAL NOT NULL,
        total_cost REAL NOT NULL,
        gross_profit REAL NOT NULL,
        suggested_withdrawal REAL NOT NULL,
        suggested_reinvestment REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Tabla Settings
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      )
    `);

    console.log('Tablas inicializadas correctamente.');
  });
};

initDB();

module.exports = db;
