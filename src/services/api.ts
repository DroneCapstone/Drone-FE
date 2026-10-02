import axios, { type AxiosError } from 'axios';
import { API_BASE_URL } from '../config/api';
import type { ApiResponse } from './apiResponse';

// Single axios instance for the whole app — every service file imports this,
// nothing should ever create a second one.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Backend errors come back as { success: false, message, data: null }.
// Unwrap that here so every service/page just reads err.message.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<null>>) => {
    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  },
);
