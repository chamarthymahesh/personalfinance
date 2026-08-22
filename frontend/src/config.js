export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000');


