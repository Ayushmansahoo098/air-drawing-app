const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path) {
  if (!path.startsWith('/')) {
    throw new Error('apiUrl(path) expects a leading slash');
  }
  return `${baseUrl}${path}`;
}

export function isLocalBackend() {
  return (
    baseUrl === '' ||
    baseUrl.includes('localhost') ||
    baseUrl.includes('127.0.0.1')
  );
}
