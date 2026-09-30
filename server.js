require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3001);

app.use(express.json());
async function authenticate(req, res, next) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer (\S+)$/i);

  if (!match) {
    return res.status(401).json({
      message: "Authentication token is required",
    });
  }

  let payload;

  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!Number.isInteger(payload.uid) || payload.uid <= 0) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { uid: payload.uid },
      select: {
        uid: true,
        username: true,
        fullname: true,
        role: { select: { rolename: true } },
        membership: { select: { mname: true } },
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication failed:", error.message);

    return res.status(500).json({
      message: "Authentication failed",
    });
  }
}
function requireAdmin(req, res, next) {
  if (req.user.role.rolename !== "ADMIN") {
    return res.status(403).json({
      message: "Admin access is required",
    });
  }

  return next();
}
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

app.post("/auth/register", async (req, res) => {
  const { username, fullname, password } = req.body || {};

  if (
    typeof username !== "string" ||
    username.trim().length < 3 ||
    username.trim().length > 50 ||
    typeof fullname !== "string" ||
    fullname.trim().length === 0 ||
    fullname.trim().length > 100 ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message:
        "Username must be 3–50 characters, fullname 1–100 characters, password at least 8 characters and at most 72 bytes.",
    });
  }

  try {
    const role = await prisma.role.findFirst({
      where: { rolename: "CUSTOMER" },
    });

    const membership = await prisma.memberShip.findFirst({
      where: { mname: "BASIC" },
    });

    if (!role || !membership) {
      return res.status(500).json({
        message: "Default account data is missing.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        fullname: fullname.trim(),
        password: hashedPassword,
        roleid: role.roleid,
        mid: membership.mid,
      },
      select: {
        uid: true,
        username: true,
        fullname: true,
        role: {
          select: { rolename: true },
        },
        membership: {
          select: { mname: true },
        },
      },
    });

    return res.status(201).json({
      message: "Registered successfully",
      user,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      message: "Registration failed",
    });
  }
});
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (
    typeof username !== "string" ||
    !username.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({
      message: "Username and password are required",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign({ uid: user.uid }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return res.status(200).json({
      message: "Logged in successfully",
      token,
      user: {
        uid: user.uid,
        username: user.username,
        fullname: user.fullname,
        role: user.role.rolename,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      message: "Login failed",
    });
  }
});
app.get("/auth/me", authenticate, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});
app.get("/admin/check", authenticate, requireAdmin, (req, res) => {
  return res.status(200).json({
    message: "Admin access granted",
  });
});
app.post("/products", authenticate, requireAdmin, async (req, res) => {
  const { pname, price, quantity } = req.body || {};
  const priceText =
    typeof price === "number" || typeof price === "string" ? String(price) : "";

  if (
    typeof pname !== "string" ||
    !pname.trim() ||
    pname.trim().length > 100 ||
    !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(priceText) ||
    Number(priceText) <= 0 ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 2147483647
  ) {
    return res.status(400).json({
      message:
        "Product name is required (max 100 characters), price must be positive (max 8 integer digits and 2 decimal places), quantity must be a non-negative integer.",
    });
  }

  try {
    const product = await prisma.product.create({
      data: {
        pname: pname.trim(),
        price: priceText,
        quantity,
      },
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product failed:", error.message);

    return res.status(500).json({
      message: "Create product failed",
    });
  }
});

app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { pid: "asc" },
    });

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Get products failed:", error.message);

    return res.status(500).json({
      message: "Get products failed",
    });
  }
});
function parseProductId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const pid = Number(value);
  return Number.isInteger(pid) && pid <= 2147483647 ? pid : null;
}

app.get("/products/:pid", async (req, res) => {
  const pid = parseProductId(req.params.pid);

  if (pid === null) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { pid },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.error("Get product failed:", error.message);
    return res.status(500).json({ message: "Get product failed" });
  }
});

app.put("/products/:pid", authenticate, requireAdmin, async (req, res) => {
  const pid = parseProductId(req.params.pid);
  const { pname, price, quantity } = req.body || {};
  const priceText =
    typeof price === "number" || typeof price === "string" ? String(price) : "";

  if (pid === null) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  if (
    typeof pname !== "string" ||
    !pname.trim() ||
    pname.trim().length > 100 ||
    !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(priceText) ||
    Number(priceText) <= 0 ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 2147483647
  ) {
    return res.status(400).json({
      message: "Invalid product name, price or quantity",
    });
  }

  try {
    const product = await prisma.product.update({
      where: { pid },
      data: {
        pname: pname.trim(),
        price: priceText,
        quantity,
      },
    });

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }

    console.error("Update product failed:", error.message);
    return res.status(500).json({ message: "Update product failed" });
  }
});

app.delete("/products/:pid", authenticate, requireAdmin, async (req, res) => {
  const pid = parseProductId(req.params.pid);

  if (pid === null) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    await prisma.product.delete({ where: { pid } });
    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }

    if (error.code === "P2003") {
      return res.status(409).json({
        message: "Cannot delete a product referenced by an order",
      });
    }

    console.error("Delete product failed:", error.message);
    return res.status(500).json({ message: "Delete product failed" });
  }
});
app.post("/orders", authenticate, async (req, res) => {
  const { items } = req.body || {};

  // Mỗi đơn có từ 1 đến 100 sản phẩm.
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return res.status(400).json({
      message: "Items must contain between 1 and 100 products",
    });
  }

  const validItems = items.every(
    (item) =>
      item &&
      Number.isInteger(item.pid) &&
      item.pid > 0 &&
      item.pid <= 2147483647 &&
      Number.isInteger(item.qty) &&
      item.qty > 0 &&
      item.qty <= 2147483647,
  );

  if (!validItems) {
    return res.status(400).json({
      message: "Product ID and quantity must be positive integers",
    });
  }

  const productIds = items.map((item) => item.pid);

  if (new Set(productIds).size !== productIds.length) {
    return res.status(400).json({
      message: "Each product must appear only once",
    });
  }

  // Xử lý sản phẩm theo cùng thứ tự khi có nhiều đơn đồng thời.
  const sortedItems = [...items].sort((a, b) => a.pid - b.pid);

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const details = [];

        for (const item of sortedItems) {
          const product = await tx.product.findUnique({
            where: { pid: item.pid },
          });

          if (!product) {
            const error = new Error(`Product ${item.pid} not found`);
            error.status = 404;
            throw error;
          }

          const updated = await tx.product.updateMany({
            where: {
              pid: item.pid,
              quantity: { gte: item.qty },
            },
            data: {
              quantity: { decrement: item.qty },
            },
          });

          if (updated.count === 0) {
            const error = new Error(
              `Insufficient stock for product ${item.pid}`,
            );
            error.status = 409;
            throw error;
          }

          details.push({
            pid: item.pid,
            qty: item.qty,
            unit_price: product.price,
          });
        }

        return tx.order.create({
          data: {
            // Lấy khách hàng từ JWT đã xác thực.
            uid: req.user.uid,
            orderDetails: {
              create: details,
            },
          },
          include: {
            orderDetails: true,
          },
        });
      },
      {
        isolationLevel: "Serializable",
        timeout: 10000,
      },
    );

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    if (error.status === 404 || error.status === 409) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    if (error.code === "P2034") {
      return res.status(409).json({
        message: "Order conflict. Please try again.",
      });
    }

    console.error("Order creation failed:", error.message);

    return res.status(500).json({
      message: "Order creation failed",
    });
  }
});
app.get("/orders", authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role.rolename === "ADMIN";

    const orders = await prisma.order.findMany({
      where: isAdmin ? {} : { uid: req.user.uid },
      orderBy: { oid: "desc" },
      include: {
        orderDetails: {
          include: {
            product: {
              select: {
                pid: true,
                pname: true,
              },
            },
          },
        },
        shipments: true,
      },
    });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Fetching orders failed:", error.message);

    return res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
});

app.get("/orders/:oid", authenticate, async (req, res) => {
  const oidText = req.params.oid;
  const oid = Number(oidText);

  if (
    !/^[1-9]\d*$/.test(oidText) ||
    !Number.isInteger(oid) ||
    oid > 2147483647
  ) {
    return res.status(400).json({
      message: "Invalid order ID",
    });
  }

  try {
    const isAdmin = req.user.role.rolename === "ADMIN";

    const order = await prisma.order.findFirst({
      where: {
        oid,
        ...(isAdmin ? {} : { uid: req.user.uid }),
      },
      include: {
        orderDetails: {
          include: {
            product: {
              select: {
                pid: true,
                pname: true,
              },
            },
          },
        },
        shipments: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Fetching order failed:", error.message);

    return res.status(500).json({
      message: "Failed to fetch order",
    });
  }
});
app.post("/shipments", authenticate, requireAdmin, async (req, res) => {
  const { oid } = req.body || {};

  if (!Number.isInteger(oid) || oid <= 0 || oid > 2147483647) {
    return res.status(400).json({
      message: "Invalid order ID",
    });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { oid },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const shipment = await prisma.shipment.create({
      data: {
        oid,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      message: "Shipment created successfully",
      shipment,
    });
  } catch (error) {
    console.error("Creating shipment failed:", error.message);

    return res.status(500).json({
      message: "Failed to create shipment",
    });
  }
});

app.patch(
  "/shipments/:shipid",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const idText = req.params.shipid;
    const shipid = Number(idText);
    const { status } = req.body || {};

    if (
      !/^[1-9]\d*$/.test(idText) ||
      !Number.isInteger(shipid) ||
      shipid > 2147483647
    ) {
      return res.status(400).json({
        message: "Invalid shipment ID",
      });
    }

    const allowedStatuses = ["PENDING", "SHIPPING", "DELIVERED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid shipment status",
      });
    }

    try {
      const shipment = await prisma.shipment.update({
        where: { shipid },
        data: { status },
      });

      return res.status(200).json({
        message: "Shipment updated successfully",
        shipment,
      });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Shipment not found",
        });
      }

      console.error("Updating shipment failed:", error.message);

      return res.status(500).json({
        message: "Failed to update shipment",
      });
    }
  },
);
app.listen(port, "0.0.0.0", () => {
  console.log(`API running at http://localhost:${port}`);
});
