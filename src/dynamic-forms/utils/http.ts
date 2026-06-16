// src/dynamic-forms/utils/http.ts
/**
 * HTTP utility helpers used by the fetch transport.
 */

/**
 * Builds common request headers for the proposed form endpoints.
 *
 * `X-Project-Token` is a placeholder for the kind of public project token an
 * SDK would typically attach. The exact authentication shape would be finalized
 * with the Bloomreach backend API.
 */
export const buildHeaders = (publicToken?: string): HeadersInit => {
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (publicToken) headers['X-Project-Token'] = publicToken;
  return headers;
};

/**
 * Adds a query parameter only when the value exists.
 *
 * This keeps generated URLs compact and avoids sending empty strings that could
 * be interpreted differently by the server.
 */
export const setQueryParam = (
  url: URL,
  name: string,
  value: string | undefined,
): void => {
  if (value !== undefined && value !== '') url.searchParams.set(name, value);
};
