// src/dynamic-forms/transport.ts
/**
 * Fetch-based transport adapter.
 *
 * The assignment says the endpoints already exist but the API design can be
 * influenced. This adapter expresses the expected endpoint contract while
 * keeping network details outside validation, rendering, and submission logic.
 */
import {DynamicFormError} from './errors';
import type {
  DynamicFormConfig,
  DynamicFormTransport,
  FetchTransportOptions,
} from './types';
import {buildHeaders, setQueryParam} from './utils/http';
import {validateFormConfig} from './validation';

/**
 * Creates a transport backed by the browser `fetch` API.
 *
 * `fetchImpl` is injectable so tests can run without real network calls and
 * older SDK environments can provide a polyfill. The returned object implements
 * the same `DynamicFormTransport` interface that a native bridge or SDK queue
 * could implement later.
 */
export const createFetchTransport = (
  options: FetchTransportOptions,
): DynamicFormTransport => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new DynamicFormError(
      'network_error',
      'No fetch implementation is available',
    );
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  return {
    /**
     * Fetches a form configuration from the proposed `/sdk/forms/v1/forms/:id`
     * endpoint and validates the payload before the renderer can use it.
     */
    fetchFormConfig: async request => {
      const url = new URL(
        `${baseUrl}/sdk/forms/v1/forms/${encodeURIComponent(request.formId)}`,
      );
      setQueryParam(url, 'placement', request.placement);
      setQueryParam(url, 'locale', request.locale);
      setQueryParam(url, 'sdk', 'web');

      const response = await fetchImpl(url, {
        method: 'GET',
        headers: buildHeaders(options.publicToken),
        signal: request.signal,
      });

      if (!response.ok) {
        throw new DynamicFormError(
          'network_error',
          `Failed to fetch form config: ${response.status}`,
          {status: response.status},
        );
      }

      const config = (await response.json()) as DynamicFormConfig;
      validateFormConfig(config);
      return config;
    },

    /**
     * Sends a validated form submission to the proposed submissions endpoint.
     *
     * Network and HTTP failures are normalized into `DynamicFormError` so host
     * callbacks receive a stable SDK error shape.
     */
    submitForm: async (payload, signal) => {
      const response = await fetchImpl(`${baseUrl}/sdk/forms/v1/submissions`, {
        method: 'POST',
        headers: {
          ...buildHeaders(options.publicToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        throw new DynamicFormError(
          'network_error',
          `Failed to submit form: ${response.status}`,
          {status: response.status},
        );
      }

      return response.json();
    },
  };
};
