// src/dynamic-forms/types.ts
import type {DynamicFormError} from './errors';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {[key: string]: JsonValue};
export type FormValues = Record<string, string>;

export interface DynamicFormTextField {
  id: string;
  type: 'text';
  title: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autocomplete?: HTMLInputElement['autocomplete'];
  inputMode?:
    | 'text'
    | 'search'
    | 'email'
    | 'tel'
    | 'url'
    | 'numeric'
    | 'decimal';
}

export type DynamicFormField = DynamicFormTextField;

export interface DynamicFormConfig {
  schemaVersion: 1;
  id: string;
  revisionId: string;
  title?: string;
  submitButton: {
    text: string;
    pendingText?: string;
  };
  fields: DynamicFormField[];
  tracking?: {
    eventName?: string;
    source?: string;
  };
  meta?: Record<string, JsonValue>;
}

export interface DynamicFormSubmitContext {
  placement?: string;
  locale?: string;
  sdk?: {
    name: string;
    version: string;
  };
}

export interface DynamicFormSubmissionPayload extends DynamicFormSubmitContext {
  schemaVersion: 1;
  formId: string;
  revisionId: string;
  submittedAt: string;
  values: FormValues;
  fieldOrder: string[];
  meta?: Record<string, JsonValue>;
}

export interface DynamicFormSubmitResult {
  status: 'accepted';
  submissionId?: string;
  trackedEventId?: string;
}

export interface DynamicFormTracker {
  track: (
    eventName: string,
    properties: Record<string, JsonValue>,
  ) => void | Promise<void>;
}

export interface DynamicFormTransport {
  fetchFormConfig: (request: {
    formId: string;
    placement?: string;
    locale?: string;
    signal?: AbortSignal;
  }) => Promise<DynamicFormConfig>;

  submitForm: (
    payload: DynamicFormSubmissionPayload,
    signal?: AbortSignal,
  ) => Promise<DynamicFormSubmitResult>;
}

export interface FetchTransportOptions {
  baseUrl: string;
  publicToken?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitDynamicFormOptions extends DynamicFormSubmitContext {
  config: DynamicFormConfig;
  values: FormValues;
  transport?: DynamicFormTransport;
  tracker?: DynamicFormTracker;
  signal?: AbortSignal;
}

export interface RenderDynamicFormOptions extends DynamicFormSubmitContext {
  formId?: string;
  config?: DynamicFormConfig;
  target: Element | string;
  transport?: DynamicFormTransport;
  tracker?: DynamicFormTracker;
  signal?: AbortSignal;
  initialValues?: FormValues;
  classNames?: Partial<
    Record<
      'form' | 'title' | 'field' | 'label' | 'input' | 'error' | 'button',
      string
    >
  >;
  onSubmitSuccess?: (result: DynamicFormSubmitResult) => void;
  onSubmitError?: (error: DynamicFormError) => void;
  onValidationError?: (errors: Record<string, string>) => void;
}

export interface DynamicFormController {
  formId: string;
  revisionId: string;
  element: HTMLFormElement;
  getValues: () => FormValues;
  setValues: (values: FormValues) => void;
  setDisabled: (disabled: boolean) => void;
  submit: () => Promise<DynamicFormSubmitResult>;
  destroy: () => void;
}
