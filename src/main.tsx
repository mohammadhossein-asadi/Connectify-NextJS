import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Fetch Interceptor to dynamically support external hosting (like Vercel)
const originalFetch = window.fetch;
const customFetch = function (input: RequestInfo | URL, init?: RequestInit) {
  let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
  
  if (url.startsWith('/api/')) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Check if custom VITE_API_URL is provided
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;

    if (envApiUrl) {
      // Use explicit API URL if configured (e.g. for custom deployments)
      url = `${envApiUrl.replace(/\/$/, '')}${url}`;
    }
    // Otherwise keep the relative URL — Vercel rewrites (vercel.json) proxy /api/* to the backend
  }
  
  if (typeof input === 'string') {
    return originalFetch(url, init);
  } else if (input instanceof URL) {
    return originalFetch(new URL(url), init);
  } else {
    // If it's a Request object, clone it with the rewritten URL
    return originalFetch(new Request(url, input), init);
  }
};

try {
  window.fetch = customFetch;
} catch (e) {
  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true
    });
  } catch (err) {
    console.error('Failed to patch fetch interceptor:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
