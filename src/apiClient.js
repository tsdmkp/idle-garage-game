const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function apiClient(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
  };

  console.log(`apiClient: Sending ${method} request to ${url}`);

  try {
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      console.log(`apiClient: Received JSON response for ${url}:`, json);
      return json;
    } else {
      const text = await response.text();
      console.log(`apiClient: Received non-JSON response for ${url}:`, text);
      return text;
    }
  } catch (error) {
    console.error(`apiClient: Network or processing error for ${url}:`, error.message);
    throw error;
  }
}

export default apiClient;