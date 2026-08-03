import api from './http';

// Song catalogue endpoints.
export const songsAPI = {
  getAll: () => api.get('/songs').then((res) => res.data.songs || []),
  getById: (id) => api.get(`/songs/${id}`).then((res) => res.data.song),
  search: (query) => api.get(`/songs/search?q=${query}`).then((res) => res.data.songs || [])
};
