import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// УБРАЛИ StrictMode для предотвращения двойной инициализации
createRoot(document.getElementById('root')).render(
  <App />
)