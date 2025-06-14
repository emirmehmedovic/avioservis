import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string({
      required_error: 'Username is required',
    }).min(1, 'Username cannot be empty'),
    password: z.string({
      required_error: 'Password is required',
    }).min(1, 'Password cannot be empty'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3, { message: 'Username mora imati bar 3 karaktera.' }),
    password: z.string().min(6, { message: 'Password mora imati bar 6 karaktera.' }),
    role: z.enum(['ADMIN', 'SERVICER', 'FUEL_OPERATOR', 'KONTROLA'], {
      errorMap: () => ({ message: 'Nevažeća uloga.' }),
    }),
  }),
});
