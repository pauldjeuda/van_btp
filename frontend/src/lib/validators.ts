/**
 * @file validators.ts
 * Fonctions de validation réutilisables pour les formulaires.
 * Retournent null si valide, ou un message d'erreur string si invalide.
 */

export const required = (value: any): string | null =>
  value === null || value === undefined || value === ''
    ? 'Ce champ est obligatoire'
    : null;

export const minLength = (min: number) => (value: string): string | null =>
  value && value.length < min
    ? `Minimum ${min} caractères requis`
    : null;

export const maxLength = (max: number) => (value: string): string | null =>
  value && value.length > max
    ? `Maximum ${max} caractères autorisés`
    : null;

export const isPositiveNumber = (value: any): string | null => {
  const num = Number(value);
  return isNaN(num) || num <= 0 ? 'Doit être un nombre positif' : null;
};

export const isValidMatricule = (value: string): string | null =>
  /^VMAT\d{4}$/.test(value)
    ? null
    : 'Format attendu : VMAT0001';

export const isValidDate = (value: string): string | null => {
  if (!value) return 'Date requise';
  const date = new Date(value);
  return isNaN(date.getTime()) ? 'Date invalide' : null;
};

export const isEndDateAfterStart = (endDate: string, startDate: string): string | null => {
  if (!endDate || !startDate) return null;
  return new Date(endDate) > new Date(startDate)
    ? null
    : 'La date de fin doit être postérieure à la date de début';
};

export const isBudgetPositive = (value: any): string | null => {
  const num = Number(value);
  return isNaN(num) || num < 0
    ? 'Le budget doit être un nombre positif'
    : null;
};

/**
 * Compose plusieurs validateurs sur un même champ.
 * Retourne le premier message d'erreur trouvé, ou null si tout est valide.
 */
export const compose = (...validators: Array<(v: any) => string | null>) =>
  (value: any): string | null => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };
