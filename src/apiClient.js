const API_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:3000';

  const apiClient = async (endpoint, method = 'GET', { body, params } = {}) => {
      const url = new URL(`${API_URL}${endpoint}`);
      if (params) {
          Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      }

      console.log(`[apiClient] Sending ${method} request to ${url.toString()}`, body || '');
      console.log('[apiClient] Platform:', navigator.userAgent);

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
          console.log(`[apiClient] Response status: ${response.status}`);
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json();
      } catch (error) {
          console.error(`[apiClient] Error fetching ${endpoint}:`, error.message, error.stack);
          throw error;
      }
  };

  export default apiClient;