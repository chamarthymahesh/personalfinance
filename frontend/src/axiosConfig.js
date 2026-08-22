import axios from 'axios';

// Global axios request interceptor to append JWT Bearer token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Global axios response interceptor to handle 401 Unauthorized
axios.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    if (window.location.pathname !== '/') {
      window.location.reload();
    }
  }
  return Promise.reject(error);
});
