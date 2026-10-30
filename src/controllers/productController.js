const prisma = require("../lib/prisma");

function parseProductId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const pid = Number(value);
  return Number.isInteger(pid) && pid <= 2147483647 ? pid : null;
}

async function createProduct(req, res) {
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
}

async function getProducts(req, res) {
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
}

async function getProductById(req, res) {
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
}

async function updateProduct(req, res) {
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
}

async function deleteProduct(req, res) {
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
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
