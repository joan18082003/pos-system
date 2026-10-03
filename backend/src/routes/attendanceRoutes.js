const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Empleados marcan entrada/salida
router.post('/clock-in', verifyToken, attendanceController.clockIn);
router.post('/clock-out', verifyToken, attendanceController.clockOut);

// Solo el Admin puede ver los registros de asistencia de los empleados
router.get('/logs', verifyToken, verifyAdmin, attendanceController.getLogs);

module.exports = router;
