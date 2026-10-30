const express = require("express");

const {
  createOrder,
  getOrders,
  getOrderById,
} = require("../controllers/orderController");

const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create order - Login required
router.post("/", authenticate, createOrder);

// Get orders - Login required
router.get("/", authenticate, getOrders);

// Get order by ID - Login required
router.get("/:oid", authenticate, getOrderById);

module.exports = router;
