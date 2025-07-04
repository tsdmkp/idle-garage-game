import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import MainGameScreen from './components/MainGameScreen';
import Tutorial from './components/Tutorial';
import NavBar from './components/NavBar';
import TuningScreen from './components/TuningScreen';
import RaceScreen from './components/RaceScreen';
import ShopScreen from './components/ShopScreen';
import StaffScreen from './components/StaffScreen';
import CarSelector from './components/CarSelector';
import LeaderboardScreen from './components/LeaderboardScreen';
import FriendsScreen from './components/FriendsScreen';
import LoadingScreen from './components/LoadingScreen';
import {
  calculateUpgradeCost,
  calculateBuildingCost,
  recalculateStatsAndIncomeBonus,
  calculateTotalIncomeRate,
  simulateRace,
  calculateStaffCost,
  getInitialPlayerCar,
  BASE_CAR_STATS,
  CAR_CATALOG,
  STAFF_CATALOG,
  INITIAL_BUILDINGS,
  MAX_OFFLINE_HOURS,
  UPDATE_INTERVAL,
  STARTING_COINS
} from './utils';
import apiClient from './apiClient';
import './App.css';

const INITIAL_CAR = getInitialPlayerCar();
const INITIAL_HIRED_STAFF = (() => {
  const init = {};
  for (const id in STAFF_CATALOG) {
    init[id] = 0;
  }
  return init;
})();

function App() {
  // ЗАЩИТА ОТ ДВОЙНОЙ ИНИЦИАЛИЗАЦИИ
  const initializationRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // Основные состояния игры
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState(null);
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);
  
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
  
  // UI состояния
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false);
  
  // Туториал
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  // Топливная система
  const [fuelCount, setFuelCount] = useState(5);
  const [lastRaceTime, setLastRaceTime] = useState(null);
  const [fuelRefillTime, setFuelRefillTime] = useState(null);

  // Refs для предотвращения лишних ререндеров
  const saveTimeoutRef = useRef(null);

  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;

  // Обработчик завершения загрузки
  const handleLoadingComplete = useCallback(() => {
    console.log('🎮 Заставка завершена, показываем игру');
    setIsLoading(false);
  }, []);

  // УПРОЩЕННАЯ функция получения userId
  const getUserId = useCallback(() => {
    if (isTgApp && tgUserData?.id) {
      const userId = tgUserData.id.toString();
      console.log('🆔 getUserId (Telegram):', userId);
      return userId;
    } else if (!isTgApp) {
      console.log('🆔 getUserId (Standalone): default');
      return 'default';
    }
    
    console.log('🆔 getUserId: null (не готов)');
    return null;
  }, [isTgApp, tgUserData?.id]);

  // Debounced save function для предотвращения частых сохранений
  const debouncedSave = useCallback((data) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const userId = getUserId();
      if (!userId) {
        console.warn('⚠️ Отмена сохранения: userId не готов');
        return;
      }

      try {
        console.log('📤 Сохранение состояния для userId:', userId);
        await apiClient('/game_state', 'POST', { body: { userId, ...data } });
        console.log('✅ Состояние успешно сохранено');
      } catch (err) {
        console.error('❌ Ошибка сохранения:', err.message);
      }
    }, 500); // 500ms debounce
  }, [getUserId]);

  // Основная функция сохранения состояния
  const saveGameState = useCallback(async (updates = {}) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('⚠️ Отмена сохранения: userId не готов');
      return;
    }

    const stateToSave = {
      userId: userId,
      player_level: playerLevel,
      first_name: playerName,
      game_coins: gameCoins,
      jet_coins: jetCoins,
      current_xp: currentXp,
      xp_to_next_level: xpToNextLevel,
      income_rate_per_hour: incomeRatePerHour,
      last_collected_time: new Date(lastCollectedTimeRef.current).toISOString(),
      buildings: buildings,
      player_cars: playerCars,
      selected_car_id: selectedCarId,
      hired_staff: hiredStaff,
      has_completed_tutorial: hasCompletedTutorial,
      last_exit_time: new Date().toISOString(),
      // Топливные данные
      fuel_count: fuelCount,
      last_race_time: lastRaceTime ? new Date(lastRaceTime).toISOString() : null,
      fuel_refill_time: fuelRefillTime ? new Date(fuelRefillTime).toISOString() : null,
      ...updates
    };

    // Используем debounced save для неважных обновлений
    if (updates && Object.keys(updates).length < 3) {
      debouncedSave(stateToSave);
      return;
    }

    // Мгновенное сохранение для важных действий
    try {
      console.log('📤 Мгновенное сохранение состояния для userId:', userId);
      await apiClient('/game_state', 'POST', { body: stateToSave });
      console.log('✅ Состояние успешно сохранено');
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err.message);
    }
  }, [
    playerLevel, playerName, gameCoins, jetCoins, currentXp, xpToNextLevel,
    incomeRatePerHour, buildings, playerCars, selectedCarId, hiredStaff, 
    hasCompletedTutorial, fuelCount, lastRaceTime, fuelRefillTime,
    getUserId, debouncedSave
  ]);

  // Вспомогательная функция валидации дат
  const parseTimestamp = (dateString) => {
    if (!dateString) return null;
    const timestamp = new Date(dateString).getTime();
    return isNaN(timestamp) ? null : timestamp;
  };

  // Функция проверки и восстановления топлива
  const checkAndRestoreFuel = useCallback((currentFuel, lastRace, refillTime) => {
    if (currentFuel >= 5) return { fuel: currentFuel, shouldUpdate: false };
    
    const now = Date.now();
    const timeToCheck = refillTime || (lastRace ? lastRace + (60 * 60 * 1000) : null);
    
    if (timeToCheck && now >= timeToCheck) {
      console.log('⛽ Топливо должно быть восстановлено');
      return { 
        fuel: 5, 
        shouldUpdate: true, 
        newLastRaceTime: now, 
        newRefillTime: null 
      };
    }
    
    return { fuel: currentFuel, shouldUpdate: false };
  }, []);

  // ИСПРАВЛЕННАЯ инициализация приложения
  useEffect(() => {
    // ЗАЩИТА ОТ ДВОЙНОЙ ИНИЦИАЛИЗАЦИИ
    if (initializationRef.current) {
      console.log('⚠️ Повторная инициализация заблокирована');
      return;
    }
    
    const initializeApp = async () => {
      console.log('🚀 Инициализация приложения...');
      initializationRef.current = true; // Устанавливаем флаг сразу
      
      // Инициализация Telegram WebApp
      const tg = window.Telegram?.WebApp;
      if (tg) {
        console.log('✅ Telegram WebApp найден');
        
        setIsTgApp(true);
        const userData = tg.initDataUnsafe?.user || null;
        setTgUserData(userData);
        
        if (userData && typeof userData === 'object') {
          const firstName = userData.first_name || userData.firstName || userData.username || 'Игрок';
          setPlayerName(firstName);
          console.log('📝 Player name установлен:', firstName);
        }
        
        tg.ready();
        tg.expand();
        tg.BackButton.hide();
        tg.MainButton.hide();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (userData?.id) {
          await loadGameData(userData.id.toString());
        } else {
          console.error('❌ Нет userId в Telegram данных');
          setError('Ошибка получения данных пользователя Telegram');
          setIsLoading(false);
        }
      } else {
        console.log('⚠️ Telegram WebApp не найден, режим standalone');
        setIsTgApp(false);
        await loadGameData('default');
      }
    };

    const loadGameData = async (userId) => {
      // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА
      if (hasLoadedData || isInitializedRef.current) {
        console.log('⏭️ Данные уже загружены, пропускаем...');
        return;
      }

      console.log('📥 Начинаем загрузку данных для userId:', userId);
      setHasLoadedData(true);
      isInitializedRef.current = true;
      
      try {
        const initialState = await apiClient('/game_state', 'GET', { params: { userId } });
        console.log('📦 Получено состояние с бэкенда:', initialState);

        if (initialState && typeof initialState === 'object') {
          // Основные данные игрока
          setPlayerLevel(Number(initialState.player_level) || 1);
          
          // ИСПРАВЛЕНО: правильно устанавливаем имя
          if (initialState.first_name) {
            setPlayerName(initialState.first_name);
          }
          
          const coinsToSet = Number(initialState.game_coins) || STARTING_COINS;
          setGameCoins(coinsToSet);
          
          setJetCoins(Number(initialState.jet_coins) || 0);
          setCurrentXp(Number(initialState.current_xp) || 10);
          setXpToNextLevel(Number(initialState.xp_to_next_level) || 100);
          setHasCompletedTutorial(Boolean(initialState.has_completed_tutorial));
          
          // Загрузка топливных данных с валидацией
          const loadedFuelCount = Math.min(Math.max(Number(initialState.fuel_count) || 5, 0), 5);
          const loadedLastRaceTime = parseTimestamp(initialState.last_race_time);
          const loadedFuelRefillTime = parseTimestamp(initialState.fuel_refill_time);
          
          console.log('⛽ Загружены данные топлива:', {
            fuel: loadedFuelCount,
            lastRace: loadedLastRaceTime ? new Date(loadedLastRaceTime).toLocaleString() : 'нет',
            refillTime: loadedFuelRefillTime ? new Date(loadedFuelRefillTime).toLocaleString() : 'нет'
          });
          
          // Проверяем восстановление топлива
          const fuelResult = checkAndRestoreFuel(loadedFuelCount, loadedLastRaceTime, loadedFuelRefillTime);
          
          setFuelCount(fuelResult.fuel);
          setLastRaceTime(fuelResult.newLastRaceTime || loadedLastRaceTime);
          setFuelRefillTime(fuelResult.newRefillTime !== undefined ? fuelResult.newRefillTime : loadedFuelRefillTime);
          
          // Если топливо было восстановлено, сохраняем это
          if (fuelResult.shouldUpdate) {
            console.log('⛽ Топливо восстановлено при загрузке!');
            // Отложенное сохранение после полной инициализации
            setTimeout(() => {
              debouncedSave({
                userId,
                fuel_count: 5,
                fuel_refill_time: null,
                last_race_time: new Date(fuelResult.newLastRaceTime).toISOString()
              });
            }, 2000);
          }
          
          // Туториал
          const savedTutorial = Boolean(initialState.has_completed_tutorial);
          if (!savedTutorial && (Number(initialState.player_level) === 1 || !initialState.player_level)) {
            console.log('🎯 Запускаем туториал для нового игрока');
            setTimeout(() => {
              setIsTutorialActive(true);
              setTutorialStep(0);
              setAccumulatedIncome(25);
            }, 1000);
          }

          // Время последнего сбора
          const loadedLastCollectedTime = parseTimestamp(initialState.last_collected_time) || Date.now();
          const loadedLastExitTime = parseTimestamp(initialState.last_exit_time) || loadedLastCollectedTime;
          lastCollectedTimeRef.current = loadedLastCollectedTime;

          // Оффлайн доход
          const now = Date.now();
          const offlineTimeMs = Math.max(0, now - loadedLastExitTime);

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
          
          // Оффлайн доход
          let offlineIncome = 0;
          if (offlineTimeMs > 0 && initialTotalRate > 0) {
            offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600);
          }
          setAccumulatedIncome(Math.max(offlineIncome, 0));
          
        } else {
          console.error('❌ Бэкенд вернул невалидные данные');
          setError('Не удалось получить данные игрока');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки данных:', err.message);
        setError(`Ошибка загрузки: ${err.message}`);
        setIsLoading(false);
      }
      // НЕ устанавливаем setIsLoading(false) здесь - это сделает LoadingScreen
    };

    initializeApp();

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      const userId = getUserId();
      if (userId) {
        apiClient('/game_state', 'POST', {
          body: {
            userId: userId,
            last_exit_time: new Date().toISOString(),
          }
        }).catch(err => console.error('Failed to save last exit time:', err));
      }
    };
  }, []); // ВАЖНО: пустой массив зависимостей!

  // Таймер дохода
  useEffect(() => {
    if (incomeRatePerHour <= 0 || isLoading) {
      return;
    }
    
    const incomePerSecond = incomeRatePerHour / 3600;
    const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
    
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000;
      
      if (!isFinite(timePassedTotalSeconds) || !isFinite(incomePerSecond) || timePassedTotalSeconds < 0) {
        return;
      }
      
      const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
      const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
      
      if (isFinite(newAccumulated) && newAccumulated >= 0) {
        setAccumulatedIncome(newAccumulated);
      }
    }, UPDATE_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [incomeRatePerHour, isLoading]);

  // Обработчики игровых действий
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
    setIsCarSelectorVisible(false);
  }, [selectedCarId, playerCars, buildings, hiredStaff, saveGameState]);

  // Топливные обработчики
  const handleFuelUpdate = useCallback((newFuelCount, newLastRaceTime, newRefillTime = null) => {
    console.log('⛽ Обновление топлива:', {
      fuel: newFuelCount,
      lastRace: newLastRaceTime ? new Date(newLastRaceTime).toLocaleString() : 'нет',
      refillTime: newRefillTime ? new Date(newRefillTime).toLocaleString() : 'нет'
    });
    
    // Валидация данных
    const validFuelCount = Math.min(Math.max(Number(newFuelCount) || 0, 0), 5);
    const validLastRaceTime = Number(newLastRaceTime) || Date.now();
    
    setFuelCount(validFuelCount);
    setLastRaceTime(validLastRaceTime);
    
    const updateData = {
      fuel_count: validFuelCount,
      last_race_time: new Date(validLastRaceTime).toISOString(),
    };
    
    if (newRefillTime !== undefined) {
      updateData.fuel_refill_time = newRefillTime ? new Date(newRefillTime).toISOString() : null;
    }
    
    saveGameState(updateData);
  }, [saveGameState]);

  const handleFuelRefillByAd = useCallback(() => {
    const now = Date.now();
    console.log('📺 Топливо восстановлено за просмотр рекламы');
    
    setFuelCount(5);
    setLastRaceTime(now);
    setFuelRefillTime(null);
    
    saveGameState({
      fuel_count: 5,
      last_race_time: new Date(now).toISOString(),
      fuel_refill_time: null,
    });
  }, [saveGameState]);

  // Остальные обработчики
  const handleReferralRewardUpdate = useCallback((coinsEarned) => {
    if (coinsEarned > 0) {
      const newTotalCoins = gameCoins + coinsEarned;
      setGameCoins(newTotalCoins);
      
      saveGameState({
        game_coins: newTotalCoins,
      });
    }
  }, [gameCoins, saveGameState]);

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

  // UI обработчики
  const handleNavClick = useCallback((screenId) => {
    setIsTuningVisible(false);
    setIsCarSelectorVisible(false);
    setActiveScreen(screenId);
  }, []);

  const handleOpenTuning = useCallback(() => {
    setIsTuningVisible(true);
  }, []);

  const handleCloseTuning = useCallback(() => {
    setIsTuningVisible(false);
  }, []);

  const handleOpenCarSelector = useCallback(() => {
    setIsCarSelectorVisible(true);
  }, []);
  
  const handleCloseCarSelector = useCallback(() => {
    setIsCarSelectorVisible(false);
  }, []);

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
  
  const handleTutorialAction = useCallback((action) => {
    if (action === 'close-tuning') {
      setIsTuningVisible(false);
    }
  }, []);

  const handleShowTutorial = useCallback(() => {
    setIsTutorialActive(true);
    setTutorialStep(0);
  }, []);

  // Вычисляемые значения
  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

  // ПОКАЗ ЗАСТАВКИ ЗАГРУЗКИ
  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  // Рендер ошибки
  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <div className="error-icon">❌</div>
          <div>Ошибка: {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Основной рендер приложения
  return (
    <div className="App">
      <div className="header-container">
        <Header
          level={playerLevel}
          playerName={playerName}
          gameCoins={gameCoins}
          jetCoins={jetCoins}
          xpPercentage={xpPercentage}
          onShowTutorial={handleShowTutorial}
        />
      </div>

      <main className="main-content">
        {activeScreen === 'garage' && currentCar && (
          <MainGameScreen
            car={currentCar}
            incomeRate={incomeRatePerHour}
            accumulatedIncome={accumulatedIncome}
            maxAccumulation={incomeRatePerHour * MAX_OFFLINE_HOURS}
            gameCoins={gameCoins}
            buildings={buildings}
            onCollect={handleCollect}
            onTuneClick={handleOpenTuning}
            onOpenCarSelector={handleOpenCarSelector}
            onBuildingClick={handleBuildingClick}
          />
        )}

        {activeScreen === 'race' && currentCar && (
          <RaceScreen
            playerCar={currentCar}
            onStartRace={handleStartRace}
            onAdReward={handleAdReward}
            fuelCount={fuelCount}
            lastRaceTime={lastRaceTime}
            fuelRefillTime={fuelRefillTime}
            onFuelUpdate={handleFuelUpdate}
            onFuelRefillByAd={handleFuelRefillByAd}
          />
        )}

        {activeScreen === 'shop' && (
          <ShopScreen
            catalog={CAR_CATALOG}
            playerCars={playerCars}
            gameCoins={gameCoins}
            onBuyCar={handleBuyCar}
          />
        )}

        {activeScreen === 'staff' && (
          <StaffScreen
            staffCatalog={STAFF_CATALOG}
            hiredStaff={hiredStaff}
            gameCoins={gameCoins}
            onHireOrUpgrade={handleHireOrUpgradeStaff}
            calculateCost={(staffId) => calculateStaffCost(staffId, hiredStaff)}
          />
        )}

        {activeScreen === 'leaderboard' && (
          <LeaderboardScreen
            tgUserData={tgUserData}
          />
        )}

        {activeScreen === 'friends' && (
          <FriendsScreen
            tgUserData={tgUserData}
            onBalanceUpdate={handleReferralRewardUpdate}
          />
        )}

        {activeScreen === 'p2e' && (
          <div className="placeholder-screen">
            <div className="placeholder-content">
              <div className="placeholder-icon">🎮</div>
              <div className="placeholder-title">Play to Earn</div>
              <div className="placeholder-subtitle">
                Скоро здесь появятся новые возможности!
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Модальные окна */}
      {isTuningVisible && currentCar && (
        <TuningScreen
          car={currentCar}
          gameCoins={gameCoins}
          onClose={handleCloseTuning}
          onUpgrade={handleUpgradePart}
        />
      )}

      {isCarSelectorVisible && (
        <CarSelector
          playerCars={playerCars}
          selectedCarId={selectedCarId}
          onSelectCar={handleSelectCar}
          onClose={handleCloseCarSelector}
        />
      )}

      {/* Навигация */}
      <NavBar
        activeScreen={activeScreen}
        onScreenChange={handleNavClick}
      />
      
      {/* Туториал */}
      <Tutorial
        isActive={isTutorialActive}
        currentStep={tutorialStep}
        onNext={handleTutorialNext}
        onComplete={handleTutorialComplete}
        onAction={handleTutorialAction}
        gameState={{
          gameCoins,
          incomeRate: incomeRatePerHour,
          accumulatedIncome
        }}
      />
    </div>
  );
}

export default App; undefined) {
      setFuelRefillTime(newRefillTime ? Number(newRefillTime) : null);
    }
    
    const updateData = {
      fuel_count: validFuelCount,
      last_race_time: new Date(validLastRaceTime).toISOString(),
    };
    
    if (newRefillTime !==