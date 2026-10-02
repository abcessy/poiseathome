
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
export const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:9000/poiseathome-images';
export const mediaUrl = (path) => `${MEDIA_BASE_URL.replace(/\/$/, '')}/${path}`;

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const cookieValue = (name) => {
  const prefix = `${name}=`;
  const cookie = document.cookie.split('; ').find(item => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

export const initCsrf = async () => {
  const response = await fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error('Unable to initialize a secure session.');
};

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  if (!SAFE_METHODS.has(method) && !cookieValue('XSRF-TOKEN')) {
    await initCsrf();
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  const xsrfToken = cookieValue('XSRF-TOKEN');
  if (!SAFE_METHODS.has(method) && xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken;

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (response.status === 419) {
    await initCsrf();
    const refreshedToken = cookieValue('XSRF-TOKEN');
    if (refreshedToken) headers['X-XSRF-TOKEN'] = refreshedToken;
    response = await fetch(url, { ...options, method, headers, credentials: 'include' });
  }

  return response;
};

export const checkHealth = async () => {
  try {
    const response = await fetchApi('/health');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Could not connect to API:", error);
    return { status: 'error', data: { database: { connected: false } } };
  }
};
