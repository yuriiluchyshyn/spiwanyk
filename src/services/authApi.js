import api from './http';

// Authentication endpoints.
export const authAPI = {
  login: (email) => api.post('/auth/login', { email }).then((res) => res.data),
  verifyToken: (token) =>
    api
      .get('/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.data)
};
