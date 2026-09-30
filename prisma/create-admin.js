require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (
    !username ||
    !password ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error("Check ADMIN_USERNAME and ADMIN_PASSWORD in .env");
  }

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    throw new Error("Username already exists. Choose another ADMIN_USERNAME.");
  }

  const role = await prisma.role.findFirst({
    where: { rolename: "ADMIN" },
  });

  const membership = await prisma.memberShip.findFirst({
    where: { mname: "BASIC" },
  });

  if (!role || !membership) {
    throw new Error("Run prisma/seed.js first");
  }

  const user = await prisma.user.create({
    data: {
      username,
      fullname: "Administrator",
      password: await bcrypt.hash(password, 10),
      roleid: role.roleid,
      mid: membership.mid,
    },
    select: {
      uid: true,
      username: true,
      role: { select: { rolename: true } },
    },
  });

  console.log("Admin created successfully");
  console.log(user);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
