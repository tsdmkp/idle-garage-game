import React, { useState, useEffect } from 'react';
import Header from './components/Header';       // Импорт компонента Header
import GarageArea from './components/GarageArea'; // Импорт компонента GarageArea
import './App.css';                             // Импорт глобальных стилей

function App() {
  // --- Состояния, связанные с Telegram ---
  const [tgUserData, setTgUserData] = useState(null); // Данные пользователя из Telegram
  const [isTgApp, setIsTgApp] = useState(false);      // Флаг: запущено ли в Telegram

  // --- Основное состояние игры ---
  const [playerLevel, setPlayerLevel] = useState(1);         // Уровень игрока
  const [playerName, setPlayerName] = useState("Игрок");     // Имя игрока (по умолчанию)
  const [gameCoins, setGameCoins] = useState(100);           // Внутриигровая валюта
  const [jetCoins, setJetCoins] = useState(0);             // P2E токен
  const [currentXp, setCurrentXp] = useState(10);            // Текущий опыт
  const [xpToNextLevel, setXpToNextLevel] = useState(100);   // Опыта до следующего уровня

  // --- Состояние Гаража ---
  const [currentCar, setCurrentCar] = useState({ // Состояние для текущей отображаемой машины
    id: 'car_001',                            // Уникальный ID машины
    name: 'Ржавая "Копейка"',                 // Название машины
    // Путь к изображению в папке /public/
    // Убедись, что файл placeholder-car.png есть в папке public
    imageUrl: '/placeholder-car.png',
    stats: {                                  // Характеристики машины
      power: 50,
      speed: 80,
      style: 10,
      reliability: 30,
    }
    // В будущем здесь, скорее всего, будет массив машин игрока,
    // а currentCar будет хранить объект *выбранной* машины.
  });

  // --- Эффект для инициализации Telegram Web App ---
  useEffect(() => {
    // Получаем объект WebApp из глобального window
    const tg = window.Telegram?.WebApp;

    if (tg) {
      // Код выполняется, если приложение запущено в Telegram
      setIsTgApp(true);
      tg.ready(); // Сообщаем Telegram, что приложение готово к отображению

      // Пытаемся получить данные пользователя Telegram
      if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        setTgUserData(user);
        // Используем имя из Telegram, если оно есть, иначе оставляем "Игрок"
        setPlayerName(user.first_name || user.username || "Игрок");
      } else {
        // Случай, когда приложение в Telegram, но данные пользователя недоступны
        // Можно установить тестовые данные для отладки внутри Telegram
        setTgUserData({ id: 123, first_name: "TG User", username: "tg_user"});
        setPlayerName("TG User"); // Запасное имя
        console.warn("Запущено в Telegram, но данные initDataUnsafe.user отсутствуют.");
      }
      // Запрашиваем расширение окна приложения на всю доступную высоту
      tg.expand();
    } else {
      // Код выполняется, если приложение запущено вне Telegram (в обычном браузере)
      setIsTgApp(false);
      // Устанавливаем тестовые данные для режима разработки в браузере
      setTgUserData({ id: 987, first_name: "Dev", username: "dev_user"});
      setPlayerName("Dev User"); // Специальное имя для режима разработки
      console.log("Скрипт Telegram WebApp не загружен или приложение запущено вне Telegram (Режим разработки).");
    }

    // --- Загрузка сохраненных данных игры ---
    // !!! ВАЖНО: Здесь в будущем должна быть логика загрузки реальных данных игрока
    // (уровень, валюта, машины, постройки и т.д.) с бэкенда или из localStorage.
    // Пока мы используем только начальные значения, заданные через useState выше.
    // Пример (концептуально):
    // const savedData = loadGameDataFromBackendOrStorage();
    // if (savedData) {
    //   setPlayerLevel(savedData.level);
    //   setGameCoins(savedData.gameCoins);
    //   setJetCoins(savedData.jetCoins);
    //   setCurrentXp(savedData.currentXp);
    //   setXpToNextLevel(savedData.xpToNextLevel);
    //   // Загрузить список машин, выбрать нужную для currentCar
    //   // Загрузить состояние зданий и т.д.
    // }

  }, []); // Пустой массив зависимостей означает, что useEffect выполнится только один раз при монтировании компонента

  // Рассчитываем процент заполнения полосы опыта для хедера
  const xpPercentage = xpToNextLevel > 0 ? (currentXp / xpToNextLevel) * 100 : 0;

  // --- Отрисовка (рендер) компонента ---
  return (
    <div className="App"> {/* Основной контейнер приложения */}

      {/* Компонент Header: отображает информацию об игроке и ресурсы */}
      <Header
        level={playerLevel}
        playerName={playerName}
        gameCoins={gameCoins}
        jetCoins={jetCoins}
        xpPercentage={xpPercentage}
      />

      {/* Компонент GarageArea: отображает текущую машину и её характеристики */}
      <GarageArea car={currentCar} />

      {/* Место для будущих компонентов */}
      {/* <IncomeArea /> */}
      {/* <BuildingArea /> */}
      {/* <NavBar /> */}

      {/* Необязательный футер для отображения статуса запуска (можно потом убрать) */}
      <footer style={{ marginTop: '20px', fontSize: '0.8em', color: '#aaa', textAlign: 'center' }}>
        {isTgApp ? 'Запущено в Telegram' : 'Запущено в браузере (Dev Mode)'}
      </footer>

    </div>
  );
}

export default App; // Экспортируем компонент App для использования в index.js/main.jsx