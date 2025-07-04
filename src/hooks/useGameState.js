// hooks/useGameState.js - Управление состоянием игры с useFuelSystem
import { useState, useRef, useCallback } from 'react';
import { useFuelSystem } from './useFuelSystem'; // ✅ НОВЫЙ ИМПОРТ
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
  // ПРОВЕРКА 1: Основные состояния игрока - точно как раньше
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerName, setPlayerName] = useState('Игрок');
  const [gameCoins, setGameCoins] = useState(STARTING_COINS);
  const [jetCoins, setJetCoins] = useState(0);
  const [currentXp, setCurrentXp] = useState(10);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [incomeRatePerHour, setIncomeRatePerHour] = useState(0);
  const lastCollectedTimeRef = useRef(Date.now());
  const [accumulatedIncome, setAccumulatedIncome] = useState(0);
  
  // ПРОВЕРКА 1: Состояния игровых объектов - точно как раньше
  const [buildings, setBuildings] = useState(INITIAL_BUILDINGS);
  const [playerCars, setPlayerCars] = useState(() => [INITIAL_CAR]);
  const [selectedCarId, setSelectedCarId] = useState(INITIAL_CAR.id);
  const [hiredStaff, setHiredStaff] = useState(INITIAL_HIRED_STAFF);
  
  // ПРОВЕРКА 1: Туториал состояния - точно как раньше
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  // ❌ УБИРАЕМ топливные состояния - теперь они в useFuelSystem
  // const [fuelCount, setFuelCount] = useState(5);
  // const [lastRaceTime, setLastRaceTime] = useState(null);
  // const [fuelRefillTime, setFuelRefillTime] = useState(null);

  // ПРОВЕРКА 1: Refs - точно как раньше
  const saveTimeoutRef = useRef(null);

  // ПРОВЕРКА 2: Debounced save function - КРИТИЧЕСКИ ВАЖНО, без изменений
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
    }, 500);
  }, [getUserId]);

  // ✅ ИСПОЛЬЗУЕМ useFuelSystem хук - передаем функцию сохранения
  const fuelSystem = useFuelSystem(debouncedSave);

  // ПРОВЕРКА 2: Основная функция сохранения - КРИТИЧЕСКИ ВАЖНО, обновлена для работы с топливным хуком
  const saveGameState = useCallback(async (updates = {}) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('⚠️ Отмена сохранения: userId не готов');
      return;
    }

    // ПРОВЕРКА 3: Структура stateToSave - ОБНОВЛЕНА для использования топливного хука
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
      // ✅ ТОПЛИВНЫЕ данные теперь берем из хука
      fuel_count: fuelSystem.fuelCount,
      last_race_time: fuelSystem.lastRaceTime ? new Date(fuelSystem.lastRaceTime).toISOString() : null,
      fuel_refill_time: fuelSystem.fuelRefillTime ? new Date(fuelSystem.fuelRefillTime).toISOString() : null,
      ...updates
    };

    // ПРОВЕРКА 3: Логика выбора сохранения - без изменений
    if (updates && Object.keys(updates).length < 3) {
      debouncedSave(stateToSave);
      return;
    }

    // ПРОВЕРКА 3: Мгновенное сохранение - без изменений
    try {
      console.log('📤 Мгновенное сохранение состояния для userId:', userId);
      await apiClient('/game_state', 'POST', { body: stateToSave });
      console.log('✅ Состояние успешно сохранено');
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err.message);
    }
  }, [
    // ПРОВЕРКА 3: Массив зависимостей - ОБНОВЛЕН для работы с топливным хуком
    playerLevel, playerName, gameCoins, jetCoins, currentXp, xpToNextLevel,
    incomeRatePerHour, buildings, playerCars, selectedCarId, hiredStaff, 
    hasCompletedTutorial, 
    fuelSystem.fuelCount, fuelSystem.lastRaceTime, fuelSystem.fuelRefillTime, // ✅ Топливные зависимости из хука
    getUserId, debouncedSave
  ]);

  // ПРОВЕРКА 2: Вычисляемое значение currentCar - без изменений
  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;

  // ПРОВЕРКА 2: Вспомогательная функция валидации дат - без изменений
  const parseTimestamp = (dateString) => {
    if (!dateString) return null;
    const timestamp = new Date(dateString).getTime();
    return isNaN(timestamp) ? null : timestamp;
  };

  // ❌ УБИРАЕМ checkAndRestoreFuel - теперь в useFuelSystem

  // ПРОВЕРКА 2: Функция загрузки данных игры - ОБНОВЛЕНА для работы с топливным хуком
  const loadGameData = useCallback(async (userId) => {
    console.log('📥 Начинаем загрузку данных для userId:', userId);
    
    try {
      const initialState = await apiClient('/game_state', 'GET', { params: { userId } });
      console.log('📦 Получено состояние с бэкенда:', initialState);

      if (initialState && typeof initialState === 'object') {
        // ПРОВЕРКА 3: Установка основных данных игрока - без изменений
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
        
        // ✅ ЗАГРУЗКА топливных данных через хук
        fuelSystem.loadFuelData(initialState, debouncedSave, userId);
        
        // ПРОВЕРКА 3: Туториал логика - без изменений
        const savedTutorial = Boolean(initialState.has_completed_tutorial);
        if (!savedTutorial && (Number(initialState.player_level) === 1 || !initialState.player_level)) {
          console.log('🎯 Запускаем туториал для нового игрока');
          setTimeout(() => {
            setIsTutorialActive(true);
            setTutorialStep(0);
            setAccumulatedIncome(25);
          }, 1000);
        }

        // ПРОВЕРКА 3: Время последнего сбора - без изменений
        const loadedLastCollectedTime = parseTimestamp(initialState.last_collected_time) || Date.now();
        const loadedLastExitTime = parseTimestamp(initialState.last_exit_time) || loadedLastCollectedTime;
        lastCollectedTimeRef.current = loadedLastCollectedTime;

        // ПРОВЕРКА 3: Оффлайн доход - без изменений
        const now = Date.now();
        const offlineTimeMs = Math.max(0, now - loadedLastExitTime);

        // ПРОВЕРКА 3: Здания - без изменений
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

        // ПРОВЕРКА 3: Персонал - без изменений
        const loadedHiredStaff = initialState.hired_staff && typeof initialState.hired_staff === 'object' 
          ? initialState.hired_staff 
          : INITIAL_HIRED_STAFF;
        setHiredStaff(loadedHiredStaff);

        // ПРОВЕРКА 3: Машины - без изменений
        const loadedPlayerCarsRaw = Array.isArray(initialState.player_cars) ? initialState.player_cars : [INITIAL_CAR];
        const loadedPlayerCars = loadedPlayerCarsRaw.map(sc => {
          if (sc && sc.id && sc.parts) {
            return { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats };
          }
          return null;
        }).filter(Boolean);
        
        const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR];
        setPlayerCars(actualPlayerCars);

        // ПРОВЕРКА 3: Выбранная машина - без изменений
        const loadedSelectedCarId = initialState.selected_car_id;
        const finalSelectedCarId = loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
          ? loadedSelectedCarId
          : actualPlayerCars[0]?.id || INITIAL_CAR.id;
        setSelectedCarId(finalSelectedCarId);

        // ПРОВЕРКА 3: Расчет дохода - без изменений
        const carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0] || INITIAL_CAR;
        const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
        setIncomeRatePerHour(initialTotalRate);
        
        // ПРОВЕРКА 3: Оффлайн доход расчет - без изменений
        let offlineIncome = 0;
        if (offlineTimeMs > 0 && initialTotalRate > 0) {
          const MAX_OFFLINE_HOURS = 2;
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
  }, [fuelSystem, debouncedSave]); // ✅ Добавили fuelSystem в зависимости

  // ПРОВЕРКА 2: Cleanup функция - без изменений
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

  // ПРОВЕРКА 1: Возвращаемый объект - ОБНОВЛЕН для работы с топливным хуком
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
    
    // ✅ ТОПЛИВНАЯ система - теперь из хука
    fuelSystem,
    
    // Функции
    saveGameState,
    loadGameData,
    parseTimestamp,
    cleanup
  };
};