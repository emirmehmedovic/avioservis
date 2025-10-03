import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';

const prisma = new PrismaClient();

async function checkProductionCronStatus() {
  try {
    console.log('🔍 Checking production cron job status...\n');

    // Check if cron jobs are scheduled
    console.log('📅 Checking cron job schedules:');
    
    // Check if node-cron is working
    const testCron = cron.schedule('* * * * *', () => {
      console.log('✅ Test cron job executed successfully');
    }, { scheduled: false });
    
    console.log('✅ node-cron library is working');
    testCron.destroy();

    // Check environment variables
    console.log('\n🌍 Environment variables:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`TZ: ${process.env.TZ || 'not set'}`);
    console.log(`PORT: ${process.env.PORT || 'not set'}`);

    // Check current time and timezone
    const now = new Date();
    console.log(`\n⏰ Current time: ${now.toISOString()}`);
    console.log(`Local time: ${now.toLocaleString()}`);
    console.log(`Timezone offset: ${now.getTimezoneOffset()} minutes`);

    // Check if cron jobs should be running
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`\n🕐 Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
    
    // Email invoice cron: 23:50
    if (currentHour === 23 && currentMinute >= 50) {
      console.log('📧 Email invoice cron should have run at 23:50');
    } else {
      console.log('📧 Email invoice cron scheduled for 23:50 (not yet time)');
    }
    
    // XML invoice cron: 23:55
    if (currentHour === 23 && currentMinute >= 55) {
      console.log('📄 XML invoice cron should have run at 23:55');
    } else {
      console.log('📄 XML invoice cron scheduled for 23:55 (not yet time)');
    }

    // Check recent SystemLog entries
    const recentLogs = await prisma.systemLog.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    console.log(`\n📊 Recent SystemLog entries (last 24h): ${recentLogs.length}`);
    
    if (recentLogs.length > 0) {
      recentLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp.toISOString()}] ${log.action} (${log.severity})`);
      });
    } else {
      console.log('❌ No SystemLog entries in last 24 hours');
    }

    // Check if there are any fueling operations that should trigger cron jobs
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
      take: 10
    });

    console.log(`\n✈️ Recent fueling operations (last 7 days): ${recentOperations.length}`);
    
    if (recentOperations.length > 0) {
      recentOperations.forEach((op, index) => {
        console.log(`${index + 1}. [${op.dateTime.toISOString()}] ${op.airline.name} - ${op.destination}`);
      });
    } else {
      console.log('❌ No fueling operations in last 7 days');
    }

    // Check XML invoice dispatches
    const xmlDispatches = await prisma.xmlInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n📧 XML invoice dispatches (last 7 days): ${xmlDispatches.length}`);
    
    if (xmlDispatches.length > 0) {
      xmlDispatches.forEach((dispatch, index) => {
        console.log(`${index + 1}. [${dispatch.createdAt.toISOString()}] Operation ${dispatch.fuelingOperationId} - ${dispatch.status}`);
      });
    } else {
      console.log('❌ No XML invoice dispatches in last 7 days');
    }

    // Check Email invoice dispatches
    const emailDispatches = await prisma.emailInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n📨 Email invoice dispatches (last 7 days): ${emailDispatches.length}`);
    
    if (emailDispatches.length > 0) {
      emailDispatches.forEach((dispatch, index) => {
        console.log(`${index + 1}. [${dispatch.createdAt.toISOString()}] Operation ${dispatch.fuelingOperationId} - ${dispatch.status}`);
      });
    } else {
      console.log('❌ No Email invoice dispatches in last 7 days');
    }

    // Check if server is running and cron jobs are initialized
    console.log('\n🔧 Server status:');
    console.log('✅ Database connection: OK');
    console.log('✅ Prisma client: OK');
    
    // Test manual dispatch
    console.log('\n🧪 Testing manual dispatch capability...');
    
    // Check if manual dispatch functions exist
    try {
      const { manualEmailDispatch } = await import('../src/cron/emailInvoiceCron');
      console.log('✅ Email invoice manual dispatch function: Available');
    } catch (error) {
      console.log('❌ Email invoice manual dispatch function: Not available');
    }

    try {
      const { dispatchDay } = await import('../src/services/xmlInvoiceDispatch.service');
      console.log('✅ XML invoice dispatch function: Available');
    } catch (error) {
      console.log('❌ XML invoice dispatch function: Not available');
    }

    console.log('\n📋 DIAGNOSIS:');
    
    if (recentLogs.length === 0) {
      console.log('🚨 ISSUE: No SystemLog entries - cron jobs may not be logging properly');
    }
    
    if (xmlDispatches.length === 0 && emailDispatches.length === 0) {
      console.log('🚨 ISSUE: No invoice dispatches - cron jobs may not be running');
    }
    
    if (recentOperations.length === 0) {
      console.log('⚠️  WARNING: No recent operations - nothing to process');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check if server is running with cron jobs initialized');
    console.log('2. Check server logs for cron job startup messages');
    console.log('3. Verify timezone settings (should be Europe/Sarajevo)');
    console.log('4. Test manual dispatch to verify functionality');
    console.log('5. Check if there are any errors in server startup');

  } catch (error) {
    console.error('❌ Error checking production cron status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkProductionCronStatus();
