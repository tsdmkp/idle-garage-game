// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './telegramWebAppMock'; // <-- This line should be very high, preferably first after React imports

// --- ADDED DEBUG LOGS IN main.jsx ---
// These logs will help us understand the state of window.Telegram immediately after the mock is loaded.
console.log('DEBUG_MAIN: After mock import, window.Telegram:', window.Telegram);
console.log('DEBUG_MAIN: After mock import, window.Telegram?.WebApp?.initData:', window.Telegram?.WebApp?.initData);
console.log('DEBUG_MAIN: After mock import, window.Telegram?.WebApp?.initDataUnsafe?.user:', window.Telegram?.WebApp?.initDataUnsafe?.user);
// -----------------------------------------------

import './index.css'; // Import global styles
import App from './App.jsx'; // Import the main application component

// Create the React root element and render the application
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);