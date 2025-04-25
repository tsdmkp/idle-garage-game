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
import CarSelector from './components/CarSelector';
import { testFunction } from './testUtil';
// Импорт утилит
import {
    calculateUpgradeCost,
    recalculateStatsAndIncomeBonus,
    calculateTotalIncomeRate,
    simulateRace, // Убедимся, что она экспортируется из utils.js
    calculateStaffCost,
    getInitialPlayerCar,
    BASE_CAR_STATS,
    CAR_CATALOG,
    STAFF_CATALOG,
    INITIAL_BUILDINGS,
    MAX_OFFLINE_HOURS,
    UPDATE_INTERVAL,
    STARTING_COINS
} from './utils'; // Импортируем все из utils.js
import './App.css';

// ========= КОМПОНЕНТ APP =========
function App() {
  // --- Состояния ---
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerName, setPlayerName] = useState("Игрок");
  const [gameCoins, setGameCoins] = useState(STARTING_COINS); // Используем константу
  const [jetCoins, setJetCoins] = useState(0);
  const [currentXp, setCurrentXp] = useState(10);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [incomeRatePerHour, setIncomeRatePerHour] = useState(0);
  const lastCollectedTimeRef = useRef(Date.now());
  const [accumulatedIncome, setAccumulatedIncome] = useState(0);
  const [buildings, setBuildings] = useState(INITIAL_BUILDINGS); // Используем константу
  const [playerCars, setPlayerCars] = useState(() => [getInitialPlayerCar()]); // Используем функцию из utils
  const [selectedCarId, setSelectedCarId] = useState('car_001'); // ID начальной машины
  const [hiredStaff, setHiredStaff] = useState(() => { // Инициализация из импортированного каталога
      const initialStaff = {};
      for (const staffId in STAFF_CATALOG) { initialStaff[staffId] = 0; } // Уровни персонала по умолчанию 0
      return initialStaff;
  });
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false);

  // --- Вычисляемая переменная для текущей выбранной машины ---
  // Находим машину в массиве playerCars по selectedCarId
  // Если вдруг не найдена (или массив пуст), возвращаем null (или можно вернуть дефолтную)
  const currentCar = playerCars.find(car => car.id === selectedCarId) || null;

  // --- Эффект Инициализации и Загрузки Данных ---
  useEffect(() => {
    console.log("App Init useEffect running...");
    // Инициализация TG
    const tg = window.Telegram?.WebApp; if (tg) { /* ... */ } else { /* ... */ }

    // --- Загрузка Сохраненных Данных ---
    console.log("--- Loading Saved Data ---");
    const savedTime = localStorage.getItem('idleGarage_lastCollectedTime');
    const savedCoins = localStorage.getItem('idleGarage_gameCoins');
    const savedBuildingsData = localStorage.getItem('idleGarage_buildings');
    const savedPlayerCarsData = localStorage.getItem('idleGarage_playerCars'); // Правильное имя
    const savedSelectedCarId = localStorage.getItem('idleGarage_selectedCarId');
    const savedHiredStaffData = localStorage.getItem('idleGarage_hiredStaff');
    const savedXp = localStorage.getItem('idleGarage_currentXp');
    const savedLevel = localStorage.getItem('idleGarage_playerLevel');

    // --- Установка Начальных Значений ---
    const loadedTime = savedTime ? parseInt(savedTime, 10) : Date.now();
    lastCollectedTimeRef.current = loadedTime;

    let initialCoinsValue = STARTING_COINS; if (savedCoins !== null && !isNaN(parseInt(savedCoins, 10))) { initialCoinsValue = parseInt(savedCoins, 10); } setGameCoins(initialCoinsValue);
    let loadedBuildings = INITIAL_BUILDINGS; if (savedBuildingsData) { try { const p = JSON.parse(savedBuildingsData); if(Array.isArray(p)) loadedBuildings = p; } catch(e){} } setBuildings(loadedBuildings);
    setCurrentXp(savedXp ? parseInt(savedXp, 10) : 10); setPlayerLevel(savedLevel ? parseInt(savedLevel, 10) : 1);
    let loadedHiredStaff = {}; for(const id in STAFF_CATALOG){ loadedHiredStaff[id] = 0; } if (savedHiredStaffData) { try { const p = JSON.parse(savedHiredStaffData); if(p && typeof p === 'object'){ for(const id in STAFF_CATALOG){ loadedHiredStaff[id] = p[id] || 0; } } } catch(e){} } setHiredStaff(loadedHiredStaff);

    // Загрузка и установка массива машин игрока
    let initialPlayerCars = [getInitialPlayerCar()]; // Начинаем с дефолтной
    if (savedPlayerCarsData) { // Используем правильное имя
        try {
            const p = JSON.parse(savedPlayerCarsData);
            if (Array.isArray(p) && p.length > 0) {
                // Пересчитываем статы для каждой загруженной машины
                initialPlayerCars = p.map(sc => sc && sc.id && sc.parts ? { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats } : null).filter(Boolean);
                 console.log("Loaded and processed player cars:", initialPlayerCars);
            }
        } catch (e) { console.error("Failed to parse player cars", e); }
    }
    setPlayerCars(initialPlayerCars.length > 0 ? initialPlayerCars : [getInitialPlayerCar()]); // Устанавливаем машины

    // Установка выбранной машины
    const finalSelectedCarId = savedSelectedCarId && initialPlayerCars.some(c => c.id === savedSelectedCarId) ? savedSelectedCarId : initialPlayerCars[0]?.id || 'car_001';
    setSelectedCarId(finalSelectedCarId);
    console.log("Set selected car ID:", finalSelectedCarId);

    // --- Пересчет Ставки Дохода на основе загруженных данных ---
    const finalSelectedCar = initialPlayerCars.find(c => c.id === finalSelectedCarId) || initialPlayerCars[0]; // Используем актуальный массив машин
    if (finalSelectedCar) {
        const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, finalSelectedCar, loadedHiredStaff); // Передаем актуальные данные
        setIncomeRatePerHour(initialTotalRate);
        console.log(`Calculated Initial Total Income Rate: ${initialTotalRate}/hour`);
        // Расчет Оффлайн Дохода
        const now = Date.now(); const offlineTimeMs = now - loadedTime; let offlineIncome = 0;
        if (offlineTimeMs > 0 && initialTotalRate > 0) { offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600); }
        setAccumulatedIncome(offlineIncome);
        console.log(`Calculated offline income: ${offlineIncome.toFixed(2)}`);
    } else {
        // Если не удалось определить машину (маловероятно)
        setIncomeRatePerHour(0);
        setAccumulatedIncome(0);
        console.error("Could not find a selected car during initialization!");
    }

    console.log("--- Initialization useEffect finished ---");
  }, []); // Пустой массив зависимостей

  // --- Эффект Таймера Дохода ---
  useEffect(() => {
    console.log("App Init useEffect running...");
    const result = testFunction(); // Вызываем тестовую функцию
    console.log("Test function result:", result); // Смотрим результат
    if (incomeRatePerHour <= 0) return;
    const incomePerSecond = incomeRatePerHour / 3600; const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
    const intervalId = setInterval(() => { const now = Date.now(); const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000; const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond; const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap); setAccumulatedIncome(newAccumulated); }, UPDATE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [incomeRatePerHour]);

  // --- Функции Обработчики ---
  const handleCollect = () => {
      const incomeToAdd = Math.floor(accumulatedIncome); if (incomeToAdd > 0) { const newTotalCoins = gameCoins + incomeToAdd; setGameCoins(newTotalCoins); setAccumulatedIncome(0); const collectionTime = Date.now(); lastCollectedTimeRef.current = collectionTime; localStorage.setItem('idleGarage_gameCoins', newTotalCoins.toString()); localStorage.setItem('idleGarage_lastCollectedTime', collectionTime.toString()); }
  };
  const handleBuildingClick = (buildingName) => {
      const targetBuilding = buildings.find(b => b.name === buildingName); if (!targetBuilding || targetBuilding.isLocked) return; const cost = 100 * Math.pow(2, targetBuilding.level);
      if (gameCoins >= cost) { const newCoins = gameCoins - cost; setGameCoins(newCoins); const updatedBuildings = buildings.map(b => b.name === buildingName ? { ...b, level: b.level + 1 } : b); setBuildings(updatedBuildings); const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar, hiredStaff); setIncomeRatePerHour(newTotalRate); localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_buildings', JSON.stringify(updatedBuildings)); }
  };
  const handleOpenTuning = () => setIsTuningVisible(true);
  const handleCloseTuning = () => setIsTuningVisible(false);
  const handleUpgradePart = (partId) => {
      if (!currentCar?.parts?.[partId]) return; const part = currentCar.parts[partId]; const cost = calculateUpgradeCost(partId, part.level);
      if (gameCoins >= cost) { const newCoins = gameCoins - cost; setGameCoins(newCoins); const updatedParts = { ...currentCar.parts, [partId]: { ...part, level: part.level + 1 } }; const { stats: newStats } = recalculateStatsAndIncomeBonus(currentCar.id, updatedParts);
          const updatedPlayerCars = playerCars.map(car => car.id === selectedCarId ? { ...car, parts: updatedParts, stats: newStats } : car ); setPlayerCars(updatedPlayerCars);
          const updatedCarForRate = updatedPlayerCars.find(c => c.id === selectedCarId); if (updatedCarForRate) { const newTotalRate = calculateTotalIncomeRate(buildings, updatedCarForRate, hiredStaff); setIncomeRatePerHour(newTotalRate); }
          localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_playerCars', JSON.stringify(updatedPlayerCars)); }
  };
  const handleStartRace = async (difficulty) => {
      if (!currentCar) return { result: 'error', reward: null }; // Проверка currentCar
      const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp); if (raceOutcome) { setGameCoins(raceOutcome.newGameCoins); setCurrentXp(raceOutcome.newCurrentXp); localStorage.setItem('idleGarage_gameCoins', raceOutcome.newGameCoins.toString()); localStorage.setItem('idleGarage_currentXp', raceOutcome.newCurrentXp.toString()); return { result: raceOutcome.result, reward: raceOutcome.reward }; } else { return { result: 'error', reward: null }; }
  };
  const handleBuyCar = (carIdToBuy) => {
      const carFromCatalog = CAR_CATALOG.find(c => c.id === carIdToBuy); if (!carFromCatalog) return; const alreadyOwned = playerCars.some(c => c.id === carIdToBuy); if (alreadyOwned) return; const price = carFromCatalog.price; if (gameCoins < price) return; const newCoins = gameCoins - price; setGameCoins(newCoins); const { stats: initialStats } = recalculateStatsAndIncomeBonus(carFromCatalog.id, carFromCatalog.initialParts); const newPlayerCar = { id: carFromCatalog.id, name: carFromCatalog.name, imageUrl: carFromCatalog.imageUrl, stats: initialStats, parts: { ...carFromCatalog.initialParts } }; const updatedPlayerCars = [...playerCars, newPlayerCar]; setPlayerCars(updatedPlayerCars); setSelectedCarId(newPlayerCar.id); const newTotalRate = calculateTotalIncomeRate(buildings, newPlayerCar, hiredStaff); setIncomeRatePerHour(newTotalRate); localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_playerCars', JSON.stringify(updatedPlayerCars)); localStorage.setItem('idleGarage_selectedCarId', newPlayerCar.id); console.log(`Car "${newPlayerCar.name}" purchased!`);
  };
  const handleHireOrUpgradeStaff = (staffId) => {
      const cost = calculateStaffCost(staffId, hiredStaff); if (cost === Infinity) return; if (gameCoins >= cost) { const newCoins = gameCoins - cost; const currentLevel = hiredStaff[staffId] || 0; const newLevel = currentLevel + 1; const updatedHiredStaff = { ...hiredStaff, [staffId]: newLevel }; setHiredStaff(updatedHiredStaff); setGameCoins(newCoins); const newTotalRate = calculateTotalIncomeRate(buildings, currentCar, updatedHiredStaff); setIncomeRatePerHour(newTotalRate); localStorage.setItem('idleGarage_gameCoins', newCoins.toString()); localStorage.setItem('idleGarage_hiredStaff', JSON.stringify(updatedHiredStaff)); console.log(`Staff "${STAFF_CATALOG[staffId]?.name}" upgraded. New rate: ${newTotalRate}/hour.`); }
  };
  const handleNavClick = (screenId) => { setIsTuningVisible(false); setIsCarSelectorVisible(false); setActiveScreen(screenId); };
  const handleOpenCarSelector = () => setIsCarSelectorVisible(true);
  const handleCloseCarSelector = () => setIsCarSelectorVisible(false);
  const handleSelectCar = (carId) => { if (carId !== selectedCarId) { setSelectedCarId(carId); const newSelectedCar = playerCars.find(c => c.id === carId); if (newSelectedCar) { const newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff); setIncomeRatePerHour(newTotalRate); } localStorage.setItem('idleGarage_selectedCarId', carId); } setIsCarSelectorVisible(false); };

  // --- Расчеты для Рендера ---
  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

  // --- Рендер Компонента ---
  return (
    <div className="App" style={{ paddingBottom: '70px' }}>
      {/* Хедер */}
      <div className="header-container">
        <Header level={playerLevel} playerName={playerName} gameCoins={gameCoins} jetCoins={jetCoins} xpPercentage={xpPercentage} />
      </div>

      {/* Основной контент */}
      <main className="main-content">
        {/* Экран Гаража */}
        {activeScreen === 'garage' && currentCar && ( // Добавлена проверка currentCar
          <>
            <GarageArea car={currentCar} onTuneClick={handleOpenTuning} onOpenCarSelector={handleOpenCarSelector}/>
            <IncomeArea incomeRate={incomeRatePerHour} accumulatedIncome={accumulatedIncome} maxAccumulation={incomeRatePerHour * MAX_OFFLINE_HOURS} onCollect={handleCollect} />
            <BuildingArea buildings={buildings} onBuildingClick={handleBuildingClick} />
          </>
        )}
        {/* Экран Гонок */}
        {activeScreen === 'race' && currentCar && ( <RaceScreen playerCar={currentCar} onStartRace={handleStartRace} /> )}
        {/* Экран Автосалона */}
        {activeScreen === 'shop' && ( <ShopScreen catalog={CAR_CATALOG} playerCars={playerCars} gameCoins={gameCoins} onBuyCar={handleBuyCar} /> )}
        {/* Экран Персонала */}
        {activeScreen === 'staff' && ( <StaffScreen staffCatalog={STAFF_CATALOG} hiredStaff={hiredStaff} gameCoins={gameCoins} onHireOrUpgrade={handleHireOrUpgradeStaff} calculateCost={(id) => calculateStaffCost(id, hiredStaff)} /> )}
        {/* Экран P2E (заглушка) */}
        {activeScreen === 'p2e' && <div className="placeholder-screen" style={placeholderStyle}>P2E</div>}
      </main>

      {/* Окно Тюнинга */}
      {isTuningVisible && currentCar && ( <TuningScreen car={currentCar} gameCoins={gameCoins} onUpgradePart={handleUpgradePart} onClose={handleCloseTuning} /> )}
      {/* Окно Выбора Машины */}
      {isCarSelectorVisible && ( <CarSelector playerCars={playerCars} selectedCarId={selectedCarId} onSelectCar={handleSelectCar} onClose={handleCloseCarSelector} /> )}

      {/* Нижняя Навигационная Панель */}
      <NavBar activeScreen={activeScreen} onNavClick={handleNavClick} />
    </div>
  );
}

// Стиль для заглушек
const placeholderStyle = { padding: '40px 20px', textAlign: 'center', color: 'white', fontSize: '1.2em', opacity: 0.7 };

export default App;