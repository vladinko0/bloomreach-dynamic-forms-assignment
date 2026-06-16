// src/dynamic-forms/rendering/valueState.ts
import type {FormValues} from '../types';

export const readValues = (
  fieldElements: Map<string, HTMLInputElement>,
): FormValues => {
  const values: FormValues = {};
  for (const [fieldId, input] of fieldElements.entries()) {
    values[fieldId] = input.value;
  }
  return values;
};

export const clearErrors = (
  fieldElements: Map<string, HTMLInputElement>,
  errorElements: Map<string, HTMLElement>,
): void => {
  for (const input of fieldElements.values()) {
    input.removeAttribute('aria-invalid');
  }
  for (const error of errorElements.values()) {
    error.textContent = '';
    error.hidden = true;
  }
};

export const showErrors = (
  fieldElements: Map<string, HTMLInputElement>,
  errorElements: Map<string, HTMLElement>,
  errors: Record<string, string>,
): void => {
  for (const [fieldId, message] of Object.entries(errors)) {
    const input = fieldElements.get(fieldId);
    const error = errorElements.get(fieldId);
    if (!input || !error) continue;

    input.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.hidden = false;
  }
};

export const focusFirstInvalidField = (
  fieldElements: Map<string, HTMLInputElement>,
  errors: Record<string, string>,
): void => {
  const firstInvalidId = Object.keys(errors)[0];
  if (!firstInvalidId) return;
  fieldElements.get(firstInvalidId)?.focus();
};
