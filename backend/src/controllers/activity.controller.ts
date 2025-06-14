import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Log an activity
 */
export const logActivity = async (
  userId: number,
  username: string,
  actionType: string,
  resourceType: string,
  resourceId: number | null,
  description: string,
  metadata?: any,
  req?: AuthRequest
): Promise<void> => {
  try {
    await prisma.activity.create({
      data: {
        userId,
        username,
        actionType,
        resourceType,
        resourceId,
        description,
        metadata: metadata ? metadata : undefined,
        ipAddress: req?.ip || undefined,
        userAgent: req?.headers['user-agent'] || undefined,
      },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // We don't throw here to prevent activity logging from breaking the main functionality
  }
};

/**
 * Get all activities with filtering options
 */
export const getActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      startDate, 
      endDate, 
      userId, 
      username, 
      actionType, 
      resourceType, 
      resourceId,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause based on filters
    const whereClause: any = {};
    
    if (startDate) {
      whereClause.timestamp = { ...whereClause.timestamp, gte: new Date(startDate as string) };
    }
    
    if (endDate) {
      whereClause.timestamp = { ...whereClause.timestamp, lte: new Date(endDate as string) };
    }
    
    if (userId) {
      whereClause.userId = parseInt(userId as string, 10);
    }
    
    if (username) {
      whereClause.username = { contains: username as string, mode: 'insensitive' };
    }
    
    if (actionType) {
      whereClause.actionType = actionType as string;
    }
    
    if (resourceType) {
      whereClause.resourceType = resourceType as string;
    }
    
    if (resourceId) {
      whereClause.resourceId = parseInt(resourceId as string, 10);
    }

    // Get activities with pagination
    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      }),
      prisma.activity.count({ where: whereClause })
    ]);

    // Return activities with pagination metadata
    res.status(200).json({
      activities,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju aktivnosti' });
  }
};

/**
 * Get activity types for filtering
 */
export const getActivityTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actionTypes = await prisma.activity.findMany({
      select: { actionType: true },
      distinct: ['actionType'],
      orderBy: { actionType: 'asc' }
    });

    const resourceTypes = await prisma.activity.findMany({
      select: { resourceType: true },
      distinct: ['resourceType'],
      orderBy: { resourceType: 'asc' }
    });

    res.status(200).json({
      actionTypes: actionTypes.map(type => type.actionType),
      resourceTypes: resourceTypes.map(type => type.resourceType)
    });
  } catch (error) {
    console.error('Error fetching activity types:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju tipova aktivnosti' });
  }
};
