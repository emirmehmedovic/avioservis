import { PrismaClient } from '@prisma/client';
import { checkVehicleExpirationDates } from '../controllers/expirationNotification.controller';

const prisma = new PrismaClient();

// Cron job to check expiration dates daily at 8:00 AM
export const checkExpirationDatesJob = async () => {
  try {
    console.log('🔔 Starting expiration dates check...');
    
    // Get all active vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: { 
        status: 'ACTIVE' 
      },
      select: {
        id: true,
        vehicle_name: true,
        license_plate: true,
      },
    });

    console.log(`📋 Found ${vehicles.length} active vehicles to check`);

    let processedCount = 0;
    let errorCount = 0;

    // Process each vehicle
    for (const vehicle of vehicles) {
      try {
        await checkVehicleExpirationDates(vehicle.id);
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`✅ Processed ${processedCount}/${vehicles.length} vehicles`);
        }
      } catch (error) {
        console.error(`❌ Error processing vehicle ${vehicle.id} (${vehicle.vehicle_name}):`, error);
        errorCount++;
      }
    }

    // Clean up old notifications (older than 90 days)
    const cleanupResult = await prisma.expirationNotification.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        },
        isActive: false,
      },
    });

    console.log(`🧹 Cleaned up ${cleanupResult.count} old notifications`);

    // Get notification statistics
    const stats = await prisma.expirationNotification.groupBy({
      by: ['notificationType'],
      where: { isActive: true },
      _count: true,
    });

    const statsSummary = stats.reduce((acc, stat) => {
      acc[stat.notificationType] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Notification statistics:', statsSummary);
    console.log(`✅ Expiration check completed: ${processedCount} vehicles processed, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in expiration dates check job:', error);
  }
};

// Function to manually trigger expiration check for a specific vehicle
export const checkVehicleExpirationDatesManually = async (vehicleId: number) => {
  try {
    console.log(`🔍 Manually checking expiration dates for vehicle ${vehicleId}...`);
    
    await checkVehicleExpirationDates(vehicleId);
    
    console.log(`✅ Manual expiration check completed for vehicle ${vehicleId}`);
  } catch (error) {
    console.error(`❌ Error in manual expiration check for vehicle ${vehicleId}:`, error);
    throw error;
  }
};

// Function to get expiration summary for dashboard
export const getExpirationSummary = async () => {
  try {
    const summary = await prisma.expirationNotification.groupBy({
      by: ['notificationType', 'isRead'],
      where: { isActive: true },
      _count: true,
    });

    const result = {
      total: 0,
      unread: 0,
      byType: {
        WARNING_30_DAYS: 0,
        WARNING_15_DAYS: 0,
        CRITICAL_7_DAYS: 0,
        EXPIRED: 0,
      },
    };

    summary.forEach(stat => {
      result.total += stat._count;
      if (!stat.isRead) {
        result.unread += stat._count;
      }
      result.byType[stat.notificationType] += stat._count;
    });

    return result;
  } catch (error) {
    console.error('Error getting expiration summary:', error);
    return null;
  }
};




