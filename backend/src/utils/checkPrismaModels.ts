import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ova funkcija će ispisati sva imena modela dostupna u Prisma klijentu
async function checkPrismaModels() {
  console.log('Available Prisma models:');
  console.log(Object.keys(prisma));
}

checkPrismaModels()
  .then(() => console.log('Done'))
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
