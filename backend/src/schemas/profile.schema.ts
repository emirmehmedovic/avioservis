import { z } from 'zod';

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6, { message: 'Trenutna lozinka mora imati najmanje 6 karaktera.' }),
    newPassword: z.string().min(6, { message: 'Nova lozinka mora imati najmanje 6 karaktera.' }),
  }),
});
