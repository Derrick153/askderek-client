const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const property = await prisma.property.findUnique({ where: { id: 12 } });
  const user = await prisma.user.findUnique({ where: { clerkId: "user_lease_real_email_test_1790870304016" } });

  console.log("PROPERTY:");
  console.log(JSON.stringify(property, null, 2));
  console.log("\nUSER:");
  console.log(JSON.stringify(user, null, 2));

  await prisma.$disconnect();
})();
