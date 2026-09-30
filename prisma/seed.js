require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  for (const rolename of ["ADMIN", "CUSTOMER"]) {
    const existing = await prisma.role.findFirst({
      where: { rolename },
    });

    if (!existing) {
      await prisma.role.create({
        data: { rolename },
      });
    }
  }

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
