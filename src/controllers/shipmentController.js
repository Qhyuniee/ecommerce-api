const prisma = require("../lib/prisma");

async function createShipment(req, res) {
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
}

async function updateShipment(req, res) {
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
}

module.exports = {
  createShipment,
  updateShipment,
};
