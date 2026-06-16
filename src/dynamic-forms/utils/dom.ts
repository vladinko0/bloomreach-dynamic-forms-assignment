// src/dynamic-forms/utils/dom.ts
import {DynamicFormError} from '../errors';

export const resolveTarget = (target: Element | string): Element => {
  if (typeof target !== 'string') return target;

  const element = document.querySelector(target);
  if (!element) {
    throw new DynamicFormError(
      'render_error',
      `Target element was not found: ${target}`,
    );
  }
  return element;
};
