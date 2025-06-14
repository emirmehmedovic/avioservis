import { z } from 'zod';

const companyBodySchema = z.object({
  name: z.string().min(2, { message: 'Ime firme mora imati najmanje 2 karaktera.' }),
  taxId: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  contactPersonName: z.string().trim().optional(),
  contactPersonPhone: z.string().trim().optional(),
});

export const createCompanySchema = z.object({
  body: companyBodySchema,
});

export const updateCompanySchema = z.object({
  body: companyBodySchema.partial(), // All fields are optional for updates
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID mora biti numerički string.' }),
  }),
});

export const companyIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID mora biti numerički string.' }),
  }),
});
