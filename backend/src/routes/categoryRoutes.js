const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Mapeamos las rutas (URLs) a las funciones del controlador
router.get('/', verifyToken, categoryController.getAllCategories);
router.post('/', verifyToken, categoryController.createCategory);
router.delete('/:id', verifyToken, categoryController.deleteCategory);

module.exports = router;
