import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVehicles() {
  try {
    console.log('Checking vehicles in database...');
    
    const vehicles = await prisma.vehicle.findMany({
      include: {
        company: true,
        location: true
      }
    });
    
    console.log(`Found ${vehicles.length} vehicles:`);
    
    vehicles.forEach((vehicle, index) => {
      console.log(`\n--- Vehicle ${index + 1} ---`);
      console.log(`ID: ${vehicle.id}`);
      console.log(`Name: ${vehicle.vehicle_name}`);
      console.log(`License Plate: ${vehicle.license_plate}`);
      console.log(`Chassis Number: ${vehicle.chassis_number || 'NULL'}`);
      console.log(`Vessel Plate No: ${vehicle.vessel_plate_no || 'NULL'}`);
      console.log(`Euro Norm: ${vehicle.euro_norm || 'NULL'}`);
      console.log(`Flow Rate: ${vehicle.flow_rate || 'NULL'}`);
      console.log(`Vehicle Type: ${vehicle.vehicle_type || 'NULL'}`);
      console.log(`Year of Manufacture: ${vehicle.year_of_manufacture || 'NULL'}`);
      console.log(`Company: ${vehicle.company?.name || 'NULL'}`);
      console.log(`Location: ${vehicle.location?.name || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error checking vehicles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVehicles(); 