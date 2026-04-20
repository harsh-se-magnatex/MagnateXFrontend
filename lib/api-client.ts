import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import axiosClient from './axios';

function toErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback;
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