import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadServiceRecordDocument } from '../middleware/documentUpload';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

// Define mapping between service item types and vehicle date fields
const serviceItemToVehicleFieldMap = {
  // Hose related fields
  HOSE_HD63: {
    current: 'last_hose_hd63_replacement_date',
    next: 'next_hose_hd63_replacement_date'
  },
  HOSE_HD38: {
    current: 'last_hose_hd38_replacement_date',
    next: 'next_hose_hd38_replacement_date'
  },
  HOSE_TW75: {
    current: 'last_hose_tw75_replacement_date',
    next: 'next_hose_tw75_replacement_date'
  },
  HOSE_LEAK_TEST: {
    current: 'last_hose_leak_test_date',
    next: 'next_hose_leak_test_date'
  },
  HD38_PRESSURE_TEST: {
    current: 'datum_testiranja_pritiska_crijeva_hd38',
    next: null
  },
  HD63_PRESSURE_TEST: {
    current: 'datum_testiranja_pritiska_crijeva_hd63',
    next: null
  },
  TW75_PRESSURE_TEST: {
    current: 'datum_testiranja_pritiska_crijeva_tw75',
    next: null
  },
  OVERWING_HOSE_TEST: {
    current: 'overwing_hose_test_date',
    next: null
  },
  UNDERWING_HOSE_TEST: {
    current: 'underwing_hose_test_date',
    next: null
  },
  
  // Calibration items
  VOLUMETER: {
    current: 'last_volumeter_calibration_date',
    next: 'next_volumeter_calibration_date'
  },
  MANOMETER: {
    current: 'last_manometer_calibration_date',
    next: 'next_manometer_calibration_date'
  },
  HECPV_ILCPV: {
    current: 'last_hecpv_ilcpv_test_date',
    next: 'next_hecpv_ilcpv_test_date'
  },
  SIX_MONTH_CHECK: {
    current: 'last_6_month_check_date',
    next: 'next_6_month_check_date'
  },
  QUARTERLY_INSPECTION: {
    current: 'tromjesecni_pregled_datum',
    next: 'tromjesecni_pregled_vazi_do'
  },
  
  // Filter related
  FILTER: {
    current: 'filter_replacement_date',
    next: 'filter_expiry_date'
  },
  FILTER_ANNUAL_INSPECTION: {
    current: 'filter_annual_inspection_date',
    next: 'filter_next_annual_inspection_date'
  },
  FILTER_EW_SENSOR_INSPECTION: {
    current: 'filter_ew_sensor_inspection_date',
    next: null
  },
  
  // Tanker related
  TANKER_PRESSURE_TEST: {
    current: 'tanker_last_pressure_test_date',
    next: 'tanker_next_pressure_test_date'
  },
  TANKER_FIRE_SAFETY_TEST: {
    current: 'tanker_last_fire_safety_test_date',
    next: 'tanker_next_fire_safety_test_date'
  },
  TANKER_CALIBRATION: {
    current: 'cisterna_zadnja_kalibracija',
    next: 'cisterna_naredna_kalibracija'
  },
  
  // Meter calibrations
  CONDUCTIVITY_METER_CALIBRATION: {
    current: 'conductivity_meter_calibration_date',
    next: 'conductivity_meter_calibration_valid_until'
  },
  HYDROMETER_CALIBRATION: {
    current: 'hydrometer_calibration_date',
    next: 'hydrometer_calibration_valid_until'
  },
  MAIN_FLOW_METER_CALIBRATION: {
    current: 'main_flow_meter_calibration_date',
    next: 'main_flow_meter_calibration_valid_until'
  },
  RESISTANCE_METER_CALIBRATION: {
    current: 'resistance_meter_calibration_date',
    next: 'resistance_meter_calibration_valid_until'
  },
  THERMOMETER_CALIBRATION: {
    current: 'thermometer_calibration_date',
    next: 'thermometer_calibration_valid_until'
  },
  TORQUE_WRENCH_CALIBRATION: {
    current: 'torque_wrench_calibration_date',
    next: 'torque_wrench_calibration_valid_until'
  },
  
  // Regular checks
  WATER_CHEMICAL_TEST: {
    current: 'water_chemical_test_date',
    next: 'water_chemical_test_valid_until'
  },
  
  // Vehicle components
  TACHOGRAPH_CALIBRATION: {
    current: 'tahograf_zadnja_kalibracija',
    next: 'tahograf_naredna_kalibracija'
  },
  ADR_CERTIFICATION: {
    current: null,
    next: 'adr_vazi_do'
  },
  CWD_EXPIRY: {
    current: null,
    next: 'datum_isteka_cwd'
  }
};

// Helper function to update vehicle date fields based on service items
async function updateVehicleDateFields(vehicleId: number, serviceItems: any[]) {
  try {
    // Prepare update data
    const updateData: Record<string, any> = {};
    
    for (const item of serviceItems) {
      const mapping = (serviceItemToVehicleFieldMap as any)[item.type];
      if (!mapping) continue;
      
      // Update current date field if it exists
      if (mapping.current && item.currentDate) {
        updateData[mapping.current] = new Date(item.currentDate);
      }
      
      // Update next date field if it exists
      if (mapping.next && item.nextDate) {
        updateData[mapping.next] = new Date(item.nextDate);
      }
    }
    
    // Only update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: updateData
      });
    }
  } catch (error) {
    console.error('Error updating vehicle date fields:', error);
    // We don't throw here to avoid breaking the service record creation
  }
}

// Get all service records for a vehicle
router.get('/vehicles/:vehicleId/service-records', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    
    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
    return;
    }

    // Get all service records for the vehicle with their service items
    const serviceRecords = await prisma.$queryRaw`
      SELECT sr.*, 
             json_agg(si.*) as "serviceItems"
      FROM "ServiceRecord" sr
      LEFT JOIN "ServiceItem" si ON sr."id" = si."serviceRecordId"
      WHERE sr."vehicleId" = ${vehicleId}
      GROUP BY sr.id
      ORDER BY sr."serviceDate" DESC
    `;

    res.json(serviceRecords);
    return;
  } catch (error) {
    console.error('Error fetching service records:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Get a specific service record
router.get('/vehicles/:vehicleId/service-records/:recordId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const recordId = parseInt(req.params.recordId);

    const serviceRecord = await prisma.$queryRaw`
      SELECT sr.*, 
             json_agg(si.*) as "serviceItems"
      FROM "ServiceRecord" sr
      LEFT JOIN "ServiceItem" si ON sr."id" = si."serviceRecordId"
      WHERE sr."id" = ${recordId} AND sr."vehicleId" = ${vehicleId}
      GROUP BY sr.id
    `;

    if (!serviceRecord || (Array.isArray(serviceRecord) && serviceRecord.length === 0)) {
      res.status(404).json({ message: 'Service record not found' });
    return;
    }

    res.json(Array.isArray(serviceRecord) ? serviceRecord[0] : serviceRecord);
    return;
  } catch (error) {
    console.error('Error fetching service record:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Create a new service record
router.post('/vehicles/:vehicleId/service-records', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    
    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
    return;
    }

    const { serviceDate, description, category, documentUrl, serviceItems } = req.body;

    // Create service record
    const serviceRecord = await prisma.$transaction(async (tx) => {
      // Create the service record
      const record = await tx.$executeRaw`
        INSERT INTO "ServiceRecord" ("vehicleId", "serviceDate", "description", "category", "documentUrl", "createdAt", "updatedAt")
        VALUES (${vehicleId}, ${new Date(serviceDate)}, ${description}, ${category}::"ServiceRecordCategory", ${documentUrl}, NOW(), NOW())
        RETURNING *
      `;
      
      // Get the created record ID
      const createdRecord = await tx.$queryRaw`
        SELECT * FROM "ServiceRecord" 
        WHERE "vehicleId" = ${vehicleId} 
        ORDER BY "createdAt" DESC 
        LIMIT 1
      `;
      
      // Safely extract the record ID
      let recordId: number;
      if (Array.isArray(createdRecord)) {
        recordId = (createdRecord[0] as any).id;
      } else {
        recordId = (createdRecord as any).id;
      }
      
      // Create service items
      if (serviceItems && serviceItems.length > 0) {
        for (const item of serviceItems) {
          await tx.$executeRaw`
            INSERT INTO "ServiceItem" ("serviceRecordId", "type", "description", "replaced", "currentDate", "nextDate", "createdAt", "updatedAt")
            VALUES (
              ${recordId}, 
              ${item.type}::"ServiceItemType", 
              ${item.description || null}, 
              ${item.replaced || false}, 
              ${item.currentDate ? new Date(item.currentDate) : null}, 
              ${item.nextDate ? new Date(item.nextDate) : null}, 
              NOW(), 
              NOW()
            )
          `;
        }
      }
      
      // Update vehicle date fields
      await updateVehicleDateFields(vehicleId, serviceItems);
      
      // Return the created record with items
      const result = await tx.$queryRaw`
        SELECT sr.*, 
               json_agg(si.*) as "serviceItems"
        FROM "ServiceRecord" sr
        LEFT JOIN "ServiceItem" si ON sr."id" = si."serviceRecordId"
        WHERE sr."id" = ${recordId}
        GROUP BY sr.id
      `;
      
      return Array.isArray(result) ? result[0] : result;
    });

    res.status(201).json(serviceRecord);
    return;
  } catch (error) {
    console.error('Error creating service record:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Update a service record
router.put('/vehicles/:vehicleId/service-records/:recordId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const recordId = parseInt(req.params.recordId);

    // Verify service record exists and belongs to the vehicle
    const existingRecord = await prisma.$queryRaw`
      SELECT * FROM "ServiceRecord"
      WHERE "id" = ${recordId} AND "vehicleId" = ${vehicleId}
    `;

    if (!existingRecord || (Array.isArray(existingRecord) && existingRecord.length === 0)) {
      res.status(404).json({ message: 'Service record not found' });
    return;
    }

    const { serviceDate, description, category, documentUrl, serviceItems } = req.body;

    // Update the service record
    const updatedServiceRecord = await prisma.$transaction(async (tx) => {
      // Update the service record
      if (serviceDate || description || category || documentUrl !== undefined) {
        let updateQuery = 'UPDATE "ServiceRecord" SET "updatedAt" = NOW()';
        const params: any[] = [];
        
        if (serviceDate) {
          params.push(new Date(serviceDate));
          updateQuery += `, "serviceDate" = $${params.length}`;
        }
        
        if (description) {
          params.push(description);
          updateQuery += `, "description" = $${params.length}`;
        }
        
        if (category) {
          params.push(category);
          updateQuery += `, "category" = $${params.length}`;
        }
        
        if (documentUrl !== undefined) {
          params.push(documentUrl);
          updateQuery += `, "documentUrl" = $${params.length}`;
        }
        
        params.push(recordId);
        updateQuery += ` WHERE "id" = $${params.length}`;
        
        await tx.$executeRawUnsafe(updateQuery, ...params);
      }

      // If service items are provided, update them
      if (serviceItems && serviceItems.length > 0) {
        // Delete existing service items
        await tx.$executeRaw`
          DELETE FROM "ServiceItem"
          WHERE "serviceRecordId" = ${recordId}
        `;

        // Create new service items
        for (const item of serviceItems) {
          await tx.$executeRaw`
            INSERT INTO "ServiceItem" ("serviceRecordId", "type", "description", "replaced", "currentDate", "nextDate", "createdAt", "updatedAt")
            VALUES (
              ${recordId}, 
              ${item.type}::"ServiceItemType", 
              ${item.description || null}, 
              ${item.replaced || false}, 
              ${item.currentDate ? new Date(item.currentDate) : null}, 
              ${item.nextDate ? new Date(item.nextDate) : null}, 
              NOW(), 
              NOW()
            )
          `;
        }
        
        // Update vehicle date fields
        await updateVehicleDateFields(vehicleId, serviceItems);
      }

      // Return the updated record with items
      const result = await tx.$queryRaw`
        SELECT sr.*, 
               json_agg(si.*) as "serviceItems"
        FROM "ServiceRecord" sr
        LEFT JOIN "ServiceItem" si ON sr."id" = si."serviceRecordId"
        WHERE sr."id" = ${recordId}
        GROUP BY sr.id
      `;
      
      return Array.isArray(result) ? result[0] : result;
    });

    res.json(updatedServiceRecord);
    return;
  } catch (error) {
    console.error('Error updating service record:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Delete a service record
router.delete('/vehicles/:vehicleId/service-records/:recordId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const recordId = parseInt(req.params.recordId);

    // Verify service record exists and belongs to the vehicle
    const existingRecord = await prisma.$queryRaw`
      SELECT * FROM "ServiceRecord"
      WHERE "id" = ${recordId} AND "vehicleId" = ${vehicleId}
    `;

    if (!existingRecord || (Array.isArray(existingRecord) && existingRecord.length === 0)) {
      res.status(404).json({ message: 'Service record not found' });
    return;
    }

    // Delete service items first (cascade doesn't work with raw queries)
    await prisma.$executeRaw`
      DELETE FROM "ServiceItem"
      WHERE "serviceRecordId" = ${recordId}
    `;

    // Delete the service record
    await prisma.$executeRaw`
      DELETE FROM "ServiceRecord"
      WHERE "id" = ${recordId}
    `;

    res.json({ message: 'Service record deleted successfully' });
    return;
  } catch (error) {
    console.error('Error deleting service record:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
});

// Upload a PDF document for a service record
router.post(
  '/vehicles/:vehicleId/service-records/:recordId/document',
  authenticateToken,
  uploadServiceRecordDocument.single('document'),
  async (req: Request, res: Response) => {
    const { vehicleId, recordId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
    return;
    }

    try {
      // Verify service record exists
      const serviceRecord = await prisma.$queryRaw`
        SELECT * FROM "ServiceRecord"
        WHERE "id" = ${parseInt(recordId)} AND "vehicleId" = ${parseInt(vehicleId)}
      `;

      if (!serviceRecord || (Array.isArray(serviceRecord) && serviceRecord.length === 0)) {
        res.status(404).json({ error: 'Service record not found' });
    return;
      }

      // Create the relative URL for the document
      const relativeDocumentUrl = path.join('/uploads/service-records', file.filename).replace(/\\/g, '/');

      // Update the service record with the document URL
      await prisma.$executeRaw`
        UPDATE "ServiceRecord"
        SET "documentUrl" = ${relativeDocumentUrl}, "updatedAt" = NOW()
        WHERE "id" = ${parseInt(recordId)}
      `;

      res.status(201).json({ documentUrl: relativeDocumentUrl });
    return;
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Server error while uploading document' });
    return;
    }
  }
);

// Create a service record with document in a single request
router.post(
  '/vehicles/:vehicleId/service-records/with-document',
  authenticateToken,
  uploadServiceRecordDocument.single('document'),
  async (req: Request, res: Response) => {
    const { vehicleId } = req.params;
    const file = req.file;
    
    try {
      // Parse the service record data from the form
      const serviceDataString = req.body.data;
      if (!serviceDataString) {
        res.status(400).json({ error: 'Service record data is required' });
    return;
      }

      const serviceData = JSON.parse(serviceDataString);
      
      // Verify vehicle exists
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: parseInt(vehicleId) }
      });

      if (!vehicle) {
        res.status(404).json({ message: 'Vehicle not found' });
    return;
      }

      // Create the relative URL for the document if a file was uploaded
      let documentUrl = null;
      if (file) {
        documentUrl = path.join('/uploads/service-records', file.filename).replace(/\\/g, '/');
      }

      // Create service record with nested service items
      const serviceRecord = await prisma.$transaction(async (tx) => {
        // Create the service record
        const record = await tx.$executeRaw`
          INSERT INTO "ServiceRecord" ("vehicleId", "serviceDate", "description", "category", "documentUrl", "createdAt", "updatedAt")
          VALUES (${parseInt(vehicleId)}, ${new Date(serviceData.serviceDate)}, ${serviceData.description}, ${serviceData.category}::"ServiceRecordCategory", ${documentUrl}, NOW(), NOW())
          RETURNING *
        `;
        
        // Get the created record ID
        const createdRecord = await tx.$queryRaw`
          SELECT * FROM "ServiceRecord" 
          WHERE "vehicleId" = ${parseInt(vehicleId)} 
          ORDER BY "createdAt" DESC 
          LIMIT 1
        `;
        
        // Safely extract the record ID
        let recordId: number;
        if (Array.isArray(createdRecord)) {
          recordId = (createdRecord[0] as any).id;
        } else {
          recordId = (createdRecord as any).id;
        }
        
        // Create service items
        if (serviceData.serviceItems && serviceData.serviceItems.length > 0) {
          for (const item of serviceData.serviceItems) {
            await tx.$executeRaw`
              INSERT INTO "ServiceItem" ("serviceRecordId", "type", "description", "replaced", "currentDate", "nextDate", "createdAt", "updatedAt")
              VALUES (
                ${recordId}, 
                ${item.type}::"ServiceItemType", 
                ${item.description || null}, 
                ${item.replaced || false}, 
                ${item.currentDate ? new Date(item.currentDate) : null}, 
                ${item.nextDate ? new Date(item.nextDate) : null}, 
                NOW(), 
                NOW()
              )
            `;
          }
        }
        
        // Update vehicle date fields
        await updateVehicleDateFields(parseInt(vehicleId), serviceData.serviceItems);
        
        // Return the created record with items
        const result = await tx.$queryRaw`
          SELECT sr.*, 
                 json_agg(si.*) as "serviceItems"
          FROM "ServiceRecord" sr
          LEFT JOIN "ServiceItem" si ON sr."id" = si."serviceRecordId"
          WHERE sr."id" = ${recordId}
          GROUP BY sr.id
        `;
        
        return Array.isArray(result) ? result[0] : result;
      });

      res.status(201).json(serviceRecord);
    return;
    } catch (error) {
      console.error('Error creating service record with document:', error);
      res.status(500).json({ message: 'Server error' });
    return;
    }
  }
);

export default router;
