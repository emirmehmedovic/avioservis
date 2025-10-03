import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

async function testCronExecution() {
  try {
    console.log('🧪 Testing cron job execution...\n');

    const tz = process.env.TZ || 'Europe/Sarajevo';
    const now = dayjs().tz(tz);
    
    console.log(`⏰ Current time: ${now.format('YYYY-MM-DD HH:mm:ss')} (${tz})`);
    console.log(`📅 Date: ${now.format('dddd, MMMM Do YYYY')}`);

    // Test immediate cron execution
    console.log('\n🚀 Testing immediate cron execution...');
    
    let testCronExecuted = false;
    const testCron = cron.schedule('* * * * *', async () => {
      testCronExecuted = true;
      console.log('✅ Test cron job executed at:', new Date().toISOString());
      
      // Test database connection
      try {
        const count = await prisma.fuelingOperation.count();
        console.log(`📊 Database connection test: ${count} operations found`);
      } catch (error) {
        console.error('❌ Database connection test failed:', error);
      }
    }, { 
      scheduled: false,
      timezone: tz
    });

    console.log('⏳ Starting test cron job (will run every minute)...');
    testCron.start();

    // Wait for 2 minutes to see if cron executes
    console.log('⏳ Waiting for cron job to execute (2 minutes)...');
    
    for (let i = 0; i < 120; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (testCronExecuted) {
        console.log('✅ Test cron job executed successfully!');
        break;
      }
      
      if (i % 30 === 0 && i > 0) {
        console.log(`⏳ Still waiting... (${i}s elapsed)`);
      }
    }

    if (!testCronExecuted) {
      console.log('❌ Test cron job did not execute within 2 minutes');
    }

    testCron.destroy();

    // Test scheduled cron jobs
    console.log('\n📅 Testing scheduled cron jobs...');
    
    // Test email invoice cron (23:50)
    const emailCronTime = dayjs().hour(23).minute(50).second(0);
    const timeToEmailCron = emailCronTime.diff(now, 'minutes');
    
    console.log(`📧 Email invoice cron scheduled for: ${emailCronTime.format('HH:mm:ss')}`);
    console.log(`⏰ Time to email cron: ${timeToEmailCron} minutes`);
    
    if (timeToEmailCron < 0) {
      console.log('✅ Email cron time has passed today');
    } else if (timeToEmailCron < 60) {
      console.log('⚠️  Email cron time is approaching (less than 1 hour)');
    } else {
      console.log('⏳ Email cron time is far away');
    }

    // Test XML invoice cron (23:55)
    const xmlCronTime = dayjs().hour(23).minute(55).second(0);
    const timeToXmlCron = xmlCronTime.diff(now, 'minutes');
    
    console.log(`📄 XML invoice cron scheduled for: ${xmlCronTime.format('HH:mm:ss')}`);
    console.log(`⏰ Time to XML cron: ${timeToXmlCron} minutes`);
    
    if (timeToXmlCron < 0) {
      console.log('✅ XML cron time has passed today');
    } else if (timeToXmlCron < 60) {
      console.log('⚠️  XML cron time is approaching (less than 1 hour)');
    } else {
      console.log('⏳ XML cron time is far away');
    }

    // Test payment status cron (06:00)
    const paymentCronTime = dayjs().hour(6).minute(0).second(0);
    const timeToPaymentCron = paymentCronTime.diff(now, 'minutes');
    
    console.log(`💰 Payment status cron scheduled for: ${paymentCronTime.format('HH:mm:ss')}`);
    console.log(`⏰ Time to payment cron: ${timeToPaymentCron} minutes`);
    
    if (timeToPaymentCron < 0) {
      console.log('✅ Payment cron time has passed today');
    } else if (timeToPaymentCron < 60) {
      console.log('⚠️  Payment cron time is approaching (less than 1 hour)');
    } else {
      console.log('⏳ Payment cron time is far away');
    }

    // Test expiration notification cron (05:00)
    const expirationCronTime = dayjs().hour(5).minute(0).second(0);
    const timeToExpirationCron = expirationCronTime.diff(now, 'minutes');
    
    console.log(`🔔 Expiration notification cron scheduled for: ${expirationCronTime.format('HH:mm:ss')}`);
    console.log(`⏰ Time to expiration cron: ${timeToExpirationCron} minutes`);
    
    if (timeToExpirationCron < 0) {
      console.log('✅ Expiration cron time has passed today');
    } else if (timeToExpirationCron < 60) {
      console.log('⚠️  Expiration cron time is approaching (less than 1 hour)');
    } else {
      console.log('⏳ Expiration cron time is far away');
    }

    // Check if there are operations that should trigger cron jobs
    const todayOperations = await prisma.fuelingOperation.findMany({
      where: {
        dateTime: {
          gte: dayjs().startOf('day').toDate(),
          lte: dayjs().endOf('day').toDate()
        },
        is_deleted: false
      },
      include: {
        airline: {
          select: { name: true }
        }
      }
    });

    console.log(`\n✈️ Operations for today: ${todayOperations.length}`);
    
    if (todayOperations.length > 0) {
      console.log('Operations that should trigger cron jobs:');
      todayOperations.forEach((op, index) => {
        console.log(`  ${index + 1}. [${dayjs(op.dateTime).format('HH:mm:ss')}] ${op.airline.name} - ${op.destination}`);
      });
    } else {
      console.log('❌ No operations for today - nothing to process');
    }

    // Check recent dispatches
    const recentXmlDispatches = await prisma.xmlInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: dayjs().startOf('day').toDate()
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const recentEmailDispatches = await prisma.emailInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: dayjs().startOf('day').toDate()
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📊 Dispatches for today:`);
    console.log(`  XML dispatches: ${recentXmlDispatches.length}`);
    console.log(`  Email dispatches: ${recentEmailDispatches.length}`);

    if (recentXmlDispatches.length > 0) {
      console.log('Recent XML dispatches:');
      recentXmlDispatches.forEach((dispatch, index) => {
        console.log(`  ${index + 1}. [${dayjs(dispatch.createdAt).format('HH:mm:ss')}] Operation ${dispatch.fuelingOperationId}: ${dispatch.status}`);
      });
    }

    if (recentEmailDispatches.length > 0) {
      console.log('Recent Email dispatches:');
      recentEmailDispatches.forEach((dispatch, index) => {
        console.log(`  ${index + 1}. [${dayjs(dispatch.createdAt).format('HH:mm:ss')}] Operation ${dispatch.fuelingOperationId}: ${dispatch.status}`);
      });
    }

    console.log('\n📋 SUMMARY:');
    
    if (testCronExecuted) {
      console.log('✅ Cron jobs are working correctly');
    } else {
      console.log('❌ Cron jobs are not working');
    }
    
    if (todayOperations.length > 0 && recentXmlDispatches.length === 0 && recentEmailDispatches.length === 0) {
      console.log('🚨 ISSUE: Operations exist but no dispatches created today');
    } else if (todayOperations.length === 0) {
      console.log('⚠️  WARNING: No operations for today');
    } else {
      console.log('✅ Operations and dispatches are in sync');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('1. If cron jobs are not working, check server startup logs');
    console.log('2. If operations exist but no dispatches, cron jobs may not be running');
    console.log('3. Test manual dispatch to verify functionality');
    console.log('4. Check server timezone settings');
    console.log('5. Verify that initAllCronJobs() is called in app.ts');

  } catch (error) {
    console.error('❌ Error testing cron execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCronExecution();
