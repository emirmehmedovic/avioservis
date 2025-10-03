import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';

const prisma = new PrismaClient();

async function checkCronInitialization() {
  try {
    console.log('🔍 Checking cron job initialization...\n');

    // Test if node-cron is working
    console.log('📅 Testing node-cron library...');
    
    let testCronExecuted = false;
    const testCron = cron.schedule('* * * * *', () => {
      testCronExecuted = true;
      console.log('✅ Test cron job executed');
    }, { scheduled: false });

    // Start test cron for 1 second
    testCron.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    testCron.destroy();

    if (testCronExecuted) {
      console.log('✅ node-cron library is working correctly');
    } else {
      console.log('❌ node-cron library is not working');
    }

    // Check environment variables
    console.log('\n🌍 Environment variables:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`TZ: ${process.env.TZ || 'not set'}`);
    console.log(`PORT: ${process.env.PORT || 'not set'}`);

    // Check current time
    const now = new Date();
    console.log(`\n⏰ Current time: ${now.toISOString()}`);
    console.log(`Local time: ${now.toLocaleString()}`);

    // Test cron job initialization
    console.log('\n🔧 Testing cron job initialization...');
    
    try {
      // Import cron initialization function
      const { initAllCronJobs } = await import('../src/cron');
      console.log('✅ Cron initialization function imported successfully');
      
      // Try to initialize cron jobs
      console.log('🚀 Initializing cron jobs...');
      initAllCronJobs();
      console.log('✅ Cron jobs initialized successfully');
      
    } catch (error) {
      console.error('❌ Cron job initialization failed:', error);
    }

    // Check if cron jobs are actually scheduled
    console.log('\n📊 Checking scheduled cron jobs...');
    
    // This is a bit tricky to check directly, but we can check if the functions exist
    try {
      const { initEmailInvoiceCron } = await import('../src/cron/emailInvoiceCron');
      console.log('✅ Email invoice cron function: Available');
    } catch (error) {
      console.log('❌ Email invoice cron function: Not available');
    }

    try {
      const { initWizzXmlInvoiceCron } = await import('../src/cron/wizzXmlInvoiceCron');
      console.log('✅ XML invoice cron function: Available');
    } catch (error) {
      console.log('❌ XML invoice cron function: Not available');
    }

    try {
      const { initPaymentStatusCron } = await import('../src/cron/paymentStatusCron');
      console.log('✅ Payment status cron function: Available');
    } catch (error) {
      console.log('❌ Payment status cron function: Not available');
    }

    try {
      const { initEmailPaymentStatusCron } = await import('../src/cron/emailPaymentStatusCron');
      console.log('✅ Email payment status cron function: Available');
    } catch (error) {
      console.log('❌ Email payment status cron function: Not available');
    }

    try {
      const { initExpirationNotificationCron } = await import('../src/cron/expirationNotificationCron');
      console.log('✅ Expiration notification cron function: Available');
    } catch (error) {
      console.log('❌ Expiration notification cron function: Not available');
    }

    // Check if there are any recent operations that should trigger cron jobs
    const recentOperations = await prisma.fuelingOperation.findMany({
      where: {
        dateTime: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        },
        is_deleted: false
      },
      include: {
        airline: {
          select: { name: true }
        }
      },
      orderBy: { dateTime: 'desc' },
      take: 5
    });

    console.log(`\n✈️ Recent operations (last 7 days): ${recentOperations.length}`);
    
    if (recentOperations.length > 0) {
      console.log('Recent operations that should trigger cron jobs:');
      recentOperations.forEach((op, index) => {
        console.log(`  ${index + 1}. [${op.dateTime.toISOString()}] ${op.airline.name} - ${op.destination}`);
      });
    } else {
      console.log('❌ No recent operations found');
    }

    // Check if there are any existing dispatches
    const xmlDispatches = await prisma.xmlInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const emailDispatches = await prisma.emailInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`\n📊 Existing dispatches (last 7 days):`);
    console.log(`  XML dispatches: ${xmlDispatches.length}`);
    console.log(`  Email dispatches: ${emailDispatches.length}`);

    if (xmlDispatches.length > 0) {
      console.log('Recent XML dispatches:');
      xmlDispatches.forEach((dispatch, index) => {
        console.log(`  ${index + 1}. [${dispatch.createdAt.toISOString()}] Operation ${dispatch.fuelingOperationId}: ${dispatch.status}`);
      });
    }

    if (emailDispatches.length > 0) {
      console.log('Recent Email dispatches:');
      emailDispatches.forEach((dispatch, index) => {
        console.log(`  ${index + 1}. [${dispatch.createdAt.toISOString()}] Operation ${dispatch.fuelingOperationId}: ${dispatch.status}`);
      });
    }

    console.log('\n📋 DIAGNOSIS:');
    
    if (recentOperations.length > 0 && xmlDispatches.length === 0 && emailDispatches.length === 0) {
      console.log('🚨 ISSUE: Operations exist but no dispatches created - cron jobs are not running');
    } else if (recentOperations.length === 0) {
      console.log('⚠️  WARNING: No recent operations - nothing to process');
    } else {
      console.log('✅ Operations and dispatches are in sync');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check server startup logs for cron job initialization messages');
    console.log('2. Verify that initAllCronJobs() is called in app.ts');
    console.log('3. Check if there are any errors during cron job initialization');
    console.log('4. Test manual dispatch to verify functionality');
    console.log('5. Check server timezone settings');

  } catch (error) {
    console.error('❌ Error checking cron initialization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkCronInitialization();
