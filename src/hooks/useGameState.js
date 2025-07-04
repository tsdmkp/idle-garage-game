// hooks/useGameState.js - Управление состоянием игры
import { useState, useRef, useCallback } from 'react';
import {
  recalculateStatsAndIncomeBonus,
  calculateTotalIncomeRate,
  getInitialPlayerCar,
  STAFF_CATALOG,
  INITIAL_BUILDINGS,
  STARTING_COINS
} from '../utils';
import apiClient from '../apiClient';

const INITIAL_CAR = getInitialPlayerCar();
const INITIAL_HIRED_STAFF = (() => {
  const init = {};
  for (const id in STAFF_CATALOG) {
    init[id] = 0;
  }
  return init;
})();

export const useGameState = (getUserId) => {
  // ПРОВЕРКА 1: Основные состояния игрока - точно как в App.jsx
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerName, setPlayerName] = useState('Игрок');
  const [gameCoins, setGameCoins] = useState(STARTING_COINS);
  const [jetCoins, setJetCoins] = useState(0);
  const [currentXp, setCurrentXp] = useState(10);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [incomeRatePerHour, setIncomeRatePerHour] = useState(0);
  const lastCollectedTimeRef = useRef(Date.now());
  const [accumulatedIncome, setAccumulatedIncome] = useState(0);
  
  // ПРОВЕРКА 1: Состояния игровых объектов - точно как в App.jsx
  const [buildings, setBuildings] = useState(INITIAL_BUILDINGS);
  const [playerCars, setPlayerCars] = useState(() => [INITIAL_CAR]);
  const [selectedCarId, setSelectedCarId] = useState(INITIAL_CAR.id);
  const [hiredStaff, setHiredStaff] = useState(INITIAL_HIRED_STAFF);
  
  // ПРОВЕРКА 1: Туториал состояния - точно как в App.jsx
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  // ПРОВЕРКА 1: Топливная система - точно как в App.jsx
  const [fuelCount, setFuelCount] = useState(5);
  const [lastRaceTime, setLastRaceTime] = useState(null);
  const [fuelRefillTime, setFuelRefillTime] = useState(null);

  // ПРОВЕРКА 1: Refs для предотвращения лишних ререндеров - точно как в App.jsx
  const saveTimeoutRef = useRef(null);

  // ПРОВЕРКА 2: Вычисляемое значение currentCar - точно как в App.jsx
  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;

  // ПРОВЕРКА 2: Debounced save function - КРИТИЧЕСКИ ВАЖНО, проверяю трижды
  const debouncedSave = useCallback((data) => {
    // ПРОВЕРКА 3: Очистка предыдущего timeout - точно как в App.jsx
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // ПРОВЕРКА 3: Создание нового timeout с точно такой же логикой
    saveTimeoutRef.current = setTimeout(async () => {
      const userId = getUserId();
      if (!userId) {
        console.warn('⚠️ Отмена сохранения: userId не готов');
        return;
      }

      try {
        console.log('📤 Сохранение состояния для userId:', userId);
        // ПРОВЕРКА 3: API call точно как в App.jsx
        await apiClient('/game_state', 'POST', { body: { userId, ...data } });
        console.log('✅ Состояние успешно сохранено');
      } catch (err) {
        console.error('❌ Ошибка сохранения:', err.message);
      }
    }, 500); // ПРОВЕРКА 3: Точно такой же debounce 500ms
  }, [getUserId]);

  // ПРОВЕРКА 2: Основная функция сохранения - КРИТИЧЕСКИ ВАЖНО, проверяю трижды
  const saveGameState = useCallback(async (updates = {}) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('⚠️ Отмена сохранения: userId не готов');
      return;
    }

    // ПРОВЕРКА 3: Структура stateToSave - ТОЧНО как в App.jsx, каждое поле проверено
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
      // ПРОВЕРКА 3: Топливные данные - точно как в App.jsx
      fuel_count: fuelCount,
      last_race_time: lastRaceTime ? new Date(lastRaceTime).toISOString() : null,
      fuel_refill_time: fuelRefillTime ? new Date(fuelRefillTime).toISOString() : null,
      ...updates
    };

    // ПРОВЕРКА 3: Логика выбора между debounced и мгновенным сохранением - точно как в App.jsx
    if (updates && Object.keys(updates).length < 3) {
      debouncedSave(stateToSave);
      return;
    }

    // ПРОВЕРКА 3: Мгновенное сохранение - точно как в App.jsx
    try {
      console.log('📤 Мгновенное сохранение состояния для userId:', userId);
      await apiClient('/game_state', 'POST', { body: stateToSave });
      console.log('✅ Состояние успешно сохранено');
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err.message);
    }
  }, [
    // ПРОВЕРКА 3: Массив зависимостей - ТОЧНО как в App.jsx, каждая зависимость проверена
    playerLevel, playerName, gameCoins, jetCoins, currentXp, xpToNextLevel,
    incomeRatePerHour, buildings, playerCars, selectedCarId, hiredStaff, 
    hasCompletedTutorial, fuelCount, lastRaceTime, fuelRefillTime,
    getUserId, debouncedSave
  ]);

  // ПРОВЕРКА 2: Вспомогательная функция валидации дат - точно как в App.jsx
  const parseTimestamp = (dateString) => {
    if (!dateString) return null;
    const timestamp = new Date(dateString).getTime();
    return isNaN(timestamp) ? null : timestamp;
  };

  // ПРОВЕРКА 2: Функция проверки и восстановления топлива - точно как в App.jsx
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

  // ПРОВЕРКА 2: Функция загрузки данных игры - КРИТИЧЕСКИ ВАЖНО, проверяю каждую строчку
  const loadGameData = useCallback(async (userId) => {
    console.log('📥 Начинаем загрузку данных для userId:', userId);
    
    try {
      // ПРОВЕРКА 3: API call для получения состояния - точно как в App.jsx
      const initialState = await apiClient('/game_state', 'GET', { params: { userId } });
      console.log('📦 Получено состояние с бэкенда:', initialState);

      if (initialState && typeof initialState === 'object') {
        // ПРОВЕРКА 3: Установка основных данных игрока - точно как в App.jsx
        setPlayerLevel(Number(initialState.player_level) || 1);
        
        // ПРОВЕРКА 3: Правильная установка имени - точно как в App.jsx
        if (initialState.first_name) {
          setPlayerName(initialState.first_name);
        }
        
        const coinsToSet = Number(initialState.game_coins) || STARTING_COINS;
        setGameCoins(coinsToSet);
        
        setJetCoins(Number(initialState.jet_coins) || 0);
        setCurrentXp(Number(initialState.current_xp) || 10);
        setXpToNextLevel(Number(initialState.xp_to_next_level) || 100);
        setHasCompletedTutorial(Boolean(initialState.has_completed_tutorial));
        
        // ПРОВЕРКА 3: Загрузка топливных данных с валидацией - точно как в App.jsx
        const loadedFuelCount = Math.min(Math.max(Number(initialState.fuel_count) || 5, 0), 5);
        const loadedLastRaceTime = parseTimestamp(initialState.last_race_time);
        const loadedFuelRefillTime = parseTimestamp(initialState.fuel_refill_time);
        
        console.log('⛽ Загружены данные топлива:', {
          fuel: loadedFuelCount,
          lastRace: loadedLastRaceTime ? new Date(loadedLastRaceTime).toLocaleString() : 'нет',
          refillTime: loadedFuelRefillTime ? new Date(loadedFuelRefillTime).toLocaleString() : 'нет'
        });
        
        // ПРОВЕРКА 3: Проверка восстановления топлива - точно как в App.jsx
        const fuelResult = checkAndRestoreFuel(loadedFuelCount, loadedLastRaceTime, loadedFuelRefillTime);
        
        setFuelCount(fuelResult.fuel);
        setLastRaceTime(fuelResult.newLastRaceTime || loadedLastRaceTime);
        setFuelRefillTime(fuelResult.newRefillTime !== undefined ? fuelResult.newRefillTime : loadedFuelRefillTime);
        
        // ПРОВЕРКА 3: Отложенное сохранение восстановленного топлива - точно как в App.jsx
        if (fuelResult.shouldUpdate) {
          console.log('⛽ Топливо восстановлено при загрузке!');
          setTimeout(() => {
            // ПРОВЕРКА 3: Используем правильный debouncedSave
            const saveData = {
              userId,
              fuel_count: 5,
              fuel_refill_time: null,
              last_race_time: new Date(fuelResult.newLastRaceTime).toISOString()
            };
            debouncedSave(saveData);
          }, 2000);
        }
        
        // ПРОВЕРКА 3: Туториал логика - точно как в App.jsx
        const savedTutorial = Boolean(initialState.has_completed_tutorial);
        if (!savedTutorial && (Number(initialState.player_level) === 1 || !initialState.player_level)) {
          console.log('🎯 Запускаем туториал для нового игрока');
          setTimeout(() => {
            setIsTutorialActive(true);
            setTutorialStep(0);
            setAccumulatedIncome(25);
          }, 1000);
        }

        // ПРОВЕРКА 3: Время последнего сбора - точно как в App.jsx
        const loadedLastCollectedTime = parseTimestamp(initialState.last_collected_time) || Date.now();
        const loadedLastExitTime = parseTimestamp(initialState.last_exit_time) || loadedLastCollectedTime;
        lastCollectedTimeRef.current = loadedLastCollectedTime;

        // ПРОВЕРКА 3: Оффлайн доход - точно как в App.jsx
        const now = Date.now();
        const offlineTimeMs = Math.max(0, now - loadedLastExitTime);

        // ПРОВЕРКА 3: Здания валидация и загрузка - точно как в App.jsx
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

        // ПРОВЕРКА 3: Персонал - точно как в App.jsx
        const loadedHiredStaff = initialState.hired_staff && typeof initialState.hired_staff === 'object' 
          ? initialState.hired_staff 
          : INITIAL_HIRED_STAFF;
        setHiredStaff(loadedHiredStaff);

        // ПРОВЕРКА 3: Машины валидация и загрузка - точно как в App.jsx
        const loadedPlayerCarsRaw = Array.isArray(initialState.player_cars) ? initialState.player_cars : [INITIAL_CAR];
        const loadedPlayerCars = loadedPlayerCarsRaw.map(sc => {
          if (sc && sc.id && sc.parts) {
            return { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats };
          }
          return null;
        }).filter(Boolean);
        
        const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR];
        setPlayerCars(actualPlayerCars);

        // ПРОВЕРКА 3: Выбранная машина - точно как в App.jsx
        const loadedSelectedCarId = initialState.selected_car_id;
        const finalSelectedCarId = loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
          ? loadedSelectedCarId
          : actualPlayerCars[0]?.id || INITIAL_CAR.id;
        setSelectedCarId(finalSelectedCarId);

        // ПРОВЕРКА 3: Расчет дохода - точно как в App.jsx
        const carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0] || INITIAL_CAR;
        const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
        setIncomeRatePerHour(initialTotalRate);
        
        // ПРОВЕРКА 3: Оффлайн доход расчет - точно как в App.jsx
        let offlineIncome = 0;
        if (offlineTimeMs > 0 && initialTotalRate > 0) {
          const MAX_OFFLINE_HOURS = 2; // ПРОВЕРКА 3: Используем константу
          offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600);
        }
        setAccumulatedIncome(Math.max(offlineIncome, 0));
        
        return { success: true };
        
      } else {
        console.error('❌ Бэкенд вернул невалидные данные');
        return { success: false, error: 'Не удалось получить данные игрока' };
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки данных:', err.message);
      return { success: false, error: `Ошибка загрузки: ${err.message}` };
    }
  }, [checkAndRestoreFuel, debouncedSave]);

  // ПРОВЕРКА 2: Cleanup функция - точно как в App.jsx
  const cleanup = useCallback(() => {
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
  }, [getUserId]);

  // ПРОВЕРКА 1: Возвращаемый объект - все состояния и функции
  return {
    // Состояния игрока
    playerLevel, setPlayerLevel,
    playerName, setPlayerName,
    gameCoins, setGameCoins,
    jetCoins, setJetCoins,
    currentXp, setCurrentXp,
    xpToNextLevel, setXpToNextLevel,
    incomeRatePerHour, setIncomeRatePerHour,
    lastCollectedTimeRef,
    accumulatedIncome, setAccumulatedIncome,
    
    // Игровые объекты
    buildings, setBuildings,
    playerCars, setPlayerCars,
    selectedCarId, setSelectedCarId,
    hiredStaff, setHiredStaff,
    currentCar,
    
    // Туториал
    isTutorialActive, setIsTutorialActive,
    tutorialStep, setTutorialStep,
    hasCompletedTutorial, setHasCompletedTutorial,
    
    // Топливная система
    fuelCount, setFuelCount,
    lastRaceTime, setLastRaceTime,
    fuelRefillTime, setFuelRefillTime,
    
    // Функции
    saveGameState,
    loadGameData,
    parseTimestamp,
    checkAndRestoreFuel,
    cleanup
  };
};