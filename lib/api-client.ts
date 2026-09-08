import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import axiosClient from './axios';

const GENERIC_API_ERROR =
  'We could not complete this request. Check your connection and try again.';

/** Error text already made safe for display by the API response boundary. */
export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function toErrorMessage(err: unknown, fallback: string = GENERIC_API_ERROR) {
  if (axios.isAxiosError(err)) {
    const apiMessage = (err.response?.data as { message?: string } | undefined)
      ?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage.trim();
    }
    if (err.response?.status === 413) {
      return 'The uploaded content is too large. Select a smaller file and try again.';
    }
    if (!err.response) {
      const code = err.code;
      const msg = err.message || '';
      if (
        code === 'ERR_NETWORK' ||
        code === 'ECONNREFUSED' ||
        msg === 'Network Error'
      ) {
        return 'We could not reach SocioGenie. Check your internet connection and try again.';
      }
    }
  }

  return fallback;
}

export async function apiGet<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const res: AxiosResponse<T> = await axiosClient.get(url, config);
    return res.data;
  } catch (err) {
    throw new ApiClientError(toErrorMessage(err));
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
    throw new ApiClientError(toErrorMessage(err));
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
    throw new ApiClientError(toErrorMessage(err));
  }
}

export async function apiDelete<TResponse = unknown, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  try {
    const res: AxiosResponse<TResponse> = await axiosClient.delete(url, {
      data: body,
      ...config,
    });
    return res.data;
  } catch (err) {
    throw new ApiClientError(toErrorMessage(err));
  }
}
