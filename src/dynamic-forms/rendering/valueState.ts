// src/dynamic-forms/rendering/valueState.ts
/**
 * Helpers for reading input values and reflecting validation state in the DOM.
 *
 * They are separate from `renderDynamicForm` to keep the high-level renderer
 * focused on orchestration and lifecycle.
 */
import type {FormValues} from '../types';

/**
 * Reads current values from rendered input elements.
 *
 * Values are keyed by field ID, matching the server schema and submission
 * payload. This keeps the renderer independent from DOM element ordering.
 */
export const readValues = (
  fieldElements: Map<string, HTMLInputElement>,
): FormValues => {
  const values: FormValues = {};
  for (const [fieldId, input] of fieldElements.entries()) {
    values[fieldId] = input.value;
  }
  return values;
};

/**
 * Clears previous validation messages and invalid ARIA state.
 *
 * This runs before every submit attempt so the UI reflects the latest
 * validation result instead of accumulating stale errors.
 */
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

/**
 * Shows validation messages next to matching inputs.
 *
 * The error map comes from `validateValues`, so keys are field IDs and values
 * are human-readable messages.
 */
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

/**
 * Moves keyboard focus to the first invalid input.
 *
 * This is a small accessibility and usability improvement for keyboard users
 * and screen-reader users after a failed submit.
 */
export const focusFirstInvalidField = (
  fieldElements: Map<string, HTMLInputElement>,
  errors: Record<string, string>,
): void => {
  const firstInvalidId = Object.keys(errors)[0];
  if (!firstInvalidId) return;
  fieldElements.get(firstInvalidId)?.focus();
};
