import { PrismaClient, Role, FixedTankStatus, VehicleStatus, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper function to generate random float between min and max
function randomFloat(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Helper function to generate random date in a specific month of 2025
function randomDateInMonth(month: number) {
  // Generate a random date in the specified month of 2025
  // Month is 0-based (0 = January, 1 = February, etc.)
  const daysInMonth = new Date(2025, month + 1, 0).getDate(); // Get number of days in the month
  const day = Math.floor(Math.random() * daysInMonth) + 1; // 1-daysInMonth
  const hour = Math.floor(Math.random() * 24); // 0-23
  const minute = Math.floor(Math.random() * 60); // 0-59
  
  return new Date(2025, month, day, hour, minute);
}

// Helper function for January 2025 (for backward compatibility)
function randomJanuaryDate() {
  return randomDateInMonth(0); // January is month 0
}

// Helper function to generate random flight number
function generateRandomFlightNumber() {
  const airlines = ['JA', 'LH', 'TK', 'FB', 'EK', 'BA', 'OS', 'SU', 'LX'];
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  
  return `${airline}${number}`;
}

// Helper function to generate random destination
function generateRandomDestination() {
  const destinations = [
    'Vienna', 'Istanbul', 'Munich', 'Zurich', 'Dubai', 'Frankfurt', 
    'Belgrade', 'Zagreb', 'London', 'Paris', 'Amsterdam', 'Rome', 'Madrid'
  ];
  
  return destinations[Math.floor(Math.random() * destinations.length)];
}

async function main() {
  console.log('Starting seed script...');

  // 1. Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('Seeded admin user:', { username: admin.username, password: 'admin123' });

  // Create fuel operator user
  const operatorPasswordHash = await bcrypt.hash('operator123', 10);
  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      passwordHash: operatorPasswordHash,
      role: 'FUEL_OPERATOR',
    },
  });
  console.log('Seeded operator user:', { username: operator.username, password: 'operator123' });

  // 2. Create airlines with destinations
  const airlines = [
    {
      name: 'Air Bosnia',
      isForeign: false,
      address: 'Sarajevo International Airport, Kurta Schorka 36',
      taxId: 'BA123456789',
      operatingDestinations: ['Vienna', 'Istanbul', 'Munich', 'Zurich', 'Dubai']
    },
    {
      name: 'Lufthansa',
      isForeign: true,
      address: 'Frankfurt Airport, 60547 Frankfurt am Main, Germany',
      taxId: 'DE987654321',
      operatingDestinations: ['Sarajevo', 'Belgrade', 'Zagreb', 'Vienna', 'Frankfurt']
    },
    {
      name: 'Turkish Airlines',
      isForeign: true,
      address: 'Istanbul Airport, Tayakadın, Terminal Caddesi No:1, 34283 Arnavutköy/İstanbul',
      taxId: 'TR123456789',
      operatingDestinations: ['Sarajevo', 'Belgrade', 'Zagreb', 'Vienna', 'Istanbul']
    },
    {
      name: 'FlyBosnia',
      isForeign: false,
      address: 'Sarajevo International Airport, Kurta Schorka 36',
      taxId: 'BA987654321',
      operatingDestinations: ['Vienna', 'Istanbul', 'Munich', 'Zurich', 'Dubai']
    },
    {
      name: 'Emirates',
      isForeign: true,
      address: 'Dubai International Airport, Dubai, UAE',
      taxId: 'AE123456789',
      operatingDestinations: ['Sarajevo', 'Belgrade', 'Zagreb', 'Vienna', 'Dubai']
    }
  ];

  for (const airlineData of airlines) {
    const airline = await prisma.airline.upsert({
      where: { name: airlineData.name },
      update: {},
      create: {
        name: airlineData.name,
        isForeign: airlineData.isForeign,
        address: airlineData.address,
        taxId: airlineData.taxId,
        operatingDestinations: airlineData.operatingDestinations
      }
    });
    console.log(`Created airline: ${airline.name}`);

    // Create price rules for each airline
    const currencies = ['BAM', 'EUR', 'USD'];
    for (const currency of currencies) {
      const basePrice = currency === 'BAM' ? 2.5 : (currency === 'EUR' ? 1.3 : 1.5);
      const priceVariation = randomFloat(-0.2, 0.3);
      
      await prisma.fuelPriceRule.upsert({
        where: {
          airlineId_currency: {
            airlineId: airline.id,
            currency: currency
          }
        },
        update: {},
        create: {
          airlineId: airline.id,
          price: basePrice + priceVariation,
          currency: currency
        }
      });
    }
    console.log(`Created price rules for ${airline.name}`);
  }

  // 3. Create fixed storage tanks (80,000L capacity)
  const fixedTanks = [
    {
      tank_name: 'Glavni Rezervoar 1',
      tank_identifier: 'FR-001',
      capacity_liters: 80000,
      fuel_type: 'JET A-1',
      current_quantity_liters: 24000, // 30% kapaciteta
      location_description: 'Sarajevo International Airport - Zona A',
      notes: 'Glavni rezervoar za JET A-1 gorivo',
      status: FixedTankStatus.ACTIVE
    },
    {
      tank_name: 'Glavni Rezervoar 2',
      tank_identifier: 'FR-002',
      capacity_liters: 80000,
      fuel_type: 'JET A-1',
      current_quantity_liters: 24000, // 30% kapaciteta
      location_description: 'Sarajevo International Airport - Zona A',
      notes: 'Rezervni rezervoar za JET A-1 gorivo',
      status: FixedTankStatus.ACTIVE
    },
    {
      tank_name: 'Glavni Rezervoar 3',
      tank_identifier: 'FR-003',
      capacity_liters: 80000,
      fuel_type: 'JET A-1',
      current_quantity_liters: 24000, // 30% kapaciteta
      location_description: 'Sarajevo International Airport - Zona B',
      notes: 'Dodatni rezervoar za JET A-1 gorivo',
      status: FixedTankStatus.ACTIVE
    }
  ];

  const createdFixedTanks = [];
  for (const tankData of fixedTanks) {
    const tank = await prisma.fixedStorageTanks.upsert({
      where: { tank_identifier: tankData.tank_identifier },
      update: {},
      create: tankData
    });
    createdFixedTanks.push(tank);
    console.log(`Created fixed tank: ${tank.tank_name} (${tank.tank_identifier}) with ${tank.current_quantity_liters}L`);
  }

  // 4. Create mobile tanker vehicles (37,500L capacity)
  // First, create a location
  const location = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Sarajevo International Airport',
      address: 'Kurta Schorka 36, Sarajevo'
    }
  });

  // Create a company
  const company = await prisma.company.upsert({
    where: { name: 'Avioservis d.o.o.' },
    update: {},
    create: {
      name: 'Avioservis d.o.o.',
      address: 'Kurta Schorka 36, Sarajevo',
      taxId: 'BA123456789',
      contactPersonName: 'Emir Mehmedović',
      contactPersonPhone: '+38761123456'
    }
  });

  const mobileTankers = [
    {
      vehicle_name: 'Cisterna 1',
      license_plate: 'A01-K-123',
      status: VehicleStatus.ACTIVE,
      kapacitet_cisterne: 37500,
      crijeva_za_tocenje: '2x HD38, 1x TW75',
      tip_filtera: 'EI-1583 Standard',
      filter_installed: true,
      companyId: company.id,
      locationId: location.id
    },
    {
      vehicle_name: 'Cisterna 2',
      license_plate: 'A01-K-456',
      status: VehicleStatus.ACTIVE,
      kapacitet_cisterne: 37500,
      crijeva_za_tocenje: '2x HD38, 1x TW75',
      tip_filtera: 'EI-1583 Standard',
      filter_installed: true,
      companyId: company.id,
      locationId: location.id
    }
  ];

  const createdMobileTankers = [];
  for (const tankerData of mobileTankers) {
    const tanker = await prisma.vehicle.upsert({
      where: { license_plate: tankerData.license_plate },
      update: {},
      create: tankerData
    });
    createdMobileTankers.push(tanker);
    console.log(`Created mobile tanker: ${tanker.vehicle_name} (${tanker.license_plate})`);

    // Create fuel tank for each vehicle with a unique identifier
    const capacity = tankerData.kapacitet_cisterne || 37500;
    
    const fuelTank = await prisma.fuelTank.create({
      data: {
        name: `Tank for ${tanker.vehicle_name}`,
        location: `Mobile tanker ${tanker.license_plate}`,
        identifier: `MT-${tanker.license_plate.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-5)}`, // Ensure uniqueness
        capacity_liters: capacity,
        current_liters: 0, // Start with empty tank
        fuel_type: 'JET A-1'
      }
    });
    console.log(`Created fuel tank for ${tanker.vehicle_name} with 0L initial fuel`);
  }

  // --- Monthly Fueling Operation Seeding (January - June) Removed As Per User Request ---
  
  console.log('Seed script completed successfully!');
}

main().catch(e => {
  console.error('Error in seed script:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());