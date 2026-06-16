export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type FormValues = Record<string, string>;

export interface DynamicFormTextField {
  id: string;
  type: "text";
  title: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autocomplete?: string;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "numeric" | "decimal";
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
  status: "accepted";
  submissionId?: string;
  trackedEventId?: string;
}

export type DynamicFormErrorCode =
  | "config_error"
  | "validation_error"
  | "network_error"
  | "tracking_error"
  | "render_error";

export class DynamicFormError extends Error {
  readonly code: DynamicFormErrorCode;
  readonly details?: unknown;

  constructor(code: DynamicFormErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "DynamicFormError";
    this.code = code;
    this.details = details;
  }
}

export interface DynamicFormTracker {
  track(eventName: string, properties: Record<string, JsonValue>): void | Promise<void>;
}

export interface DynamicFormTransport {
  fetchFormConfig(request: {
    formId: string;
    placement?: string;
    locale?: string;
    signal?: AbortSignal;
  }): Promise<DynamicFormConfig>;

  submitForm(
    payload: DynamicFormSubmissionPayload,
    signal?: AbortSignal
  ): Promise<DynamicFormSubmitResult>;
}

export interface FetchTransportOptions {
  baseUrl: string;
  publicToken?: string;
  fetchImpl?: typeof fetch;
}

export function createFetchTransport(options: FetchTransportOptions): DynamicFormTransport {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new DynamicFormError("network_error", "No fetch implementation is available");
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  return {
    async fetchFormConfig(request) {
      const url = new URL(`${baseUrl}/sdk/forms/v1/forms/${encodeURIComponent(request.formId)}`);
      setQueryParam(url, "placement", request.placement);
      setQueryParam(url, "locale", request.locale);
      setQueryParam(url, "sdk", "web");

      const response = await fetchImpl(url, {
        method: "GET",
        headers: buildHeaders(options.publicToken),
        signal: request.signal
      });

      if (!response.ok) {
        throw new DynamicFormError(
          "network_error",
          `Failed to fetch form config: ${response.status}`,
          { status: response.status }
        );
      }

      const config = (await response.json()) as DynamicFormConfig;
      validateFormConfig(config);
      return config;
    },

    async submitForm(payload, signal) {
      const response = await fetchImpl(`${baseUrl}/sdk/forms/v1/submissions`, {
        method: "POST",
        headers: {
          ...buildHeaders(options.publicToken),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal
      });

      if (!response.ok) {
        throw new DynamicFormError(
          "network_error",
          `Failed to submit form: ${response.status}`,
          { status: response.status }
        );
      }

      return (await response.json()) as DynamicFormSubmitResult;
    }
  };
}

export interface RenderDynamicFormOptions extends DynamicFormSubmitContext {
  formId?: string;
  config?: DynamicFormConfig;
  target: Element | string;
  transport?: DynamicFormTransport;
  tracker?: DynamicFormTracker;
  signal?: AbortSignal;
  initialValues?: FormValues;
  classNames?: Partial<Record<"form" | "title" | "field" | "label" | "input" | "error" | "button", string>>;
  onSubmitSuccess?: (result: DynamicFormSubmitResult) => void;
  onSubmitError?: (error: DynamicFormError) => void;
  onValidationError?: (errors: Record<string, string>) => void;
}

export interface DynamicFormController {
  formId: string;
  revisionId: string;
  element: HTMLFormElement;
  getValues(): FormValues;
  setValues(values: FormValues): void;
  setDisabled(disabled: boolean): void;
  submit(): Promise<DynamicFormSubmitResult>;
  destroy(): void;
}

export async function renderDynamicForm(
  options: RenderDynamicFormOptions
): Promise<DynamicFormController> {
  const target = resolveTarget(options.target);
  const config = options.config ?? await fetchConfigForRender(options);
  validateFormConfig(config);

  const form = document.createElement("form");
  form.noValidate = true;
  addClass(form, options.classNames?.form);
  form.dataset.brDynamicFormId = config.id;
  form.dataset.brDynamicFormRevisionId = config.revisionId;

  if (config.title) {
    const title = document.createElement("h2");
    title.textContent = config.title;
    addClass(title, options.classNames?.title);
    form.appendChild(title);
  }

  const fieldElements = new Map<string, HTMLInputElement>();
  const errorElements = new Map<string, HTMLElement>();

  for (const field of config.fields) {
    const rendered = renderTextField(field, options.classNames, options.initialValues?.[field.id]);
    fieldElements.set(field.id, rendered.input);
    errorElements.set(field.id, rendered.error);
    form.appendChild(rendered.root);
  }

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = config.submitButton.text;
  addClass(submitButton, options.classNames?.button);
  form.appendChild(submitButton);

  target.appendChild(form);

  const controller: DynamicFormController = {
    formId: config.id,
    revisionId: config.revisionId,
    element: form,
    getValues() {
      return readValues(fieldElements);
    },
    setValues(values) {
      for (const [fieldId, value] of Object.entries(values)) {
        const input = fieldElements.get(fieldId);
        if (input) input.value = value;
      }
    },
    setDisabled(disabled) {
      for (const input of fieldElements.values()) input.disabled = disabled;
      submitButton.disabled = disabled;
    },
    async submit() {
      clearErrors(fieldElements, errorElements);
      const values = readValues(fieldElements);
      const validationErrors = validateValues(config, values);

      if (Object.keys(validationErrors).length > 0) {
        showErrors(fieldElements, errorElements, validationErrors);
        focusFirstInvalidField(fieldElements, validationErrors);
        options.onValidationError?.(validationErrors);
        throw new DynamicFormError(
          "validation_error",
          "Dynamic form values are invalid",
          validationErrors
        );
      }

      controller.setDisabled(true);
      submitButton.textContent = config.submitButton.pendingText ?? config.submitButton.text;

      try {
        const result = await submitDynamicForm({
          config,
          values,
          placement: options.placement,
          locale: options.locale,
          sdk: options.sdk,
          transport: options.transport,
          tracker: options.tracker,
          signal: options.signal
        });
        options.onSubmitSuccess?.(result);
        return result;
      } catch (error) {
        const normalized = normalizeSubmissionError(error);
        options.onSubmitError?.(normalized);
        throw normalized;
      } finally {
        controller.setDisabled(false);
        submitButton.textContent = config.submitButton.text;
      }
    },
    destroy() {
      form.removeEventListener("submit", onSubmit);
      form.remove();
    }
  };

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void controller.submit();
  };

  form.addEventListener("submit", onSubmit);
  return controller;
}

export interface SubmitDynamicFormOptions extends DynamicFormSubmitContext {
  config: DynamicFormConfig;
  values: FormValues;
  transport?: DynamicFormTransport;
  tracker?: DynamicFormTracker;
  signal?: AbortSignal;
}

export async function submitDynamicForm(
  options: SubmitDynamicFormOptions
): Promise<DynamicFormSubmitResult> {
  validateFormConfig(options.config);

  const validationErrors = validateValues(options.config, options.values);
  if (Object.keys(validationErrors).length > 0) {
    throw new DynamicFormError("validation_error", "Dynamic form values are invalid", validationErrors);
  }

  const payload = buildSubmissionPayload(options);

  if (options.transport) {
    return options.transport.submitForm(payload, options.signal);
  }

  if (options.tracker) {
    const eventName = options.config.tracking?.eventName ?? "dynamic_form_submit";
    try {
      await options.tracker.track(eventName, toTrackingProperties(payload, options.config));
      return { status: "accepted" };
    } catch (error) {
      throw new DynamicFormError("tracking_error", "Dynamic form tracking failed", error);
    }
  }

  throw new DynamicFormError(
    "tracking_error",
    "No form transport or tracking adapter was provided"
  );
}

export function validateFormConfig(config: DynamicFormConfig): void {
  if (!config || config.schemaVersion !== 1) {
    throw new DynamicFormError("config_error", "Unsupported dynamic form schema version");
  }

  if (!isSafeId(config.id) || !config.revisionId) {
    throw new DynamicFormError("config_error", "Form id and revision id are required");
  }

  if (!config.submitButton?.text?.trim()) {
    throw new DynamicFormError("config_error", "Submit button text is required");
  }

  if (!Array.isArray(config.fields) || config.fields.length < 1 || config.fields.length > 5) {
    throw new DynamicFormError("config_error", "A dynamic form must contain 1 to 5 fields");
  }

  const fieldIds = new Set<string>();
  for (const field of config.fields) {
    if (field.type !== "text") {
      throw new DynamicFormError("config_error", `Unsupported field type: ${field.type}`);
    }

    if (!isSafeId(field.id)) {
      throw new DynamicFormError("config_error", `Invalid field id: ${field.id}`);
    }

    if (fieldIds.has(field.id)) {
      throw new DynamicFormError("config_error", `Duplicate field id: ${field.id}`);
    }

    if (!field.title?.trim()) {
      throw new DynamicFormError("config_error", `Title is required for field: ${field.id}`);
    }

    if (field.minLength !== undefined && field.minLength < 0) {
      throw new DynamicFormError("config_error", `Invalid minLength for field: ${field.id}`);
    }

    if (field.maxLength !== undefined && field.maxLength < 1) {
      throw new DynamicFormError("config_error", `Invalid maxLength for field: ${field.id}`);
    }

    if (
      field.minLength !== undefined &&
      field.maxLength !== undefined &&
      field.minLength > field.maxLength
    ) {
      throw new DynamicFormError(
        "config_error",
        `minLength cannot be greater than maxLength for field: ${field.id}`
      );
    }

    fieldIds.add(field.id);
  }
}

export function validateValues(
  config: DynamicFormConfig,
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const value = values[field.id] ?? "";
    const normalized = value.trim();

    if (field.required && normalized.length === 0) {
      errors[field.id] = "This field is required.";
      continue;
    }

    if (field.minLength !== undefined && normalized.length < field.minLength) {
      errors[field.id] = `Please enter at least ${field.minLength} characters.`;
      continue;
    }

    if (field.maxLength !== undefined && normalized.length > field.maxLength) {
      errors[field.id] = `Please enter no more than ${field.maxLength} characters.`;
    }
  }

  return errors;
}

export function buildSubmissionPayload(
  options: SubmitDynamicFormOptions
): DynamicFormSubmissionPayload {
  const allowedValues: FormValues = {};

  for (const field of options.config.fields) {
    allowedValues[field.id] = options.values[field.id]?.trim() ?? "";
  }

  return {
    schemaVersion: 1,
    formId: options.config.id,
    revisionId: options.config.revisionId,
    submittedAt: new Date().toISOString(),
    placement: options.placement,
    locale: options.locale,
    sdk: options.sdk ?? { name: "engagement-web-sdk", version: "unknown" },
    values: allowedValues,
    fieldOrder: options.config.fields.map(field => field.id),
    meta: options.config.meta
  };
}

function renderTextField(
  field: DynamicFormTextField,
  classNames: RenderDynamicFormOptions["classNames"],
  initialValue = ""
): { root: HTMLElement; input: HTMLInputElement; error: HTMLElement } {
  const root = document.createElement("div");
  addClass(root, classNames?.field);

  const label = document.createElement("label");
  label.textContent = field.title;
  label.htmlFor = inputId(field.id);
  addClass(label, classNames?.label);

  const input = document.createElement("input");
  input.id = inputId(field.id);
  input.name = field.id;
  input.type = "text";
  input.value = initialValue;
  input.placeholder = field.placeholder ?? "";
  input.required = field.required ?? false;
  if (field.maxLength !== undefined) input.maxLength = field.maxLength;
  if (field.minLength !== undefined) input.minLength = field.minLength;
  if (field.autocomplete) input.autocomplete = field.autocomplete;
  if (field.inputMode) input.inputMode = field.inputMode;
  addClass(input, classNames?.input);

  const error = document.createElement("div");
  error.id = `${input.id}-error`;
  error.hidden = true;
  error.setAttribute("role", "alert");
  addClass(error, classNames?.error);

  input.setAttribute("aria-describedby", error.id);
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    error.textContent = "";
    error.hidden = true;
  });

  root.append(label, input, error);
  return { root, input, error };
}

function buildHeaders(publicToken?: string): HeadersInit {
  const headers: HeadersInit = { Accept: "application/json" };
  if (publicToken) headers["X-Project-Token"] = publicToken;
  return headers;
}

function buildSubmissionPayloadForTracking(
  payload: DynamicFormSubmissionPayload,
  config: DynamicFormConfig
): Record<string, JsonValue> {
  return {
    form_id: payload.formId,
    form_revision_id: payload.revisionId,
    placement: payload.placement ?? null,
    locale: payload.locale ?? null,
    values: payload.values,
    field_order: payload.fieldOrder,
    field_count: payload.fieldOrder.length,
    source: config.tracking?.source ?? "dynamic_form",
    campaign_id: config.meta?.campaignId ?? null,
    experiment_variant: config.meta?.experimentVariant ?? null
  };
}

function toTrackingProperties(
  payload: DynamicFormSubmissionPayload,
  config: DynamicFormConfig
): Record<string, JsonValue> {
  return buildSubmissionPayloadForTracking(payload, config);
}

async function fetchConfigForRender(
  options: RenderDynamicFormOptions
): Promise<DynamicFormConfig> {
  if (!options.formId) {
    throw new DynamicFormError("render_error", "Either config or formId must be provided");
  }
  if (!options.transport) {
    throw new DynamicFormError("render_error", "Transport is required when config is not provided");
  }

  return options.transport.fetchFormConfig({
    formId: options.formId,
    placement: options.placement,
    locale: options.locale,
    signal: options.signal
  });
}

function normalizeSubmissionError(error: unknown): DynamicFormError {
  if (error instanceof DynamicFormError) return error;
  return new DynamicFormError("network_error", "Dynamic form submission failed", error);
}

function readValues(fieldElements: Map<string, HTMLInputElement>): FormValues {
  const values: FormValues = {};
  for (const [fieldId, input] of fieldElements.entries()) {
    values[fieldId] = input.value;
  }
  return values;
}

function clearErrors(
  fieldElements: Map<string, HTMLInputElement>,
  errorElements: Map<string, HTMLElement>
): void {
  for (const input of fieldElements.values()) input.removeAttribute("aria-invalid");
  for (const error of errorElements.values()) {
    error.textContent = "";
    error.hidden = true;
  }
}

function showErrors(
  fieldElements: Map<string, HTMLInputElement>,
  errorElements: Map<string, HTMLElement>,
  errors: Record<string, string>
): void {
  for (const [fieldId, message] of Object.entries(errors)) {
    const input = fieldElements.get(fieldId);
    const error = errorElements.get(fieldId);
    if (!input || !error) continue;

    input.setAttribute("aria-invalid", "true");
    error.textContent = message;
    error.hidden = false;
  }
}

function focusFirstInvalidField(
  fieldElements: Map<string, HTMLInputElement>,
  errors: Record<string, string>
): void {
  const firstInvalidId = Object.keys(errors)[0];
  if (!firstInvalidId) return;
  fieldElements.get(firstInvalidId)?.focus();
}

function resolveTarget(target: Element | string): Element {
  if (typeof target !== "string") return target;

  const element = document.querySelector(target);
  if (!element) {
    throw new DynamicFormError("render_error", `Target element was not found: ${target}`);
  }
  return element;
}

function setQueryParam(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined && value !== "") url.searchParams.set(name, value);
}

function inputId(fieldId: string): string {
  return `br-dynamic-form-${fieldId}`;
}

function isSafeId(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value);
}

function addClass(element: Element, className: string | undefined): void {
  if (!className) return;
  for (const item of className.split(/\s+/).filter(Boolean)) {
    element.classList.add(item);
  }
}

