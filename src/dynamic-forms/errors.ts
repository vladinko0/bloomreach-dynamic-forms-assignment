// src/dynamic-forms/errors.ts
export type DynamicFormErrorCode =
  | 'config_error'
  | 'validation_error'
  | 'network_error'
  | 'tracking_error'
  | 'render_error';

export class DynamicFormError extends Error {
  readonly code: DynamicFormErrorCode;
  readonly details?: unknown;

  constructor(code: DynamicFormErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'DynamicFormError';
    this.code = code;
    this.details = details;
  }
}
