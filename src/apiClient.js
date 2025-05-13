const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000'; // Для продакшена задайте REACT_APP_API_URL

async function apiClient(endpoint, method = 'GET', { params = {}, body = null } = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  
  // Добавляем query-параметры
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`apiClient: Sending ${method} request to ${url.toString()}`);
  
  try {
    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const json = await response.json();
    console.log('apiClient: Received JSON response:', json);
    return json;
  } catch (error) {
    console.error(`apiClient: Error fetching ${endpoint}:`, error.message);
    throw error;
  }
}

export default apiClient;