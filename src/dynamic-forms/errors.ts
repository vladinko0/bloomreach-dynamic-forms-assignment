// src/dynamic-forms/errors.ts
/**
 * Machine-readable error categories returned by the dynamic forms module.
 *
 * These categories exist so host applications can route failures to their own
 * UX patterns: configuration bugs, local validation messages, network failures,
 * tracking failures, or renderer integration problems.
 */
export type DynamicFormErrorCode =
  | 'config_error'
  | 'validation_error'
  | 'network_error'
  | 'tracking_error'
  | 'render_error';

/**
 * Typed SDK error used across validation, transport, submission, and rendering.
 *
 * The assignment requires callbacks for successful and failed submissions.
 * Returning a typed error object instead of a raw thrown value gives integrators
 * a stable contract for `onSubmitError`.
 */
export class DynamicFormError extends Error {
  /** Stable category that customer code can switch on. */
  readonly code: DynamicFormErrorCode;

  /** Optional diagnostic details for logs or developer tooling. */
  readonly details?: unknown;

  /**
   * Creates an SDK error with a stable category and optional details.
   *
   * `details` is intentionally unknown because it may wrap a browser `fetch`
   * failure, a validation error map, or a lower-level tracker exception.
   */
  constructor(code: DynamicFormErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'DynamicFormError';
    this.code = code;
    this.details = details;
  }
}
