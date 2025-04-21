import React, { useState, useEffect, useRef } from 'react';
// Импорты компонентов
import Header from './components/Header';
import GarageArea from './components/GarageArea';
import IncomeArea from './components/IncomeArea';
import BuildingArea from './components/BuildingArea';
import NavBar from './components/NavBar';
import TuningScreen from './components/TuningScreen';
import RaceScreen from './components/RaceScreen';
// Импорт утилит (убедись, что utils.js есть и актуален)
import {
    calculateUpgradeCost,
    recalculateStatsAndIncomeBonus,
    calculateTotalIncomeRate,
    BASE_CAR_STATS
} from './utils';
import './App.css'; // Глобальные стили

// --- Константы Игры ---
const MAX_OFFLINE_HOURS = 2; // Макс. часов накопления оффлайн
const UPDATE_INTERVAL = 1000; // Интервал обновления дохода (1с)
const STARTING_COINS = 100000; // Начальные монеты для теста
const INITIAL_BUILDINGS = [ // Начальное состояние зданий
    { id: 'wash', name: 'Автомойка', level: 1, icon: '🧼', isLocked: false },
    { id: 'service', name: 'Сервис', level: 0, icon: '🔧', isLocked: false },
    { id: 'tires', name: 'Шиномонтаж', level: 0, icon: '🔘', isLocked: true },
    { id: 'drift', name: 'Шк. Дрифта', level: 0, icon: '🏫', isLocked: true },
];
const INITIAL_CAR = { // Начальное состояние машины
    id: 'car_001', name: 'Ржавая "Копейка"', imageUrl: '/placeholder-car.png',
    stats: { power: 40, speed: 70, style: 5, reliability: 25 }, // Базовые статы, будут пересчитаны
    parts: { // Начальные детали
      engine: { level: 1, name: 'Двигатель' },
      tires: { level: 0, name: 'Шины' },
      style_body: { level: 0, name: 'Кузов (Стиль)' },
      reliability_base: { level: 1, name: 'Надежность (База)' },
    }
};
const BOT_STATS = { // Параметры ботов для гонок
  easy:   { power: 35, speed: 65, reliability: 55 },
  medium: { power: 62, speed: 92, reliability: 45 },
  hard:   { power: 90, speed: 120, reliability: 35 },
};

// ========= КОМПОНЕНТ APP =========
function App() {
  // --- Состояния Игры ---
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerName, setPlayerName] = useState("Игрок");
  const [gameCoins, setGameCoins] = useState(STARTING_COINS);
  const [jetCoins, setJetCoins] = useState(0);
  const [currentXp, setCurrentXp] = useState(10);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [incomeRatePerHour, setIncomeRatePerHour] = useState(0);
  const lastCollectedTimeRef = useRef(Date.now());
  const [accumulatedIncome, setAccumulatedIncome] = useState(0);
  const [buildings, setBuildings] = useState(INITIAL_BUILDINGS);
  const [currentCar, setCurrentCar] = useState(INITIAL_CAR); // Используем начальное значение

  // --- Состояния UI ---
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);

  // --- Эффект Инициализации Приложения и Загрузки Данных ---
  useEffect(() => {
    console.log("App Init useEffect running...");

    // --- Инициализация Telegram Web App ---
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setIsTgApp(true);
      tg.ready();
      if (tg.initDataUnsafe?.user) {
        setTgUserData(tg.initDataUnsafe.user);
        setPlayerName(tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || "Игрок");
      } else {
        setTgUserData({ id: 123, first_name: "TG User", username: "tg_user"});
        setPlayerName("TG User");
      }
      tg.expand();
    } else {
      setIsTgApp(false);
      setTgUserData({ id: 987, first_name: "Dev", username: "dev_user"});
      setPlayerName("Dev User");
    }

    // --- Загрузка Сохраненных Данных из Local Storage ---
    console.log("--- Loading Saved Data ---");
    const savedTime = localStorage.getItem('idleGarage_lastCollectedTime');
    const savedCoins = localStorage.getItem('idleGarage_gameCoins');
    const savedBuildingsData = localStorage.getItem('idleGarage_buildings');
    const savedCarData = localStorage.getItem('idleGarage_currentCar');
    const savedXp = localStorage.getItem('idleGarage_currentXp');
    const savedLevel = localStorage.getItem('idleGarage_playerLevel');
    // TODO: Загрузить jetCoins, xpToNextLevel

    // --- Установка Начальных Значений ---
    const loadedTime = savedTime ? parseInt(savedTime, 10) : Date.now();
    lastCollectedTimeRef.current = loadedTime;

    let initialCoinsValue = STARTING_COINS;
    if (savedCoins !== null && !isNaN(parseInt(savedCoins, 10))) { initialCoinsValue = parseInt(savedCoins, 10); }
    setGameCoins(initialCoinsValue);

    let loadedBuildings = INITIAL_BUILDINGS;
    if (savedBuildingsData) { try { const p = JSON.parse(savedBuildingsData); if(Array.isArray(p)) loadedBuildings = p; } catch(e){} }
    setBuildings(loadedBuildings);

    let loadedCar = INITIAL_CAR;
    if (savedCarData) { try { const p = JSON.parse(savedCarData); if(p && p.id && p.parts && p.stats) loadedCar = p; } catch(e){} }
    // Не устанавливаем машину сразу

    setCurrentXp(savedXp ? parseInt(savedXp, 10) : 10);
    setPlayerLevel(savedLevel ? parseInt(savedLevel, 10) : 1);
    // TODO: Установить xpToNextLevel, jetCoins

    // --- Пересчет Статов Машины и Ставки Дохода ---
    const baseStats = BASE_CAR_STATS[loadedCar.id] || BASE_CAR_STATS['car_001'];
    const { stats: calculatedStats } = recalculateStatsAndIncomeBonus(loadedCar.id, loadedCar.parts);
    const finalInitialCar = { ...loadedCar, stats: calculatedStats };
    setCurrentCar(finalInitialCar); // Устанавливаем машину с правильными статами

    const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, finalInitialCar);
    setIncomeRatePerHour(initialTotalRate);

    // --- Расчет Оффлайн Дохода ---
    const now = Date.now();
    const offlineTimeMs = now - loadedTime;
    let offlineIncome = 0;
    if (offlineTimeMs > 0 && initialTotalRate > 0) {
        const incomePerSecond = initialTotalRate / 3600;
        const maxOfflineSeconds = MAX_OFFLINE_HOURS * 3600;
        const effectiveOfflineSeconds = Math.min(offlineTimeMs / 1000, maxOfflineSeconds);
        offlineIncome = incomePerSecond * effectiveOfflineSeconds;
    }
    setAccumulatedIncome(offlineIncome);

    console.log("--- Initialization useEffect finished ---");
  }, []); // Пустой массив зависимостей

  // --- Эффект Таймера Пассивного Дохода ---
  useEffect(() => {
    if (incomeRatePerHour <= 0) return;
    const incomePerSecond = incomeRatePerHour / 3600;
    const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
    // console.log(`Starting income timer: Rate ${incomeRatePerHour}/hour`); // Можно раскомментировать для отладки
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000;
      const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
      const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
      setAccumulatedIncome(newAccumulated); // Простое обновление
    }, UPDATE_INTERVAL);
    return () => { clearInterval(intervalId); /* console.log("Income timer stopped."); */ }; // Очистка
  }, [incomeRatePerHour]); // Зависимость от ставки

  // --- Функция Сбора Дохода ---
  const handleCollect = () => {
    const incomeToAdd = Math.floor(accumulatedIncome);
    // console.log("Collect attempt. Accumulated:", accumulatedIncome, "ToAdd:", incomeToAdd); // Лог для отладки
    if (incomeToAdd > 0) {
      const newTotalCoins = gameCoins + incomeToAdd;
      setGameCoins(newTotalCoins);
      setAccumulatedIncome(0); // Сброс накопленного
      const collectionTime = Date.now();
      lastCollectedTimeRef.current = collectionTime; // Обновление времени
      // Сохранение
      localStorage.setItem('idleGarage_gameCoins', newTotalCoins.toString());
      localStorage.setItem('idleGarage_lastCollectedTime', collectionTime.toString());
      console.log(`Collected ${incomeToAdd} GC.`);
    } else {
      console.log("Nothing to collect.");
    }
  };

  // --- Функция Улучшения Здания ---
  const handleBuildingClick = (buildingName) => {
      const targetBuilding = buildings.find(b => b.name === buildingName);
      if (!targetBuilding || targetBuilding.isLocked) return;
      const cost = 100 * Math.pow(2, targetBuilding.level); // Примерная стоимость
      if (gameCoins >= cost) {
          const newCoins = gameCoins - cost;
          setGameCoins(newCoins);
          const updatedBuildings = buildings.map(b => b.name === buildingName ? { ...b, level: b.level + 1 } : b);
          setBuildings(updatedBuildings);
          const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar); // Пересчет ставки
          setIncomeRatePerHour(newTotalRate);
          // Сохранение
          localStorage.setItem('idleGarage_gameCoins', newCoins.toString());
          localStorage.setItem('idleGarage_buildings', JSON.stringify(updatedBuildings));
          console.log(`Building ${buildingName} upgraded. New rate: ${newTotalRate}/hour`);
      } else { console.log(`Not enough coins for ${buildingName}`); }
  };

  // --- Функции для Окна Тюнинга ---
  const handleOpenTuning = () => setIsTuningVisible(true);
  const handleCloseTuning = () => setIsTuningVisible(false);
  const handleUpgradePart = (partId) => {
      if (!currentCar?.parts?.[partId]) return;
      const part = currentCar.parts[partId];
      const cost = calculateUpgradeCost(partId, part.level);
      if (gameCoins >= cost) {
          const newCoins = gameCoins - cost;
          setGameCoins(newCoins);
          const updatedParts = { ...currentCar.parts, [partId]: { ...part, level: part.level + 1 } };
          const baseStats = BASE_CAR_STATS[currentCar.id] || BASE_CAR_STATS['car_001'];
          const { stats: newStats } = recalculateStatsAndIncomeBonus(currentCar.id, updatedParts); // Пересчет статов
          const updatedCar = { ...currentCar, parts: updatedParts, stats: newStats };
          setCurrentCar(updatedCar); // Обновляем машину
          const newTotalRate = calculateTotalIncomeRate(buildings, updatedCar); // Пересчет ставки
          setIncomeRatePerHour(newTotalRate);
          // Сохранение
          localStorage.setItem('idleGarage_gameCoins', newCoins.toString());
          localStorage.setItem('idleGarage_currentCar', JSON.stringify(updatedCar));
          console.log(`Part ${part.name} upgraded. New rate: ${newTotalRate}/hour. New Stats:`, newStats);
      } else { console.log(`Not enough coins for ${part.name}`); }
  };

  // --- Функция Симуляции Гонки ---
  const handleStartRace = async (difficulty) => {
    if (!currentCar?.stats) { console.error("Race Error: Car/Stats missing."); return null; }
    console.log(`Starting race: ${difficulty}`);
    const baseBotStats = BOT_STATS[difficulty];
    if (!baseBotStats) { console.error(`Race Error: Invalid difficulty "${difficulty}"`); return null; }
    // Расчет статов бота с разбросом
    const currentBot = {
        power: baseBotStats.power * (0.9 + Math.random() * 0.2),
        speed: baseBotStats.speed * (0.9 + Math.random() * 0.2),
        reliability: baseBotStats.reliability * (0.9 + Math.random() * 0.2)
    };
    // Расчет "силы"
    const playerPowerScore = (currentCar.stats.power * 0.5) + (currentCar.stats.speed * 0.4) + (currentCar.stats.reliability * 0.1 * (0.8 + Math.random() * 0.4));
    const botPowerScore = (currentBot.power * 0.5) + (currentBot.speed * 0.4) + (currentBot.reliability * 0.1 * (0.8 + Math.random() * 0.4));
    console.log(`Scores - Player: ${playerPowerScore.toFixed(1)}, Bot: ${botPowerScore.toFixed(1)}`);
    // Задержка
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    // Результат
    let result = 'lose';
    let reward = { coins: 0, xp: 0 }; // Чистая награда для UI
    let finalCoins = gameCoins;      // Итоговый баланс
    let finalXp = currentXp;         // Итоговый XP

    if (playerPowerScore > botPowerScore) { // Победа
      result = 'win';
      const baseWinCoins = { easy: 25, medium: 75, hard: 150 };
      const baseWinXp = { easy: 5, medium: 15, hard: 30 };
      const coinsWon = Math.floor(baseWinCoins[difficulty] * (0.9 + Math.random() * 0.2));
      const xpWon = Math.floor(baseWinXp[difficulty] * (0.9 + Math.random() * 0.2));
      reward = { coins: coinsWon, xp: xpWon }; // Награда
      finalCoins += coinsWon; // Обновляем итог
      finalXp += xpWon;       // Обновляем итог
      console.log(`Win! +${coinsWon} GC, +${xpWon} XP`);
      // TODO: Проверка Level Up
    } else { // Поражение
      result = 'lose';
      const consolationCoins = Math.floor(( { easy: 2, medium: 5, hard: 10 }[difficulty] || 0) * Math.random() );
      reward = { coins: consolationCoins, xp: 0 }; // Награда
       if (consolationCoins > 0) {
           finalCoins += consolationCoins; // Обновляем итог
           console.log(`Lose. +${consolationCoins} GC consolation.`);
       } else {
           console.log("Lose. No consolation prize.");
       }
       finalXp = currentXp; // XP не меняется
    }
    // Обновляем состояние ОДИН раз
    setGameCoins(finalCoins);
    setCurrentXp(finalXp);
    // Сохраняем ФИНАЛЬНЫЕ значения
    localStorage.setItem('idleGarage_gameCoins', finalCoins.toString());
    localStorage.setItem('idleGarage_currentXp', finalXp.toString());
    console.log("Race finished. Final Coins:", finalCoins, "Final XP:", finalXp);
    // Возвращаем результат и чистую награду для UI
    return { result, reward };
  };

  // --- Функция Навигации ---
  const handleNavClick = (screenId) => setActiveScreen(screenId);

  // --- Расчеты для Рендера ---
  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0; // Не больше 100%

  // --- Рендер Компонента ---
  return (
    <div className="App" style={{ paddingBottom: '70px' }}>
      {/* Хедер */}
      <Header
        level={playerLevel}
        playerName={playerName}
        gameCoins={gameCoins}
        jetCoins={jetCoins}
        xpPercentage={xpPercentage}
      />

      {/* Основной Контент */}
      <main>
        {/* Экран Гаража */}
        {activeScreen === 'garage' && (
          <>
            <GarageArea car={currentCar} onTuneClick={handleOpenTuning} />
            <IncomeArea
              incomeRate={incomeRatePerHour}
              accumulatedIncome={accumulatedIncome}
              maxAccumulation={incomeRatePerHour * MAX_OFFLINE_HOURS}
              onCollect={handleCollect}
            />
            <BuildingArea
              buildings={buildings}
              onBuildingClick={handleBuildingClick}
            />
          </>
        )}

        {/* Экран Гонок */}
        {activeScreen === 'race' && (
            <RaceScreen
                playerCar={currentCar}
                onStartRace={handleStartRace}
            />
        )}

        {/* Заглушки для других экранов */}
        {activeScreen === 'shop' && <div className="placeholder-screen" style={placeholderStyle}>Экран "Магазин"</div>}
        {activeScreen === 'staff' && <div className="placeholder-screen" style={placeholderStyle}>Экран "Персонал"</div>}
        {activeScreen === 'p2e' && <div className="placeholder-screen" style={placeholderStyle}>Экран "P2E"</div>}
      </main>

      {/* Окно Тюнинга (поверх всего) */}
      {isTuningVisible && (
        <TuningScreen
          car={currentCar}
          gameCoins={gameCoins}
          onUpgradePart={handleUpgradePart}
          onClose={handleCloseTuning}
        />
      )}

      {/* Нижняя Навигационная Панель */}
      <NavBar
        activeScreen={activeScreen}
        onNavClick={handleNavClick}
      />
    </div>
  );
}

// Стиль для заглушек (можно вынести в CSS)
const placeholderStyle = {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'white',
    fontSize: '1.2em',
    opacity: 0.7
};

// Экспортируем компонент App
export default App;