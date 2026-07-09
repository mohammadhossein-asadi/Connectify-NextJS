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
    const isCloudRun = window.location.hostname.endsWith('.run.app');
    
    // Check if custom VITE_API_URL is provided, or fallback to the deployed production Shared App URL
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    const backendUrl = envApiUrl || 'https://ais-pre-uaq5apaedzbw26pq6t7qxr-981004563440.asia-southeast1.run.app';
    
    if (!isLocalhost && !isCloudRun) {
      url = `${backendUrl.replace(/\/$/, '')}${url}`;
    }
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
