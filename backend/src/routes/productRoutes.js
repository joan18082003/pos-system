const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, checkInventoryPermission } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, productController.getAllProducts);
router.post('/', verifyToken, checkInventoryPermission, productController.createProduct);
router.delete('/:id', verifyToken, checkInventoryPermission, productController.deleteProduct);

module.exports = router;
