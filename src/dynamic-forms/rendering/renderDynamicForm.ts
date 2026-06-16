// src/dynamic-forms/rendering/renderDynamicForm.ts
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

  if (config.title) {
    const title = document.createElement('h2');
    title.textContent = config.title;
    addClass(title, options.classNames?.title);
    form.appendChild(title);
  }

  const fieldElements = new Map<string, HTMLInputElement>();
  const errorElements = new Map<string, HTMLElement>();

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

  const controller: DynamicFormController = {
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

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      await controller.submit();
    } catch {
      return;
    }
  };

  form.addEventListener('submit', onSubmit);
  return controller;
};

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

const normalizeSubmissionError = (error: unknown): DynamicFormError => {
  if (error instanceof DynamicFormError) return error;
  return new DynamicFormError(
    'network_error',
    'Dynamic form submission failed',
    error,
  );
};

const addClass = (element: Element, className: string | undefined): void => {
  if (!className) return;
  for (const item of className.split(/\s+/).filter(Boolean)) {
    element.classList.add(item);
  }
};
