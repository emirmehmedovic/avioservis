import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Obriši postojeće usere
  console.log('🗑️  Deleting existing users...');
  await prisma.user.deleteMany({});

  // Kreiraj admin korisnika
  console.log('👨‍💼 Creating admin user...');
  const adminUser = await prisma.user.create({
    data: {
      username: 'emir.mehmedovic',
      passwordHash: '$2b$10$E7GnGW/e2AQ1JjgJm1jThuqWadnLdFBWnLgxo31TKwTi5BK6.Ewla', // 123456789EmIna
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:');
  console.log('   Username:', adminUser.username);
  console.log('   Password: 123456789EmIna');
  console.log('   Role:', adminUser.role);
  
  console.log('🎉 Seeding finished!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });