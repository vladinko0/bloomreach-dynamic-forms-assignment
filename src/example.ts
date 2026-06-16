// src/example.ts
/**
 * Example host-application integration.
 *
 * This file is not required by the SDK runtime. It exists to show interviewers
 * and integrators how the public API can be embedded in a customer website.
 * The examples mirror the assignment requirement that the form is rendered in
 * the host page and submits values back to Bloomreach Engagement.
 */
import {
  createFetchTransport,
  renderDynamicForm,
  type DynamicFormConfig,
} from './dynamicForms';

/**
 * Minimal shape of the existing Engagement Web SDK global used in examples.
 *
 * Source: Bloomreach Engagement web tracking documentation shows custom event
 * tracking through an SDK `track` call. The declaration avoids importing a real
 * SDK package in this assignment draft.
 */
declare const exponea: {
  track: (eventName: string, properties: Record<string, unknown>) => void;
};

/** Example form identifier chosen by the marketer/server configuration. */
const FORM_ID = 'style-preferences';

/** CSS selector where the host website wants the SDK to mount the form. */
const FORM_TARGET = '#preferences-form-slot';

/** Host-defined placement used for targeting and reporting. */
const FORM_PLACEMENT = 'profile_preferences';

/** Example locale requested by the host website. */
const FORM_LOCALE = 'en-US';

/** Placeholder API base URL for the proposed Bloomreach form endpoints. */
const API_BASE_URL = 'https://api.example.bloomreach.cloud';

/** Placeholder public project token for endpoint requests. */
const PUBLIC_TOKEN = 'project-public-token';

/** Example campaign metadata carried through form submission. */
const CAMPAIGN_ID = 'cmp_123';

/** Example experiment variant metadata carried through form submission. */
const EXPERIMENT_VARIANT = 'B';

/** Example text-field limit reused in the static config fixture. */
const FIELD_MAX_LENGTH = 80;

/**
 * Example that fetches a form from the proposed server endpoint and renders it.
 *
 * This is the realistic website integration path: the host supplies a target,
 * transport, optional tracker, class names, and callbacks. The returned
 * controller is destroyed on `pagehide` to clean up DOM and event listeners.
 */
export const renderFetchedForm = async (): Promise<void> => {
  const controller = await renderDynamicForm({
    formId: FORM_ID,
    target: FORM_TARGET,
    placement: FORM_PLACEMENT,
    locale: FORM_LOCALE,
    transport: createFetchTransport({
      baseUrl: API_BASE_URL,
      publicToken: PUBLIC_TOKEN,
    }),
    tracker: {
      track: (eventName, properties) => exponea.track(eventName, properties),
    },
    classNames: {
      form: 'PreferencesForm',
      field: 'PreferencesForm-field',
      label: 'PreferencesForm-label',
      input: 'PreferencesForm-input',
      button: 'Button Button--primary',
      error: 'PreferencesForm-error',
    },
    onSubmitSuccess: result => {
      console.log('Dynamic form submitted', result);
    },
    onSubmitError: error => {
      console.error('Dynamic form failed', error.code, error.details);
    },
  });

  window.addEventListener('pagehide', () => controller.destroy(), {
    once: true,
  });
};

/**
 * Example that renders an inline config without a network request.
 *
 * This exists for local development, unit/integration tests, and demos. It uses
 * the same public renderer and tracker adapter as the fetched example, proving
 * that fetching and rendering are intentionally decoupled.
 */
export const renderStaticConfigForTesting = async (): Promise<void> => {
  const config: DynamicFormConfig = {
    schemaVersion: 1,
    id: FORM_ID,
    revisionId: 'rev_2026_06_16_01',
    title: 'Tell us what you like',
    submitButton: {
      text: 'Save preferences',
      pendingText: 'Saving...',
    },
    fields: [
      {
        id: 'favorite_category',
        type: 'text',
        title: 'Favorite category',
        placeholder: 'Running shoes',
        required: true,
        maxLength: FIELD_MAX_LENGTH,
      },
      {
        id: 'preferred_brand',
        type: 'text',
        title: 'Preferred brand',
        placeholder: 'Acme',
        maxLength: FIELD_MAX_LENGTH,
      },
    ],
    tracking: {
      eventName: 'dynamic_form_submit',
      source: 'dynamic_form',
    },
    meta: {
      campaignId: CAMPAIGN_ID,
      experimentVariant: EXPERIMENT_VARIANT,
    },
  };

  await renderDynamicForm({
    config,
    target: FORM_TARGET,
    tracker: {
      track: (eventName, properties) => exponea.track(eventName, properties),
    },
  });
};
