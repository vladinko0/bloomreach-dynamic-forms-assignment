// src/dynamic-forms/submission.ts
/**
 * Headless submission logic.
 *
 * This module owns the path from validated values to either a dedicated
 * submission endpoint or an existing tracking adapter. It is intentionally not
 * tied to DOM rendering so React, React Native, Flutter wrappers, or tests can
 * reuse the same payload and validation behavior.
 */
import {
  DEFAULT_EVENT_NAME,
  DEFAULT_SDK,
  DEFAULT_TRACKING_SOURCE,
  FORM_SCHEMA_VERSION,
} from './constants';
import {DynamicFormError} from './errors';
import type {
  DynamicFormConfig,
  DynamicFormSubmissionPayload,
  DynamicFormSubmitResult,
  FormValues,
  JsonValue,
  SubmitDynamicFormOptions,
} from './types';
import {validateFormConfig, validateValues} from './validation';

/**
 * Validates and submits a dynamic form without depending on the DOM renderer.
 *
 * Source: the assignment requires submitted user inputs to be tracked back to
 * Bloomreach Engagement and asks for customizable success/failure callbacks at
 * the integration layer. This function performs the SDK-owned work before a
 * renderer or host app decides how to react.
 */
export const submitDynamicForm = async (
  options: SubmitDynamicFormOptions,
): Promise<DynamicFormSubmitResult> => {
  validateFormConfig(options.config);

  const validationErrors = validateValues(options.config, options.values);
  if (Object.keys(validationErrors).length > 0) {
    throw new DynamicFormError(
      'validation_error',
      'Dynamic form values are invalid',
      validationErrors,
    );
  }

  const payload = buildSubmissionPayload(options);

  if (options.transport) {
    return options.transport.submitForm(payload, options.signal);
  }

  if (options.tracker) {
    const eventName = options.config.tracking?.eventName ?? DEFAULT_EVENT_NAME;
    try {
      await options.tracker.track(
        eventName,
        toTrackingProperties(payload, options.config),
      );
      return {status: 'accepted'};
    } catch (error) {
      throw new DynamicFormError(
        'tracking_error',
        'Dynamic form tracking failed',
        error,
      );
    }
  }

  throw new DynamicFormError(
    'tracking_error',
    'No form transport or tracking adapter was provided',
  );
};

/**
 * Builds the canonical submission payload.
 *
 * It trims values and only includes field IDs present in the validated config.
 * That prevents accidental submission of extra object keys supplied by host
 * code. Form ID, revision ID, field order, and metadata are included so
 * Bloomreach can attribute the submission to the exact marketer-defined form.
 */
export const buildSubmissionPayload = (
  options: SubmitDynamicFormOptions,
): DynamicFormSubmissionPayload => {
  const allowedValues: FormValues = {};

  for (const field of options.config.fields) {
    allowedValues[field.id] = options.values[field.id]?.trim() ?? '';
  }

  return {
    schemaVersion: FORM_SCHEMA_VERSION,
    formId: options.config.id,
    revisionId: options.config.revisionId,
    submittedAt: new Date(Date.now()).toISOString(),
    placement: options.placement,
    locale: options.locale,
    sdk: options.sdk ?? DEFAULT_SDK,
    values: allowedValues,
    fieldOrder: options.config.fields.map(field => field.id),
    meta: options.config.meta,
  };
};

/**
 * Converts the dedicated submission payload into custom event properties.
 *
 * Source: Bloomreach web tracking examples use custom event properties. This
 * adapter lets the first version reuse the existing tracking pipeline while
 * keeping the richer dedicated payload shape available for a future endpoint.
 */
export const toTrackingProperties = (
  payload: DynamicFormSubmissionPayload,
  config: DynamicFormConfig,
): Record<string, JsonValue> => ({
  form_id: payload.formId,
  form_revision_id: payload.revisionId,
  placement: payload.placement ?? null,
  locale: payload.locale ?? null,
  values: payload.values,
  field_order: payload.fieldOrder,
  field_count: payload.fieldOrder.length,
  source: config.tracking?.source ?? DEFAULT_TRACKING_SOURCE,
  campaign_id: config.meta?.campaignId ?? null,
  experiment_variant: config.meta?.experimentVariant ?? null,
});
