import React, { useState, useEffect, useRef } from 'react'; // Импортируем useState, useEffect, useRef
import Header from './components/Header';       // Импорт компонента Header
import GarageArea from './components/GarageArea'; // Импорт компонента GarageArea
import IncomeArea from './components/IncomeArea'; // Импорт компонента IncomeArea
import './App.css';                             // Импорт глобальных стилей

// Константы для настройки пассивного дохода
const MAX_OFFLINE_HOURS = 2; // Макс. часов, за которые копится доход оффлайн
const UPDATE_INTERVAL = 1000; // Как часто обновлять расчет накопления (1000мс = 1с)

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
    imageUrl: '/placeholder-car.png',         // Путь к изображению (в папке /public/)
    stats: {                                  // Характеристики машины
      power: 50,
      speed: 80,
      style: 10,
      reliability: 30,
    }
  });

  // --- Состояния для пассивного дохода ---
  const [incomeRatePerHour, setIncomeRatePerHour] = useState(50); // Ставка дохода в час (пока фиксированная)
  // Используем useRef для времени последнего сбора, чтобы его изменение не вызывало перерисовку
  const lastCollectedTimeRef = useRef(Date.now()); // Хранит timestamp последнего сбора
  const [accumulatedIncome, setAccumulatedIncome] = useState(0); // Сколько монет накоплено с последнего сбора

  // --- Эффект для инициализации Telegram и Загрузки Данных ---
  useEffect(() => {
    // Получаем объект WebApp
    const tg = window.Telegram?.WebApp;

    // Определяем, где запущено приложение
    if (tg) {
      setIsTgApp(true);
      tg.ready(); // Сообщаем, что приложение готово
      if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        setTgUserData(user);
        setPlayerName(user.first_name || user.username || "Игрок");
      } else {
        setTgUserData({ id: 123, first_name: "TG User", username: "tg_user"});
        setPlayerName("TG User");
        console.warn("Запущено в Telegram, но данные initDataUnsafe.user отсутствуют.");
      }
      tg.expand(); // Расширяем окно
    } else {
      setIsTgApp(false);
      setTgUserData({ id: 987, first_name: "Dev", username: "dev_user"});
      setPlayerName("Dev User");
      console.log("Скрипт Telegram WebApp не загружен или приложение запущено вне Telegram (Режим разработки).");
    }

    // --- Загрузка сохраненных данных ---
    // ВАЖНО: Здесь должна быть логика загрузки из localStorage или с сервера
    // Пример для localStorage:
    const savedTime = localStorage.getItem('idleGarage_lastCollectedTime');
    const savedCoins = localStorage.getItem('idleGarage_gameCoins');
    // (добавьте загрузку уровня, xp, jetcoins и т.д.)

    // Устанавливаем время последнего сбора (загруженное или текущее)
    const loadedTime = savedTime ? parseInt(savedTime, 10) : Date.now();
    lastCollectedTimeRef.current = loadedTime;

    // Устанавливаем монеты (загруженные или начальные)
    setGameCoins(savedCoins ? parseInt(savedCoins, 10) : 100);

    // Рассчитываем доход, накопленный за время отсутствия
    const now = Date.now();
    const offlineTimeMs = now - loadedTime; // Время в миллисекундах, пока игра была закрыта

    if (offlineTimeMs > 0) {
      const offlineSeconds = offlineTimeMs / 1000;
      const maxOfflineSeconds = MAX_OFFLINE_HOURS * 3600; // Макс. секунд накопления оффлайн
      const effectiveOfflineSeconds = Math.min(offlineSeconds, maxOfflineSeconds); // Учитываем лимит
      const incomePerSecond = incomeRatePerHour / 3600; // Доход в секунду
      const offlineIncome = incomePerSecond * effectiveOfflineSeconds; // Накопленный оффлайн доход

      // Устанавливаем начальное значение накопленного дохода
      setAccumulatedIncome(offlineIncome);
      console.log(`Рассчитано ${offlineIncome.toFixed(2)} GC, накопленных оффлайн.`);
    } else {
      setAccumulatedIncome(0); // Если время не прошло, начинаем с нуля
    }

    // Загрузить остальные данные...

  }, []); // Пустой массив зависимостей - этот useEffect выполнится один раз при старте

  // --- Эффект для Таймера Пассивного Дохода ---
  useEffect(() => {
    // Рассчитываем константы для интервала
    const incomePerSecond = incomeRatePerHour / 3600;
    const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS; // Макс. накопление

    // Запускаем интервал, который будет обновлять накопленный доход
    const intervalId = setInterval(() => {
      const now = Date.now();
      // Общее время, прошедшее с момента ПОСЛЕДНЕГО СБОРА (или старта)
      const timePassedTotalMs = now - lastCollectedTimeRef.current;
      const timePassedTotalSeconds = timePassedTotalMs / 1000;

      // Сколько могло бы накопиться за это время
      const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;

      // Ограничиваем накопление максимальной планкой
      const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);

      // Обновляем состояние накопленного дохода (это вызовет перерисовку IncomeArea)
      setAccumulatedIncome(newAccumulated);

    }, UPDATE_INTERVAL); // Повторяем каждую секунду

    // Функция очистки: выполняется при размонтировании компонента или перед перезапуском эффекта
    return () => {
      clearInterval(intervalId); // Останавливаем интервал, чтобы избежать утечек памяти
      // --- Сохранение данных при выходе/очистке ---
      // ВАЖНО: Сохранить важные данные здесь или по другому событию
      // localStorage.setItem('idleGarage_lastCollectedTime', lastCollectedTimeRef.current.toString());
      // localStorage.setItem('idleGarage_gameCoins', gameCoins.toString());
      // ... сохранить другие данные ...
      console.log("Таймер дохода остановлен, очистка выполнена.");
    };

    // Зависимости: если изменится ставка дохода, эффект перезапустится
  }, [incomeRatePerHour]);

  // --- Функция для Сбора Дохода ---
  const handleCollect = () => {
    const incomeToAdd = Math.floor(accumulatedIncome); // Собираем только целые монеты
    if (incomeToAdd > 0) {
      // Добавляем собранное к основному балансу
      const newTotalCoins = gameCoins + incomeToAdd;
      setGameCoins(newTotalCoins);

      // Сбрасываем накопленный доход
      setAccumulatedIncome(0);

      // Обновляем время последнего сбора на ТЕКУЩЕЕ время
      const collectionTime = Date.now();
      lastCollectedTimeRef.current = collectionTime;

      // --- Сохранение данных после сбора ---
      // Сохраняем новое кол-во монет и время сбора (пример для localStorage)
      localStorage.setItem('idleGarage_gameCoins', newTotalCoins.toString());
      localStorage.setItem('idleGarage_lastCollectedTime', collectionTime.toString());

      console.log(`Собрано ${incomeToAdd} GC. Новое время сбора: ${collectionTime}`);
      // TODO: Добавить визуальный эффект (анимацию монет и т.п.)
    } else {
      console.log("Нечего собирать.");
    }
  };

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

      {/* Компонент IncomeArea: пассивный доход и кнопка сбора */}
      <IncomeArea
        incomeRate={incomeRatePerHour} // Ставка дохода в час
        accumulatedIncome={accumulatedIncome} // Текущее накопление
        maxAccumulation={incomeRatePerHour * MAX_OFFLINE_HOURS} // Макс. для прогресс-бара
        onCollect={handleCollect} // Функция, вызываемая при клике на сбор
      />

      {/* Место для будущих компонентов */}
      {/* <BuildingArea /> */}
      {/* <NavBar /> */}

      {/* Необязательный футер для отображения статуса запуска */}
      <footer style={{ marginTop: '20px', fontSize: '0.8em', color: '#aaa', textAlign: 'center', paddingBottom: '10px' }}>
        {isTgApp ? 'Запущено в Telegram' : 'Запущено в браузере (Dev Mode)'}
      </footer>

    </div>
  );
}

export default App; // Экспортируем компонент App для использования в index.js/main.jsx