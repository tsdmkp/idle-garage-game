import React, { useState, useEffect, useRef } from 'react';
// Импорты компонентов
import Header from './components/Header';
import GarageArea from './components/GarageArea';
import IncomeArea from './components/IncomeArea';
import BuildingArea from './components/BuildingArea';
import NavBar from './components/NavBar';
import TuningScreen from './components/TuningScreen';
import RaceScreen from './components/RaceScreen';
import ShopScreen from './components/ShopScreen';
import StaffScreen from './components/StaffScreen';
import CarSelector from './components/CarSelector'; // Импорт селектора машин
// Утилиты НЕ импортируем, вся логика здесь для надежности
import './App.css'; // Глобальные стили

// --- Константы Игры ---
const MAX_OFFLINE_HOURS = 2;
const UPDATE_INTERVAL = 1000;
const STARTING_COINS = 100000; // Стартовые монеты для теста

// --- Начальное состояние зданий ---
const INITIAL_BUILDINGS = [
    { id: 'wash', name: 'Автомойка', level: 1, icon: '🧼', isLocked: false },
    { id: 'service', name: 'Сервис', level: 0, icon: '🔧', isLocked: false },
    { id: 'tires', name: 'Шиномонтаж', level: 0, icon: '🔘', isLocked: true },
    { id: 'drift', name: 'Шк. Дрифта', level: 0, icon: '🏫', isLocked: true },
];

// --- Базовые статы для разных машин ---
const BASE_CAR_STATS = {
    'car_001': { power: 40, speed: 70, style: 5, reliability: 25, baseIncome: 20 },
    'car_002': { power: 60, speed: 95, style: 10, reliability: 35, baseIncome: 35 },
    'car_003': { power: 75, speed: 110, style: 15, reliability: 45, baseIncome: 50 },
};

// --- Каталог Машин для Магазина ---
const CAR_CATALOG = [
  { id: 'car_001', name: 'Ржавая "Копейка"', imageUrl: '/placeholder-car.png', price: 0, baseStats: BASE_CAR_STATS['car_001'], initialParts: { engine: { level: 1, name: 'Двигатель' }, tires: { level: 0, name: 'Шины' }, style_body: { level: 0, name: 'Кузов (Стиль)' }, reliability_base: { level: 1, name: 'Надежность (База)' },}},
  { id: 'car_002', name: 'Бодрая "Девятка"', imageUrl: '/placeholder-car-2.png', price: 5000, baseStats: BASE_CAR_STATS['car_002'], initialParts: { engine: { level: 1, name: 'Двигатель' }, tires: { level: 1, name: 'Шины' }, style_body: { level: 0, name: 'Кузов (Стиль)' }, reliability_base: { level: 1, name: 'Надежность (База)' },}},
  { id: 'car_003', name: 'Старый "Японец"', imageUrl: '/placeholder-car-3.png', price: 15000, baseStats: BASE_CAR_STATS['car_003'], initialParts: { engine: { level: 2, name: 'Двигатель' }, tires: { level: 1, name: 'Шины' }, style_body: { level: 1, name: 'Кузов (Стиль)' }, reliability_base: { level: 2, name: 'Надежность (База)' },}},
];

// --- Параметры Ботов ---
const BOT_STATS = {
  easy:   { power: 35, speed: 65, reliability: 55 },
  medium: { power: 62, speed: 92, reliability: 45 },
  hard:   { power: 90, speed: 120, reliability: 35 },
};

// --- Описание Персонала ---
const STAFF_CATALOG = {
    mechanic: { id: 'mechanic', name: 'Механик', icon: '👨‍🔧', description: 'Ускоряет тюнинг.', baseHireCost: 200, costMultiplier: 1.8, maxLevel: 10, getBonus: (level) => ({ speedBoostPercent: level * 5 }) },
    manager: { id: 'manager', name: 'Менеджер', icon: '💼', description: 'Увеличивает доход.', baseHireCost: 500, costMultiplier: 2.0, maxLevel: 5, getBonus: (level) => ({ incomeBoostPercent: level * 3 }) },
};


// --- Вспомогательные Функции Расчета (ВНУТРИ МОДУЛЯ, ПЕРЕД APP) ---
const recalculateStatsAndIncomeBonus = (carId, parts) => {
    const baseStats = BASE_CAR_STATS[carId] || { power: 0, speed: 0, style: 0, reliability: 0 };
    if (!parts || typeof parts !== 'object') { return { stats: { ...baseStats }, carIncomeBonus: 0 }; }
    let newPower = baseStats?.power || 0; let newSpeed = baseStats?.speed || 0; let newStyle = baseStats?.style || 0; let newReliability = baseStats?.reliability || 0; let carIncomeBonus = 0;
    if (parts.engine) { newPower += parts.engine.level * 5; }
    if (parts.tires) { newSpeed += parts.tires.level * 3; newReliability -= Math.floor(parts.tires.level / 5) * 1; }
    if (parts.style_body) { newStyle += parts.style_body.level * 4; carIncomeBonus += parts.style_body.level * 2; }
    if (parts.reliability_base) { newReliability += parts.reliability_base.level * 5; }
    newReliability = Math.max(1, newReliability); newPower = Math.max(1, newPower); newSpeed = Math.max(1, newSpeed); newStyle = Math.max(1, newStyle);
    return { stats: { power: newPower, speed: newSpeed, style: newStyle, reliability: newReliability }, carIncomeBonus: carIncomeBonus };
};

const calculateTotalIncomeRate = (buildingsState, carState, currentStaffState = {}) => {
    if (!carState) return 0;
    const incomeFromBuildings = buildingsState.reduce((sum, b) => { if (b.level > 0 && !b.isLocked) { switch (b.id) { case 'wash': return sum + b.level * 5; case 'service': return sum + b.level * 10; default: return sum; }} return sum; }, 0);
    const baseStats = BASE_CAR_STATS[carState?.id] || { baseIncome: 0, power: 0, speed: 0, style: 0, reliability: 0 };
    const { carIncomeBonus } = recalculateStatsAndIncomeBonus(carState?.id, carState?.parts);
    const totalCarIncome = (baseStats.baseIncome || 0) + carIncomeBonus;
    let totalRate = totalCarIncome + incomeFromBuildings;
    const managerLevel = currentStaffState?.manager || 0;
    if (managerLevel > 0 && STAFF_CATALOG.manager?.getBonus) {
        const managerBonus = STAFF_CATALOG.manager.getBonus(managerLevel);
        if(managerBonus?.incomeBoostPercent) { totalRate *= (1 + (managerBonus.incomeBoostPercent / 100)); }
    }
    return Math.round(totalRate);
};

const calculateUpgradeCost = (partType, currentLevel) => {
  // --- Настройки стоимости для разных типов деталей ---
  const partCostSettings = {
      engine:           { base: 150, multiplier: 1.18 }, // Двигатель - дороже и рост чуть быстрее
      tires:            { base: 70,  multiplier: 1.15 }, // Шины - дешевле, рост медленнее
      style_body:       { base: 100, multiplier: 1.12 }, // Стиль - рост медленный
      reliability_base: { base: 80,  multiplier: 1.16 }, // Надежность - средний рост
      default:          { base: 100, multiplier: 1.15 }  // Значение по умолчанию
  };
  // ---------------------------------------------------

  const settings = partCostSettings[partType] || partCostSettings.default;
  const baseCost = settings.base;
  const multiplier = settings.multiplier;

  // Рассчитываем стоимость по формуле: База * (Множитель ^ Уровень)
  // Math.pow(multiplier, currentLevel) - возводит множитель в степень текущего уровня
  // Округляем до ближайшего целого
  const cost = Math.round(baseCost * Math.pow(multiplier, currentLevel));

  // Добавим минимальную стоимость, чтобы улучшения всегда стоили хоть сколько-то
  return Math.max(cost, 10); // Минимальная стоимость - 10 монет
};

// --- Функция инициализации первой машины ---
const getInitialPlayerCar = () => {
    const carData = CAR_CATALOG.find(c => c.id === 'car_001');
    if (!carData) return {id: 'error', name:'Error Car', stats:{power:0,speed:0,style:0,reliability:0}, parts:{}};
    const { stats } = recalculateStatsAndIncomeBonus(carData.id, carData.initialParts);
    return { id: carData.id, name: carData.name, imageUrl: carData.imageUrl, stats: stats, parts: { ...carData.initialParts }};
};


// ========= КОМПОНЕНТ APP =========
function App() {
  // --- Состояния ---
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
  const [playerCars, setPlayerCars] = useState([getInitialPlayerCar()]); // Используем функцию
  const [selectedCarId, setSelectedCarId] = useState('car_001');
  const [hiredStaff, setHiredStaff] = useState(() => { // Инициализация персонала
      const initialStaff = {};
      for (const staffId in STAFF_CATALOG) { initialStaff[staffId] = 0; }
      return initialStaff;
  });
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false); // Для выбора машины

  // --- Вычисляемая переменная для текущей машины ---
  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || getInitialPlayerCar();

  // --- Эффект Инициализации и Загрузки ---
  useEffect(() => {
    console.log("App Init useEffect running...");
    // Инициализация TG
    const tg = window.Telegram?.WebApp; if (tg) {setIsTgApp(true); tg.ready(); if(tg.initDataUnsafe?.user){setTgUserData(tg.initDataUnsafe.user); setPlayerName(tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || "Игрок");} else {setTgUserData({id:123}); setPlayerName("TG User");} tg.expand();} else {setIsTgApp(false); setTgUserData({id:987}); setPlayerName("Dev User");}
    // Загрузка данных
    const savedTime = localStorage.getItem('idleGarage_lastCollectedTime'); const savedCoins = localStorage.getItem('idleGarage_gameCoins'); const savedBuildingsData = localStorage.getItem('idleGarage_buildings'); const savedPlayerCarsData = localStorage.getItem('idleGarage_playerCars'); const savedSelectedCarId = localStorage.getItem('idleGarage_selectedCarId'); const savedHiredStaffData = localStorage.getItem('idleGarage_hiredStaff'); const savedXp = localStorage.getItem('idleGarage_currentXp'); const savedLevel = localStorage.getItem('idleGarage_playerLevel');
    // Установка Начальных Значений
    const loadedTime = savedTime ? parseInt(savedTime, 10) : Date.now(); lastCollectedTimeRef.current = loadedTime;
    let initialCoinsValue = STARTING_COINS; if (savedCoins !== null && !isNaN(parseInt(savedCoins, 10))) { initialCoinsValue = parseInt(savedCoins, 10); } setGameCoins(initialCoinsValue);
    let loadedBuildings = INITIAL_BUILDINGS; if (savedBuildingsData) { try { const p=JSON.parse(savedBuildingsData); if(Array.isArray(p)) loadedBuildings = p; } catch(e){} } setBuildings(loadedBuildings);
    setCurrentXp(savedXp ? parseInt(savedXp, 10) : 10); setPlayerLevel(savedLevel ? parseInt(savedLevel, 10) : 1);
    let loadedHiredStaff = {}; for(const id in STAFF_CATALOG){ loadedHiredStaff[id] = 0; } if (savedHiredStaffData) { try { const p = JSON.parse(savedHiredStaffData); if(p && typeof p === 'object'){ for(const id in STAFF_CATALOG){ loadedHiredStaff[id] = p[id] || 0; } } } catch(e){} } setHiredStaff(loadedHiredStaff);
    let initialPlayerCars = [getInitialPlayerCar()]; if (savedPlayerCarsData) { try { const p = JSON.parse(savedPlayerCarsData); if (Array.isArray(p) && p.length > 0) { initialPlayerCars = p.map(sc => sc && sc.id && sc.parts ? { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats } : null).filter(Boolean); } } catch (e) {} } setPlayerCars(initialPlayerCars.length > 0 ? initialPlayerCars : [getInitialPlayerCar()]);
    const finalSelectedCarId = savedSelectedCarId && initialPlayerCars.some(c => c.id === savedSelectedCarId) ? savedSelectedCarId : initialPlayerCars[0]?.id || 'car_001'; setSelectedCarId(finalSelectedCarId);
    // Пересчет Ставки Дохода...
    const initialSelectedCarObj = initialPlayerCars.find(c => c.id === finalSelectedCarId) || initialPlayerCars[0];
    if (initialSelectedCarObj) { const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, initialSelectedCarObj, loadedHiredStaff); setIncomeRatePerHour(initialTotalRate);
        const now = Date.now(); const offlineTimeMs = now - loadedTime; let offlineIncome = 0; if (offlineTimeMs > 0 && initialTotalRate > 0) { offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600); } setAccumulatedIncome(offlineIncome);
    } else { setIncomeRatePerHour(0); setAccumulatedIncome(0); }
    console.log("--- Initialization useEffect finished ---");
  }, []);

  // --- Эффект Таймера Дохода ---
  useEffect(() => {
    if (incomeRatePerHour <= 0) return;
    const incomePerSecond = incomeRatePerHour / 3600; const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
    const intervalId = setInterval(() => { const now = Date.now(); const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000; const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond; const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap); setAccumulatedIncome(newAccumulated); }, UPDATE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [incomeRatePerHour]);

  // --- Функции Обработчики ---
  // Сбор дохода
  const handleCollect = () => {
    const incomeToAdd = Math.floor(accumulatedIncome);
    if (incomeToAdd > 0) { const newTotalCoins = gameCoins + incomeToAdd; setGameCoins(newTotalCoins); setAccumulatedIncome(0); const collectionTime = Date.now(); lastCollectedTimeRef.current = collectionTime; localStorage.setItem('idleGarage_gameCoins', newTotalCoins.toString()); localStorage.setItem('idleGarage_lastCollectedTime', collectionTime.toString()); }
  };

  // Улучшение здания
  const handleBuildingClick = (buildingName) => {
      const targetBuilding = buildings.find(b => b.name === buildingName); if (!targetBuilding || targetBuilding.isLocked) return; const cost = 100 * Math.pow(2, targetBuilding.level);
      if (gameCoins >= cost) { const newCoins = gameCoins - cost; setGameCoins(newCoins); const updatedBuildings = buildings.map(b => b.name === buildingName ? { ...b, level: b.level + 1 } : b); setBuildings(updatedBuildings); const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar, hiredStaff); setIncomeRatePerHour(newTotalRate); localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_buildings', JSON.stringify(updatedBuildings)); }
  };

  // Открытие/закрытие тюнинга
  const handleOpenTuning = () => setIsTuningVisible(true);
  const handleCloseTuning = () => setIsTuningVisible(false);

  // Улучшение детали
  const handleUpgradePart = (partId) => {
      if (!currentCar?.parts?.[partId]) return; const part = currentCar.parts[partId]; const cost = calculateUpgradeCost(partId, part.level);
      if (gameCoins >= cost) { const newCoins = gameCoins - cost; setGameCoins(newCoins); const updatedParts = { ...currentCar.parts, [partId]: { ...part, level: part.level + 1 } }; const { stats: newStats } = recalculateStatsAndIncomeBonus(currentCar.id, updatedParts);
          const updatedPlayerCars = playerCars.map(car => car.id === selectedCarId ? { ...car, parts: updatedParts, stats: newStats } : car );
          setPlayerCars(updatedPlayerCars);
          const updatedCarForRate = updatedPlayerCars.find(c => c.id === selectedCarId);
          if (updatedCarForRate) { const newTotalRate = calculateTotalIncomeRate(buildings, updatedCarForRate, hiredStaff); setIncomeRatePerHour(newTotalRate); }
          localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_playerCars', JSON.stringify(updatedPlayerCars)); }
  };

  // Старт гонки
  const handleStartRace = async (difficulty) => {
    if (!currentCar?.stats) { return null; } const baseBotStats = BOT_STATS[difficulty]; if (!baseBotStats) { return null; }
    const currentBot = { power: baseBotStats.power * (0.9 + Math.random() * 0.2), speed: baseBotStats.speed * (0.9 + Math.random() * 0.2), reliability: baseBotStats.reliability * (0.9 + Math.random() * 0.2) };
    const playerPowerScore = (currentCar.stats.power * 0.5) + (currentCar.stats.speed * 0.4) + (currentCar.stats.reliability * 0.1 * (0.8 + Math.random() * 0.4));
    const botPowerScore = (currentBot.power * 0.5) + (currentBot.speed * 0.4) + (currentBot.reliability * 0.1 * (0.8 + Math.random() * 0.4));
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    let result = 'lose'; let reward = { coins: 0, xp: 0 }; let finalCoins = gameCoins; let finalXp = currentXp;
    if (playerPowerScore > botPowerScore) { result = 'win'; const baseWinCoins = { easy: 25, medium: 75, hard: 150 }; const baseWinXp = { easy: 5, medium: 15, hard: 30 }; const coinsWon = Math.floor(baseWinCoins[difficulty]*(0.9+Math.random()*0.2)); const xpWon = Math.floor(baseWinXp[difficulty]*(0.9+Math.random()*0.2)); reward={ coins: coinsWon, xp: xpWon }; finalCoins+=coinsWon; finalXp+=xpWon; }
    else { result = 'lose'; const consolationCoins = Math.floor(({ easy: 2, medium: 5, hard: 10 }[difficulty] || 0)*Math.random()); reward={ coins: consolationCoins, xp: 0 }; if(consolationCoins > 0){ finalCoins+=consolationCoins; } finalXp=currentXp; }
    setGameCoins(finalCoins); setCurrentXp(finalXp);
    localStorage.setItem('idleGarage_gameCoins', finalCoins.toString()); localStorage.setItem('idleGarage_currentXp', finalXp.toString());
    return { result, reward };
  };

  // Покупка машины
  const handleBuyCar = (carIdToBuy) => {
      const carFromCatalog = CAR_CATALOG.find(c => c.id === carIdToBuy); if (!carFromCatalog) return;
      const alreadyOwned = playerCars.some(c => c.id === carIdToBuy); if (alreadyOwned) return;
      const price = carFromCatalog.price; if (gameCoins < price) return;
      const newCoins = gameCoins - price; setGameCoins(newCoins);
      const { stats: initialStats } = recalculateStatsAndIncomeBonus(carFromCatalog.id, carFromCatalog.initialParts);
      const newPlayerCar = { id: carFromCatalog.id, name: carFromCatalog.name, imageUrl: carFromCatalog.imageUrl, stats: initialStats, parts: { ...carFromCatalog.initialParts } };
      const updatedPlayerCars = [...playerCars, newPlayerCar]; setPlayerCars(updatedPlayerCars);
      setSelectedCarId(newPlayerCar.id); // Сразу делаем активной
      const newTotalRate = calculateTotalIncomeRate(buildings, newPlayerCar, hiredStaff); setIncomeRatePerHour(newTotalRate);
      localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_playerCars', JSON.stringify(updatedPlayerCars)); localStorage.setItem('idleGarage_selectedCarId', newPlayerCar.id);
      console.log(`Car "${newPlayerCar.name}" purchased!`);
  };

  // Найм/улучшение персонала
  const calculateStaffCost = (staffId) => {
    const staffInfo = STAFF_CATALOG[staffId];
    if (!staffInfo || typeof staffInfo.maxLevel !== 'number' || typeof staffInfo.baseHireCost !== 'number' || typeof staffInfo.costMultiplier !== 'number') { return Infinity; }
    let currentLevel = 0; const levelFromState = hiredStaff[staffId]; if (typeof levelFromState === 'number' && !isNaN(levelFromState)) { currentLevel = levelFromState; }
    if (currentLevel >= staffInfo.maxLevel) { return Infinity; }
    let cost; if (currentLevel === 0) { cost = staffInfo.baseHireCost; } else { cost = Math.floor(staffInfo.baseHireCost * Math.pow(staffInfo.costMultiplier, currentLevel)); }
    if (isNaN(cost)) { return Infinity; } return cost;
  };

  const handleHireOrUpgradeStaff = (staffId) => {
    const cost = calculateStaffCost(staffId); if (cost === Infinity) return;
    if (gameCoins >= cost) {
        const newCoins = gameCoins - cost; const currentLevel = hiredStaff[staffId] || 0; const newLevel = currentLevel + 1;
        const updatedHiredStaff = { ...hiredStaff, [staffId]: newLevel }; setHiredStaff(updatedHiredStaff); setGameCoins(newCoins);
        const newTotalRate = calculateTotalIncomeRate(buildings, currentCar, updatedHiredStaff); setIncomeRatePerHour(newTotalRate);
        localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_hiredStaff', JSON.stringify(updatedHiredStaff));
        console.log(`Staff "${STAFF_CATALOG[staffId]?.name}" upgraded. New rate: ${newTotalRate}/hour.`);
    }
  };

  // Навигация
  const handleNavClick = (screenId) => {
    setIsTuningVisible(false); // Закрываем тюнинг при смене экрана
    setIsCarSelectorVisible(false); // Закрываем выбор машины
    setActiveScreen(screenId);
  };

  // --- Функции для выбора машины ---
  const handleOpenCarSelector = () => setIsCarSelectorVisible(true);
  const handleCloseCarSelector = () => setIsCarSelectorVisible(false);
  const handleSelectCar = (carId) => {
    if (carId !== selectedCarId) {
        console.log("Selecting car:", carId);
        setSelectedCarId(carId);
        const newSelectedCar = playerCars.find(c => c.id === carId);
        if (newSelectedCar) {
            const newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff);
            setIncomeRatePerHour(newTotalRate);
        }
        localStorage.setItem('idleGarage_selectedCarId', carId);
    }
    setIsCarSelectorVisible(false); // Закрываем окно после выбора
  };

  // --- Расчеты для Рендера ---
  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

  // --- Рендер Компонента ---
  return (
    <div className="App" style={{ paddingBottom: '70px' }}>
      {/* Хедер в контейнере */}
      <div className="header-container">
        <Header level={playerLevel} playerName={playerName} gameCoins={gameCoins} jetCoins={jetCoins} xpPercentage={xpPercentage} />
      </div>

      {/* Основной контент в контейнере */}
      <main className="main-content">
        {/* Экран Гаража */}
        {activeScreen === 'garage' && (
          <>
            {/* Передаем обработчик открытия селектора */}
            <GarageArea car={currentCar} onTuneClick={handleOpenTuning} onOpenCarSelector={handleOpenCarSelector}/>
            <IncomeArea incomeRate={incomeRatePerHour} accumulatedIncome={accumulatedIncome} maxAccumulation={incomeRatePerHour * MAX_OFFLINE_HOURS} onCollect={handleCollect} />
            <BuildingArea buildings={buildings} onBuildingClick={handleBuildingClick} />
          </>
        )}
        {/* Экран Гонок */}
        {activeScreen === 'race' && ( <RaceScreen playerCar={currentCar} onStartRace={handleStartRace} /> )}
        {/* Экран Автосалона */}
        {activeScreen === 'shop' && ( <ShopScreen catalog={CAR_CATALOG} playerCars={playerCars} gameCoins={gameCoins} onBuyCar={handleBuyCar} /> )}
        {/* Экран Персонала */}
        {activeScreen === 'staff' && ( <StaffScreen staffCatalog={STAFF_CATALOG} hiredStaff={hiredStaff} gameCoins={gameCoins} onHireOrUpgrade={handleHireOrUpgradeStaff} calculateCost={calculateStaffCost} /> )}
        {/* Экран P2E (заглушка) */}
        {activeScreen === 'p2e' && <div className="placeholder-screen" style={placeholderStyle}>P2E</div>}
      </main>

      {/* Окно Тюнинга (поверх всего) */}
      {isTuningVisible && ( <TuningScreen car={currentCar} gameCoins={gameCoins} onUpgradePart={handleUpgradePart} onClose={handleCloseTuning} /> )}
      {/* Окно Выбора Машины (поверх всего) */}
      {isCarSelectorVisible && ( <CarSelector playerCars={playerCars} selectedCarId={selectedCarId} onSelectCar={handleSelectCar} onClose={handleCloseCarSelector} /> )}

      {/* Нижняя Навигационная Панель */}
      <NavBar activeScreen={activeScreen} onNavClick={handleNavClick} />
    </div>
  );
}

// Стиль для заглушек
const placeholderStyle = { padding: '40px 20px', textAlign: 'center', color: 'white', fontSize: '1.2em', opacity: 0.7 };

export default App;