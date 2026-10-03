require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/config/db'); // Inicializa la conexión a SQLite y crea las tablas

const app = express();
const PORT = process.env.PORT || 5000;

// Importar rutas
const authRoutes = require('./src/routes/authRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const salesRoutes = require('./src/routes/salesRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

// Middlewares
app.use(cors());
app.use(express.json());

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Basic Route for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor POS funcionando correctamente.' });
});

// Start Server — listen on 0.0.0.0 so VS Code tunnels and LAN devices can connect
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT} (accesible desde la red)`);
});
