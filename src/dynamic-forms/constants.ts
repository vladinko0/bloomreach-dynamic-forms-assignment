// src/dynamic-forms/constants.ts
/**
 * Version of the server-to-SDK schema supported by this draft.
 *
 * Source: the assignment asks for an API/payload specification and for an
 * extendable SDK interface. A versioned schema is the compatibility mechanism
 * that lets a future SDK support additional field types without silently
 * misreading older or newer payloads.
 */
export const FORM_SCHEMA_VERSION = 1 as const;

/**
 * Minimum number of fields allowed in the first iteration.
 *
 * Source: the feature requirements explicitly say the marketer can define
 * 1-5 text inputs.
 */
export const MIN_FIELD_COUNT = 1;

/**
 * Maximum number of fields allowed in the first iteration.
 *
 * Keeping this as a constant makes the product constraint visible to server
 * validation, client validation, tests, and future reviewers.
 */
export const MAX_FIELD_COUNT = 5;

/**
 * Maximum field identifier length accepted by the SDK.
 *
 * This is not a product requirement from the assignment. It exists as a
 * defensive SDK constraint so field IDs stay practical for object keys,
 * tracking properties, and DOM-derived identifiers.
 */
export const FIELD_ID_MAX_LENGTH = 64;

/**
 * Default tracking event name used when the server payload does not override it.
 *
 * Source: Bloomreach Engagement Web SDK documentation uses custom event
 * tracking through `exponea.track(...)`; this draft maps form submissions to a
 * named custom event.
 */
export const DEFAULT_EVENT_NAME = 'dynamic_form_submit';

/**
 * Default source marker added to tracking payloads.
 *
 * It lets analytics and debugging distinguish these events from manually
 * emitted customer events while still using the existing tracking pipeline.
 */
export const DEFAULT_TRACKING_SOURCE = 'dynamic_form';

/**
 * Fallback SDK identity used in submission payloads.
 *
 * A real SDK would inject its package name and runtime version. The fallback
 * keeps the draft implementation deterministic when used standalone.
 */
export const DEFAULT_SDK = {
  name: 'engagement-web-sdk',
  version: 'unknown',
} as const;

/**
 * Only supported field type in the first iteration.
 *
 * Source: the assignment says it is enough to handle 1-5 short text inputs now,
 * while other input types may be added later.
 */
export const SUPPORTED_FIELD_TYPE = 'text' as const;
