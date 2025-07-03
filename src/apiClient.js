// src/apiClient.js - УЛУЧШЕННАЯ ВЕРСИЯ

// Определяем базовый URL для API. Используем переменную окружения VITE_REACT_APP_API_URL,
// если она установлена (например, на Vercel), иначе используем localhost для разработки.
const API_URL = (import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:3000') + '/api';

/**
 * Универсальная функция для выполнения API-запросов к бэкенду.
 * @param {string} endpoint - Конечная точка API (например, '/game_state').
 * @param {string} method - Метод HTTP-запроса (GET, POST, PUT, PATCH). По умолчанию 'GET'.
 * @param {object} [options] - Дополнительные параметры запроса.
 * @param {object} [options.body] - Тело запроса для методов POST/PUT/PATCH.
 * @param {object} [options.params] - Параметры запроса для GET-запросов (будут добавлены в URL как query string).
 * @returns {Promise<object>} - Промис, который разрешается в JSON-ответ от сервера.
 * @throws {Error} - Выбрасывает ошибку, если запрос не удался или ответ не OK.
 */
const apiClient = async (endpoint, method = 'GET', { body, params } = {}) => {
    // Создаем URL-объект для удобной работы с параметрами запроса
    const url = new URL(`${API_URL}${endpoint}`);

    // Если есть параметры, добавляем их в URL как query string
    if (params) {
        Object.keys(params).forEach(key => {
            // Проверяем, что значение параметра не undefined и не null, чтобы избежать добавления пустых параметров
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
    }

    // Получаем initData из глобального объекта Telegram.WebApp.
    // Если Telegram.WebApp не существует (например, при локальной разработке без мока), initData будет пустой строкой.
    const initData = window.Telegram?.WebApp?.initData || '';

    // --- ДОБАВЛЕННЫЙ ЛОГ ДЛЯ ОТЛАДКИ initData ---
    // Этот лог покажет, какое значение initData используется при каждом API-запросе.
    console.log('DEBUG_API_CLIENT: initData value:', initData);
    // -------------------------------------------
    
    // Формируем объект опций для fetch-запроса
    const options = {
        method, // Метод HTTP (GET, POST и т.д.)
        headers: {
            'Content-Type': 'application/json', // Указываем, что тело запроса будет в JSON формате
            'X-Telegram-Init-Data': initData // Добавляем initData в заголовок для аутентификации на бэкенде
        }
    };

    // Если есть тело запроса (для POST, PUT, PATCH), преобразуем его в JSON строку
    if (body) {
        options.body = JSON.stringify(body);
    }

    // --- ДОБАВЛЕННОЕ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ ЗАПРОСОВ ---
    console.log(`📤 ${method} ${url.toString()}`); // Логируем отправляемый запрос

    // Логируем наличие initData в заголовках
    if (initData) {
        console.log('📡 X-Telegram-Init-Data header added to request');
        // Для безопасности, если initData содержит реферальные параметры, логируем только их наличие,
        // а не полное значение, чтобы избежать утечки чувствительных данных в логах.
        if (initData.includes('startapp=') || initData.includes('start_param=')) {
            const hasStartApp = initData.includes('startapp=');
            const hasStartParam = initData.includes('start_param=');
            console.log('🔗 Referral data detected in initData:', { hasStartApp, hasStartParam });
        }
    } else {
        console.log('⚠️ No Telegram initData available for request'); // Предупреждение, если initData отсутствует
    }
    
    // Логируем тело запроса, если оно есть
    if (body) {
        console.log('📦 Request body:', body);
    }
    // -----------------------------------------------------------

    try {
        // Выполняем fetch-запрос
        const response = await fetch(url.toString(), options);
        
        // Проверяем, был ли ответ успешным (статус 2xx)
        if (!response.ok) {
            // Если ответ не успешный, пытаемся прочитать текст ошибки из ответа
            const errorText = await response.text();
            console.error(`[apiClient] Error ${response.status} for ${endpoint}:`, errorText);
            // Выбрасываем новую ошибку с подробной информацией
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        // Если ответ успешный, парсим JSON из тела ответа
        const data = await response.json();
        console.log(`📥 ${method} ${endpoint} success:`, data); // Логируем успешный ответ
        return data; // Возвращаем полученные данные
    } catch (error) {
        // Обрабатываем любые ошибки, возникшие во время выполнения fetch-запроса
        console.error(`[apiClient] Fetch error for ${endpoint}:`, error);
        throw error; // Перебрасываем ошибку дальше для обработки в вызывающем коде
    }
};

export default apiClient; // Экспортируем функцию apiClient для использования в других частях приложения