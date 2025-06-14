import { z } from 'zod';

const locationBodyBaseSchema = z.object({
  name: z.string().trim().min(1, { message: 'Naziv lokacije je obavezan.' }),
  address: z.string().trim().optional(),
  companyTaxId: z.string().trim().optional(),
});

export const createLocationSchema = z.object({
  body: locationBodyBaseSchema,
});

export const updateLocationSchema = z.object({
  body: locationBodyBaseSchema.partial(), // All fields are optional for updates
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID mora biti numerički string.' }),
  }),
});

export const locationIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID mora biti numerički string.' }),
  }),
});
