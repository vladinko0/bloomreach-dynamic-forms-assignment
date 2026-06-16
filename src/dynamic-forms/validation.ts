// src/dynamic-forms/validation.ts
import {
  FIELD_ID_MAX_LENGTH,
  FORM_SCHEMA_VERSION,
  MAX_FIELD_COUNT,
  MIN_FIELD_COUNT,
  SUPPORTED_FIELD_TYPE,
} from './constants';
import {DynamicFormError} from './errors';
import type {DynamicFormConfig, FormValues} from './types';

export const validateFormConfig = (config: DynamicFormConfig): void => {
  if (!config || config.schemaVersion !== FORM_SCHEMA_VERSION) {
    throw new DynamicFormError(
      'config_error',
      'Unsupported dynamic form schema version',
    );
  }

  if (!isSafeId(config.id) || !config.revisionId) {
    throw new DynamicFormError(
      'config_error',
      'Form id and revision id are required',
    );
  }

  if (!config.submitButton?.text?.trim()) {
    throw new DynamicFormError('config_error', 'Submit button text is required');
  }

  if (
    !Array.isArray(config.fields) ||
    config.fields.length < MIN_FIELD_COUNT ||
    config.fields.length > MAX_FIELD_COUNT
  ) {
    throw new DynamicFormError(
      'config_error',
      `A dynamic form must contain ${MIN_FIELD_COUNT} to ${MAX_FIELD_COUNT} fields`,
    );
  }

  const fieldIds = new Set<string>();
  for (const field of config.fields) {
    if (field.type !== SUPPORTED_FIELD_TYPE) {
      throw new DynamicFormError(
        'config_error',
        `Unsupported field type: ${field.type}`,
      );
    }

    if (!isSafeId(field.id)) {
      throw new DynamicFormError(
        'config_error',
        `Invalid field id: ${field.id}`,
      );
    }

    if (fieldIds.has(field.id)) {
      throw new DynamicFormError(
        'config_error',
        `Duplicate field id: ${field.id}`,
      );
    }

    if (!field.title?.trim()) {
      throw new DynamicFormError(
        'config_error',
        `Title is required for field: ${field.id}`,
      );
    }

    if (field.minLength !== undefined && field.minLength < 0) {
      throw new DynamicFormError(
        'config_error',
        `Invalid minLength for field: ${field.id}`,
      );
    }

    if (field.maxLength !== undefined && field.maxLength < 1) {
      throw new DynamicFormError(
        'config_error',
        `Invalid maxLength for field: ${field.id}`,
      );
    }

    if (
      field.minLength !== undefined &&
      field.maxLength !== undefined &&
      field.minLength > field.maxLength
    ) {
      throw new DynamicFormError(
        'config_error',
        `minLength cannot be greater than maxLength for field: ${field.id}`,
      );
    }

    fieldIds.add(field.id);
  }
};

export const validateValues = (
  config: DynamicFormConfig,
  values: FormValues,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const value = values[field.id] ?? '';
    const normalized = value.trim();

    if (field.required && normalized.length === 0) {
      errors[field.id] = 'This field is required.';
      continue;
    }

    if (field.minLength !== undefined && normalized.length < field.minLength) {
      errors[field.id] = `Please enter at least ${field.minLength} characters.`;
      continue;
    }

    if (field.maxLength !== undefined && normalized.length > field.maxLength) {
      errors[field.id] =
        `Please enter no more than ${field.maxLength} characters.`;
    }
  }

  return errors;
};

export const isSafeId = (value: string): boolean => {
  const maxLengthPattern = `{0,${FIELD_ID_MAX_LENGTH - 1}}`;
  return new RegExp(`^[a-zA-Z][a-zA-Z0-9_-]${maxLengthPattern}$`).test(value);
};
