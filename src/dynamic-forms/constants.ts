// src/dynamic-forms/constants.ts
export const FORM_SCHEMA_VERSION = 1 as const;
export const MIN_FIELD_COUNT = 1;
export const MAX_FIELD_COUNT = 5;
export const FIELD_ID_MAX_LENGTH = 64;
export const DEFAULT_EVENT_NAME = 'dynamic_form_submit';
export const DEFAULT_TRACKING_SOURCE = 'dynamic_form';
export const DEFAULT_SDK = {
  name: 'engagement-web-sdk',
  version: 'unknown',
} as const;
export const SUPPORTED_FIELD_TYPE = 'text' as const;
