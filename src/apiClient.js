// src/apiClient.js - УЛУЧШЕННАЯ ВЕРСИЯ

const API_URL = (import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:3000') + '/api';

const apiClient = async (endpoint, method = 'GET', { body, params } = {}) => {
    const url = new URL(`${API_URL}${endpoint}`);
    if (params) {
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
    }

    // Получаем initData и логируем его
    const initData = window.Telegram?.WebApp?.initData || '';
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    // ДОБАВЛЕНО: Детальное логирование для отладки
    console.log(`📤 ${method} ${url.toString()}`);
    
    if (initData) {
        console.log('📡 X-Telegram-Init-Data header added to request');
        // Показываем только наличие startapp/start_param для безопасности
        if (initData.includes('startapp=') || initData.includes('start_param=')) {
            const hasStartApp = initData.includes('startapp=');
            const hasStartParam = initData.includes('start_param=');
            console.log('🔗 Referral data detected in initData:', { hasStartApp, hasStartParam });
        }
    } else {
        console.log('⚠️ No Telegram initData available for request');
    }
    
    if (body) {
        console.log('📦 Request body:', body);
    }

    try {
        const response = await fetch(url.toString(), options);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[apiClient] Error ${response.status} for ${endpoint}:`, errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`📥 ${method} ${endpoint} success:`, data);
        return data;
        
    } catch (error) {
        console.error(`[apiClient] Failed ${endpoint}:`, error.message);
        throw error;
    }
};

export default apiClient;