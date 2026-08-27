import api from './http';

// Songbook endpoints: CRUD, section management, song membership & sharing.
export const songbooksAPI = {
  getMy: () => api.get('/songbooks/my').then((res) => res.data.songbooks || []),
  getSharedWithMe: () =>
    api.get('/songbooks/shared-with-me').then((res) => res.data.songbooks || []),
  getById: (id) => api.get(`/songbooks/${id}`).then((res) => res.data.songbook),
  create: (data) => api.post('/songbooks', data).then((res) => res.data),
  update: (id, data) => api.put(`/songbooks/${id}`, data).then((res) => res.data),
  // Порядок пісень у межах розділів: 'manual' | 'alpha'
  setSongSort: (id, sort) =>
    api.put(`/songbooks/${id}/song-sort`, { sort }).then((res) => res.data),
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
  getNearby: (lat, lng) =>
    api.get(`/songbooks/nearby?lat=${lat}&lng=${lng}`).then((res) => res.data.songbooks || []),
  share: (id, data) => api.post(`/songbooks/${id}/share`, data).then((res) => res.data),

  // Shared "singing now" state. `nowSinging` is { songId, songTitle,
  // startedByEmail, startedAt } or null.
  getNowSinging: (songbookId) =>
    api.get(`/songbooks/${songbookId}/now-singing`).then((res) => res.data.nowSinging),
  // Aggregated: every songbook (this user can see) that is being sung right now.
  getAllNowSinging: () =>
    api.get('/songbooks/now-singing').then((res) => res.data.singing || []),
  setNowSinging: (songbookId, songId) =>
    api
      .put(`/songbooks/${songbookId}/now-singing`, { songId })
      .then((res) => res.data.nowSinging),
  stopNowSinging: (songbookId) =>
    api.delete(`/songbooks/${songbookId}/now-singing`).then((res) => res.data.nowSinging)
};
