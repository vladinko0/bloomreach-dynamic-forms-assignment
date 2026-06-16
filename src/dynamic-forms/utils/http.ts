// src/dynamic-forms/utils/http.ts
export const buildHeaders = (publicToken?: string): HeadersInit => {
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (publicToken) headers['X-Project-Token'] = publicToken;
  return headers;
};

export const setQueryParam = (
  url: URL,
  name: string,
  value: string | undefined,
): void => {
  if (value !== undefined && value !== '') url.searchParams.set(name, value);
};
