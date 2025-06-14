import { z } from 'zod';

const vehicleStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE'], {
  errorMap: () => ({ message: "Status must be one of: 'ACTIVE', 'INACTIVE', 'MAINTENANCE'" }),
});

// This schema is now based on the express-validator rules found in vehicle.ts
const vehicleBodySchema = z.object({
  vehicle_name: z.string().min(2, 'Vehicle name is required'),
  license_plate: z.string().min(2, 'License plate is required'),
  status: vehicleStatusEnum,
  companyId: z.coerce.number().int('CompanyId is required'),
  
  // Optional fields from the validator
  kapacitet_cisterne: z.coerce.number().optional(),
  tip_filtera: z.string().optional(),
  crijeva_za_tocenje: z.string().optional(),
  registrovano_do: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  adr_vazi_do: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  periodicni_pregled_vazi_do: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  
  // Enhanced Filter Information
  filter_vessel_number: z.string().optional(),
  filter_annual_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  filter_next_annual_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  filter_ew_sensor_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  filter_installation_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(), // Added based on controller logic
  filter_validity_period_months: z.coerce.number().int().optional(), // Added based on controller logic
  last_annual_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(), // Added based on controller logic

  // Hose HD63
  broj_crijeva_hd63: z.string().optional(),
  godina_proizvodnje_crijeva_hd63: z.coerce.number().int().optional(),
  datum_testiranja_pritiska_crijeva_hd63: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  
  // Hose HD38
  broj_crijeva_hd38: z.string().optional(),
  godina_proizvodnje_crijeva_hd38: z.coerce.number().int().optional(),
  datum_testiranja_pritiska_crijeva_hd38: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  
  // Hose TW75
  broj_crijeva_tw75: z.string().optional(),
  godina_proizvodnje_crijeva_tw75: z.coerce.number().int().optional(),
  datum_testiranja_pritiska_crijeva_tw75: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  
  // Calibration Dates
  datum_kalibracije_moment_kljuca: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  datum_kalibracije_termometra: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  datum_kalibracije_hidrometra: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  datum_kalibracije_uredjaja_elektricne_provodljivosti: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  
  // Other Expiry Dates
  datum_isteka_cwd: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),

  // These were in my original schema, but not in the validator. I'll keep them as optional for now.
  vehicle_type: z.string().min(2).optional(),
  vehicle_details: z.string().optional(),
  vehicle_chassis_number: z.string().min(5).optional(),
  vehicle_owner: z.string().optional(),
  locationId: z.coerce.number().int().optional(),
  year_of_production: z.coerce.number().int().optional(),
  year_of_first_registration: z.coerce.number().int().optional(),
  regular_service_interval_months: z.coerce.number().int().optional(),
  regular_service_interval_km: z.coerce.number().int().optional(),
  next_service_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  next_service_km: z.coerce.number().int().optional(),
  next_technical_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  next_tahograf_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  next_fire_extinguisher_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  next_adr_inspection_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  has_gps: z.coerce.boolean().optional(),
  registration_expiry_date: z.string().datetime({ message: 'Invalid date format' }).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});

export const createVehicleSchema = z.object({
  body: vehicleBodySchema,
});

export const updateVehicleSchema = z.object({
  body: vehicleBodySchema.partial(), // For updates, all fields are optional
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID must be a numeric string.' }),
  }),
});

export const vehicleIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID must be a numeric string.' }),
  }),
});
