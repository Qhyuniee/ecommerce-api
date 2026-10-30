const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

async function register(req, res) {
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
      where: { rolename: "normal" },
    });

    const membership = await prisma.memberShip.findFirst({
      where: { mname: "NORMAL", score: 10 },
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
          select: {
            mname: true,
            score: true,
          },
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
}

async function login(req, res) {
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
}

function getMe(req, res) {
  return res.status(200).json({
    user: req.user,
  });
}

function checkAdmin(req, res) {
  return res.status(200).json({
    message: "Admin access granted",
  });
}

module.exports = {
  register,
  login,
  getMe,
  checkAdmin,
};
