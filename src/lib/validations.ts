import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
  password: z
    .string()
    .min(1, 'Hasło jest wymagane')
    .min(8, 'Hasło musi mieć minimum 8 znaków'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Nazwa użytkownika jest wymagana')
    .min(3, 'Nazwa użytkownika musi mieć minimum 3 znaki')
    .max(50, 'Nazwa użytkownika może mieć maksymalnie 50 znaków')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia'),
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format email'),
  password: z
    .string()
    .min(1, 'Hasło jest wymagane')
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
  confirmPassword: z
    .string()
    .min(1, 'Potwierdzenie hasła jest wymagane'),
  firstName: z
    .string()
    .min(1, 'Imię jest wymagane')
    .max(100, 'Imię może mieć maksymalnie 100 znaków'),
  lastName: z
    .string()
    .min(1, 'Nazwisko jest wymagane')
    .max(100, 'Nazwisko może mieć maksymalnie 100 znaków'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła muszą być takie same',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
