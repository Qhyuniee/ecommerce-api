require("dotenv").config();

const express = require("express");

const prisma = require("./src/lib/prisma");
const authRoutes = require("./src/routes/authRoutes");
const productRoutes = require("./src/routes/productRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const shipmentRoutes = require("./src/routes/shipmentRoutes");
const { checkAdmin } = require("./src/controllers/authController");
const {
  authenticate,
  requireAdmin,
} = require("./src/middlewares/authMiddleware");

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "healthy",
      service: "ecommerce-api",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(503).json({
      status: "unhealthy",
      service: "ecommerce-api",
      database: "disconnected",
    });
  }
});
app.use("/auth", authRoutes);

app.get("/admin/check", authenticate, requireAdmin, checkAdmin);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/shipments", shipmentRoutes);
app.listen(port, "0.0.0.0", () => {
  console.log(`API running at http://localhost:${port}`);
});
