const defaultApiUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://riffaa.com/api'
    : 'http://localhost:8000/api';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || defaultApiUrl
).replace(/\/+$/, '');