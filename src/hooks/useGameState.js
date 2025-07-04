import { useState, useRef, useCallback } from 'react';
import {
  calculateUpgradeCost,
  calculateBuildingCost,
  recalculateStatsAndIncomeBonus,
  calculateTotalIncomeRate,
  simulateRace,
  calculateStaffCost,
  getInitialPlayerCar,
  CAR_CATALOG,
  INITIAL_BUILDINGS,
  STARTING_COINS
} from '../utils';

const INITIAL_CAR = getInitialPlayerCar();

const INITIAL_HIRED_STAFF = (() => {
  const init = {};
  const staffIds = ['mechanic', 'manager', 'cleaner', 'security', 'marketer', 'accountant'];
  staffIds.forEach(id => {
    init[id] = 0;
  });
  return init;
})();

export const useGameState = (saveGameState) => {
  // Состояния игрока
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerName, setPlayerName] = useState('Игрок');
  const [gameCoins, setGameCoins] = useState(STARTING_COINS);
  const [jetCoins, setJetCoins] = useState(0);
  const [currentXp, setCurrentXp] = useState(10);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [incomeRatePerHour, setIncomeRatePerHour] = useState(0);
  const lastCollectedTimeRef = useRef(Date.now());
  const [accumulatedIncome, setAccumulatedIncome] = useState(0);
  
  // Состояния игровых объектов
  const [buildings, setBuildings] = useState(INITIAL_BUILDINGS);
  const [playerCars, setPlayerCars] = useState(() => [INITIAL_CAR]);
  const [selectedCarId, setSelectedCarId] = useState(INITIAL_CAR.id);
  const [hiredStaff, setHiredStaff] = useState(INITIAL_HIRED_STAFF);
  
  // Туториал
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  // Вычисляемые значения
  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;
  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

  // Функция инициализации состояния из загруженных данных
  const initializeGameState = useCallback((initialState) => {
    console.log('🎮 Инициализация состояния игры...');
    
    // Основные данные игрока
    setPlayerLevel(Number(initialState.player_level) || 1);
    
    if (initialState.first_name) {
      setPlayerName(initialState.first_name);
    }
    
    const coinsToSet = Number(initialState.game_coins) || STARTING_COINS;
    setGameCoins(coinsToSet);
    
    setJetCoins(Number(initialState.jet_coins) || 0);
    setCurrentXp(Number(initialState.current_xp) || 10);
    setXpToNextLevel(Number(initialState.xp_to_next_level) || 100);
    setHasCompletedTutorial(Boolean(initialState.has_completed_tutorial));
    
    // Здания
    let loadedBuildings = INITIAL_BUILDINGS;
    if (Array.isArray(initialState.buildings) && initialState.buildings.length > 0) {
      const validBuildings = initialState.buildings.every(building => 
        building && 
        typeof building.id === 'string' && 
        typeof building.name === 'string' && 
        typeof building.icon === 'string' &&
        typeof building.level === 'number' &&
        typeof building.isLocked === 'boolean'
      );
      
      if (validBuildings) {
        loadedBuildings = initialState.buildings;
      }
    }
    setBuildings(loadedBuildings);

    // Персонал
    const loadedHiredStaff = initialState.hired_staff && typeof initialState.hired_staff === 'object' 
      ? initialState.hired_staff 
      : INITIAL_HIRED_STAFF;
    setHiredStaff(loadedHiredStaff);

    // Машины
    const loadedPlayerCarsRaw = Array.isArray(initialState.player_cars) ? initialState.player_cars : [INITIAL_CAR];
    const loadedPlayerCars = loadedPlayerCarsRaw.map(sc => {
      if (sc && sc.id && sc.parts) {
        return { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats };
      }
      return null;
    }).filter(Boolean);
    
    const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR];
    setPlayerCars(actualPlayerCars);

    // Выбранная машина
    const loadedSelectedCarId = initialState.selected_car_id;
    const finalSelectedCarId = loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
      ? loadedSelectedCarId
      : actualPlayerCars[0]?.id || INITIAL_CAR.id;
    setSelectedCarId(finalSelectedCarId);

    // Расчет дохода
    const carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0] || INITIAL_CAR;
    const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
    setIncomeRatePerHour(initialTotalRate);
    
    return {
      buildings: loadedBuildings,
      playerCars: actualPlayerCars,
      selectedCarId: finalSelectedCarId,
      incomeRate: initialTotalRate
    };
  }, []);

  // Обработчик сбора дохода
  const handleCollect = useCallback(() => {
    const incomeToAdd = Math.floor(accumulatedIncome);
    if (incomeToAdd > 0) {
      const newTotalCoins = gameCoins + incomeToAdd;
      setGameCoins(newTotalCoins);
      setAccumulatedIncome(0);
      const collectionTime = Date.now();
      lastCollectedTimeRef.current = collectionTime;
      
      if (isTutorialActive && tutorialStep === 3) {
        setTimeout(() => setTutorialStep(4), 500);
      }
      
      saveGameState({
        game_coins: newTotalCoins,
        last_collected_time: new Date(collectionTime).toISOString(),
      });
    }
  }, [accumulatedIncome, gameCoins, isTutorialActive, tutorialStep, saveGameState]);

  // Обработчик клика по зданию
  const handleBuildingClick = useCallback((buildingName) => {
    const targetBuilding = buildings.find(b => b.name === buildingName);
    if (!targetBuilding) return;

    const cost = calculateBuildingCost(targetBuilding.id, targetBuilding.level);
    
    if (gameCoins >= cost) {
      const newCoins = gameCoins - cost;
      const updatedBuildings = buildings.map(b =>
        b.name === buildingName ? { ...b, level: b.level + 1 } : b
      );
      const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar, hiredStaff);

      setGameCoins(newCoins);
      setBuildings(updatedBuildings);
      setIncomeRatePerHour(newTotalRate);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
      saveGameState({
        game_coins: newCoins,
        buildings: updatedBuildings,
        income_rate_per_hour: newTotalRate,
      });
    } else {
      alert(`💰 Недостаточно монет! Нужно: ${cost.toLocaleString()}, у вас: ${gameCoins.toLocaleString()}`);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  }, [buildings, gameCoins, currentCar, hiredStaff, saveGameState]);

  // Обработчик улучшения детали
  const handleUpgradePart = useCallback((partId) => {
    if (!currentCar?.parts?.[partId]) return;
    
    const part = currentCar.parts[partId];
    const cost = calculateUpgradeCost(partId, part.level, hiredStaff);
    
    if (gameCoins >= cost && cost !== Infinity) {
      const newCoins = gameCoins - cost;
      const updatedParts = { ...currentCar.parts, [partId]: { ...part, level: part.level + 1 } };
      const { stats: newStats } = recalculateStatsAndIncomeBonus(currentCar.id, updatedParts);
      
      const updatedPlayerCars = playerCars.map(car =>
        car.id === selectedCarId ? { ...car, parts: updatedParts, stats: newStats } : car
      );
      
      const updatedCarForRate = updatedPlayerCars.find(c => c.id === selectedCarId);
      if (updatedCarForRate) {
        const newTotalRate = calculateTotalIncomeRate(buildings, updatedCarForRate, hiredStaff);
        setIncomeRatePerHour(newTotalRate);
        
        setGameCoins(newCoins);
        setPlayerCars(updatedPlayerCars);
        
        saveGameState({
          game_coins: newCoins,
          player_cars: updatedPlayerCars,
          income_rate_per_hour: newTotalRate,
        });
      }
    }
  }, [currentCar, hiredStaff, gameCoins, playerCars, selectedCarId, buildings, saveGameState]);

  // Обработчик гонки
  const handleStartRace = useCallback(async (difficulty) => {
    if (!currentCar) return { result: 'error', reward: null };
    
    const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp, hiredStaff);
    if (raceOutcome) {
      setGameCoins(raceOutcome.newGameCoins);
      setCurrentXp(raceOutcome.newCurrentXp);
      
      saveGameState({
        game_coins: raceOutcome.newGameCoins,
        current_xp: raceOutcome.newCurrentXp,
      });
      
      return { result: raceOutcome.result, reward: raceOutcome.reward };
    }
    
    return { result: 'error', reward: null };
  }, [currentCar, gameCoins, currentXp, hiredStaff, saveGameState]);

  // Обработчик покупки машины
  const handleBuyCar = useCallback((carIdToBuy) => {
    const carData = CAR_CATALOG.find(c => c.id === carIdToBuy);
    if (!carData || gameCoins < carData.price || playerCars.some(c => c.id === carIdToBuy)) {
      return;
    }
    
    const newCoins = gameCoins - carData.price;
    const newCar = {
      id: carData.id,
      name: carData.name,
      imageUrl: carData.imageUrl,
      parts: { ...carData.initialParts },
      stats: recalculateStatsAndIncomeBonus(carData.id, carData.initialParts).stats
    };
    
    const updatedPlayerCars = [...playerCars, newCar];
    setGameCoins(newCoins);
    setPlayerCars(updatedPlayerCars);
    
    saveGameState({
      game_coins: newCoins,
      player_cars: updatedPlayerCars,
    });
  }, [gameCoins, playerCars, saveGameState]);

  // Обработчик найма/улучшения персонала
  const handleHireOrUpgradeStaff = useCallback((staffId) => {
    const cost = calculateStaffCost(staffId, hiredStaff);
    
    if (gameCoins >= cost && cost !== Infinity) {
      const newCoins = gameCoins - cost;
      const updatedHiredStaff = { ...hiredStaff, [staffId]: (hiredStaff[staffId] || 0) + 1 };
      const newTotalRate = calculateTotalIncomeRate(buildings, currentCar, updatedHiredStaff);

      setGameCoins(newCoins);
      setHiredStaff(updatedHiredStaff);
      setIncomeRatePerHour(newTotalRate);
      
      saveGameState({
        game_coins: newCoins,
        hired_staff: updatedHiredStaff,
        income_rate_per_hour: newTotalRate,
      });
    }
  }, [hiredStaff, gameCoins, buildings, currentCar, saveGameState]);

  // Обработчик выбора машины
  const handleSelectCar = useCallback((carId) => {
    if (carId !== selectedCarId) {
      setSelectedCarId(carId);
      const newSelectedCar = playerCars.find(c => c.id === carId);
      
      if (newSelectedCar) {
        const newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff);
        setIncomeRatePerHour(newTotalRate);
        
        saveGameState({
          selected_car_id: carId,
          income_rate_per_hour: newTotalRate,
        });
      }
    }
  }, [selectedCarId, playerCars, buildings, hiredStaff, saveGameState]);

  // Обработчик награды за рекламу
  const handleAdReward = useCallback((rewardAmount) => {
    if (rewardAmount > 0) {
      const newTotalCoins = gameCoins + rewardAmount;
      setGameCoins(newTotalCoins);
      
      saveGameState({
        game_coins: newTotalCoins,
      });
      
      alert(`🎉 Получено ${rewardAmount} монет за просмотр рекламы!`);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    }
  }, [gameCoins, saveGameState]);

  // Обработчик награды за рефералов
  const handleReferralRewardUpdate = useCallback((coinsEarned) => {
    if (coinsEarned > 0) {
      const newTotalCoins = gameCoins + coinsEarned;
      setGameCoins(newTotalCoins);
      
      saveGameState({
        game_coins: newTotalCoins,
      });
    }
  }, [gameCoins, saveGameState]);

  // Туториал обработчики
  const handleTutorialNext = useCallback(() => {
    setTutorialStep(prev => prev + 1);
  }, []);
  
  const handleTutorialComplete = useCallback(() => {
    setIsTutorialActive(false);
    setHasCompletedTutorial(true);
    
    saveGameState({
      has_completed_tutorial: true,
    });
  }, [saveGameState]);
  
  const handleShowTutorial = useCallback(() => {
    setIsTutorialActive(true);
    setTutorialStep(0);
  }, []);

  // Функции для управления накопленным доходом
  const updateAccumulatedIncome = useCallback((newAmount) => {
    setAccumulatedIncome(newAmount);
  }, []);

  const updateLastCollectedTime = useCallback((timestamp) => {
    lastCollectedTimeRef.current = timestamp;
  }, []);

  return {
    // Состояния
    playerLevel,
    playerName,
    gameCoins,
    jetCoins,
    currentXp,
    xpToNextLevel,
    incomeRatePerHour,
    accumulatedIncome,
    buildings,
    playerCars,
    selectedCarId,
    hiredStaff,
    isTutorialActive,
    tutorialStep,
    hasCompletedTutorial,
    
    // Вычисляемые значения
    currentCar,
    xpPercentage,
    lastCollectedTimeRef,
    
    // Функции управления состоянием
    setPlayerLevel,
    setPlayerName,
    setGameCoins,
    setJetCoins,
    setCurrentXp,
    setXpToNextLevel,
    setIncomeRatePerHour,
    setAccumulatedIncome: updateAccumulatedIncome,
    setBuildings,
    setPlayerCars,
    setSelectedCarId,
    setHiredStaff,
    setIsTutorialActive,
    setTutorialStep,
    setHasCompletedTutorial,
    updateLastCollectedTime,
    
    // Функция инициализации
    initializeGameState,
    
    // Обработчики действий
    handleCollect,
    handleBuildingClick,
    handleUpgradePart,
    handleStartRace,
    handleBuyCar,
    handleHireOrUpgradeStaff,
    handleSelectCar,
    handleAdReward,
    handleReferralRewardUpdate,
    handleTutorialNext,
    handleTutorialComplete,
    handleShowTutorial,
  };
};