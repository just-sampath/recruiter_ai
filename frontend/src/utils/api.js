// API configuration and helpers

// Auto-detect API URL: use env var if set (Docker), else detect from current port
const getDefaultApiUrl = () => {
    // Vite injects VITE_API_URL at build time for Docker
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Fallback: if running on port 5175 (Docker frontend), use Docker backend port
    if (typeof window !== 'undefined' && window.location.port === '5175') {
        return 'http://localhost:3005/api';
    }
    // Default for local development
    return 'http://localhost:3000/api';
};

const DEFAULT_API_URL = getDefaultApiUrl();

export function getApiUrl() {
    return localStorage.getItem('apiUrl') || DEFAULT_API_URL;
}

export function setApiUrl(url) {
    localStorage.setItem('apiUrl', url);
}

export function getAuthToken() {
    return localStorage.getItem('authToken');
}

export function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

export function clearAuth() {
    localStorage.removeItem('authToken');
}

export async function apiFetch(endpoint, options = {}) {
    const baseUrl = getApiUrl();
    const token = getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        clearAuth();
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    return response;
}

export async function apiJson(endpoint, options = {}) {
    const response = await apiFetch(endpoint, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}
