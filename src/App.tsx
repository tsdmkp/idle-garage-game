import React, { useState, useEffect } from 'react';
import './App.css'; // Или другой файл стилей

// Объявляем тип для объекта WebApp, чтобы TypeScript не ругался
// В будущем можно использовать готовые типы, если найдем/установим
declare global {
  interface Window {
    Telegram: {
      WebApp: any; // Используем 'any' для простоты на начальном этапе
    }
  }
}

function App() {
  const [tgUserData, setTgUserData] = useState<any>(null); // Состояние для данных пользователя
  const [isTgApp, setIsTgApp] = useState(false); // Флаг, что приложение открыто в Telegram

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      setIsTgApp(true);
      tg.ready(); // Сообщаем Telegram, что приложение готово

      // Пытаемся получить данные пользователя
      if (tg.initDataUnsafe?.user) {
        setTgUserData(tg.initDataUnsafe.user);
      } else {
        // Если данных нет (например, открыто в браузере не из Telegram)
        // Установим тестовые данные для разработки
        setTgUserData({
          id: 123456789,
          first_name: "Dev",
          last_name: "User",
          username: "dev_user",
          is_premium: false
        });
      }

      // Попробуем расширить окно на всю высоту
      tg.expand();

    } else {
      console.log("Telegram WebApp script not loaded or running outside Telegram.");
      // Установим тестовые данные для разработки вне Telegram
       setTgUserData({
          id: 123456789,
          first_name: "Dev",
          last_name: "User",
          username: "dev_user",
          is_premium: false
       });
    }
  }, []); // Пустой массив зависимостей, чтобы выполнилось один раз при монтировании

  return (
    <div className="App">
      <h1>Idle Garage (TMA)</h1>

      {isTgApp ? (
        <p>Приложение запущено в Telegram!</p>
      ) : (
        <p>Приложение запущено в браузере (режим разработки).</p>
      )}

      {tgUserData ? (
        <div>
          <h2>Привет, {tgUserData.first_name}!</h2>
          <p>Твой ID: {tgUserData.id}</p>
          <p>Никнейм: @{tgUserData.username || 'не указан'}</p>
          <p>Премиум: {tgUserData.is_premium ? 'Да' : 'Нет'}</p>
          {/* В реальном приложении эти данные так явно выводить не стоит,
              но для проверки интеграции - самое то */}
        </div>
      ) : (
        <p>Загрузка данных пользователя...</p>
      )}

      {/* Здесь будет остальной интерфейс игры */}

    </div>
  );
}

export default App;