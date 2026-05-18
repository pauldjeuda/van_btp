/**
 * @file useForm.ts
 * Hook générique pour la gestion d'état de formulaires avec validation.
 * Remplace les useState() répétitifs dans chaque modal de création/édition.
 */

import { useState, useCallback } from 'react';

type ValidationRule<T> = (value: T[keyof T], formValues: T) => string | null;
type ValidationRules<T> = Partial<Record<keyof T, ValidationRule<T>>>;

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (updates: Partial<T>) => void;
  validate: () => boolean;
  reset: () => void;
  isValid: boolean;
}

export function useForm<T extends object>(
  initialValues: T,
  validationRules?: ValidationRules<T>
): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur lors de la saisie
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const setValues = useCallback((updates: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...updates }));
  }, []);

  const validate = useCallback((): boolean => {
    if (!validationRules) return true;
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const field in validationRules) {
      const rule = validationRules[field as keyof T];
      if (rule) {
        const error = rule(values[field as keyof T], values);
        if (error) {
          newErrors[field as keyof T] = error;
          isValid = false;
        }
      }
    }
    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
  }, [initialValues]);

  const isValid = Object.values(errors).every(e => !e);

  return { values, errors, setValue, setValues, validate, reset, isValid };
}
