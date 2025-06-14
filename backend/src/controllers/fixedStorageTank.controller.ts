import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient, FixedTankStatus, Prisma, FixedTankActivityType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import path from 'path'; // Ensure path is imported
import fs from 'fs';   // Use standard fs module
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Define constants for file paths
const PUBLIC_UPLOADS_BASE_PATH = '/uploads/fixed_tank_documents/'; // URL base path
const FULL_UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'fixed_tank_documents');

// Ensure the final upload directory exists
if (!fs.existsSync(FULL_UPLOADS_DIR)) {
  fs.mkdirSync(FULL_UPLOADS_DIR, { recursive: true });
}

// Helper function to delete a file if it exists
const deleteFileFromServer = (fileUrlPath: string | null | undefined) => {
  if (!fileUrlPath) return;
  try {
    // Convert URL path (e.g., /uploads/fixed_tank_documents/doc.pdf) to absolute system path
    // This assumes fileUrlPath starts with PUBLIC_UPLOADS_BASE_PATH
    const fileName = path.basename(fileUrlPath);
    const localPath = path.join(FULL_UPLOADS_DIR, fileName);

    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`Successfully deleted old file: ${localPath}`);
    }
  } catch (err) {
    console.error(`Error deleting file ${fileUrlPath}:`, err);
  }
};

// Helper function to create directory if it doesn't exist
const ensureUploadDirExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// POST /api/fuel/fixed-tanks - Kreiranje novog fiksnog tanka
export const createFixedStorageTank: RequestHandler = async (req, res, next): Promise<void> => {
  console.log('[FixedTankController] Received request to create fixed tank. Body:', req.body);

  const {
    tank_name,
    tank_identifier,
    capacity_liters, // Value from body, could be string or number if express.json parsed it
    current_liters,  // Value from body
    fuel_type,
    location_description,
    status
  } = req.body;

  // Convert to numbers. Validators should have ensured they are valid numeric representations.
  const parsedCapacityLiters = Number(capacity_liters);
  const parsedCurrentLiters = (current_liters !== undefined && current_liters !== null && String(current_liters).trim() !== '') 
                              ? Number(current_liters) 
                              : 0;
  
  // Izračunaj i inicijaliziraj količinu u kilogramima koristeći defaultnu specifičnu gustoću od 0.8 kg/L
  // Ovo je standardna vrijednost za Jet A1 gorivo
  const DEFAULT_SPECIFIC_DENSITY = 0.8;
  const parsedCurrentKg = parsedCurrentLiters * DEFAULT_SPECIFIC_DENSITY;

  // Validators handle: 
  // - capacity_liters: isFloat({ gt: 0 })
  // - current_liters: optional, isFloat({ min: 0 })
  // Additional cross-field validation or specific checks can remain here:

  if (parsedCapacityLiters <= 0) { // Redundant if validator's gt:0 is effective, but safe to keep for clarity
    console.error('[FixedTankController] Non-positive capacity_liters:', parsedCapacityLiters);
    res.status(400).json({ message: 'Capacity liters must be a positive number.' });
    return;
  }

  if (parsedCurrentLiters < 0) { // Redundant if validator's min:0 is effective, but safe to keep
    console.error('[FixedTankController] Negative current_liters:', parsedCurrentLiters);
    res.status(400).json({ message: 'Current liters cannot be negative.' });
    return;
  }

  if (parsedCurrentLiters > parsedCapacityLiters) {
    console.error('[FixedTankController] current_liters > capacity_liters:', parsedCurrentLiters, parsedCapacityLiters);
    res.status(400).json({
      message: `Current liters (${parsedCurrentLiters} L) cannot exceed capacity (${parsedCapacityLiters} L).`,
    });
    return;
  }
  
  console.log('[FixedTankController] Attempting to create tank with parsed data:', {
    tank_name: tank_name,
    tank_identifier: tank_identifier,
    capacity_liters: parsedCapacityLiters,
    current_quantity_liters: parsedCurrentLiters,
    fuel_type,
    location_description,
    status
  });

  let identificationDocumentUrl: string | null = null;

  if (req.file) {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'fixed_tank_documents');
    ensureUploadDirExists(uploadDir);
    const uniqueFilename = `identificationDocument-${Date.now()}-${Math.floor(Math.random() * 1E9)}.${req.file.originalname.split('.').pop()}`;
    const newPath = path.join(uploadDir, uniqueFilename);

    try {
      // Use fs.rename to move the file (works like move within the same filesystem)
      // Multer saves uploaded files to a temporary path (req.file.path)
      await fs.promises.rename(req.file.path, newPath);
      identificationDocumentUrl = `/uploads/fixed_tank_documents/${uniqueFilename}`;
    } catch (err) {
      console.error('Error moving uploaded file:', err);
      // Decide if you want to stop the tank creation or proceed without the document
      // For now, let's proceed but log the error and not set the URL
      // Or, return an error response:
      // return res.status(500).json({ message: 'Failed to save uploaded document.' });
    }
  }

  try {
    const newTank = await prisma.fixedStorageTanks.create({ // Reverted to fixedStorageTanks
      data: {
        tank_name: tank_name,
        tank_identifier: tank_identifier,
        capacity_liters: parsedCapacityLiters,
        current_quantity_liters: parsedCurrentLiters,
        current_quantity_kg: parsedCurrentKg, // Dodajemo inicijalizaciju količine u kilogramima
        fuel_type,
        location_description: location_description || null,
        status,
        identificationDocumentUrl: identificationDocumentUrl, // Add this field
      },
    });
    console.log('[FixedTankController] Tank created successfully:', newTank);
    res.status(201).json(newTank);
    return;
  } catch (error: any) {
    console.error('[FixedTankController] Error during prisma.create:', error); 
    if (error.code === 'P2002' && error.meta?.target?.includes('tank_identifier')) {
        res.status(409).json({ message: 'Tank with this identifier already exists.' });
        return;
    }
    next(error);
  }
};

// GET /api/fuel/fixed-tanks - Dobijanje liste svih fiksnih tankova
export const getAllFixedStorageTanks: RequestHandler = async (req, res, next) => {
  try {
    const { status, fuel_type } = req.query;
    const filters: any = {};
    if (status) filters.status = status as string;
    if (fuel_type) filters.fuel_type = fuel_type as string;

    const tanks = await prisma.fixedStorageTanks.findMany({
      where: filters,
      orderBy: {
        createdAt: 'desc',
      }
    });
    res.status(200).json(tanks);
  } catch (error: any) {
    next(error);
  }
};

// GET /api/fuel/fixed-tanks/:id - Dobijanje detalja specifičnog fiksnog tanka
export const getFixedStorageTankById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tank = await prisma.fixedStorageTanks.findUnique({
      where: { id: parseInt(id) },
    });
    if (!tank) {
      res.status(404).json({ message: 'Fixed storage tank not found' });
      return;
    }
    res.status(200).json(tank);
  } catch (error: any) {
    next(error);
  }
};

// PUT /api/fuel/fixed-tanks/:id - Ažuriranje fiksnog tanka
export const updateFixedStorageTank: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Note: tank_name, fuel_type, etc. are now coming from req.body, not directly destructured if using FormData
    // When using multer with FormData, non-file fields are in req.body
    const { 
      tank_name, 
      // tank_identifier should not be updatable after creation, handle this logic if needed
      capacity_liters,
      // current_quantity_liters, // This should be managed by transactions, not direct update typically
      fuel_type, 
      location_description, 
      status,
      remove_document // Expect 'true' or '1' if client wants to remove existing doc without uploading new
    } = req.body;

    const tankId = parseInt(id);
    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID.' });
      return;
    }

    const existingTank = await prisma.fixedStorageTanks.findUnique({
      where: { id: tankId },
    });

    if (!existingTank) {
      // If a file was uploaded but tank not found, delete the uploaded temp file
      if (req.file) {
        // req.file.path is the path to the temporary file saved by multer
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
      }
      res.status(404).json({ message: 'Fixed storage tank not found for update.' });
      return;
    }
    
    const updateData: any = {}; // Prisma's FixedStorageTanksUpdateInput type would be better

    if (tank_name !== undefined) updateData.tank_name = String(tank_name);
    // tank_identifier is generally not updated. If it needs to be, add specific logic.
    // For now, we assume it's fixed after creation.

    if (capacity_liters !== undefined) updateData.capacity_liters = parseFloat(String(capacity_liters));
    // current_quantity_liters should ideally be updated via transactions (intake, transfer, drain)
    // Direct updates can lead to data inconsistency. For now, removing direct update.
    // if (current_quantity_liters !== undefined) updateData.current_quantity_liters = parseFloat(String(current_quantity_liters));
    
    if (fuel_type !== undefined) updateData.fuel_type = String(fuel_type);
    if (location_description !== undefined) {
      updateData.location_description = location_description === "" || location_description === null ? null : String(location_description);
    }
    if (status !== undefined) updateData.status = String(status);

    // Handle document upload/removal
    let oldDocumentUrl: string | null = existingTank.identificationDocumentUrl;

    if (req.file) { // New file uploaded
      // Delete old document if it exists
      if (oldDocumentUrl) {
        deleteFileFromServer(oldDocumentUrl);
      }

      const newFileName = req.file.filename; // Multer provides unique name in temp
      const finalFilePath = path.join(FULL_UPLOADS_DIR, newFileName);
      const tempFilePath = req.file.path;

      try {
        fs.renameSync(tempFilePath, finalFilePath); // Move from temp to final destination
        updateData.identificationDocumentUrl = `${PUBLIC_UPLOADS_BASE_PATH}${newFileName}`; // Store URL path
      } catch (fsError) {
        console.error('Error moving uploaded file:', fsError);
        // Attempt to clean up temp file if move fails
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        // Do not proceed with DB update for document if file system operation failed
        // but continue with other field updates if any.
        // Or, decide to fail the whole request:
        // return res.status(500).json({ message: 'Error processing uploaded file.' });
      }
    } else if (remove_document === 'true' || remove_document === '1') {
      if (oldDocumentUrl) {
        deleteFileFromServer(oldDocumentUrl);
        updateData.identificationDocumentUrl = null; // Set to null in DB
      }
    }

    // Validate capacity vs current quantity (if either is changing or already set)
    const finalCapacity = updateData.capacity_liters !== undefined ? updateData.capacity_liters : existingTank.capacity_liters;
    // Since current_quantity_liters is not directly updatable here, use existing value for validation
    const currentLiters = existingTank.current_quantity_liters;

    if (currentLiters > finalCapacity) {
      // If a file was uploaded but validation fails, delete the newly moved file
      if (req.file && updateData.identificationDocumentUrl) {
         deleteFileFromServer(updateData.identificationDocumentUrl);
         // also ensure updateData.identificationDocumentUrl is not set for the DB update
         delete updateData.identificationDocumentUrl;
      }
      res.status(400).json({
        message: `Current liters (${currentLiters} L) cannot exceed capacity (${finalCapacity} L).`,
      });
      return;
    }

    if (Object.keys(updateData).length === 0 && !req.file && !(remove_document === 'true' || remove_document === '1')) {
      // If a file was uploaded but no other data, it would have been handled above.
      // This means no actual changes are being made.
      res.status(200).json(existingTank); // Or 304 Not Modified, or 400 if no changes is an error
      return;
    }

    const updatedTank = await prisma.fixedStorageTanks.update({
      where: { id: tankId },
      data: updateData,
    });
    res.status(200).json(updatedTank);
  } catch (error: any) {
    // If an error occurs and a file was uploaded and moved, attempt to delete it to prevent orphans
    if (req.file && error) { 
        // Check if the file was successfully moved to its final destination
        const finalFilePathToCheck = path.join(FULL_UPLOADS_DIR, req.file.filename);
        if (fs.existsSync(finalFilePathToCheck)) {
            deleteFileFromServer(`${PUBLIC_UPLOADS_BASE_PATH}${req.file.filename}`);
        } else if (fs.existsSync(req.file.path)) { // if it's still in temp (e.g. move failed)
            fs.unlinkSync(req.file.path);
        }
    }

    if (error.code === 'P2002' && error.meta?.target?.includes('tank_identifier')) {
        res.status(409).json({ message: 'Another tank with this identifier already exists.' });
        return;
    }
    // Add more specific error handling if needed
    console.error("Update Fixed Tank Error:", error);
    next(error);
  }
};

// DELETE /api/fuel/fixed-tanks/:id - Logičko brisanje ili deaktivacija fiksnog tanka
// For this example, we'll implement a status change to 'Neaktivan' or 'Na održavanju'
// A true delete might be: await prisma.fixedStorageTanks.delete({ where: { id: parseInt(id) } });
export const deleteFixedStorageTank: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Option 1: Change status to 'Neaktivan' (logical delete)
    const deactivatedTank = await prisma.fixedStorageTanks.update({
      where: { id: parseInt(id) },
      data: { status: FixedTankStatus.INACTIVE }, // Or some other status indicating it's not in use
    });
    // Option 2: Actual delete (if preferred and safe considering relations)
    // await prisma.fixedStorageTanks.delete({ where: { id: parseInt(id) } });
    
    res.status(200).json({ message: 'Fixed storage tank status set to Neaktivan (logically deleted).', tank: deactivatedTank });
  } catch (error: any) {
    if (error.code === 'P2025') {
        res.status(404).json({ message: 'Fixed storage tank not found for deactivation/deletion.' });
        return;
    }
    next(error);
  }
};

// GET /api/fuel/fixed-tanks/:tankId/history - Get transaction history for a fixed tank
export const getFixedTankHistory: RequestHandler = async (req, res, next): Promise<void> => {
  const { tankId } = req.params;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  if (isNaN(parseInt(tankId))) {
    res.status(400).json({ message: 'Invalid Tank ID provided.' });
    return;
  }

  try {
    const parsedTankId = parseInt(tankId);

    const dateFiltersCondition: any = {};

    // Validate and parse startDate
    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
      const parsedStartDate = new Date(startDate);
      if (!isNaN(parsedStartDate.getTime())) {
        dateFiltersCondition.gte = parsedStartDate;
      } else {
        console.warn(`Invalid startDate format received: ${startDate}`);
      }
    }

    // Validate and parse endDate
    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
      const parsedEndDate = new Date(endDate);
      if (!isNaN(parsedEndDate.getTime())) {
        parsedEndDate.setHours(23, 59, 59, 999); // Set to end of day
        dateFiltersCondition.lte = parsedEndDate;
      } else {
        console.warn(`Invalid endDate format received: ${endDate}`);
      }
    }

    // Unified conditions for FixedTankTransfers (Intakes, Internal Transfers In/Out)
    const fixedTankTransferWhereConditions: Prisma.FixedTankTransfersWhereInput = {
      AND: [
        (Object.keys(dateFiltersCondition).length > 0 ? { transfer_datetime: dateFiltersCondition } : {}),
        {
          OR: [
            { affected_fixed_tank_id: parsedTankId, activity_type: FixedTankActivityType.INTAKE },
            { affected_fixed_tank_id: parsedTankId, activity_type: FixedTankActivityType.INTERNAL_TRANSFER_IN },
            { affected_fixed_tank_id: parsedTankId, activity_type: FixedTankActivityType.INTERNAL_TRANSFER_OUT },
          ],
        }
      ]
    };

    const transferToMobileWhereConditions: any = { 
      sourceFixedStorageTankId: parsedTankId,
    };
    if (Object.keys(dateFiltersCondition).length > 0) {
      transferToMobileWhereConditions.dateTime = dateFiltersCondition;
    }

    const drainWhereConditions: any = {
      sourceFixedTankId: parsedTankId, 
      sourceType: 'fixed', 
    };
    if (Object.keys(dateFiltersCondition).length > 0) {
      drainWhereConditions.dateTime = dateFiltersCondition; 
    }

    const fixedTankTransferRecords = await prisma.fixedTankTransfers.findMany({
      where: fixedTankTransferWhereConditions, 
      include: {
        affectedFixedTank: { select: { tank_name: true } },
        counterpartyFixedTank: { select: { tank_name: true, tank_identifier: true } },
        fuelIntakeRecord: { 
          select: {
            delivery_note_number: true,
            supplier_name: true,
            delivery_vehicle_plate: true,
          },
        },
      },
      orderBy: {
        transfer_datetime: 'desc',
      },
    });

    const transfersToMobileTankers = await prisma.fuelTransferToTanker.findMany({
      where: transferToMobileWhereConditions, // Updated variable name
      include: {
        targetFuelTank: { 
          select: {
            name: true, 
            identifier: true,
          },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    });

    const drainRecords = await prisma.fuelDrainRecord.findMany({
      where: drainWhereConditions,
      include: {
        user: { select: { username: true } }, 
      },
      orderBy: {
        dateTime: 'desc', 
      },
    });

    // Map FixedTankTransfers (Intakes, Internal Transfers In/Out)
    const formattedFixedTankTransfers = fixedTankTransferRecords.map(activity => {
      let type: string = '';
      let quantityLitersValue: Prisma.Decimal = activity.quantity_liters_transferred;
      let relatedDocument: string | undefined = undefined;
      let sourceOrDestination: string | undefined = undefined;
      const notes: string | undefined = activity.notes || undefined;
      const tankName = activity.affectedFixedTank?.tank_name || 'Nepoznat rezervoar';

      switch (activity.activity_type) {
        case FixedTankActivityType.INTAKE:
          type = 'intake';
          relatedDocument = activity.fuelIntakeRecord?.delivery_note_number || 'N/A';
          sourceOrDestination = `${activity.fuelIntakeRecord?.supplier_name || 'Dobavljač N/A'} (Vozilo: ${activity.fuelIntakeRecord?.delivery_vehicle_plate || 'N/A'})`;
          // quantityLitersValue is already positive
          break;
        case FixedTankActivityType.INTERNAL_TRANSFER_IN:
          type = 'internal_transfer_in';
          relatedDocument = `Interni Transfer ID: ${activity.id}`;
          sourceOrDestination = `Iz tanka: ${activity.counterpartyFixedTank?.tank_name || 'N/A'} (${activity.counterpartyFixedTank?.tank_identifier || 'N/A'})`;
          // quantityLitersValue is already positive
          break;
        case FixedTankActivityType.INTERNAL_TRANSFER_OUT:
          type = 'internal_transfer_out';
          relatedDocument = `Interni Transfer ID: ${activity.id}`;
          sourceOrDestination = `U tank: ${activity.counterpartyFixedTank?.tank_name || 'N/A'} (${activity.counterpartyFixedTank?.tank_identifier || 'N/A'})`;
          if (quantityLitersValue.isPositive()) {
            quantityLitersValue = quantityLitersValue.negated();
          }
          break;
        default:
          console.warn(`Unhandled FixedTankActivityType: ${activity.activity_type} for record id ${activity.id} in FixedTankTransfers`);
          return null; // Allows filtering out unhandled types
      }

      return {
        id: `${type.replace(/_/g, '-')}-${activity.id}`,
        type: type as any, // Cast to match frontend expected types
        transaction_datetime: activity.transfer_datetime ? activity.transfer_datetime.toISOString() : null,
        quantityLiters: quantityLitersValue.toString(), // Send as string
        relatedDocument,
        sourceOrDestination,
        notes,
        // Only include tankName for intakes, or if relevant for other types based on frontend needs
        tankName: activity.activity_type === FixedTankActivityType.INTAKE ? tankName : undefined,
      };
    }).filter(Boolean) as any[]; // Filter out nulls and assert type for combinedHistory


    const formattedTransfersToMobile = transfersToMobileTankers.map(transfer => {
      // Parsiranje MRN breakdown podataka ako postoje
      let mrnInfo = [];
      if (transfer.mrnBreakdown) {
        try {
          const mrnData = JSON.parse(transfer.mrnBreakdown);
          mrnInfo = mrnData.map((item: { mrn: string, quantity: number }) => 
            `${item.mrn}: ${item.quantity.toFixed(2)} L`
          );
        } catch (e) {
          console.error(`Error parsing MRN breakdown for transfer ${transfer.id}:`, e);
        }
      }
      
      return {
        id: `transfer-out-${transfer.id}`,
        type: 'transfer_to_mobile' as const, 
        transaction_datetime: transfer.dateTime ? transfer.dateTime.toISOString() : null, 
        quantityLiters: -transfer.quantityLiters, // Ensure negative for outgoing
        relatedDocument: `Transfer ID: ${transfer.id}`,
        sourceOrDestination: `Mobilni Tanker: ${transfer.targetFuelTank?.name || 'N/A'} (${transfer.targetFuelTank?.identifier || 'N/A'})`,
        notes: transfer.notes || undefined,
        mrn_breakdown: mrnInfo.length > 0 ? mrnInfo : undefined,
      };
    });

    const formattedDrains = drainRecords.map(drain => {
      // Check if this is a reverse transaction (negative quantity in the database indicates a reverse transaction)
      const isReverseTransaction = Number(drain.quantityLiters) < 0;
      
      return {
        id: `fuel-drain-${drain.id}`,
        // Use a different type for reverse transactions to display them differently in the UI
        type: isReverseTransaction ? 'fuel_return' as const : 'fuel_drain' as const,
        transaction_datetime: drain.dateTime ? drain.dateTime.toISOString() : null,
        // For reverse transactions, we want to show the positive quantity
        // For regular drains, we want to show the negative quantity
        quantityLiters: isReverseTransaction ? Math.abs(Number(drain.quantityLiters)) : -Number(drain.quantityLiters),
        relatedDocument: drain.notes || 'N/A',
        // Different description for reverse transactions
        sourceOrDestination: isReverseTransaction 
          ? `Povrat filtriranog goriva (Korisnik: ${drain.user?.username || 'N/A'})` 
          : `Drenirano iz tanka (Korisnik: ${drain.user?.username || 'N/A'})`,
        notes: drain.notes || undefined,
      };
    });

    const combinedHistory = [
      ...formattedFixedTankTransfers, 
      ...formattedTransfersToMobile, 
      ...formattedDrains
    ];

    combinedHistory.sort((a, b) => new Date(b.transaction_datetime || 0).getTime() - new Date(a.transaction_datetime || 0).getTime());

    res.status(200).json(combinedHistory);

  } catch (error: any) {
    console.error("[FixedTankHistory] Error fetching tank history:", error);
    next(error);
  }
};

// GET /api/fuel/fixed-tanks/summary/total-intake - Get total fuel intake across all fixed tanks for a date range
export const getTotalFixedTankIntake: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFiltersCondition: Prisma.DateTimeFilter = {};

    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
      const parsedStartDate = new Date(startDate);
      if (!isNaN(parsedStartDate.getTime())) {
        parsedStartDate.setHours(0, 0, 0, 0); // Set to start of day
        dateFiltersCondition.gte = parsedStartDate;
      } else {
        console.warn(`[TotalIntake] Invalid startDate format received: ${startDate}`);
      }
    }

    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
      const parsedEndDate = new Date(endDate);
      if (!isNaN(parsedEndDate.getTime())) {
        parsedEndDate.setHours(23, 59, 59, 999); // Set to end of day
        dateFiltersCondition.lte = parsedEndDate;
      } else {
        console.warn(`[TotalIntake] Invalid endDate format received: ${endDate}`);
      }
    }

    const whereConditions: Prisma.FixedTankTransfersWhereInput = {
      activity_type: FixedTankActivityType.INTAKE, // Ensure only actual intakes are summed
    };
    if (Object.keys(dateFiltersCondition).length > 0) {
      whereConditions.transfer_datetime = dateFiltersCondition;
    }

    const result = await prisma.fixedTankTransfers.aggregate({
      _sum: {
        quantity_liters_transferred: true,
      },
      where: whereConditions,
    });

    res.status(200).json({ totalIntake: result._sum.quantity_liters_transferred || 0 });

  } catch (error: any) {
    console.error("[TotalIntake] Error fetching total fixed tank intake:", error);
    next(error);
  }
};

// GET /api/fuel/fixed-tanks/summary/all-intakes-list - Get a list of all intake transactions across all fixed tanks for a date range
export const getCombinedIntakeHistoryList: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFiltersCondition: Prisma.DateTimeFilter = {};

    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
      const parsedStartDate = new Date(startDate);
      if (!isNaN(parsedStartDate.getTime())) {
        parsedStartDate.setHours(0, 0, 0, 0); // Set to start of day
        dateFiltersCondition.gte = parsedStartDate;
      } else {
        console.warn(`[CombinedIntakeList] Invalid startDate format received: ${startDate}`);
      }
    }

    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
      const parsedEndDate = new Date(endDate);
      if (!isNaN(parsedEndDate.getTime())) {
        parsedEndDate.setHours(23, 59, 59, 999); // Set to end of day
        dateFiltersCondition.lte = parsedEndDate;
      } else {
        console.warn(`[CombinedIntakeList] Invalid endDate format received: ${endDate}`);
      }
    }

    const whereConditions: Prisma.FixedTankTransfersWhereInput = {
      activity_type: FixedTankActivityType.INTAKE, // Ensure only actual intakes are fetched
    };
    if (Object.keys(dateFiltersCondition).length > 0) {
      whereConditions.transfer_datetime = dateFiltersCondition;
    }

    const intakeTransactions = await prisma.fixedTankTransfers.findMany({
      where: whereConditions,
      include: {
        affectedFixedTank: { 
          select: { tank_name: true }     
        },
        fuelIntakeRecord: {        
          select: { delivery_note_number: true } 
        }
      },
      orderBy: {
        transfer_datetime: 'desc',
      },
    });

    const formattedIntakes = intakeTransactions.map(intake => ({
      id: String(intake.id),
      transaction_datetime: intake.transfer_datetime ? intake.transfer_datetime.toISOString() : null,
      type: 'intake' as 'intake', 
      quantityLiters: intake.quantity_liters_transferred,
      notes: intake.notes || '',
      relatedDocument: intake.fuelIntakeRecord?.delivery_note_number || '', 
      user: 'Nepoznat korisnik', 
      tankId: intake.affected_fixed_tank_id, 
      tankName: intake.affectedFixedTank?.tank_name || 'Nepoznat rezervoar' 
    }));

    res.status(200).json(formattedIntakes);
    return;

  } catch (error: any) {
    console.error("[CombinedIntakeList] Error fetching combined fixed tank intake list:", error);
    next(error);
  }
};

// POST /api/fuel/fixed-tanks/internal-transfer - Transfer fuel between two fixed tanks
export const transferFuelBetweenFixedTanks: RequestHandler = async (req, res, next): Promise<void> => {
  const { sourceTankId, destinationTankId, quantityLiters, notes } = req.body;

  // Validate input
  if (!sourceTankId || !destinationTankId || !quantityLiters) {
    res.status(400).json({ message: 'Source tank ID, destination tank ID, and quantity are required.' });
    return;
  }
  if (quantityLiters <= 0) {
    res.status(400).json({ message: 'Quantity to transfer must be a positive number.' });
    return;
  }

  try {
    // Fetch both tanks in a single query if possible, or separately
    const sourceTank = await prisma.fixedStorageTanks.findUnique({
      where: { id: Number(sourceTankId) },
    });
    const destinationTank = await prisma.fixedStorageTanks.findUnique({
      where: { id: Number(destinationTankId) },
    });

    // Validations
    if (!sourceTank) {
      res.status(404).json({ message: `Source tank with ID ${sourceTankId} not found.` });
      return;
    }
    if (!destinationTank) {
      res.status(404).json({ message: `Destination tank with ID ${destinationTankId} not found.` });
      return;
    }
    if (sourceTank.status !== FixedTankStatus.ACTIVE) {
      res.status(400).json({ message: `Source tank '${sourceTank.tank_name}' is not active.` });
      return;
    }
    if (destinationTank.status !== FixedTankStatus.ACTIVE) {
      res.status(400).json({ message: `Destination tank '${destinationTank.tank_name}' is not active.` });
      return;
    }
    if (sourceTank.fuel_type !== destinationTank.fuel_type) {
      res.status(400).json({
        message: `Fuel type mismatch: Source tank has '${sourceTank.fuel_type}', destination tank has '${destinationTank.fuel_type}'.`,
      });
      return;
    }
    if (sourceTank.current_quantity_liters < quantityLiters) {
      res.status(400).json({
        message: `Insufficient fuel in source tank '${sourceTank.tank_name}'. Available: ${sourceTank.current_quantity_liters} L, Required: ${quantityLiters} L.`,
      });
      return;
    }
    const destinationTankAvailableCapacity = destinationTank.capacity_liters - destinationTank.current_quantity_liters;
    if (destinationTankAvailableCapacity < quantityLiters) {
      res.status(400).json({
        message: `Insufficient capacity in destination tank '${destinationTank.tank_name}'. Available capacity: ${destinationTankAvailableCapacity} L, Required: ${quantityLiters} L.`,
      });
      return;
    }

    const transferPairId = uuidv4();
    const transferTime = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Decrement source tank
      await tx.fixedStorageTanks.update({
        where: { id: sourceTank.id },
        data: { current_quantity_liters: { decrement: quantityLiters } },
      });

      // 2. Increment destination tank
      await tx.fixedStorageTanks.update({
        where: { id: destinationTank.id },
        data: { current_quantity_liters: { increment: quantityLiters } },
      });
      
      // 3. Implementacija FIFO logike za prenos goriva po carinskim prijavama (MRN)
      let remainingQuantityToTransfer = quantityLiters;
      
      // Dohvati sve zapise o gorivu po carinskim prijavama za izvorni tank, sortirano po datumu (FIFO)
      const sourceTankCustomsFuelRecords = await tx.$queryRaw<{
        id: number, 
        customs_declaration_number: string, 
        remaining_quantity_liters: number,
        fuel_intake_record_id: number | null
      }[]>`
        SELECT id, customs_declaration_number, remaining_quantity_liters, fuel_intake_record_id 
        FROM "TankFuelByCustoms" 
        WHERE fixed_tank_id = ${sourceTank.id} 
          AND remaining_quantity_liters > 0 
        ORDER BY date_added ASC
      `;
      
      console.log('[transferFuelBetweenFixedTanks] Processing FIFO transfer of customs declarations');
      
      // Prolazi kroz zapise po FIFO principu i prenosi gorivo
      for (const record of sourceTankCustomsFuelRecords) {
        if (remainingQuantityToTransfer <= 0) break;
        
        const recordId = record.id;
        const availableQuantity = parseFloat(record.remaining_quantity_liters.toString());
        const quantityToTransfer = Math.min(availableQuantity, remainingQuantityToTransfer);
        
        console.log(`[transferFuelBetweenFixedTanks] Transferring ${quantityToTransfer} L from customs record ID ${recordId} (MRN: ${record.customs_declaration_number})`);
        
        // Smanji količinu u izvornom zapisu
        await tx.$executeRaw`
          UPDATE "TankFuelByCustoms" 
          SET remaining_quantity_liters = remaining_quantity_liters - ${quantityToTransfer} 
          WHERE id = ${recordId}
        `;
        
        // Provjeri da li već postoji zapis za ovu carinsku prijavu u odredišnom tanku
        const existingDestinationRecord = await tx.$queryRaw<{ id: number, remaining_quantity_liters: number }[]>`
          SELECT id, remaining_quantity_liters 
          FROM "TankFuelByCustoms" 
          WHERE fixed_tank_id = ${destinationTank.id} 
            AND customs_declaration_number = ${record.customs_declaration_number}
        `;
        
        if (existingDestinationRecord.length > 0) {
          // Ako postoji, povećaj količinu
          await tx.$executeRaw`
            UPDATE "TankFuelByCustoms" 
            SET remaining_quantity_liters = remaining_quantity_liters + ${quantityToTransfer} 
            WHERE id = ${existingDestinationRecord[0].id}
          `;
        } else {
          // Ako ne postoji, kreiraj novi zapis
          await tx.$executeRaw`
            INSERT INTO "TankFuelByCustoms" (
              fixed_tank_id, 
              fuel_intake_record_id, 
              customs_declaration_number, 
              quantity_liters, 
              remaining_quantity_liters, 
              date_added,
              "createdAt",
              "updatedAt"
            ) VALUES (
              ${destinationTank.id}, 
              ${record.fuel_intake_record_id}, 
              ${record.customs_declaration_number}, 
              ${quantityToTransfer}, 
              ${quantityToTransfer}, 
              NOW(),
              NOW(),
              NOW()
            )
          `;
        }
        
        remainingQuantityToTransfer -= quantityToTransfer;
      }
      
      // Ako je ostalo još goriva za prenijeti, znači da nemamo dovoljno praćenog po MRN
      if (remainingQuantityToTransfer > 0) {
        console.log(`[transferFuelBetweenFixedTanks] Warning: ${remainingQuantityToTransfer} L not tracked by customs declarations`);
        
        // Kreiraj zapis u odredišnom tanku za nepraćeno gorivo
        await tx.$executeRaw`
          INSERT INTO "TankFuelByCustoms" (
            fixed_tank_id, 
            fuel_intake_record_id, 
            customs_declaration_number, 
            quantity_liters, 
            remaining_quantity_liters, 
            date_added,
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${destinationTank.id}, 
            NULL, 
            'UNTRACKED-TRANSFER-${transferPairId.substring(0, 8)}', 
            ${remainingQuantityToTransfer}, 
            ${remainingQuantityToTransfer}, 
            NOW(),
            NOW(),
            NOW()
          )
        `;
      }
      
      // 4. Create TRANSFER_OUT record
      await tx.fixedTankTransfers.create({
        data: {
          activity_type: FixedTankActivityType.INTERNAL_TRANSFER_OUT,
          affected_fixed_tank_id: sourceTank.id,
          counterparty_fixed_tank_id: destinationTank.id,
          internal_transfer_pair_id: transferPairId,
          quantity_liters_transferred: quantityLiters,
          quantity_kg_transferred: 0, // Default value for now, density calculations should be implemented
          transfer_datetime: transferTime,
          notes: notes || 'Interni izdatak goriva', // Translated to Bosnian
        },
      });

      // 5. Create TRANSFER_IN record
      await tx.fixedTankTransfers.create({
        data: {
          activity_type: FixedTankActivityType.INTERNAL_TRANSFER_IN,
          affected_fixed_tank_id: destinationTank.id,
          counterparty_fixed_tank_id: sourceTank.id,
          internal_transfer_pair_id: transferPairId,
          quantity_liters_transferred: quantityLiters,
          quantity_kg_transferred: 0, // Default value for now, density calculations should be implemented
          transfer_datetime: transferTime,
          notes: notes || 'Interni prijem goriva', // Translated to Bosnian
        },
      });
    });

    res.status(200).json({ message: 'Fuel transfer successful.' });
    return;

  } catch (error: any) {
    console.error('[TransferFuel] Error during fuel transfer:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle known Prisma errors, e.g., transaction failure
        res.status(500).json({ message: 'Database transaction failed.', details: error.message });
        return;
    }
    next(error);
  }
};

// GET /api/fuel/fixed-tanks/mrn-history/:mrnNumber - Dobijanje historije transakcija za određeni MRN broj
export const getMrnTransactionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const mrnNumber = req.params.mrnNumber;
    
    if (!mrnNumber) {
      res.status(400).json({ message: 'MRN broj je obavezan.' });
      return;
    }
    
    // Dohvati originalni unos goriva s ovim MRN brojem
    const originalIntake = await prisma.fuelIntakeRecords.findFirst({
      where: { customs_declaration_number: mrnNumber },
      include: {
        fixedTankTransfers: {
          include: {
            affectedFixedTank: {
              select: {
                id: true,
                tank_name: true,
                tank_identifier: true
              }
            }
          }
        }
      }
    });
    
    if (!originalIntake) {
      res.status(404).json({ message: `Nije pronađen unos goriva s MRN brojem: ${mrnNumber}` });
      return;
    }
    
    // Dohvati sve zapise o gorivu po ovom MRN broju
    const mrnRecords = await prisma.$queryRaw<any[]>`
      SELECT 
        tfc.id, 
        tfc.fixed_tank_id, 
        tfc.customs_declaration_number,
        tfc.quantity_liters,
        tfc.remaining_quantity_liters,
        tfc.date_added,
        fst.tank_name,
        fst.tank_identifier,
        fst.fuel_type
      FROM "TankFuelByCustoms" tfc
      JOIN "FixedStorageTanks" fst ON tfc.fixed_tank_id = fst.id
      WHERE tfc.customs_declaration_number = ${mrnNumber}
      ORDER BY tfc.date_added ASC
    `;
    
    // Dohvati historiju transakcija koje su koristile gorivo s ovim MRN brojem
    // Ovo uključuje interne transfere, točenja u mobilne tankere i drenaže
    
    // 1. Interne transfere
    const internalTransfers = await prisma.$queryRaw<any[]>`
      SELECT 
        'internal_transfer' as transaction_type,
        ft.transfer_datetime as transaction_datetime,
        ft.quantity_liters_transferred as quantity_liters,
        ft.notes,
        source.id as source_tank_id,
        source.tank_name as source_tank_name,
        source.tank_identifier as source_tank_identifier,
        dest.id as destination_tank_id,
        dest.tank_name as destination_tank_name,
        dest.tank_identifier as destination_tank_identifier
      FROM "FixedTankTransfers" ft
      JOIN "FixedStorageTanks" source ON ft.affected_fixed_tank_id = source.id
      JOIN "FixedStorageTanks" dest ON ft.counterparty_fixed_tank_id = dest.id
      WHERE ft.activity_type = 'INTERNAL_TRANSFER_OUT'
      AND ft.notes LIKE '%${mrnNumber}%'
      ORDER BY ft.transfer_datetime DESC
    `;
    
    // 2. Točenja u mobilne tankere
    const tankerTransfers = await prisma.$queryRaw<any[]>`
      SELECT 
        'tanker_transfer' as transaction_type,
        ftt."dateTime" as transaction_datetime,
        ftt."quantityLiters" as quantity_liters,
        ftt.notes,
        ftt."mrnBreakdown",
        source.id as source_tank_id,
        source.tank_name as source_tank_name,
        source.tank_identifier as source_tank_identifier,
        ft.id as tanker_id,
        ft.name as tanker_name,
        ft.identifier as tanker_identifier
      FROM "FuelTransferToTanker" ftt
      JOIN "FixedStorageTanks" source ON ftt."sourceFixedStorageTankId" = source.id
      JOIN "FuelTank" ft ON ftt."targetFuelTankId" = ft.id
      WHERE ftt."mrnBreakdown" LIKE '%${mrnNumber}%'
      ORDER BY ftt."dateTime" DESC
    `;
    
    // 3. Drenaže goriva
    const drainOperations = await prisma.$queryRaw<any[]>`
      SELECT 
        'fuel_drain' as transaction_type,
        fd."dateTime" as transaction_datetime,
        fd."quantityLiters" as quantity_liters,
        fd.notes,
        fd."mrnBreakdown",
        source.id as source_tank_id,
        source.tank_name as source_tank_name,
        source.tank_identifier as source_tank_identifier
      FROM "FuelDrainRecord" fd
      JOIN "FixedStorageTanks" source ON fd."sourceFixedTankId" = source.id
      WHERE fd."sourceType" = 'fixed_tank'
      AND fd."mrnBreakdown" LIKE '%${mrnNumber}%'
      ORDER BY fd."dateTime" DESC
    `;
    
    // Kombinuj sve transakcije i sortiraj po datumu
    const allTransactions = [
      ...internalTransfers.map(tx => ({
        ...tx,
        transaction_type_display: 'Interni transfer'
      })),
      ...tankerTransfers.map(tx => ({
        ...tx,
        transaction_type_display: 'Točenje u mobilni tanker'
      })),
      ...drainOperations.map(tx => ({
        ...tx,
        transaction_type_display: 'Drenaža goriva'
      }))
    ].sort((a, b) => new Date(b.transaction_datetime).getTime() - new Date(a.transaction_datetime).getTime());
    
    // Pripremi odgovor
    const response = {
      mrn_number: mrnNumber,
      original_intake: {
        id: originalIntake.id,
        intake_datetime: originalIntake.intake_datetime,
        delivery_vehicle_plate: originalIntake.delivery_vehicle_plate,
        supplier_name: originalIntake.supplier_name,
        quantity_liters_received: originalIntake.quantity_liters_received,
        tank_distributions: originalIntake.fixedTankTransfers.map((transfer: any) => ({
          tank_id: transfer.affected_fixed_tank_id,
          tank_name: transfer.affectedFixedTank?.tank_name,
          tank_identifier: transfer.affectedFixedTank?.tank_identifier,
          quantity_liters: transfer.quantity_liters_transferred
        }))
      },
      current_status: mrnRecords.map((record: any) => ({
        tank_id: record.fixed_tank_id,
        tank_name: record.tank_name,
        tank_identifier: record.tank_identifier,
        fuel_type: record.fuel_type,
        original_quantity_liters: parseFloat(record.quantity_liters),
        remaining_quantity_liters: parseFloat(record.remaining_quantity_liters),
        date_added: record.date_added
      })),
      transaction_history: allTransactions
    };
    
    res.status(200).json(response);
    return;
    
  } catch (error: any) {
    console.error('[getMrnTransactionHistory] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json({ message: 'Database error.', details: error.message });
      return;
    }
    next(error);
  }
};

// GET /api/fuel/fixed-tanks/:id/customs-breakdown - Dobijanje raščlanjenog stanja goriva po carinskim prijavama (MRN)
export const getTankFuelByCustoms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tankId = parseInt(req.params.id);
    
    if (isNaN(tankId)) {
      res.status(400).json({ message: 'Invalid tank ID format.' });
      return;
    }
    
    // Provjera da li tank postoji
    const tank = await prisma.fixedStorageTanks.findUnique({
      where: { id: tankId },
      select: {
        id: true,
        tank_name: true,
        tank_identifier: true,
        fuel_type: true,
        current_quantity_liters: true
      }
    });
    
    if (!tank) {
      res.status(404).json({ message: `Tank with ID ${tankId} not found.` });
      return;
    }
    
    // Definiraj tip za rezultat upita
    type CustomsFuelRecord = {
      id: number;
      fixed_tank_id: number;
      fuel_intake_record_id: number;
      customs_declaration_number: string;
      quantity_liters: string | number;
      remaining_quantity_liters: string | number;
      quantity_kg: string | number;
      remaining_quantity_kg: string | number;
      date_added: Date;
      delivery_vehicle_plate: string | null;
      supplier_name: string | null;
      intake_datetime: Date | null;
      specific_gravity: string | number | null;
    };

    // Dohvati podatke o gorivu po carinskim prijavama za ovaj tank, sortirano po datumu (FIFO)
    const customsFuelBreakdown = await prisma.$queryRaw<CustomsFuelRecord[]>`
      SELECT 
        tfc.id, 
        tfc.fixed_tank_id, 
        tfc.fuel_intake_record_id,
        tfc.customs_declaration_number,
        tfc.quantity_liters,
        tfc.remaining_quantity_liters,
        tfc.quantity_kg,
        tfc.remaining_quantity_kg,
        tfc.date_added,
        fir.delivery_vehicle_plate,
        fir.supplier_name,
        fir.intake_datetime,
        fir.specific_gravity
      FROM "TankFuelByCustoms" tfc
      LEFT JOIN "FuelIntakeRecords" fir ON tfc.fuel_intake_record_id = fir.id
      WHERE tfc.fixed_tank_id = ${tankId}
        AND tfc.remaining_quantity_liters > 0
      ORDER BY tfc.date_added ASC
    `;
    
    // Pripremi odgovor
    const response = {
      tank: tank,
      customs_breakdown: customsFuelBreakdown.map((item: any) => ({
        id: item.id,
        customs_declaration_number: item.customs_declaration_number,
        quantity_liters: parseFloat(item.quantity_liters),
        remaining_quantity_liters: parseFloat(item.remaining_quantity_liters),
        // Format kg values safely with defensive coding to handle any data format
        quantity_kg: item.quantity_kg ? Number(Number(item.quantity_kg).toFixed(3)) : 0,
        remaining_quantity_kg: item.remaining_quantity_kg ? Number(Number(item.remaining_quantity_kg).toFixed(3)) : 0,
        specific_gravity: item.specific_gravity ? parseFloat(item.specific_gravity) : null,
        date_added: item.date_added,
        supplier_name: item.supplier_name || null,
        delivery_vehicle_plate: item.delivery_vehicle_plate || null
      })),
      total_customs_tracked_liters: customsFuelBreakdown.reduce(
        (sum: number, item: any) => sum + parseFloat(item.remaining_quantity_liters), 0
      )
    };
    
    res.status(200).json(response);
    return;
    
  } catch (error: any) {
    console.error('[getTankFuelByCustoms] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json({ message: 'Database error.', details: error.message });
      return;
    }
    next(error);
  }
};
