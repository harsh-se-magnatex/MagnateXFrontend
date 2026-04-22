import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import axiosClient from './axios';

function toErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback;

  // No response: browser/network (often ECONNREFUSED when the API is down).
  if (!err.response) {
    const code = err.code;
    const msg = err.message || '';
    if (
      code === 'ERR_NETWORK' ||
      code === 'ECONNREFUSED' ||
      msg === 'Network Error'
    ) {
      const base =
        typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL
          ? process.env.NEXT_PUBLIC_BACKEND_URL
          : 'the backend';
      return `Cannot reach the API at ${base}. Start the backend (e.g. cd backend && npm run dev) or check NEXT_PUBLIC_BACKEND_URL.`;
    }
  }

  const data: unknown = err.response?.data;

  if (typeof data === 'string' && data.trim().length > 0) return data;
  if (data && typeof data === 'object') {
    const maybeMessage =
      'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : undefined;
    if (maybeMessage) return maybeMessage;

    const maybeError =
      'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : undefined;
    if (maybeError) return maybeError;
  }

  return err.message || fallback;
}

export async function apiGet<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const res: AxiosResponse<T> = await axiosClient.get(url, config);
    return res.data;
  } catch (err) {
    throw new Error(toErrorMessage(err, `GET ${url} failed`));
  }
}

export async function apiPost<TResponse = unknown, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  try {
    const res: AxiosResponse<TResponse> = await axiosClient.post(url, body, config);
    return res.data;
  } catch (err) {
    throw new Error(toErrorMessage(err, `POST ${url} failed`));
  }
}

export async function apiPut<TResponse = unknown, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  try {
    const res: AxiosResponse<TResponse> = await axiosClient.put(url, body, config);
    return res.data;
  } catch (err) {
    throw new Error(toErrorMessage(err, `PUT ${url} failed`));
  }
}

export async function apiDelete<TResponse = unknown, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  try {
    const res: AxiosResponse<TResponse> = await axiosClient.delete(url, { data: body, ...config });
    return res.data;
  } catch (err) {
    throw new Error(toErrorMessage(err, `DELETE ${url} failed`));
    }
  }