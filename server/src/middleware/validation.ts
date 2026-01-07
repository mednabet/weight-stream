import { z } from 'zod';

/**
 * Password validation schema with strong requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export const passwordSchema = z.string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .trim()
  .email('Format d\'email invalide')
  .max(255, 'L\'email ne doit pas dépasser 255 caractères');

/**
 * Validate password and return result
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message };
  }
  return { valid: true };
}

/**
 * Validate email and return result
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message };
  }
  return { valid: true };
}
