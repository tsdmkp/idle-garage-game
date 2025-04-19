import React, { useState, useEffect } from 'react';
import Header from './components/Header'; // <-- Импорт компонента
import './App.css';

function App() {
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);

  // --- Начальные игровые данные (пока просто заглушки) ---
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerName, setPlayerName] = useState("Игрок"); // По умолчанию
  const [gameCoins, setGameCoins] = useState(100); // Начальные монеты
  const [jetCoins, setJetCoins] = useState(0);    // Начальные токены
  const [currentXp, setCurrentXp] = useState(10); // Текущий опыт
  const [xpToNextLevel, setXpToNextLevel] = useState(100); // Опыта до след. уровня
  // --------------------------------------------------------

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      setIsTgApp(true);
      tg.ready();

      if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        setTgUserData(user);
        // Используем имя из ТГ, если есть, иначе оставляем "Игрок"
        setPlayerName(user.first_name || user.username || "Игрок");
      } else {
        // Тестовые данные для разработки вне ТГ
         setTgUserData({ id: 123, first_name: "Dev", username: "dev_user"});
         setPlayerName("Dev User"); // Имя для режима разработки
      }
      tg.expand();
    } else {
      // Тестовые данные для разработки вне ТГ
       setTgUserData({ id: 123, first_name: "Dev", username: "dev_user"});
       setPlayerName("Dev User"); // Имя для режима разработки
      console.log("Telegram WebApp script not loaded or running outside Telegram.");
    }

    // !!! В будущем здесь будет логика загрузки СОХРАНЕННЫХ данных игрока (уровень, монеты и т.д.)
    // Пока используем заглушки выше

  }, []);

  // Рассчитываем процент XP для полосы прогресса
  const xpPercentage = xpToNextLevel > 0 ? (currentXp / xpToNextLevel) * 100 : 0;

  return (
    <div className="App">
      {/* Используем компонент Header и передаем ему данные */}
      <Header
        level={playerLevel}
        playerName={playerName}
        gameCoins={gameCoins}
        jetCoins={jetCoins}
        xpPercentage={xpPercentage}
      />

      {/* Уберем старый вывод данных ТГ, т.к. имя теперь в хедере */}
      <h1>Idle Garage (TMA)</h1>
      {isTgApp ? (
        <p>Запущено в Telegram.</p>
      ) : (
        <p>Запущено в браузере (dev).</p>
      )}

      {/* Здесь будут остальные компоненты: GarageArea, IncomeArea и т.д. */}

    </div>
  );
}

export default App;