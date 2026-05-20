import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const workspaceId = localStorage.getItem('workspaceId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (workspaceId) {
    config.headers['x-workspace-id'] = workspaceId;
  }

  return config;
});

export default api;
