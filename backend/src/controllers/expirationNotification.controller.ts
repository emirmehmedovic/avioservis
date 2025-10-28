import { Request, Response } from 'express';
import { NotificationType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

// Validation schemas
const markAsReadSchema = z.object({
  id: z.string().transform(Number),
});

const getNotificationsSchema = z.object({
  vehicleId: z.string().optional().transform(val => val ? Number(val) : undefined),
  notificationType: z.nativeEnum(NotificationType).optional(),
  isRead: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  isActive: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  limit: z.string().optional().transform(val => val ? Number(val) : 50),
  offset: z.string().optional().transform(val => val ? Number(val) : 0),
});

// Field display names mapping
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  'next_annual_inspection_date': 'Godišnji pregled',
  'filter_expiry_date': 'Filter',
  'adr_vazi_do': 'ADR certifikat',
  'periodicni_pregled_vazi_do': 'Periodični pregled',
  'registrovano_do': 'Registracija',
  'licenca_vazi_do': 'Licenca',
  'next_hose_hd63_replacement_date': 'Crijevo HD63',
  'next_hose_hd38_replacement_date': 'Crijevo HD38',
  'next_hose_tw75_replacement_date': 'Crijevo TW75',
  'next_hose_leak_test_date': 'Test curenja crijeva',
  'next_volumeter_calibration_date': 'Kalibracija volumetra',
  'next_manometer_calibration_date': 'Kalibracija manometra',
  'next_hecpv_ilcpv_test_date': 'Test HECPV/ILCPV',
  'next_6_month_check_date': 'Šestomjesečni pregled',
  'cisterna_naredna_kalibracija': 'Kalibracija cisterne',
  'tahograf_naredna_kalibracija': 'Kalibracija tahografa',
  'tanker_next_fire_safety_test_date': 'Test protivpožarne zaštite',
  'tromjesecni_pregled_vazi_do': 'Tromjesečni pregled',
  'manometer_calibration_valid_until': 'Manometar kalibracija',
  'volumeter_kalibracija_vazi_do': 'Volumetar kalibracija',
  'conductivity_meter_calibration_valid_until': 'Mjerač provodljivosti',
  'hydrometer_calibration_valid_until': 'Hidrometar kalibracija',
  'main_flow_meter_calibration_valid_until': 'Glavni protok mjerač',
  'resistance_meter_calibration_valid_until': 'Mjerač otpora',
  'thermometer_calibration_valid_until': 'Termometar kalibracija',
  'torque_wrench_calibration_valid_until': 'Moment ključ kalibracija',
  'water_chemical_test_valid_until': 'Hemijski test vode',
  'datum_isteka_cwd': 'CWD datum',
  'filter_next_annual_inspection_date': 'Filter godišnji pregled',
  'tanker_next_pressure_test_date': 'Test pritiska cisterne',
};

// Get all expiration notifications
export const getExpirationNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedQuery = getNotificationsSchema.parse(req.query);
    
    const where: any = {};
    
    if (validatedQuery.vehicleId) {
      where.vehicleId = validatedQuery.vehicleId;
    }
    
    if (validatedQuery.notificationType) {
      where.notificationType = validatedQuery.notificationType;
    }
    
    if (validatedQuery.isRead !== undefined) {
      where.isRead = validatedQuery.isRead;
    }
    
    if (validatedQuery.isActive !== undefined) {
      where.isActive = validatedQuery.isActive;
    }

    const notifications = await prisma.expirationNotification.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            vehicle_name: true,
            license_plate: true,
            status: true,
          },
        },
      },
      orderBy: [
        { notificationType: 'asc' },
        { expirationDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: validatedQuery.limit,
      skip: validatedQuery.offset,
    });

    const totalCount = await prisma.expirationNotification.count({ where });

    res.json({
      notifications,
      totalCount,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    });
  } catch (error) {
    console.error('Error fetching expiration notifications:', error);
    res.status(500).json({ error: 'Greška pri dohvatanju obavještenja' });
  }
};

// Get notifications for a specific vehicle
export const getVehicleExpirationNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    
    if (isNaN(vehicleId)) {
      res.status(400).json({ error: 'Neispravan ID vozila' });
      return;
    }

    const notifications = await prisma.expirationNotification.findMany({
      where: {
        vehicleId,
        isActive: true,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            vehicle_name: true,
            license_plate: true,
            status: true,
          },
        },
      },
      orderBy: [
        { notificationType: 'asc' },
        { expirationDate: 'asc' },
      ],
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching vehicle notifications:', error);
    res.status(500).json({ error: 'Greška pri dohvatanju obavještenja za vozilo' });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = markAsReadSchema.parse(req.params);

    const notification = await prisma.expirationNotification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Greška pri označavanju obavještenja kao pročitano' });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await prisma.expirationNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    res.json({ 
      message: 'Sva obavještenja su označena kao pročitana',
      updatedCount: result.count 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Greška pri označavanju svih obavještenja kao pročitana' });
  }
};

// Dismiss notification (mark as inactive)
export const dismissNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = markAsReadSchema.parse(req.params);

    const notification = await prisma.expirationNotification.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ notification });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({ error: 'Greška pri otkazivanju obavještenja' });
  }
};

// Get notification statistics
export const getNotificationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await prisma.expirationNotification.groupBy({
      by: ['notificationType', 'isRead'],
      where: { isActive: true },
      _count: true,
    });

    const formattedStats = {
      total: 0,
      unread: 0,
      byType: {
        WARNING_30_DAYS: 0,
        WARNING_15_DAYS: 0,
        CRITICAL_7_DAYS: 0,
        EXPIRED: 0,
      },
    };

    stats.forEach(stat => {
      formattedStats.total += stat._count;
      if (!stat.isRead) {
        formattedStats.unread += stat._count;
      }
      formattedStats.byType[stat.notificationType] += stat._count;
    });

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Greška pri dohvatanju statistika obavještenja' });
  }
};

// Helper function to create notification
export const createExpirationNotification = async (
  vehicleId: number,
  fieldName: string,
  expirationDate: Date
) => {
  try {
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    let notificationType: NotificationType;
    if (daysUntilExpiration <= 0) {
      notificationType = 'EXPIRED';
    } else if (daysUntilExpiration <= 7) {
      notificationType = 'CRITICAL_7_DAYS';
    } else if (daysUntilExpiration <= 15) {
      notificationType = 'WARNING_15_DAYS';
    } else if (daysUntilExpiration <= 30) {
      notificationType = 'WARNING_30_DAYS';
    } else {
      return null; // No notification needed
    }

    const fieldDisplayName = FIELD_DISPLAY_NAMES[fieldName] || fieldName;

    // Check if notification already exists
    const existingNotification = await prisma.expirationNotification.findFirst({
      where: {
        vehicleId,
        fieldName,
        isActive: true,
      },
    });

    if (existingNotification) {
      // Update existing notification
      return await prisma.expirationNotification.update({
        where: { id: existingNotification.id },
        data: {
          expirationDate,
          notificationType,
          daysUntilExpiration,
          fieldDisplayName,
        },
      });
    } else {
      // Create new notification
      return await prisma.expirationNotification.create({
        data: {
          vehicleId,
          fieldName,
          fieldDisplayName,
          expirationDate,
          notificationType,
          daysUntilExpiration,
        },
      });
    }
  } catch (error) {
    console.error('Error creating expiration notification:', error);
    return null;
  }
};

// Helper function to check vehicle expiration dates
export const checkVehicleExpirationDates = async (vehicleId: number) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return;
    }

    const expirationFields = [
      'next_annual_inspection_date',
      'filter_expiry_date',
      'adr_vazi_do',
      'periodicni_pregled_vazi_do',
      'registrovano_do',
      'licenca_vazi_do',
      'next_hose_hd63_replacement_date',
      'next_hose_hd38_replacement_date',
      'next_hose_tw75_replacement_date',
      'next_hose_leak_test_date',
      'next_volumeter_calibration_date',
      'next_manometer_calibration_date',
      'next_hecpv_ilcpv_test_date',
      'next_6_month_check_date',
      'cisterna_naredna_kalibracija',
      'tahograf_naredna_kalibracija',
      'tanker_next_fire_safety_test_date',
      'tromjesecni_pregled_vazi_do',
      'manometer_calibration_valid_until',
      'volumeter_kalibracija_vazi_do',
      'conductivity_meter_calibration_valid_until',
      'hydrometer_calibration_valid_until',
      'main_flow_meter_calibration_valid_until',
      'resistance_meter_calibration_valid_until',
      'thermometer_calibration_valid_until',
      'torque_wrench_calibration_valid_until',
      'water_chemical_test_valid_until',
      'datum_isteka_cwd',
      'filter_next_annual_inspection_date',
      'tanker_next_pressure_test_date',
    ];

    for (const fieldName of expirationFields) {
      const expirationDate = vehicle[fieldName as keyof typeof vehicle] as Date | null;
      
      if (expirationDate) {
        await createExpirationNotification(vehicleId, fieldName, expirationDate);
      }
    }

    // Deactivate notifications for fields that no longer have expiration dates
    await prisma.expirationNotification.updateMany({
      where: {
        vehicleId,
        isActive: true,
        fieldName: {
          notIn: expirationFields.filter(fieldName => 
            vehicle[fieldName as keyof typeof vehicle] !== null
          ),
        },
      },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('Error checking vehicle expiration dates:', error);
  }
};
