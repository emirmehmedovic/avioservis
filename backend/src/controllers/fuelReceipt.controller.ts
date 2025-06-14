import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth'; // Import AuthRequest
import { PrismaClient, FixedStorageTanks, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const createFuelReceipt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { dateTime, fixedStorageTankId, supplier, quantityLiters, notes } = req.body;
  const file = req.file;

  if (!file) {
    res.status(400).json({ message: 'Document file is required.' });
    return;
  }

  // Konvertiranje stringova iz body-ja u odgovarajuće tipove ako je potrebno
  const parsedFixedStorageTankId = parseInt(fixedStorageTankId, 10);
  const parsedQuantityLiters = parseFloat(quantityLiters);
  const parsedDateTime = new Date(dateTime);

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Provjeri tank i kapacitet
      const tank = await tx.fixedStorageTanks.findUnique({
        where: { id: parsedFixedStorageTankId },
      });

      if (!tank) {
        throw new Error(`FixedStorageTank with ID ${parsedFixedStorageTankId} not found.`);
      }

      if (tank.current_quantity_liters + parsedQuantityLiters > tank.capacity_liters) {
        throw new Error(
          `Adding ${parsedQuantityLiters}L would exceed tank capacity of ${tank.capacity_liters}L. Current: ${tank.current_quantity_liters}L.`
        );
      }

      // 2. Kreiraj FuelReceipt
      const fuelReceipt = await tx.fuelReceipt.create({
        data: {
          dateTime: parsedDateTime,
          fixedStorageTankId: parsedFixedStorageTankId,
          supplier: supplier || null, // Osiguraj null ako je prazan string ili undefined
          quantityLiters: parsedQuantityLiters,
          notes: notes || null,
          userId: req.user!.id, // Pretpostavka da req.user sadrži ID logiranog korisnika
        },
      });

      // 3. Kreiraj AttachedDocument
      const document = await tx.attachedDocument.create({
        data: {
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: file.path, // Putanja spremljenog fajla
          fuelReceiptId: fuelReceipt.id,
          // fuelTransferToTankerId će biti null
        },
      });

      // 4. Ažuriraj količinu u tanku
      const updatedTank = await tx.fixedStorageTanks.update({
        where: { id: parsedFixedStorageTankId },
        data: {
          current_quantity_liters: {
            increment: parsedQuantityLiters,
          },
        },
      });

      return { fuelReceipt, document, updatedTank };
    });

    res.status(201).json({
      message: 'Fuel receipt created successfully.',
      fuelReceipt: result.fuelReceipt,
      document: result.document,
      updatedTank: result.updatedTank,
    });

  } catch (error: any) {
    // Ako dođe do greške tokom transakcije (ili prije nje, npr. nevalidan tankId),
    // obriši uploadani fajl jer transakcija nije uspjela.
    if (file && file.path) {
      try {
        fs.unlinkSync(file.path);
        console.log(`Deleted orphaned file: ${file.path}`);
      } catch (e) {
        console.error('Error deleting orphaned file:', e);
        // Možda logirati ovu grešku u poseban sistem za praćenje
      }
    }
    // Vraćanje eksplicitnog returna za Promise<void> da se izbjegne linting greška (ako je primjenjivo)
    // Za MEMORY[0edb3b07-ef92-4f99-817d-3fbd6d1508c5]
    // next(error); <--- Originalno, ali može uzrokovati 'Promise<Response | undefined>' is not assignable to 'Promise<void>'
    // Ispravka na osnovu MEMORY:
    if (!res.headersSent) {
        next(error);
    } else {
        // Ako su headeri već poslani (što ne bi trebalo biti ovdje, ali za svaki slučaj)
        // onda samo logiraj grešku jer ne možeš poslati novi odgovor
        console.error("Error after headers sent in createFuelReceipt:", error);
    }
  }
};
