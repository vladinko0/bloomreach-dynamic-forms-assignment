// src/dynamic-forms/types.ts
import type {DynamicFormError} from './errors';

/**
 * Primitive JSON values accepted in payload metadata and tracking properties.
 *
 * The SDK sends form metadata back to Bloomreach Engagement. Keeping this type
 * JSON-only prevents accidental inclusion of functions, DOM nodes, Dates, or
 * other browser-specific objects that cannot be serialized safely.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Recursive JSON value type used for metadata and tracking payloads.
 */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {[key: string]: JsonValue};

/**
 * Runtime form values keyed by marketer-defined field IDs.
 *
 * Version 1 supports only short text inputs, so every submitted value is a
 * string. Future field types can widen this type through a versioned API.
 */
export type FormValues = Record<string, string>;

/**
 * Text input field configuration received from the server.
 *
 * Source: the assignment requires title and placeholder per text input, and it
 * says other input types should be possible in future iterations. The explicit
 * `type: 'text'` discriminator is what makes that future union possible.
 */
export interface DynamicFormTextField {
  /** Stable marketer/server field key used in validation and submission. */
  id: string;

  /** Discriminator for future field unions such as select, email, or checkbox. */
  type: 'text';

  /** Human-readable label shown next to the input. */
  title: string;

  /** Optional hint shown before the customer enters a value. */
  placeholder?: string;

  /** Local UX validation rule; server must still validate again. */
  required?: boolean;

  /** Optional minimum length used by the local validator. */
  minLength?: number;

  /** Optional maximum length used by the local validator and DOM input. */
  maxLength?: number;

  /** Browser autocomplete hint. Typed from the DOM API for compatibility. */
  autocomplete?: HTMLInputElement['autocomplete'];

  /** Browser input mode hint for mobile keyboards. */
  inputMode?:
    | 'text'
    | 'search'
    | 'email'
    | 'tel'
    | 'url'
    | 'numeric'
    | 'decimal';
}

/**
 * Union of supported field types.
 *
 * It currently contains only text fields because the assignment scopes the
 * first iteration to text inputs. New field interfaces should be added here
 * without changing the public render API.
 */
export type DynamicFormField = DynamicFormTextField;

/**
 * Full server-provided dynamic form configuration.
 *
 * This is the contract expected from Bloomreach Engagement. It includes
 * versioning, stable form identity, renderable field definitions, and optional
 * tracking metadata needed to attribute submissions to campaigns or variants.
 */
export interface DynamicFormConfig {
  /** Schema version used to guard backward and forward compatibility. */
  schemaVersion: 1;

  /** Stable form identifier selected by the server or campaign configuration. */
  id: string;

  /** Specific revision shown to the customer, useful for debugging and audit. */
  revisionId: string;

  /** Optional form heading rendered by the default DOM renderer. */
  title?: string;

  /** Submit button copy controlled by the marketer/server payload. */
  submitButton: {
    /** Default button text. Required by the assignment. */
    text: string;

    /** Optional text shown while a submission request is in progress. */
    pendingText?: string;
  };

  /** Ordered field list rendered and submitted by the SDK. */
  fields: DynamicFormField[];

  /** Optional tracking customization for the existing Engagement event flow. */
  tracking?: {
    /** Custom event name; defaults to `dynamic_form_submit`. */
    eventName?: string;

    /** Source marker included in tracking properties. */
    source?: string;
  };

  /** Campaign, experiment, or placement metadata carried through submission. */
  meta?: Record<string, JsonValue>;
}

/**
 * Shared context passed when fetching or submitting a form.
 *
 * This exists because forms can be selected and analyzed differently depending
 * on placement, locale, and SDK family/version.
 */
export interface DynamicFormSubmitContext {
  /** Host-defined slot such as profile preferences or checkout modal. */
  placement?: string;

  /** Requested localization, for example `en-US`. */
  locale?: string;

  /** SDK identity included for observability and server compatibility checks. */
  sdk?: {
    name: string;
    version: string;
  };
}

/**
 * Payload sent to the dedicated submission endpoint.
 *
 * Source: the assignment says user inputs must be tracked back to Bloomreach
 * Engagement and that endpoint API design can be influenced. This payload keeps
 * form identity, revision, context, values, and field order together.
 */
export interface DynamicFormSubmissionPayload extends DynamicFormSubmitContext {
  /** Submission payload schema version. */
  schemaVersion: 1;

  /** Submitted form ID. */
  formId: string;

  /** Submitted form revision ID. */
  revisionId: string;

  /** Client-side submission timestamp in ISO format. */
  submittedAt: string;

  /** Sanitized values keyed by server-defined field IDs. */
  values: FormValues;

  /** Field order shown to the customer, useful for replay/debugging. */
  fieldOrder: string[];

  /** Optional metadata copied from the form config. */
  meta?: Record<string, JsonValue>;
}

/**
 * Normalized successful submission result.
 *
 * A dedicated endpoint may return IDs. A tracker-only implementation can still
 * return `{status: 'accepted'}` to keep the callback contract stable.
 */
export interface DynamicFormSubmitResult {
  status: 'accepted';
  submissionId?: string;
  trackedEventId?: string;
}

/**
 * Adapter for an existing tracking API such as `exponea.track(...)`.
 *
 * Source: Bloomreach public web tracking docs describe custom event tracking.
 * This interface keeps the form module independent from a concrete global SDK.
 */
export interface DynamicFormTracker {
  track: (
    eventName: string,
    properties: Record<string, JsonValue>,
  ) => void | Promise<void>;
}

/**
 * Adapter for fetching form configuration and submitting form values.
 *
 * It exists so the rendering and validation layers do not know whether the SDK
 * uses `fetch`, an existing event queue, a mocked test transport, or a future
 * native-backed bridge.
 */
export interface DynamicFormTransport {
  /** Loads a server-selected form configuration. */
  fetchFormConfig: (request: {
    formId: string;
    placement?: string;
    locale?: string;
    signal?: AbortSignal;
  }) => Promise<DynamicFormConfig>;

  /** Sends a validated submission payload to Bloomreach Engagement. */
  submitForm: (
    payload: DynamicFormSubmissionPayload,
    signal?: AbortSignal,
  ) => Promise<DynamicFormSubmitResult>;
}

/**
 * Options used by the built-in `fetch` transport.
 */
export interface FetchTransportOptions {
  /** Base API URL for the project/environment. */
  baseUrl: string;

  /** Optional public token or project token passed as a request header. */
  publicToken?: string;

  /** Injected fetch implementation for tests or older environments. */
  fetchImpl?: typeof fetch;
}

/**
 * Headless submission options.
 *
 * This allows host applications to submit a form without using the default DOM
 * renderer, which is important for React, React Native, or custom UI wrappers.
 */
export interface SubmitDynamicFormOptions extends DynamicFormSubmitContext {
  config: DynamicFormConfig;
  values: FormValues;
  transport?: DynamicFormTransport;
  tracker?: DynamicFormTracker;
  signal?: AbortSignal;
}

/**
 * Options for rendering a dynamic form into a browser page.
 *
 * The assignment requires the rendered form to align with the host application
 * look and feel. For that reason, the renderer accepts class names and returns a
 * controller instead of owning visual styling itself.
 */
export interface RenderDynamicFormOptions extends DynamicFormSubmitContext {
  /** ID to fetch. Required when `config` is not provided. */
  formId?: string;

  /** Pre-fetched config. Useful for tests or host-managed fetching. */
  config?: DynamicFormConfig;

  /** CSS selector or DOM element where the form should be mounted. */
  target: Element | string;

  /** Transport used for fetch and submit when needed. */
  transport?: DynamicFormTransport;

  /** Tracker used when submission should go through custom event tracking. */
  tracker?: DynamicFormTracker;

  /** Abort signal for page transitions or host cancellation. */
  signal?: AbortSignal;

  /** Optional initial values for editing or prefill scenarios. */
  initialValues?: FormValues;

  /** Host-provided CSS class names for native styling integration. */
  classNames?: Partial<
    Record<
      'form' | 'title' | 'field' | 'label' | 'input' | 'error' | 'button',
      string
    >
  >;

  /** Called after the SDK finishes a successful submission. */
  onSubmitSuccess?: (result: DynamicFormSubmitResult) => void;

  /** Called after validation, network, tracking, or rendering submission errors. */
  onSubmitError?: (error: DynamicFormError) => void;

  /** Called when local value validation fails before the request is sent. */
  onValidationError?: (errors: Record<string, string>) => void;
}

/**
 * Runtime controller returned by the DOM renderer.
 *
 * It gives the host application lifecycle control, especially important for
 * single-page apps where routes and modals unmount without reloading the page.
 */
export interface DynamicFormController {
  /** Mounted form ID. */
  formId: string;

  /** Mounted form revision ID. */
  revisionId: string;

  /** Actual browser form element created by the renderer. */
  element: HTMLFormElement;

  /** Reads current DOM input values. */
  getValues: () => FormValues;

  /** Programmatically updates known field values. */
  setValues: (values: FormValues) => void;

  /** Enables or disables all inputs and the submit button. */
  setDisabled: (disabled: boolean) => void;

  /** Runs the same validation and submission path as a user submit. */
  submit: () => Promise<DynamicFormSubmitResult>;

  /** Removes event listeners and DOM nodes created by the renderer. */
  destroy: () => void;
}
