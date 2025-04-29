const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function apiClient(endpoint, method = 'GET', data = null, userId = null) {
    let tgUserData = null;
    try {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            tgUserData = window.Telegram.WebApp.initDataUnsafe.user;
            console.log('apiClient: Telegram user data:', tgUserData);
        } else {
            console.warn('apiClient: Telegram initData not found. Using default userId if not provided.');
        }
    } catch (error) {
        console.error('apiClient: Error accessing Telegram initData:', error);
    }

    // Используем userId из аргумента, если передан, иначе tgUserData.id или 'default'
    const effectiveUserId = userId || tgUserData?.id?.toString() || 'default';

    // Убираем лишние слэши
    const cleanBaseUrl = API_BASE_URL.replace(/\/$/, ''); // Удаляем слэш в конце
    const cleanEndpoint = endpoint.replace(/^\//, ''); // Удаляем слэш в начале
    const url = `${cleanBaseUrl}/${cleanEndpoint}${method === 'GET' ? `?userId=${encodeURIComponent(effectiveUserId)}` : ''}`;

    const tgData = window.Telegram?.WebApp?.initData;
    if (!tgData && effectiveUserId === 'default') {
        console.warn('apiClient: Telegram initData not found. Request might fail.');
    }

    const config = {
        method: method,
        headers: {
            ...(tgData && { 'X-Telegram-Init-Data': tgData }),
        },
    };

    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && data) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify({ ...data, userId: effectiveUserId });
    }

    console.log(`apiClient: Sending ${method} request to ${url}`);

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: response.statusText };
            }
            console.error(`apiClient: ${response.status} ${response.statusText}`, errorData);
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json();
            console.log(`apiClient: Received JSON response from ${url}`, responseData);
            return responseData;
        } else if (response.status === 204) {
            console.log(`apiClient: Received 204 No Content from ${url}`);
            return null;
        } else {
            const responseText = await response.text();
            console.log(`apiClient: Received non-JSON response from ${url}`, responseText);
            return responseText;
        }
    } catch (error) {
        console.error(`apiClient: Network or processing error for ${url}`, error);
        throw error;
    }
}

export default apiClient;