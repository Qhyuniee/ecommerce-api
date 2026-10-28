require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Tạo các vai trò mặc định nếu chưa tồn tại
  for (const rolename of ["ADMIN", "CUSTOMER", "normal"]) {
    const existing = await prisma.role.findFirst({
      where: { rolename },
    });

    if (!existing) {
      await prisma.role.create({
        data: { rolename },
      });
    }
  }

  // Tạo membership BASIC cho dữ liệu cũ
  const basic = await prisma.memberShip.findFirst({
    where: { mname: "BASIC" },
  });

  if (!basic) {
    await prisma.memberShip.create({
      data: {
        mname: "BASIC",
        score: 0,
      },
    });
  }

  // Tạo membership NORMAL với score = 10
  const normal = await prisma.memberShip.findFirst({
    where: { mname: "NORMAL" },
  });

  if (!normal) {
    await prisma.memberShip.create({
      data: {
        mname: "NORMAL",
        score: 10,
      },
    });
  } else if (normal.score !== 10) {
    await prisma.memberShip.update({
      where: { mid: normal.mid },
      data: { score: 10 },
    });
  }

  console.log("Seed completed");

  console.table(await prisma.role.findMany());
  console.table(await prisma.memberShip.findMany());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
