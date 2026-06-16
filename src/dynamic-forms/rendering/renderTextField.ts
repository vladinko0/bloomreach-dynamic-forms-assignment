// src/dynamic-forms/rendering/renderTextField.ts
/**
 * Renderer for the current version's only field type: short text input.
 *
 * Source: the assignment explicitly scopes the first iteration to 1-5 short text
 * inputs with a title and placeholder. This module is separate so future field
 * renderers can be added next to it without changing the main renderer.
 */
import {SUPPORTED_FIELD_TYPE} from '../constants';
import type {DynamicFormTextField, RenderDynamicFormOptions} from '../types';

/**
 * Creates the DOM subtree for one text field.
 *
 * The function returns the wrapper, input, and error element because the main
 * renderer needs the wrapper for mounting, the input for reading values, and the
 * error node for validation messages.
 */
export const renderTextField = (
  field: DynamicFormTextField,
  classNames: RenderDynamicFormOptions['classNames'],
  initialValue = '',
): {root: HTMLElement; input: HTMLInputElement; error: HTMLElement} => {
  const root = document.createElement('div');
  addClass(root, classNames?.field);

  const label = document.createElement('label');
  label.textContent = field.title;
  label.htmlFor = inputId(field.id);
  addClass(label, classNames?.label);

  const input = document.createElement('input');
  input.id = inputId(field.id);
  input.name = field.id;
  input.type = SUPPORTED_FIELD_TYPE;
  input.value = initialValue;
  input.placeholder = field.placeholder ?? '';
  input.required = field.required ?? false;
  if (field.maxLength !== undefined) input.maxLength = field.maxLength;
  if (field.minLength !== undefined) input.minLength = field.minLength;
  if (field.autocomplete) input.autocomplete = field.autocomplete;
  if (field.inputMode) input.inputMode = field.inputMode;
  addClass(input, classNames?.input);

  /**
   * Error container is present from the start so `aria-describedby` can point to
   * a stable element ID. It is hidden until validation fails.
   */
  const error = document.createElement('div');
  error.id = `${input.id}-error`;
  error.hidden = true;
  error.setAttribute('role', 'alert');
  addClass(error, classNames?.error);

  input.setAttribute('aria-describedby', error.id);
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    error.hidden = true;
  });

  root.append(label, input, error);
  return {root, input, error};
};

/**
 * Builds a deterministic DOM ID from the stable field ID.
 */
const inputId = (fieldId: string): string => `br-dynamic-form-${fieldId}`;

/**
 * Applies host-provided CSS class names to one element.
 */
const addClass = (element: Element, className: string | undefined): void => {
  if (!className) return;
  for (const item of className.split(/\s+/).filter(Boolean)) {
    element.classList.add(item);
  }
};
