import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

async function testManualDispatch() {
  try {
    console.log('🧪 Testing manual dispatch functionality...\n');

    const tz = process.env.TZ || 'Europe/Sarajevo';
    const today = dayjs().tz(tz).toDate();
    const todayStr = dayjs(today).format('YYYY-MM-DD');

    console.log(`📅 Testing dispatch for: ${todayStr}`);
    console.log(`🌍 Timezone: ${tz}`);

    // Check if there are operations for today
    const todayOperations = await prisma.fuelingOperation.findMany({
      where: {
        dateTime: {
          gte: dayjs(today).startOf('day').toDate(),
          lte: dayjs(today).endOf('day').toDate()
        },
        is_deleted: false
      },
      include: {
        airline: {
          select: { name: true }
        }
      }
    });

    console.log(`\n✈️ Found ${todayOperations.length} operations for today:`);
    
    if (todayOperations.length === 0) {
      console.log('❌ No operations found for today - nothing to dispatch');
      return;
    }

    todayOperations.forEach((op, index) => {
      console.log(`${index + 1}. ${op.airline.name} - ${op.destination} (${op.quantity_liters}L)`);
    });

    // Test XML dispatch
    console.log('\n📄 Testing XML invoice dispatch...');
    
    try {
      const { dispatchDay } = await import('../src/services/xmlInvoiceDispatch.service');
      
      console.log('✅ XML dispatch service imported successfully');
      
      const xmlResult = await dispatchDay(today);
      console.log(`✅ XML dispatch completed: ${xmlResult.total} operations processed`);
      
      if (xmlResult.total > 0) {
        console.log('📊 XML dispatch results:');
        xmlResult.results.forEach((result: any, index: number) => {
          console.log(`  ${index + 1}. Operation ${result.opId}: ${result.success ? '✅ Success' : '❌ Failed'}`);
          if (!result.success && result.error) {
            console.log(`     Error: ${result.error}`);
          }
        });
      }
      
    } catch (error) {
      console.error('❌ XML dispatch test failed:', error);
    }

    // Test Email dispatch
    console.log('\n📧 Testing Email invoice dispatch...');
    
    try {
      const { dispatchEmailRange } = await import('../src/services/emailInvoiceDispatch.service');
      
      console.log('✅ Email dispatch service imported successfully');
      
      const emailResult = await dispatchEmailRange(today, today);
      console.log(`✅ Email dispatch completed: ${emailResult.total} operations processed`);
      
      if (emailResult.total > 0) {
        console.log('📊 Email dispatch results:');
        emailResult.days.forEach((day: any) => {
          console.log(`  Day ${day.date}: ${day.operations} operations`);
          day.results.forEach((result: any, index: number) => {
            console.log(`    ${index + 1}. Operation ${result.opId}: ${result.success ? '✅ Success' : '❌ Failed'}`);
            if (!result.success && result.error) {
              console.log(`       Error: ${result.error}`);
            }
          });
        });
      }
      
    } catch (error) {
      console.error('❌ Email dispatch test failed:', error);
    }

    // Check dispatch records
    console.log('\n📊 Checking dispatch records...');
    
    const xmlDispatches = await prisma.xmlInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: dayjs(today).startOf('day').toDate(),
          lte: dayjs(today).endOf('day').toDate()
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📄 XML dispatches created: ${xmlDispatches.length}`);
    xmlDispatches.forEach((dispatch, index) => {
      console.log(`  ${index + 1}. Operation ${dispatch.fuelingOperationId}: ${dispatch.status} (${dispatch.attempts} attempts)`);
    });

    const emailDispatches = await prisma.emailInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: dayjs(today).startOf('day').toDate(),
          lte: dayjs(today).endOf('day').toDate()
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📧 Email dispatches created: ${emailDispatches.length}`);
    emailDispatches.forEach((dispatch, index) => {
      console.log(`  ${index + 1}. Operation ${dispatch.fuelingOperationId}: ${dispatch.status} (${dispatch.attempts} attempts)`);
    });

    console.log('\n✅ Manual dispatch test completed!');

  } catch (error) {
    console.error('❌ Manual dispatch test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testManualDispatch();
