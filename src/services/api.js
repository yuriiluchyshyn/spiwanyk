import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 секунд timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor для обробки помилок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('❌ Backend сервер недоступний. Перевірте чи запущений сервер на порті 5001');
      // Показуємо користувачу зрозумілу помилку
      throw new Error('Сервер недоступний. Перевірте підключення до інтернету або зверніться до адміністратора.');
    }
    throw error;
  }
);

// Auth API
export const authAPI = {
  login: (email) => api.post('/auth/login', { email }).then(res => res.data),
  verifyToken: (token) => api.get('/auth/verify', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.data),
};

// Songs API
export const songsAPI = {
  getAll: () => api.get('/songs').then(res => res.data.songs || []),
  getById: (id) => api.get(`/songs/${id}`).then(res => res.data.song),
  search: (query) => api.get(`/songs/search?q=${query}`).then(res => res.data.songs || []),
};

// Songbooks API
export const songbooksAPI = {
  getMy: () => api.get('/songbooks/my').then(res => res.data.songbooks || []),
  getById: (id) => api.get(`/songbooks/${id}`).then(res => res.data.songbook),
  create: (data) => api.post('/songbooks', data).then(res => res.data),
  update: (id, data) => api.put(`/songbooks/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/songbooks/${id}`).then(res => res.data),
  addSong: (songbookId, songId, sectionId) => {
    const data = { songId };
    if (sectionId) {
      data.sectionId = sectionId;
    }
    return api.post(`/songbooks/${songbookId}/songs`, data).then(res => res.data);
  },
  removeSong: (songbookId, songId) => 
    api.delete(`/songbooks/${songbookId}/songs/${songId}`).then(res => res.data),
  addSection: (songbookId, name, description) =>
    api.post(`/songbooks/${songbookId}/sections`, { name, description }).then(res => res.data),
  removeSection: (songbookId, sectionId) =>
    api.delete(`/songbooks/${songbookId}/sections/${sectionId}`).then(res => res.data),
  getAvailableSongs: (songbookId, params = {}) =>
    api.get(`/songbooks/${songbookId}/available-songs`, { params }).then(res => res.data),
  getPublic: () => api.get('/songbooks/public').then(res => res.data.songbooks || []),
  getNearby: (lat, lng) => api.get(`/songbooks/nearby?lat=${lat}&lng=${lng}`).then(res => res.data.songbooks || []),
  share: (id, data) => api.post(`/songbooks/${id}/share`, data).then(res => res.data),
};

// Location API
export const locationAPI = {
  updateLocation: (lat, lng) => api.post('/location', { lat, lng }).then(res => res.data),
};

// Health check функція
export const healthCheck = () => api.get('/health').then(res => res.data);

export default api;