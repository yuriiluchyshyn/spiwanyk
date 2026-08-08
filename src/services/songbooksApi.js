import api from './http';

// Songbook endpoints: CRUD, section management, song membership & sharing.
export const songbooksAPI = {
  getMy: () => api.get('/songbooks/my').then((res) => res.data.songbooks || []),
  getById: (id) => api.get(`/songbooks/${id}`).then((res) => res.data.songbook),
  create: (data) => api.post('/songbooks', data).then((res) => res.data),
  update: (id, data) => api.put(`/songbooks/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/songbooks/${id}`).then((res) => res.data),
  addSong: (songbookId, songId, sectionId) => {
    const data = { songId };
    if (sectionId) {
      data.sectionId = sectionId;
    }
    return api.post(`/songbooks/${songbookId}/songs`, data).then((res) => res.data);
  },
  removeSong: (songbookId, songId) =>
    api.delete(`/songbooks/${songbookId}/songs/${songId}`).then((res) => res.data),
  reorderSongs: (songbookId, sectionId, orderedSongIds) =>
    api
      .put(`/songbooks/${songbookId}/songs/reorder`, {
        sectionId: sectionId || null,
        orderedSongIds
      })
      .then((res) => res.data),
  moveSong: (songbookId, songId, sectionId, targetIndex) =>
    api
      .put(`/songbooks/${songbookId}/songs/${songId}/move`, {
        sectionId: sectionId || null,
        targetIndex
      })
      .then((res) => res.data),
  addSection: (songbookId, name, description) =>
    api.post(`/songbooks/${songbookId}/sections`, { name, description }).then((res) => res.data),
  removeSection: (songbookId, sectionId) =>
    api.delete(`/songbooks/${songbookId}/sections/${sectionId}`).then((res) => res.data),
  getAvailableSongs: (songbookId, params = {}) =>
    api.get(`/songbooks/${songbookId}/available-songs`, { params }).then((res) => res.data),
  getPublic: () => api.get('/songbooks/public').then((res) => res.data.songbooks || []),
  getNearby: (lat, lng, debugIncludeSelf = false) => {
    const params = new URLSearchParams({ lat, lng });
    if (debugIncludeSelf) params.append('debugIncludeSelf', 'true');
    return api.get(`/songbooks/nearby?${params}`).then((res) => res.data.songbooks || []);
  },
  share: (id, data) => api.post(`/songbooks/${id}/share`, data).then((res) => res.data)
};
