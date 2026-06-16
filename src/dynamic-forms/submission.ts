// src/dynamic-forms/submission.ts
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
