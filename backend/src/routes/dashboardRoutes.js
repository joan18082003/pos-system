const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

router.get('/report', verifyToken, verifyAdmin, dashboardController.getDailyReport);
router.get('/stagnant', verifyToken, verifyAdmin, dashboardController.getStagnantProducts);
router.get('/replenishment', verifyToken, verifyAdmin, dashboardController.getReplenishmentList);
router.get('/closure/today', verifyToken, verifyAdmin, dashboardController.getTodayClosure);
router.get('/closures', verifyToken, verifyAdmin, dashboardController.getClosureHistory);
router.post('/close-day', verifyToken, verifyAdmin, dashboardController.performDailyClosure);
router.get('/settings/:key', verifyToken, dashboardController.getSetting);
router.put('/settings', verifyToken, verifyAdmin, dashboardController.updateSetting);

module.exports = router;
