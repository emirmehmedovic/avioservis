import { PrismaClient } from '@prisma/client';

// Custom MRN to check - adjust as needed
const MRN_TO_CHECK = 'BA1111111111111111';
const prisma = new PrismaClient();

async function logTable(label: string, data: any) {
  console.log(`\n===== ${label} =====`);
  console.table(data);
}

async function main() {
  try {
    console.log(`\n[SEARCH] Checking data for MRN: ${MRN_TO_CHECK}`);
    
    // First, get the IDs of TankFuelByCustoms and MobileTankCustoms records for our MRN
    const tankFuelByCustoms = await prisma.tankFuelByCustoms.findMany({
      where: { customs_declaration_number: MRN_TO_CHECK }
    });
    console.log(`\n[OK] TankFuelByCustoms records: ${tankFuelByCustoms.length}`);
    
    if (tankFuelByCustoms.length > 0) {
      logTable('TankFuelByCustoms Records', tankFuelByCustoms.map(r => ({
        id: r.id,
        fixed_tank_id: r.fixed_tank_id,
        remaining_kg: r.remaining_quantity_kg?.toString() || '0',
        remaining_liters: r.remaining_quantity_liters?.toString() || '0',
        date: r.date_added
      })));
    }
    
    const mobileTankCustoms = await prisma.mobileTankCustoms.findMany({
      where: { customs_declaration_number: MRN_TO_CHECK }
    });
    console.log(`\n[OK] MobileTankCustoms records: ${mobileTankCustoms.length}`);
    
    if (mobileTankCustoms.length > 0) {
      logTable('MobileTankCustoms Records', mobileTankCustoms.map(r => ({
        id: r.id,
        mobile_tank_id: r.mobile_tank_id,
        remaining_kg: r.remaining_quantity_kg?.toString() || '0',
        remaining_liters: r.remaining_quantity_liters?.toString() || '0',
        date: r.date_added
      })));
    }
    
    // Build IDs for transaction leg query
    const tankCustomsIds = tankFuelByCustoms.map(r => r.id);
    const mobileTankCustomsIds = mobileTankCustoms.map(r => r.id);
    
    // If we have no records, nothing to check further
    if (tankCustomsIds.length === 0 && mobileTankCustomsIds.length === 0) {
      console.log(`\n[ERROR] No customs records found for MRN ${MRN_TO_CHECK}. Cannot check transaction legs.`);
      return;
    }
    
    // Prepare the query conditions
    const whereConditions = [];
    if (tankCustomsIds.length > 0) {
      whereConditions.push({ tankFuelByCustomsId: { in: tankCustomsIds } });
    }
    if (mobileTankCustomsIds.length > 0) {
      whereConditions.push({ mobileTankCustomsId: { in: mobileTankCustomsIds } });
    }
    
    // Get all MrnTransactionLegs linked to these records
    const transactionLegs = await prisma.mrnTransactionLeg.findMany({
      where: { OR: whereConditions },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log(`\n[OK] MrnTransactionLegs found: ${transactionLegs.length}`);
    
    // Show transaction legs by type
    const legsByType = transactionLegs.reduce((acc, leg) => {
      acc[leg.transactionType] = (acc[leg.transactionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n[INFO] Transaction legs by type:');
    console.table(legsByType);
    
    // Check which transaction legs have relatedTransactionId set
    const legsWithRelatedTransactions = transactionLegs.filter(leg => leg.relatedTransactionId !== null);
    console.log(`\n[INFO] Legs with relatedTransactionId set: ${legsWithRelatedTransactions.length} of ${transactionLegs.length}`);
    
    // Show summary of all transaction legs
    console.log('\n[INFO] Summary of all transaction legs:');
    console.table(transactionLegs.map(leg => ({
      id: leg.id,
      type: leg.transactionType,
      tankId: leg.tankFuelByCustomsId || '-',
      mobileTankId: leg.mobileTankCustomsId || '-',
      kgTransacted: leg.kgTransacted.toString(),
      litersTransacted: leg.litersTransactedActual.toString(),
      relatedId: leg.relatedTransactionId || 'null',
      timestamp: leg.timestamp
    })));
    
    // For each leg with relatedTransactionId, check if the FuelingOperation exists
    console.log('\n[SEARCH] Checking related FuelingOperations...');
    
    const operationResults = [];
    
    for (const leg of legsWithRelatedTransactions) {
      try {
        const relatedId = leg.relatedTransactionId!;
        const parsedId = parseInt(relatedId, 10);
        
        if (isNaN(parsedId)) {
          operationResults.push({
            leg_id: leg.id,
            leg_type: leg.transactionType,
            related_id: relatedId,
            status: 'ERROR: Invalid ID format',
            details: 'Not a valid integer'
          });
          continue;
        }
        
        const fuelingOperation = await prisma.fuelingOperation.findUnique({
          where: { id: parsedId },
          select: { 
            id: true, 
            aircraft_registration: true, 
            dateTime: true,
            quantity_liters: true,
            quantity_kg: true
          }
        });
        
        operationResults.push({
          leg_id: leg.id,
          leg_type: leg.transactionType,
          related_id: relatedId,
          status: fuelingOperation ? 'FOUND' : 'NOT FOUND',
          details: fuelingOperation ? 
            `Aircraft: ${fuelingOperation.aircraft_registration || 'N/A'}, Date: ${fuelingOperation.dateTime.toISOString()}` : 'No operation with this ID'
        });
        
      } catch (error) {
        operationResults.push({
          leg_id: leg.id,
          leg_type: leg.transactionType,
          related_id: leg.relatedTransactionId,
          status: 'ERROR',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    if (operationResults.length > 0) {
      console.log('\n[INFO] Related FuelingOperation check results:');
      console.table(operationResults);
    } else {
      console.log('\n[WARNING] No transaction legs with relatedTransactionId to check');
    }
    
    console.log('\n[OK] Database check completed successfully');
  } catch (error) {
    console.error('\n[ERROR] Error during database check:', error);
  }
}

// Run the main function and ensure proper cleanup
main()
  .then(async () => {
    console.log('\n[INFO] Disconnecting from database...');
    await prisma.$disconnect();
    console.log('[OK] Database connection closed');
  })
  .catch(async (e) => {
    console.error('\n[ERROR] Fatal error:', e);
    try {
      await prisma.$disconnect();
      console.log('[OK] Database connection closed after error');
    } catch (disconnectError) {
      console.error('[ERROR] Error while disconnecting:', disconnectError);
    }
    // Add a delay to ensure all logs are printed
    await new Promise(resolve => setTimeout(resolve, 500));
    process.exit(1);
  });
