import { z } from 'zod';

const roles = z.enum(['ADMIN', 'SERVICER', 'FUEL_OPERATOR', 'KONTROLA', 'CARINA', 'AERODROM'], {
  errorMap: () => ({ message: 'Nevažeća uloga.' }),
});

export const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(3, { message: 'Korisničko ime mora imati najmanje 3 karaktera.' }),
    password: z.string().min(6, { message: 'Lozinka mora imati najmanje 6 karaktera.' }),
    role: roles,
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    username: z.string().min(3, { message: 'Username mora imati najmanje 3 karaktera.' }).optional(),
    role: roles.optional(),
    password: z.string().min(6, { message: 'Lozinka mora imati najmanje 6 karaktera.' }).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID mora biti numerički string.' }),
  }),
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, { message: 'ID mora biti numerički string.' }),
  }),
});
