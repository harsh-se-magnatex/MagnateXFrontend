import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import axiosClient from './axios';
import { CONTENT_TOO_LARGE_MESSAGE } from './show-error-toast';

const GENERIC_API_ERROR = 'Something went wrong. Please try again.';

function toErrorMessage(err: unknown, fallback: string = GENERIC_API_ERROR) {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 413) {
      return CONTENT_TOO_LARGE_MESSAGE;
    }
    const apiMessage = (err.response?.data as { message?: string } | undefined)
      ?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage.trim();
    }
    if (!err.response) {
      const code = err.code;
      const msg = err.message || '';
      if (
        code === 'ERR_NETWORK' ||
        code === 'ECONNREFUSED' ||
        msg === 'Network Error'
      ) {
        return 'Try again later';
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
    throw new Error(toErrorMessage(err));
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
    throw new Error(toErrorMessage(err));
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
    throw new Error(toErrorMessage(err));
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
    throw new Error(toErrorMessage(err));
  }
}
