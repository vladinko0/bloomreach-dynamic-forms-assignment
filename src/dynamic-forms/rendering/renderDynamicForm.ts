// src/dynamic-forms/rendering/renderDynamicForm.ts
/**
 * Browser DOM renderer for dynamic forms.
 *
 * Source: the assignment asks for forms to render in alignment with the
 * embedding application look and feel. The renderer therefore creates semantic
 * native DOM elements and accepts class names, but it does not inject opinionated
 * CSS or HTML templates.
 */
import {DynamicFormError} from '../errors';
import {submitDynamicForm} from '../submission';
import type {
  DynamicFormConfig,
  DynamicFormController,
  RenderDynamicFormOptions,
} from '../types';
import {validateFormConfig, validateValues} from '../validation';
import {resolveTarget} from '../utils/dom';
import {renderTextField} from './renderTextField';
import {
  clearErrors,
  focusFirstInvalidField,
  readValues,
  showErrors,
} from './valueState';

/**
 * Resolves the form config for the renderer.
 *
 * The integration can either pass an already fetched config or pass `formId`
 * plus a transport. Supporting both modes makes the SDK easier to integrate in
 * apps that already centralize data fetching.
 */
const fetchConfigForRender = async (
  options: RenderDynamicFormOptions,
): Promise<DynamicFormConfig> => {
  if (!options.formId) {
    throw new DynamicFormError(
      'render_error',
      'Either config or formId must be provided',
    );
  }
  if (!options.transport) {
    throw new DynamicFormError(
      'render_error',
      'Transport is required when config is not provided',
    );
  }

  return options.transport.fetchFormConfig({
    formId: options.formId,
    placement: options.placement,
    locale: options.locale,
    signal: options.signal,
  });
};

/**
 * Normalizes unknown submission failures into the SDK error type.
 *
 * Browser APIs and customer-provided tracker callbacks can throw arbitrary
 * values. Normalization protects the public callback contract.
 */
const normalizeSubmissionError = (error: unknown): DynamicFormError => {
  if (error instanceof DynamicFormError) return error;
  return new DynamicFormError(
    'network_error',
    'Dynamic form submission failed',
    error,
  );
};

/**
 * Applies host-provided class names to an element.
 *
 * This small helper exists because the renderer accepts space-separated class
 * strings in the same style as normal HTML markup.
 */
const addClass = (element: Element, className: string | undefined): void => {
  if (!className) return;
  for (const item of className.split(/\s+/).filter(Boolean)) {
    element.classList.add(item);
  }
};

/**
 * Fetches or accepts a form config, renders it into a target element, and
 * returns a lifecycle controller.
 *
 * This is the main browser integration API. It exists as a convenience layer on
 * top of the headless schema, validation, submission, and transport modules. The
 * host app can use callbacks for success/error flows while the SDK owns
 * validation, disabling during submit, and cleanup.
 */
export const renderDynamicForm = async (
  options: RenderDynamicFormOptions,
): Promise<DynamicFormController> => {
  const target = resolveTarget(options.target);
  const config = options.config ?? (await fetchConfigForRender(options));
  validateFormConfig(config);

  const form = document.createElement('form');
  form.noValidate = true;
  addClass(form, options.classNames?.form);
  form.dataset.brDynamicFormId = config.id;
  form.dataset.brDynamicFormRevisionId = config.revisionId;

  /**
   * The title is optional because not every host placement needs a heading.
   * Text is assigned via `textContent` to avoid rendering marketer-provided HTML.
   */
  if (config.title) {
    const title = document.createElement('h2');
    title.textContent = config.title;
    addClass(title, options.classNames?.title);
    form.appendChild(title);
  }

  const fieldElements = new Map<string, HTMLInputElement>();
  const errorElements = new Map<string, HTMLElement>();

  /**
   * Field and error elements are stored by field ID so validation errors can be
   * shown next to the correct input and current values can be read later.
   */
  for (const field of config.fields) {
    const rendered = renderTextField(
      field,
      options.classNames,
      options.initialValues?.[field.id],
    );
    fieldElements.set(field.id, rendered.input);
    errorElements.set(field.id, rendered.error);
    form.appendChild(rendered.root);
  }

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = config.submitButton.text;
  addClass(submitButton, options.classNames?.button);
  form.appendChild(submitButton);

  target.appendChild(form);

  let controller: DynamicFormController;

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      await controller.submit();
    } catch {
      return;
    }
  };

  /**
   * Controller returned to the host application.
   *
   * Single-page applications need explicit lifecycle control because the SDK
   * cannot know when a route, modal, or component tree is unmounted.
   */
  controller = {
    formId: config.id,
    revisionId: config.revisionId,
    element: form,
    getValues: () => readValues(fieldElements),
    setValues: values => {
      for (const [fieldId, value] of Object.entries(values)) {
        const input = fieldElements.get(fieldId);
        if (input) input.value = value;
      }
    },
    setDisabled: disabled => {
      for (const input of fieldElements.values()) input.disabled = disabled;
      submitButton.disabled = disabled;
    },
    submit: async () => {
      clearErrors(fieldElements, errorElements);
      const values = readValues(fieldElements);
      const validationErrors = validateValues(config, values);

      if (Object.keys(validationErrors).length > 0) {
        showErrors(fieldElements, errorElements, validationErrors);
        focusFirstInvalidField(fieldElements, validationErrors);
        options.onValidationError?.(validationErrors);
        throw new DynamicFormError(
          'validation_error',
          'Dynamic form values are invalid',
          validationErrors,
        );
      }

      controller.setDisabled(true);
      submitButton.textContent =
        config.submitButton.pendingText ?? config.submitButton.text;

      /**
       * Submission is delegated to the headless module. This keeps rendering
       * concerns separate from transport/tracking concerns and makes the same
       * submission logic reusable in non-DOM environments.
       */
      try {
        const result = await submitDynamicForm({
          config,
          values,
          placement: options.placement,
          locale: options.locale,
          sdk: options.sdk,
          transport: options.transport,
          tracker: options.tracker,
          signal: options.signal,
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
    destroy: () => {
      form.removeEventListener('submit', onSubmit);
      form.remove();
    },
  };

  form.addEventListener('submit', onSubmit);
  return controller;
};
