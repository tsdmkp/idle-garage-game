// src/apiClient.js

const API_URL = (import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:3000') + '/api';

const apiClient = async (endpoint, method = 'GET', { body, params } = {}) => {
    const url = new URL(`${API_URL}${endpoint}`);
    if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url.toString(), options);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[apiClient] Error ${response.status} for ${endpoint}:`, errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`[apiClient] Failed ${endpoint}:`, error.message);
        throw error;
    }
};

export default apiClient;