// src/dynamic-forms/transport.ts
import {DynamicFormError} from './errors';
import type {
  DynamicFormConfig,
  DynamicFormTransport,
  FetchTransportOptions,
} from './types';
import {buildHeaders, setQueryParam} from './utils/http';
import {validateFormConfig} from './validation';

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
