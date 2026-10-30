const express = require("express");

const {
  register,
  login,
  getMe,
  checkAdmin,
} = require("../controllers/authController");

const { authenticate, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);

module.exports = router;
