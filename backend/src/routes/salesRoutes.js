const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Todas las rutas de ventas requieren estar logueado
router.post('/', verifyToken, salesController.createSale);
router.get('/today', verifyToken, salesController.getTodaySales);

module.exports = router;
