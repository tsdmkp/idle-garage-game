// hooks/useGameHandlers.js - Обработчики игровых событий
import { useCallback } from 'react';
import {
  calculateUpgradeCost,
  calculateBuildingCost,
  recalculateStatsAndIncomeBonus,
  calculateTotalIncomeRate,
  simulateRace,
  calculateStaffCost,
  CAR_CATALOG
} from '../utils';

export const useGameHandlers = ({
  // Состояния игрока
  gameCoins, setGameCoins,
  currentXp, setCurrentXp,
  accumulatedIncome, setAccumulatedIncome,
  lastCollectedTimeRef,
  incomeRatePerHour, setIncomeRatePerHour,
  
  // Игровые объекты
  buildings, setBuildings,
  playerCars, setPlayerCars,
  selectedCarId, setSelectedCarId,
  hiredStaff, setHiredStaff,
  currentCar,
  
  // Туториал
  isTutorialActive, tutorialStep, setTutorialStep,
  setIsTutorialActive, setHasCompletedTutorial,
  
  // Топливная система
  fuelSystem,
  
  // Функции
  saveGameState
}) => {

  // ПРОВЕРКА 2: Обработчик сбора монет - КРИТИЧЕСКИ ВАЖНО, точно как в App.jsx
  const handleCollect = useCallback(() => {
    const incomeToAdd = Math.floor(accumulatedIncome);
    if (incomeToAdd > 0) {
      const newTotalCoins = gameCoins + incomeToAdd;
      setGameCoins(newTotalCoins);
      setAccumulatedIncome(0);
      const collectionTime = Date.now();
      lastCollectedTimeRef.current = collectionTime;
      
      // ПРОВЕРКА 3: Туториал логика - точно как в App.jsx
      if (isTutorialActive && tutorialStep === 3) {
        setTimeout(() => setTutorialStep(4), 500);
      }
      
      // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
      saveGameState({
        game_coins: newTotalCoins,
        last_collected_time: new Date(collectionTime).toISOString(),
      });
    }
  }, [accumulatedIncome, gameCoins, isTutorialActive, tutorialStep, setGameCoins, setAccumulatedIncome, setTutorialStep, lastCollectedTimeRef, saveGameState]);

  // ПРОВЕРКА 2: Обработчик клика по зданию - КРИТИЧЕСКИ ВАЖНО, точно как в App.jsx
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
      
      // ПРОВЕРКА 3: Haptic feedback - точно как в App.jsx
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
      // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
      saveGameState({
        game_coins: newCoins,
        buildings: updatedBuildings,
        income_rate_per_hour: newTotalRate,
      });
    } else {
      alert(`💰 Недостаточно монет! Нужно: ${cost.toLocaleString()}, у вас: ${gameCoins.toLocaleString()}`);
      
      // ПРОВЕРКА 3: Error haptic - точно как в App.jsx
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  }, [buildings, gameCoins, currentCar, hiredStaff, setGameCoins, setBuildings, setIncomeRatePerHour, saveGameState]);

  // ПРОВЕРКА 2: Обработчик улучшения деталей - КРИТИЧЕСКИ ВАЖНО, точно как в App.jsx
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
        
        // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
        saveGameState({
          game_coins: newCoins,
          player_cars: updatedPlayerCars,
          income_rate_per_hour: newTotalRate,
        });
      }
    }
  }, [currentCar, hiredStaff, gameCoins, playerCars, selectedCarId, buildings, setIncomeRatePerHour, setGameCoins, setPlayerCars, saveGameState]);

  // ПРОВЕРКА 2: Обработчик начала гонки - точно как в App.jsx
  const handleStartRace = useCallback(async (difficulty) => {
    if (!currentCar) return { result: 'error', reward: null };
    
    const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp, hiredStaff);
    if (raceOutcome) {
      setGameCoins(raceOutcome.newGameCoins);
      setCurrentXp(raceOutcome.newCurrentXp);
      
      // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
      saveGameState({
        game_coins: raceOutcome.newGameCoins,
        current_xp: raceOutcome.newCurrentXp,
      });
      
      return { result: raceOutcome.result, reward: raceOutcome.reward };
    }
    
    return { result: 'error', reward: null };
  }, [currentCar, gameCoins, currentXp, hiredStaff, setGameCoins, setCurrentXp, saveGameState]);

  // ПРОВЕРКА 2: Обработчик покупки машины - точно как в App.jsx
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
    
    // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
    saveGameState({
      game_coins: newCoins,
      player_cars: updatedPlayerCars,
    });
  }, [gameCoins, playerCars, setGameCoins, setPlayerCars, saveGameState]);

  // ПРОВЕРКА 2: Обработчик найма/улучшения персонала - точно как в App.jsx
  const handleHireOrUpgradeStaff = useCallback((staffId) => {
    const cost = calculateStaffCost(staffId, hiredStaff);
    
    if (gameCoins >= cost && cost !== Infinity) {
      const newCoins = gameCoins - cost;
      const updatedHiredStaff = { ...hiredStaff, [staffId]: (hiredStaff[staffId] || 0) + 1 };
      const newTotalRate = calculateTotalIncomeRate(buildings, currentCar, updatedHiredStaff);

      setGameCoins(newCoins);
      setHiredStaff(updatedHiredStaff);
      setIncomeRatePerHour(newTotalRate);
      
      // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
      saveGameState({
        game_coins: newCoins,
        hired_staff: updatedHiredStaff,
        income_rate_per_hour: newTotalRate,
      });
    }
  }, [hiredStaff, gameCoins, buildings, currentCar, setGameCoins, setHiredStaff, setIncomeRatePerHour, saveGameState]);

  // ПРОВЕРКА 2: Обработчик выбора машины - точно как в App.jsx  
  const handleSelectCar = useCallback((carId) => {
    if (carId !== selectedCarId) {
      setSelectedCarId(carId);
      const newSelectedCar = playerCars.find(c => c.id === carId);
      
      if (newSelectedCar) {
        const newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff);
        setIncomeRatePerHour(newTotalRate);
        
        // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
        saveGameState({
          selected_car_id: carId,
          income_rate_per_hour: newTotalRate,
        });
      }
    }
  }, [selectedCarId, playerCars, buildings, hiredStaff, setSelectedCarId, setIncomeRatePerHour, saveGameState]);

  // ПРОВЕРКА 2: Топливные обработчики - точно как в App.jsx
  const handleFuelUpdate = useCallback((newFuelCount, newLastRaceTime, newRefillTime = null) => {
    // ПРОВЕРКА 3: Используем функцию из топливного хука - точно как в App.jsx
    fuelSystem.handleFuelUpdate(newFuelCount, newLastRaceTime, newRefillTime);
  }, [fuelSystem]);

  const handleFuelRefillByAd = useCallback(() => {
    // ПРОВЕРКА 3: Используем функцию из топливного хука - точно как в App.jsx
    fuelSystem.handleFuelRefillByAd();
  }, [fuelSystem]);

  // ПРОВЕРКА 2: Обработчики наград - точно как в App.jsx
  const handleReferralRewardUpdate = useCallback((coinsEarned) => {
    if (coinsEarned > 0) {
      const newTotalCoins = gameCoins + coinsEarned;
      setGameCoins(newTotalCoins);
      
      // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
      saveGameState({
        game_coins: newTotalCoins,
      });
    }
  }, [gameCoins, setGameCoins, saveGameState]);

  const handleAdReward = useCallback((rewardAmount) => {
    if (rewardAmount > 0) {
      const newTotalCoins = gameCoins + rewardAmount;
      setGameCoins(newTotalCoins);
      
      // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
      saveGameState({
        game_coins: newTotalCoins,
      });
      
      alert(`🎉 Получено ${rewardAmount} монет за просмотр рекламы!`);
      
      // ПРОВЕРКА 3: Success haptic - точно как в App.jsx
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    }
  }, [gameCoins, setGameCoins, saveGameState]);

  // ПРОВЕРКА 2: Туториал обработчики - точно как в App.jsx
  const handleTutorialNext = useCallback(() => {
    setTutorialStep(prev => prev + 1);
  }, [setTutorialStep]);
  
  const handleTutorialComplete = useCallback(() => {
    setIsTutorialActive(false);
    setHasCompletedTutorial(true);
    
    // ПРОВЕРКА 3: Сохранение - точно как в App.jsx
    saveGameState({
      has_completed_tutorial: true,
    });
  }, [setIsTutorialActive, setHasCompletedTutorial, saveGameState]);
  
  const handleTutorialAction = useCallback((action) => {
    // ПРОВЕРКА 3: Логика действий туториала - точно как в App.jsx
    if (action === 'close-tuning') {
      // Этот обработчик будет использоваться в App.jsx для закрытия тюнинга
      return 'close-tuning';
    }
  }, []);

  const handleShowTutorial = useCallback(() => {
    setIsTutorialActive(true);
    setTutorialStep(0);
  }, [setIsTutorialActive, setTutorialStep]);

  // ПРОВЕРКА 1: Возвращаемый объект - все обработчики
  return {
    // Основные игровые обработчики
    handleCollect,
    handleBuildingClick,
    handleUpgradePart,
    handleStartRace,
    handleBuyCar,
    handleHireOrUpgradeStaff,
    handleSelectCar,
    
    // Топливные обработчики
    handleFuelUpdate,
    handleFuelRefillByAd,
    
    // Обработчики наград
    handleReferralRewardUpdate,
    handleAdReward,
    
    // Туториал обработчики
    handleTutorialNext,
    handleTutorialComplete,
    handleTutorialAction,
    handleShowTutorial
  };
};