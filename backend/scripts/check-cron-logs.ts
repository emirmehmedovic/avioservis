import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCronLogs() {
  try {
    console.log('🔍 Checking cron job logs...\n');

    // Check SystemLog for cron-related entries
    const cronLogs = await prisma.systemLog.findMany({
      where: {
        OR: [
          { action: { contains: 'cron' } },
          { action: { contains: 'invoice' } },
          { action: { contains: 'email' } },
          { action: { contains: 'xml' } },
          { action: { contains: 'dispatch' } }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    console.log(`📊 Found ${cronLogs.length} cron-related logs:\n`);

    if (cronLogs.length === 0) {
      console.log('❌ No cron job logs found in SystemLog table');
      console.log('This might indicate that cron jobs are not running or not logging properly.\n');
    } else {
      cronLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp.toISOString()}] ${log.action}`);
        console.log(`   Severity: ${log.severity}`);
        console.log(`   Details: ${log.details}`);
        console.log('');
      });
    }

    // Check XML invoice dispatches
    const xmlDispatches = await prisma.xmlInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`📧 Found ${xmlDispatches.length} XML invoice dispatches in last 3 days:\n`);

    if (xmlDispatches.length === 0) {
      console.log('❌ No XML invoice dispatches found in last 3 days');
    } else {
      xmlDispatches.forEach((dispatch, index) => {
        console.log(`${index + 1}. [${dispatch.createdAt.toISOString()}] Operation ${dispatch.fuelingOperationId}`);
        console.log(`   Status: ${dispatch.status}`);
        console.log(`   Attempts: ${dispatch.attempts}`);
        if (dispatch.lastError) {
          console.log(`   Error: ${dispatch.lastError}`);
        }
        console.log('');
      });
    }

    // Check Email invoice dispatches
    const emailDispatches = await prisma.emailInvoiceDispatch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`📨 Found ${emailDispatches.length} Email invoice dispatches in last 3 days:\n`);

    if (emailDispatches.length === 0) {
      console.log('❌ No Email invoice dispatches found in last 3 days');
    } else {
      emailDispatches.forEach((dispatch, index) => {
        console.log(`${index + 1}. [${dispatch.createdAt.toISOString()}] Operation ${dispatch.fuelingOperationId}`);
        console.log(`   Status: ${dispatch.status}`);
        console.log(`   Attempts: ${dispatch.attempts}`);
        if (dispatch.lastError) {
          console.log(`   Error: ${dispatch.lastError}`);
        }
        console.log('');
      });
    }

    // Check recent fueling operations
    const recentOperations = await prisma.fuelingOperation.findMany({
      where: {
        dateTime: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
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

    console.log(`✈️ Found ${recentOperations.length} fueling operations in last 3 days:\n`);

    if (recentOperations.length === 0) {
      console.log('❌ No fueling operations found in last 3 days');
    } else {
      recentOperations.forEach((op, index) => {
        console.log(`${index + 1}. [${op.dateTime.toISOString()}] ${op.airline.name} - ${op.destination}`);
        console.log(`   Quantity: ${op.quantity_liters}L / ${op.quantity_kg}kg`);
        console.log(`   Amount: ${op.total_amount} ${op.currency}`);
        console.log('');
      });
    }

    // Summary
    console.log('📋 SUMMARY:');
    console.log(`- SystemLog entries: ${cronLogs.length}`);
    console.log(`- XML dispatches (3 days): ${xmlDispatches.length}`);
    console.log(`- Email dispatches (3 days): ${emailDispatches.length}`);
    console.log(`- Recent operations (3 days): ${recentOperations.length}`);

    if (cronLogs.length === 0 && xmlDispatches.length === 0 && emailDispatches.length === 0) {
      console.log('\n🚨 WARNING: No cron job activity detected!');
      console.log('Possible issues:');
      console.log('1. Cron jobs are not running');
      console.log('2. Cron jobs are not logging to SystemLog');
      console.log('3. No eligible operations for processing');
      console.log('4. Server timezone issues');
    }

  } catch (error) {
    console.error('❌ Error checking cron logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkCronLogs();
