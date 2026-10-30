const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { authenticate, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create product - ADMIN only
router.post("/", authenticate, requireAdmin, createProduct);

// Get all products - Public
router.get("/", getProducts);

// Get product by ID - Public
router.get("/:pid", getProductById);

// Update product - ADMIN only
router.put("/:pid", authenticate, requireAdmin, updateProduct);

// Delete product - ADMIN only
router.delete("/:pid", authenticate, requireAdmin, deleteProduct);

module.exports = router;
