import axios from 'axios';

// Defaults to relative /api which Vite proxies to port 5000 in dev
const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

export const api = {
  // Health
  getHealth: async () => {
    const res = await client.get('/health');
    return res.data;
  },

  // Yield
  getYieldOptions: async () => {
    const res = await client.get('/yield/options');
    return res.data;
  },

  predictYield: async (payload) => {
    const res = await client.post('/yield/predict', payload);
    return res.data;
  },

  // Disease
  predictDisease: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await client.post('/disease/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  // Chat
  sendChat: async (message, language = 'auto', history = []) => {
    const res = await client.post('/chat', { message, language, history });
    return res.data;
  }
};
