// src/dynamic-forms/utils/dom.ts
/**
 * DOM-related utility helpers shared by the renderer.
 */
import {DynamicFormError} from '../errors';

/**
 * Resolves the host-provided render target.
 *
 * The public API accepts either a CSS selector or an existing Element. Throwing a
 * typed render error here makes integration mistakes visible before the SDK
 * tries to build any form DOM.
 */
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
