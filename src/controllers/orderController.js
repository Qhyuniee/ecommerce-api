const prisma = require("../lib/prisma");

async function createOrder(req, res) {
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

            // Tạo chi tiết đơn hàng.
            orderDetails: {
              create: details,
            },

            // Tự động tạo Shipment khi đặt hàng.
            shipments: {
              create: {
                status: "PENDING",
              },
            },
          },

          include: {
            orderDetails: true,
            shipments: true,
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
}

async function getOrders(req, res) {
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
}

async function getOrderById(req, res) {
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
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
};
