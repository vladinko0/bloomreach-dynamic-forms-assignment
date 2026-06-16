// src/example.ts
import {
  createFetchTransport,
  renderDynamicForm,
  type DynamicFormConfig,
} from './dynamicForms';

declare const exponea: {
  track: (eventName: string, properties: Record<string, unknown>) => void;
};

const FORM_ID = 'style-preferences';
const FORM_TARGET = '#preferences-form-slot';
const FORM_PLACEMENT = 'profile_preferences';
const FORM_LOCALE = 'en-US';
const API_BASE_URL = 'https://api.example.bloomreach.cloud';
const PUBLIC_TOKEN = 'project-public-token';
const CAMPAIGN_ID = 'cmp_123';
const EXPERIMENT_VARIANT = 'B';
const FIELD_MAX_LENGTH = 80;

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
