
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const login = async (email, password) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  if (response.data.access_token) {
    localStorage.setItem('access_token', response.data.access_token);
  }

  return response.data;
};

export const getDashboard = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('access_token');
};

export default api;
