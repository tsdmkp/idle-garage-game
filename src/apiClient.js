// src/apiClient.js

// ВРЕМЕННО: Захардкодим URL для отладки на телефоне
// Удалим эту строку после отладки
const API_URL = 'https://idle-garage-game-backend.onrender.com';

const apiClient = async (endpoint, method = 'GET', { body, params } = {}) => {
    // Убедимся, что здесь формируется правильный URL
    const url = new URL(`${API_URL}${endpoint}`);

    // Добавим еще один console.log прямо перед fetch
    console.log(`[apiClient DEBUG] Final URL for fetch: ${url.toString()}`);
    console.log(`[apiClient DEBUG] Method: ${method}, Body:`, body || 'None');
    console.log(`[apiClient DEBUG] Headers:`, {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || 'MISSING_INIT_DATA'
    });
    console.log('[apiClient DEBUG] Platform:', navigator.userAgent);


    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            // Это важно: если initData отсутствует, здесь будет пустая строка, что может быть проблемой
            'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url.toString(), options);
        console.log(`[apiClient] Response status: ${response.status}`);
        if (!response.ok) {
            // Если запрос дошел, но есть ошибка HTTP
            const errorText = await response.text();
            console.error(`[apiClient] HTTP error! Status: ${response.status}, Body: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        // Эта ошибка Load failed происходит здесь
        console.error(`[apiClient] Error fetching ${endpoint}:`, error.message, error.stack);
        throw error;
    }
};

export default apiClient;