const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

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

module.exports = { authenticate, requireAdmin };
