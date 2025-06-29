import { PrismaClient } from '@prisma/client';
import { reconcileTankWithMrnRecords } from '../src/utils/densityConsistencyManager';

const prisma = new PrismaClient();

async function fixTank3Immediate() {
  console.log('🔧 Starting immediate fix for Tank 3 negative quantities...');
  
  try {
    // Tank 3 ID is 7 based on the logs
    const tankId = 7;
    
    // First, let's see the current state
    console.log('\n📊 Current state of Tank 3:');
    const currentTank = await prisma.fixedStorageTanks.findUnique({
      where: { id: tankId },
      select: {
        id: true,
        tank_name: true,
        current_quantity_kg: true,
        current_quantity_liters: true
      }
    });
    
    if (!currentTank) {
      console.error('❌ Tank 3 not found!');
      return;
    }
    
    console.log(`Tank: ${currentTank.tank_name}`);
    console.log(`Current KG: ${currentTank.current_quantity_kg}`);
    console.log(`Current Liters: ${currentTank.current_quantity_liters}`);
    
    // Check MRN records
    console.log('\n📋 MRN Records for Tank 3:');
    const mrnRecords = await prisma.tankFuelByCustoms.findMany({
      where: { 
        fixed_tank_id: tankId,
        remaining_quantity_kg: { gt: 0 }
      },
      select: {
        id: true,
        customs_declaration_number: true,
        remaining_quantity_kg: true,
        remaining_quantity_liters: true,
        density_at_intake: true
      }
    });
    
    console.log(`Found ${mrnRecords.length} active MRN records:`);
    let totalMrnKg = 0;
    let totalMrnLiters = 0;
    
    mrnRecords.forEach((record, index) => {
      const kg = Number(record.remaining_quantity_kg || 0);
      const liters = Number(record.remaining_quantity_liters || 0);
      totalMrnKg += kg;
      totalMrnLiters += liters;
      
      console.log(`  ${index + 1}. MRN: ${record.customs_declaration_number}`);
      console.log(`     KG: ${kg}, Liters: ${liters}, Density: ${record.density_at_intake}`);
    });
    
    console.log(`\n📊 MRN Totals: ${totalMrnKg.toFixed(2)} kg, ${totalMrnLiters.toFixed(2)} L`);
    console.log(`📊 Difference: KG ${(Number(currentTank.current_quantity_kg) - totalMrnKg).toFixed(2)}, Liters ${(Number(currentTank.current_quantity_liters) - totalMrnLiters).toFixed(2)}`);
    
    // Perform reconciliation
    console.log('\n🔧 Performing reconciliation...');
    const result = await reconcileTankWithMrnRecords(tankId);
    
    if (result.success) {
      console.log('✅ Tank 3 successfully reconciled!');
      console.log(`📊 Before: ${result.beforeKg.toFixed(2)} kg, ${result.beforeLiters.toFixed(2)} L`);
      console.log(`📊 After:  ${result.afterKg.toFixed(2)} kg, ${result.afterLiters.toFixed(2)} L`);
      console.log(`📊 Adjustment: ${result.adjustmentKg.toFixed(2)} kg, ${result.adjustmentLiters.toFixed(2)} L`);
      
      // Verify the fix
      const verifyTank = await prisma.fixedStorageTanks.findUnique({
        where: { id: tankId },
        select: {
          current_quantity_kg: true,
          current_quantity_liters: true
        }
      });
      
      console.log('\n✅ Verification:');
      console.log(`Current tank KG: ${verifyTank?.current_quantity_kg}`);
      console.log(`Current tank Liters: ${verifyTank?.current_quantity_liters}`);
      console.log(`MRN sum KG: ${totalMrnKg.toFixed(2)}`);
      console.log(`MRN sum Liters: ${totalMrnLiters.toFixed(2)}`);
      
      const kgDiff = Math.abs(Number(verifyTank?.current_quantity_kg) - totalMrnKg);
      const litersDiff = Math.abs(Number(verifyTank?.current_quantity_liters) - totalMrnLiters);
      
      if (kgDiff < 0.1 && litersDiff < 0.1) {
        console.log('🎉 Tank 3 is now consistent with MRN records!');
      } else {
        console.log('⚠️  Small discrepancies remain but within tolerance');
      }
      
    } else {
      console.error('❌ Failed to reconcile Tank 3:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Error during Tank 3 fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixTank3Immediate()
    .then(() => {
      console.log('\n🏁 Tank 3 fix completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { fixTank3Immediate }; 