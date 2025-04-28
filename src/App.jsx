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
// Импорт утилит
import {
    calculateUpgradeCost,
    recalculateStatsAndIncomeBonus,
    calculateTotalIncomeRate,
    simulateRace,
    calculateStaffCost,
    getInitialPlayerCar,
    BASE_CAR_STATS,
    CAR_CATALOG,
    STAFF_CATALOG,
    INITIAL_BUILDINGS, // Используется только для useState
    MAX_OFFLINE_HOURS,
    UPDATE_INTERVAL,
    STARTING_COINS
} from './utils';
// Импорт API клиента
import apiClient from './apiClient';
import './App.css';

// Начальное состояние машины (константа)
const INITIAL_CAR = getInitialPlayerCar(); // Используем функцию из utils
// Начальное состояние персонала (константа)
const INITIAL_HIRED_STAFF = (() => { const init = {}; for (const id in STAFF_CATALOG) { init[id] = 0; } return init; })();


// ========= КОМПОНЕНТ APP =========
function App() {
  // --- Состояния ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [playerCars, setPlayerCars] = useState(() => [INITIAL_CAR]); // Инициализируем с константой
  const [selectedCarId, setSelectedCarId] = useState(INITIAL_CAR.id); // Инициализируем с ID константы
  const [hiredStaff, setHiredStaff] = useState(INITIAL_HIRED_STAFF); // Используем константу
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false);

  // --- Вычисляемая переменная для текущей выбранной машины ---
  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null; // Добавлен fallback на первую машину

  // --- Асинхронная Функция Загрузки Данных (объявлена внутри App) ---
  const loadInitialData = async () => {
    console.log("loadInitialData started...");
    // Используем ТЕКУЩЕЕ состояние как дефолт для локальных переменных
    let loadedBuildings = buildings;
    let loadedHiredStaff = hiredStaff;
    let carToCalculateFrom = currentCar || INITIAL_CAR; // Берем текущую или дефолтную

    try {
        console.log("Attempting apiClient call...");
        const initialState = await apiClient('/game_state');
        console.log("Received initial state from backend:", initialState);

        if (initialState && typeof initialState === 'object') {
            // --- Установка простых состояний ---
            setPlayerLevel(initialState.player_level ?? playerLevel); // Используем текущее состояние как fallback
            setPlayerName(initialState.first_name || initialState.username || playerName);
            setGameCoins(initialState.game_coins ?? gameCoins);
            setJetCoins(initialState.jet_coins ?? jetCoins);
            setCurrentXp(initialState.current_xp ?? currentXp);
            setXpToNextLevel(initialState.xp_to_next_level ?? xpToNextLevel);
            const loadedTime = initialState.last_collected_time ? new Date(initialState.last_collected_time).getTime() : Date.now();
            lastCollectedTimeRef.current = loadedTime;

            // --- Обработка сложных состояний ---
            loadedBuildings = initialState.buildings ?? buildings;
            setBuildings(loadedBuildings);

            loadedHiredStaff = initialState.hired_staff ?? hiredStaff;
            setHiredStaff(loadedHiredStaff);

            const loadedPlayerCarsRaw = initialState.player_cars ?? playerCars;
            const loadedPlayerCars = loadedPlayerCarsRaw.map(sc =>
                sc && sc.id && sc.parts ? { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats } : null
            ).filter(Boolean);
            const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR]; // Гарантируем машину
            setPlayerCars(actualPlayerCars);

            const loadedSelectedCarId = initialState.selected_car_id;
            const finalSelectedCarId = loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
                ? loadedSelectedCarId
                : actualPlayerCars[0]?.id || INITIAL_CAR.id;
            setSelectedCarId(finalSelectedCarId);

            // Перезаписываем локальную переменную для расчетов ниже
            carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0];

            if (!carToCalculateFrom) throw new Error("Ошибка определения машины после загрузки");

        } else {
            console.warn("Backend returned invalid initial state. Using current state as defaults.");
            setError("Не удалось получить данные игрока.");
            // Переменные для расчетов остаются равными текущему состоянию
            loadedBuildings = buildings;
            carToCalculateFrom = currentCar || INITIAL_CAR; // Берем текущую или дефолт
            loadedHiredStaff = hiredStaff;
        }
    } catch (err) {
        console.error("Failed to fetch initial game state:", err.message);
        setError(`Ошибка загрузки: ${err.message}`);
        // Переменные для расчетов остаются равными текущему состоянию
        loadedBuildings = buildings;
        carToCalculateFrom = currentCar || INITIAL_CAR;
        loadedHiredStaff = hiredStaff;
    } finally {
         console.log("Entering finally block...");
         // Используем локальные переменные, которые были установлены в try или catch
         if (carToCalculateFrom) {
             const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
             setIncomeRatePerHour(initialTotalRate);
             const now = Date.now();
             const offlineTimeMs = now - lastCollectedTimeRef.current;
             let offlineIncome = 0;
             if (offlineTimeMs > 0 && initialTotalRate > 0) { offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600); }
             setAccumulatedIncome(offlineIncome);
             console.log(`Final calculated rate: ${initialTotalRate}/h, offline income: ${offlineIncome.toFixed(2)}`);
         } else {
             console.error("Finally block: carToCalculateFrom is not set!");
             setIncomeRatePerHour(0); setAccumulatedIncome(0);
             if (!error) setError("Критическая ошибка инициализации.");
         }
        setIsLoading(false); // Завершаем загрузку
        console.log("isLoading set to false. Initialization finished.");
    }
  };

  // --- Эффект Инициализации ---
  useEffect(() => {
    // Инициализация TG
    const tg = window.Telegram?.WebApp;
    if (tg) { setIsTgApp(true); tg.ready(); /* ... */ tg.expand(); } else { setIsTgApp(false); /* ... */ }
    loadInitialData(); // Вызываем асинхронную функцию загрузки
  }, []); // Пустой массив зависимостей

  // --- Эффект Таймера Дохода ---
  useEffect(() => {
    if (incomeRatePerHour <= 0 || isLoading) return;
    const incomePerSecond = incomeRatePerHour / 3600;
    const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000;
      const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
      const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
      setAccumulatedIncome(newAccumulated);
    }, UPDATE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [incomeRatePerHour, isLoading]);

  // --- Функции Обработчики (без localStorage.setItem, но с вызовами API - пока TODO) ---
   const handleCollect = () => {
        const incomeToAdd = Math.floor(accumulatedIncome);
        if (incomeToAdd > 0) {
            const newTotalCoins = gameCoins + incomeToAdd;
            setGameCoins(newTotalCoins);
            setAccumulatedIncome(0);
            const collectionTime = Date.now();
            lastCollectedTimeRef.current = collectionTime;
            console.log(`Collected ${incomeToAdd} GC.`);
            // TODO: apiClient('/game_state', 'POST', { game_coins: newTotalCoins, last_collected_time: collectionTime });
        }
    };
   const handleBuildingClick = (buildingName) => {
        const targetBuilding = buildings.find(b => b.name === buildingName);
        if (!targetBuilding || targetBuilding.isLocked) return;
        const cost = 100 * Math.pow(2, targetBuilding.level);
        if (gameCoins >= cost) {
            const newCoins = gameCoins - cost;
            const updatedBuildings = buildings.map(b => b.name === buildingName ? { ...b, level: b.level + 1 } : b);
            const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar, hiredStaff);
            setGameCoins(newCoins);
            setBuildings(updatedBuildings);
            setIncomeRatePerHour(newTotalRate);
            console.log(`Building ${buildingName} upgraded. New rate: ${newTotalRate}/hour.`);
            // TODO: apiClient('/game_state', 'POST', { game_coins: newCoins, buildings: updatedBuildings });
        }
    };
   const handleOpenTuning = () => setIsTuningVisible(true);
   const handleCloseTuning = () => setIsTuningVisible(false);
   const handleUpgradePart = (partId) => {
        if (!currentCar?.parts?.[partId]) return;
        const part = currentCar.parts[partId];
        const cost = calculateUpgradeCost(partId, part.level);
        if (gameCoins >= cost) {
            const newCoins = gameCoins - cost;
            const updatedParts = { ...currentCar.parts, [partId]: { ...part, level: part.level + 1 } };
            const { stats: newStats } = recalculateStatsAndIncomeBonus(currentCar.id, updatedParts);
            const updatedPlayerCars = playerCars.map(car => car.id === selectedCarId ? { ...car, parts: updatedParts, stats: newStats } : car );
            const updatedCarForRate = updatedPlayerCars.find(c => c.id === selectedCarId);
            if (updatedCarForRate) {
                 const newTotalRate = calculateTotalIncomeRate(buildings, updatedCarForRate, hiredStaff);
                 setIncomeRatePerHour(newTotalRate);
            }
            setGameCoins(newCoins);
            setPlayerCars(updatedPlayerCars);
            console.log(`Part "${part.name}" upgraded. New rate: ${incomeRatePerHour}/hour.`);
             // TODO: apiClient('/game_state', 'POST', { game_coins: newCoins, player_cars: updatedPlayerCars }); // Или только измененную машину?
        }
    };
   const handleStartRace = async (difficulty) => {
        if (!currentCar) return { result: 'error', reward: null };
        const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp);
        if (raceOutcome) {
            setGameCoins(raceOutcome.newGameCoins);
            setCurrentXp(raceOutcome.newCurrentXp);
            // TODO: apiClient('/game_state', 'POST', { game_coins: raceOutcome.newGameCoins, current_xp: raceOutcome.newCurrentXp });
            return { result: raceOutcome.result, reward: raceOutcome.reward };
        } else { return { result: 'error', reward: null }; }
    };
   const handleBuyCar = (carIdToBuy) => { /* ... TODO: Добавить вызов API ... */ };
   const handleHireOrUpgradeStaff = (staffId) => { /* ... TODO: Добавить вызов API ... */ };
   const handleNavClick = (screenId) => { setIsTuningVisible(false); setIsCarSelectorVisible(false); setActiveScreen(screenId); };
   const handleOpenCarSelector = () => setIsCarSelectorVisible(true);
   const handleCloseCarSelector = () => setIsCarSelectorVisible(false);
   const handleSelectCar = (carId) => {
       if (carId !== selectedCarId) {
           setSelectedCarId(carId);
           const newSelectedCar = playerCars.find(c => c.id === carId);
           if (newSelectedCar) {
               const newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff);
               setIncomeRatePerHour(newTotalRate);
           }
           // TODO: apiClient('/game_state', 'POST', { selected_car_id: carId });
       }
       setIsCarSelectorVisible(false);
   };


  // --- Расчеты для Рендера ---
  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

  // --- Рендер Компонента ---
  if (isLoading) { return <div className="loading-screen">Загрузка данных...</div>; }
  if (error) { return <div className="error-screen">Ошибка: {error}</div>; }

  return (
    <div className="App" style={{ paddingBottom: '70px' }}>
      {/* Хедер */}
      <div className="header-container">
        <Header level={playerLevel} playerName={playerName} gameCoins={gameCoins} jetCoins={jetCoins} xpPercentage={xpPercentage} />
      </div>

      {/* Основной контент */}
      <main className="main-content">
        {/* Экран Гаража */}
        {activeScreen === 'garage' && currentCar && (
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