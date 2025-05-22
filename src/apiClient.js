const BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:3000';

const apiClient = async (endpoint, method = 'GET', { body } = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
        }
    };

    // Убедимся, что body — это корректный JSON
    if (body) {
        try {
            options.body = JSON.stringify(body);
            console.log(`[apiClient] Sending ${method} request to ${url} with body:`, JSON.stringify(body, null, 2));
        } catch (e) {
            console.error('[apiClient] Failed to stringify body:', body, e);
            throw new Error('Invalid request body');
        }
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[apiClient] Error fetching ${endpoint}: HTTP error! Status: ${response.status}, Response: ${errorText}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`[apiClient] Response from ${endpoint}:`, JSON.stringify(data, null, 2));
        return data;
    } catch (err) {
        console.error(`[apiClient] Error fetching ${endpoint}:`, err);
        throw err;
    }
};

export default apiClient;