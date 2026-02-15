import axios from 'axios';
import { getAdminToken, setAdminToken } from './storage';

export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:3010/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      setAdminToken('');
    }
    return Promise.reject(error);
  }
);
