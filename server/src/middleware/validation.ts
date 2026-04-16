import { z } from 'zod';

/**
 * Password validation schema — simplified:
 * - Minimum 3 characters only
 */
export const passwordSchema = z.string()
  .min(3, 'Le mot de passe doit contenir au moins 3 caractères');

/**
 * Login validation schema — simple identifier (not necessarily an email):
 * - Minimum 2 characters
 * - Maximum 255 characters
 */
export const loginSchema = z.string()
  .trim()
  .min(2, 'L\'identifiant doit contenir au moins 2 caractères')
  .max(255, 'L\'identifiant ne doit pas dépasser 255 caractères');

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
 * Validate login identifier and return result
 */
export function validateLogin(login: string): { valid: boolean; error?: string } {
  const result = loginSchema.safeParse(login);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message };
  }
  return { valid: true };
}

// Keep backward compatibility alias
export const emailSchema = loginSchema;
export const validateEmail = validateLogin;
