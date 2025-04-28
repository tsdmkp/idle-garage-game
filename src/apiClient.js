// src/apiClient.js

// Получаем базовый URL API из переменных окружения Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Функция для выполнения запросов к API
async function apiClient(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`; // Формируем полный URL

    // --- Получаем initData ---
    // Делаем это внутри функции, чтобы брать актуальное значение
    const tgData = window.Telegram?.WebApp?.initData;
    if (!tgData) {
        // В режиме разработки или если что-то пошло не так
        // Можно либо кидать ошибку, либо отправлять запрос без initData
        // (но бэкенд его отклонит для защищенных маршрутов)
        console.warn("apiClient: Telegram initData not found. Request might fail.");
        // throw new Error("Telegram initData is required for API calls.");
    }
    // --------------------------

    // --- Настройки запроса ---
    const config = {
        method: method,
        headers: {
            // Добавляем заголовок с initData, если он есть
            ...(tgData && { 'X-Telegram-Init-Data': tgData }),
        },
    };

    // Если это POST или PUT/PATCH и есть данные, добавляем тело запроса
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && data) {
        config.headers['Content-Type'] = 'application/json'; // Указываем тип контента
        config.body = JSON.stringify(data); // Преобразуем данные в JSON
    }
    // --------------------------

    console.log(`apiClient: Sending ${method} request to ${url}`); // Лог запроса

    try {
        const response = await fetch(url, config);

        // --- Обработка ответа ---
        if (!response.ok) {
            // Если статус ответа не 2xx (ошибка сервера или клиента)
            let errorData;
            try {
                // Пытаемся прочитать тело ответа как JSON (бэкенд может вернуть детали ошибки)
                errorData = await response.json();
            } catch (e) {
                // Если тело не JSON или пустое
                errorData = { message: response.statusText };
            }
            console.error(`apiClient: ${response.status} ${response.statusText}`, errorData);
            // Пробрасываем ошибку дальше с данными от сервера
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        // Если ответ успешный (статус 2xx)
        // Проверяем тип контента перед парсингом JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json(); // Парсим JSON
            console.log(`apiClient: Received JSON response from ${url}`, responseData);
            return responseData; // Возвращаем данные
        } else if (response.status === 204) { // No Content
             console.log(`apiClient: Received 204 No Content from ${url}`);
             return null; // Возвращаем null для No Content
        }
         else {
            // Если ответ не JSON (например, текст или HTML)
            const responseText = await response.text();
            console.log(`apiClient: Received non-JSON response from ${url}`, responseText);
            return responseText; // Возвращаем как текст
        }
        // -----------------------

    } catch (error) {
        // Обработка сетевых ошибок или ошибок парсинга
        console.error(`apiClient: Network or processing error for ${url}`, error);
        // Пробрасываем ошибку, чтобы ее можно было поймать в компоненте
        throw error;
    }
}

// Экспортируем функцию для использования в других частях приложения
export default apiClient;