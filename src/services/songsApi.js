import api from './http';

// Song catalogue endpoints.
export const songsAPI = {
  getAll: () => api.get('/songs').then((res) => res.data.songs || []),
  getById: (id) => api.get(`/songs/${id}`).then((res) => res.data.song),
  search: (query) => api.get(`/songs/search?q=${query}`).then((res) => res.data.songs || []),

  // Categories (global + the authenticated user's own private ones).
  getCategories: () => api.get('/songs/categories').then((res) => res.data.categories || []),

  // Create a private category owned by the current user.
  createMyCategory: (data) =>
    api.post('/songs/my/categories', data).then((res) => res.data.category),

  // Rename one of the current user's own private categories.
  updateMyCategory: (id, data) =>
    api.put(`/songs/my/categories/${id}`, data).then((res) => res.data.category),

  // Delete one of the current user's own private categories.
  deleteMyCategory: (id) =>
    api.delete(`/songs/my/categories/${id}`).then((res) => res.data),

  // Create a private song owned by the current user.
  createMySong: (data) => api.post('/songs/my/songs', data).then((res) => res.data.song),

  // Update one of the current user's own private songs.
  updateMySong: (id, data) => api.put(`/songs/my/songs/${id}`, data).then((res) => res.data.song),

  // Delete one of the current user's own private songs.
  deleteMySong: (id) => api.delete(`/songs/my/songs/${id}`).then((res) => res.data),

  // Save a song (seen inside a shared songbook) into the current user's own
  // catalogue. Payload: { category } or { newCategory: { name, icon?, color? } }.
  saveToMyCatalog: (songId, data) =>
    api.post(`/songs/my/save/${songId}`, data).then((res) => res.data.song)
};
