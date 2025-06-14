import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_GLOBAL_PROJECTION_PRESET_NAME = 'default_global_projection';

export const getFuelProjectionPreset = async (req: Request, res: Response) => {
  try {
    const preset = await prisma.fuelProjectionPreset.findUnique({
      where: { name: DEFAULT_GLOBAL_PROJECTION_PRESET_NAME },
    });

    if (!preset) {
      return res.status(200).json({ presetData: [] });
    }
    // Ensure presetData is returned directly if it exists, even if null
    // The frontend expects an object with presetData, or presetData directly
    // For consistency, let's return the whole preset object which includes presetData
    res.status(200).json(preset);
  } catch (error) {
    console.error('Error fetching fuel projection preset:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ message: 'Error fetching preset.', error: error.message });
    }
    res.status(500).json({ message: 'Internal server error while fetching preset.' });
  }
};

export const upsertFuelProjectionPreset = async (req: Request, res: Response) => {
  const { presetData, calculatedResultsData, description } = req.body;

  // presetData can be an empty array, so we check if it's undefined
  if (presetData === undefined) {
    return res.status(400).json({ message: 'presetData is required in the request body (can be an empty array).' });
  }

  try {
    const dataToUpdate: Prisma.FuelProjectionPresetUpdateInput = {
      presetData: presetData as Prisma.InputJsonValue,
      description: description || null,
    };

    if (calculatedResultsData !== undefined) {
      dataToUpdate.calculatedResultsData = calculatedResultsData as Prisma.InputJsonValue;
    }

    const dataToCreate: Prisma.FuelProjectionPresetCreateInput = {
      name: DEFAULT_GLOBAL_PROJECTION_PRESET_NAME,
      presetData: presetData as Prisma.InputJsonValue,
      description: description || null,
    };

    if (calculatedResultsData !== undefined) {
      dataToCreate.calculatedResultsData = calculatedResultsData as Prisma.InputJsonValue;
    }

    const upsertedPreset = await prisma.fuelProjectionPreset.upsert({
      where: { name: DEFAULT_GLOBAL_PROJECTION_PRESET_NAME },
      update: dataToUpdate,
      create: dataToCreate,
    });
    res.status(200).json(upsertedPreset);
  } catch (error) {
    console.error('Error upserting fuel projection preset:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ message: 'Error saving preset.', error: error.message });
    }
    res.status(500).json({ message: 'Internal server error while saving preset.' });
  }
};
