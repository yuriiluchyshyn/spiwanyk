import api from './http';

// User geolocation endpoints.
export const locationAPI = {
  updateLocation: (lat, lng) => api.post('/location', { lat, lng }).then((res) => res.data)
};

// Backend health probe.
export const healthCheck = () => api.get('/health').then((res) => res.data);
