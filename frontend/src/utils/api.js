// API configuration and helpers

const DEFAULT_API_URL = 'http://localhost:3000/api';

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
