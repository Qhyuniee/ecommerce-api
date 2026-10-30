const express = require("express");

const {
  createShipment,
  updateShipment,
} = require("../controllers/shipmentController");

const { authenticate, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create shipment - ADMIN only
router.post("/", authenticate, requireAdmin, createShipment);

// Update shipment status - ADMIN only
router.patch("/:shipid", authenticate, requireAdmin, updateShipment);

module.exports = router;
