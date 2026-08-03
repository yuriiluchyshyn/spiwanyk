import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api');

// Shared axios instance. Owns base URL, timeout, auth header injection and
// network-error normalization for every domain API module.
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Attach the stored bearer token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Turn low-level connection failures into a user-readable error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('❌ Backend сервер недоступний. Перевірте чи запущений сервер на порті 5001');
      throw new Error(
        'Сервер недоступний. Перевірте підключення до інтернету або зверніться до адміністратора.'
      );
    }
    throw error;
  }
);

export default api;
