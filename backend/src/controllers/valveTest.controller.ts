import { Request, Response } from 'express';
import { prisma } from '../db';
import { validateAndParseDate } from '../utils/dateUtils';

// Define ValveTestType enum to match the Prisma schema
enum ValveTestType {
  HECPV = 'HECPV',
  ILPCV = 'ILPCV'
}

// Get all valve test records for a specific vehicle
export const getValveTestRecords = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required' });
    }

    // Use Prisma client to get valve test records
    const valveTestRecords = await prisma.valveTestRecord.findMany({
      where: {
        vehicleId: parseInt(vehicleId)
      },
      orderBy: {
        testDate: 'desc'
      }
    });

    return res.status(200).json(valveTestRecords);
  } catch (error) {
    console.error('Error getting valve test records:', error);
    return res.status(500).json({ message: 'Failed to get valve test records' });
  }
};

// Get a specific valve test record by ID
export const getValveTestRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Record ID is required' });
    }

    const record = await prisma.valveTestRecord.findUnique({
      where: {
        id: parseInt(id)
      }
    });

    if (!record) {
      return res.status(404).json({ message: 'Valve test record not found' });
    }

    return res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching valve test record:', error);
    return res.status(500).json({ message: 'Error fetching valve test record' });
  }
};

// Create a new valve test record
export const createValveTestRecord = async (req: Request, res: Response) => {
  try {
    const {
      vehicleId,
      testType,
      testDate,
      vehicleNumber,
      fuelHoseType,
      fuelHoseProductionDate,
      maxFlowRate,
      pressureReading,
      maxPressureDuringClosing,
      pressureAtZeroFlow,
      pressureAfterThirtySeconds,
      pressureIncrease,
      notes,
    } = req.body;

    // Validate required fields
    if (!vehicleId || !testType || !testDate || !vehicleNumber || !fuelHoseType) {
      return res.status(400).json({ 
        message: 'Missing required fields: vehicleId, testType, testDate, vehicleNumber, and fuelHoseType are required' 
      });
    }

    // Validate test type
    if (!Object.values(ValveTestType).includes(testType as ValveTestType)) {
      return res.status(400).json({ message: 'Invalid test type' });
    }

    // Parse dates
    const parsedTestDate = validateAndParseDate(testDate);
    if (!parsedTestDate) {
      return res.status(400).json({ message: 'Invalid test date format' });
    }

    let parsedFuelHoseProductionDate = null;
    if (fuelHoseProductionDate) {
      parsedFuelHoseProductionDate = validateAndParseDate(fuelHoseProductionDate);
      if (!parsedFuelHoseProductionDate) {
        return res.status(400).json({ message: 'Invalid fuel hose production date format' });
      }
    }

    // Create the record using Prisma client
    const createdRecord = await prisma.valveTestRecord.create({
      data: {
        vehicleId: parseInt(vehicleId.toString()),
        testType: testType as ValveTestType,
        testDate: parsedTestDate,
        vehicleNumber,
        fuelHoseType,
        fuelHoseProductionDate: parsedFuelHoseProductionDate,
        maxFlowRate: maxFlowRate ? parseFloat(maxFlowRate.toString()) : null,
        pressureReading: pressureReading ? parseFloat(pressureReading.toString()) : null,
        maxPressureDuringClosing: maxPressureDuringClosing ? parseFloat(maxPressureDuringClosing.toString()) : null,
        pressureAtZeroFlow: pressureAtZeroFlow ? parseFloat(pressureAtZeroFlow.toString()) : null,
        pressureAfterThirtySeconds: pressureAfterThirtySeconds ? parseFloat(pressureAfterThirtySeconds.toString()) : null,
        pressureIncrease: pressureIncrease ? parseFloat(pressureIncrease.toString()) : null,
        notes
      }
    });

    return res.status(201).json(createdRecord);
  } catch (error) {
    console.error('Error creating valve test record:', error);
    return res.status(500).json({ message: 'Error creating valve test record' });
  }
};

// Update an existing valve test record
export const updateValveTestRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      testType,
      testDate,
      vehicleNumber,
      fuelHoseType,
      fuelHoseProductionDate,
      maxFlowRate,
      pressureReading,
      maxPressureDuringClosing,
      pressureAtZeroFlow,
      pressureAfterThirtySeconds,
      pressureIncrease,
      notes,
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Record ID is required' });
    }

    // Validate test type if provided
    if (testType && !Object.values(ValveTestType).includes(testType as ValveTestType)) {
      return res.status(400).json({ message: 'Invalid test type' });
    }

    // Parse dates if provided
    let parsedTestDate = undefined;
    if (testDate) {
      parsedTestDate = validateAndParseDate(testDate);
      if (!parsedTestDate) {
        return res.status(400).json({ message: 'Invalid test date format' });
      }
    }

    let parsedFuelHoseProductionDate = undefined;
    if (fuelHoseProductionDate) {
      parsedFuelHoseProductionDate = validateAndParseDate(fuelHoseProductionDate);
      if (!parsedFuelHoseProductionDate) {
        return res.status(400).json({ message: 'Invalid fuel hose production date format' });
      }
    }

    // Check if record exists
    const existingRecord = await prisma.valveTestRecord.findUnique({
      where: {
        id: parseInt(id)
      }
    });

    if (!existingRecord) {
      return res.status(404).json({ message: 'Valve test record not found' });
    }

    // Prepare update data
    const updateData: any = {};

    if (testType !== undefined) {
      updateData.testType = testType as ValveTestType;
    }

    if (parsedTestDate !== undefined) {
      updateData.testDate = parsedTestDate;
    }

    if (vehicleNumber !== undefined) {
      updateData.vehicleNumber = vehicleNumber;
    }

    if (fuelHoseType !== undefined) {
      updateData.fuelHoseType = fuelHoseType;
    }

    if (parsedFuelHoseProductionDate !== undefined) {
      updateData.fuelHoseProductionDate = parsedFuelHoseProductionDate;
    } else if (fuelHoseProductionDate === null) {
      updateData.fuelHoseProductionDate = null;
    }

    if (maxFlowRate !== undefined) {
      updateData.maxFlowRate = maxFlowRate ? parseFloat(maxFlowRate.toString()) : null;
    } else if (maxFlowRate === null) {
      updateData.maxFlowRate = null;
    }

    if (pressureReading !== undefined) {
      updateData.pressureReading = pressureReading ? parseFloat(pressureReading.toString()) : null;
    } else if (pressureReading === null) {
      updateData.pressureReading = null;
    }

    if (maxPressureDuringClosing !== undefined) {
      updateData.maxPressureDuringClosing = maxPressureDuringClosing ? parseFloat(maxPressureDuringClosing.toString()) : null;
    } else if (maxPressureDuringClosing === null) {
      updateData.maxPressureDuringClosing = null;
    }

    if (pressureAtZeroFlow !== undefined) {
      updateData.pressureAtZeroFlow = pressureAtZeroFlow ? parseFloat(pressureAtZeroFlow.toString()) : null;
    } else if (pressureAtZeroFlow === null) {
      updateData.pressureAtZeroFlow = null;
    }

    if (pressureAfterThirtySeconds !== undefined) {
      updateData.pressureAfterThirtySeconds = pressureAfterThirtySeconds ? parseFloat(pressureAfterThirtySeconds.toString()) : null;
    } else if (pressureAfterThirtySeconds === null) {
      updateData.pressureAfterThirtySeconds = null;
    }

    if (pressureIncrease !== undefined) {
      updateData.pressureIncrease = pressureIncrease ? parseFloat(pressureIncrease.toString()) : null;
    } else if (pressureIncrease === null) {
      updateData.pressureIncrease = null;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    } else if (notes === null) {
      updateData.notes = null;
    }

    // If no fields to update, return the existing record
    if (Object.keys(updateData).length === 0) {
      return res.status(200).json(existingRecord);
    }

    // Execute the update using Prisma client
    const updatedRecord = await prisma.valveTestRecord.update({
      where: {
        id: parseInt(id)
      },
      data: updateData
    });

    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating valve test record:', error);
    return res.status(500).json({ message: 'Error updating valve test record' });
  }
};

// Delete a valve test record
export const deleteValveTestRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Record ID is required' });
    }

    // Check if record exists
    const existingRecord = await prisma.valveTestRecord.findUnique({
      where: {
        id: parseInt(id)
      }
    });

    if (!existingRecord) {
      return res.status(404).json({ message: 'Valve test record not found' });
    }

    // Delete the record using Prisma client
    await prisma.valveTestRecord.delete({
      where: {
        id: parseInt(id)
      }
    });

    return res.status(200).json({ message: 'Valve test record deleted successfully' });
  } catch (error) {
    console.error('Error deleting valve test record:', error);
    return res.status(500).json({ message: 'Error deleting valve test record' });
  }
};
