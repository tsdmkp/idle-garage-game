import { useRef, useCallback } from 'react';
import apiClient from '../apiClient';
import { MAX_OFFLINE_HOURS } from '../utils';

export const useGameSave = (getUserId) => {
  const saveTimeoutRef = useRef(null);

  // Вспомогательная функция валидации дат
  const parseTimestamp = useCallback((dateString) => {
    if (!dateString) return null;
    const timestamp = new Date(dateString).getTime();
    return isNaN(timestamp) ? null : timestamp;
  }, []);

  // ✅ НОВАЯ ФУНКЦИЯ - API запрос с retry логикой
  const apiRequestWithRetry = useCallback(async (endpoint, method = 'GET', options = {}, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 API запрос ${method} ${endpoint} (попытка ${attempt}/${maxRetries})`);
        
        const result = await apiClient(endpoint, method, options);
        
        console.log(`✅ API запрос успешен (попытка ${attempt})`);
        return { success: true, data: result };
        
      } catch (error) {
        console.log(`❌ API ошибка (попытка ${attempt}):`, error.message);
        
        // Проверяем тип ошибки
        const isNetworkError = error.message.includes('ERR_CONNECTION_RESET') || 
                              error.message.includes('Failed to fetch') ||
                              error.message.includes('Network Error');
        
        if (isNetworkError) {
          console.log('🐌 Сетевая ошибка - вероятно сервер "спит"');
        }
        
        if (attempt === maxRetries) {
          console.log(`🚨 Все попытки API запроса исчерпаны`);
          return { 
            success: false, 
            error: error.message,
            isNetworkError 
          };
        }
        
        // Прогрессивная задержка: 1с, 2с, 4с
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Ожидание ${delay/1000}с перед следующей попыткой...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

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
        const result = await apiRequestWithRetry('/game_state', 'POST', { body: { userId, ...data } }, 2);
        
        if (result.success) {
          console.log('✅ Состояние успешно сохранено');
        } else {
          console.error('❌ Ошибка сохранения после retry:', result.error);
        }
      } catch (err) {
        console.error('❌ Критическая ошибка сохранения:', err.message);
      }
    }, 500); // 500ms debounce
  }, [getUserId, apiRequestWithRetry]);

  // Основная функция сохранения состояния
  const saveGameState = useCallback(async (gameState, fuelState, updates = {}) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('⚠️ Отмена сохранения: userId не готов');
      return;
    }

    const stateToSave = {
      userId: userId,
      player_level: gameState.playerLevel,
      first_name: gameState.playerName,
      game_coins: gameState.gameCoins,
      jet_coins: gameState.jetCoins,
      current_xp: gameState.currentXp,
      xp_to_next_level: gameState.xpToNextLevel,
      income_rate_per_hour: gameState.incomeRatePerHour,
      last_collected_time: new Date(gameState.lastCollectedTimeRef.current).toISOString(),
      buildings: gameState.buildings,
      player_cars: gameState.playerCars,
      selected_car_id: gameState.selectedCarId,
      hired_staff: gameState.hiredStaff,
      has_completed_tutorial: gameState.hasCompletedTutorial,
      last_exit_time: new Date().toISOString(),
      // Топливные данные
      fuel_count: fuelState.fuelCount,
      last_race_time: fuelState.lastRaceTime ? new Date(fuelState.lastRaceTime).toISOString() : null,
      fuel_refill_time: fuelState.fuelRefillTime ? new Date(fuelState.fuelRefillTime).toISOString() : null,
      ...updates
    };

    // Используем debounced save для неважных обновлений
    if (updates && Object.keys(updates).length < 3) {
      debouncedSave(stateToSave);
      return;
    }

    // Мгновенное сохранение для важных действий с retry
    const result = await apiRequestWithRetry('/game_state', 'POST', { body: stateToSave }, 2);
    
    if (result.success) {
      console.log('✅ Состояние успешно сохранено');
    } else {
      console.error('❌ Ошибка сохранения после retry:', result.error);
    }
  }, [getUserId, debouncedSave, apiRequestWithRetry]);

  // ✅ УЛУЧШЕННАЯ функция загрузки данных игры с retry логикой
  const loadGameData = useCallback(async (userId, gameState, fuelState, checkAndRestoreFuel) => {
    console.log('📥 Начинаем загрузку данных для userId:', userId);
    
    // Используем новую функцию с retry
    const result = await apiRequestWithRetry('/game_state', 'GET', { params: { userId } }, 3);
    
    if (!result.success) {
      console.error('❌ Не удалось загрузить данные после всех попыток:', result.error);
      
      // Если сетевая ошибка - возвращаем специальный статус
      if (result.isNetworkError) {
        return { 
          success: false, 
          error: result.error,
          isNetworkError: true,
          useDefaults: true
        };
      }
      
      return { success: false, error: result.error };
    }

    const initialState = result.data;
    console.log('📦 Получено состояние с бэкенда:', initialState);

    if (initialState && typeof initialState === 'object') {
      // Инициализируем игровое состояние
      const { incomeRate } = gameState.initializeGameState(initialState);
      
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
      
      fuelState.setFuelCount(fuelResult.fuel);
      fuelState.setLastRaceTime(fuelResult.newLastRaceTime || loadedLastRaceTime);
      fuelState.setFuelRefillTime(fuelResult.newRefillTime !== undefined ? fuelResult.newRefillTime : loadedFuelRefillTime);
      
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
          gameState.setIsTutorialActive(true);
          gameState.setTutorialStep(0);
          gameState.setAccumulatedIncome(25);
        }, 1000);
      }

      // Время последнего сбора
      const loadedLastCollectedTime = parseTimestamp(initialState.last_collected_time) || Date.now();
      const loadedLastExitTime = parseTimestamp(initialState.last_exit_time) || loadedLastCollectedTime;
      gameState.updateLastCollectedTime(loadedLastCollectedTime);

      // Оффлайн доход
      const now = Date.now();
      const offlineTimeMs = Math.max(0, now - loadedLastExitTime);
      
      let offlineIncome = 0;
      if (offlineTimeMs > 0 && incomeRate > 0) {
        offlineIncome = (incomeRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600);
        
        if (offlineIncome > 0) {
          console.log(`💰 Оффлайн доход: ${Math.floor(offlineIncome)} монет за ${(offlineTimeMs/1000/3600).toFixed(1)}ч`);
        }
      }
      gameState.setAccumulatedIncome(Math.max(offlineIncome, 0));
      
      return { success: true, data: initialState };
      
    } else {
      console.error('❌ Бэкенд вернул невалидные данные');
      return { success: false, error: 'Не удалось получить данные игрока' };
    }
  }, [parseTimestamp, debouncedSave, apiRequestWithRetry]);

  // ✅ УЛУЧШЕННАЯ функция сохранения времени выхода
  const saveExitTime = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    const result = await apiRequestWithRetry('/game_state', 'POST', {
      body: {
        userId: userId,
        last_exit_time: new Date().toISOString(),
      }
    }, 1); // Только 1 попытка для exit time

    if (result.success) {
      console.log('✅ Время выхода сохранено');
    } else {
      console.error('❌ Ошибка сохранения времени выхода:', result.error);
    }
  }, [getUserId, apiRequestWithRetry]);

  // Функция очистки таймеров сохранения
  const cleanupSaveTimers = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Функция создания сокращенного saveGameState для передачи в другие хуки
  const createSaveFunction = useCallback((gameState, fuelState) => {
    return (updates = {}) => saveGameState(gameState, fuelState, updates);
  }, [saveGameState]);

  // ✅ УЛУЧШЕННАЯ функция сохранения только топливных данных
  const saveFuelData = useCallback(async (fuelState, updates = {}) => {
    const userId = getUserId();
    if (!userId) {
      console.warn('⚠️ Отмена сохранения топлива: userId не готов');
      return;
    }

    const fuelDataToSave = {
      userId,
      fuel_count: fuelState.fuelCount,
      last_race_time: fuelState.lastRaceTime ? new Date(fuelState.lastRaceTime).toISOString() : null,
      fuel_refill_time: fuelState.fuelRefillTime ? new Date(fuelState.fuelRefillTime).toISOString() : null,
      ...updates
    };

    const result = await apiRequestWithRetry('/game_state', 'POST', { body: fuelDataToSave }, 2);
    
    if (result.success) {
      console.log('✅ Данные топлива сохранены');
    } else {
      console.error('❌ Ошибка сохранения топлива:', result.error);
    }
  }, [getUserId, apiRequestWithRetry]);

  // Функция валидации загруженных данных
  const validateLoadedData = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Невалидные данные' };
    }

    // Проверяем обязательные поля
    const requiredFields = ['player_level', 'game_coins'];
    for (const field of requiredFields) {
      if (data[field] === undefined) {
        console.warn(`⚠️ Отсутствует обязательное поле: ${field}`);
      }
    }

    // Проверяем валидность массивов
    if (data.buildings && !Array.isArray(data.buildings)) {
      console.warn('⚠️ buildings не является массивом');
      data.buildings = null;
    }

    if (data.player_cars && !Array.isArray(data.player_cars)) {
      console.warn('⚠️ player_cars не является массивом');
      data.player_cars = null;
    }

    // Проверяем валидность чисел
    const numericFields = ['player_level', 'game_coins', 'jet_coins', 'current_xp', 'xp_to_next_level', 'income_rate_per_hour', 'fuel_count'];
    numericFields.forEach(field => {
      if (data[field] !== undefined && (isNaN(Number(data[field])) || !isFinite(Number(data[field])))) {
        console.warn(`⚠️ Невалидное числовое поле ${field}: ${data[field]}`);
        data[field] = 0;
      }
    });

    return { isValid: true, data };
  }, []);

  // Функция создания резервной копии данных
  const createBackup = useCallback(async (gameState, fuelState) => {
    const userId = getUserId();
    if (!userId) return null;

    const backupData = {
      timestamp: new Date().toISOString(),
      userId,
      gameState: {
        playerLevel: gameState.playerLevel,
        playerName: gameState.playerName,
        gameCoins: gameState.gameCoins,
        jetCoins: gameState.jetCoins,
        currentXp: gameState.currentXp,
        xpToNextLevel: gameState.xpToNextLevel,
        incomeRatePerHour: gameState.incomeRatePerHour,
        buildings: gameState.buildings,
        playerCars: gameState.playerCars,
        selectedCarId: gameState.selectedCarId,
        hiredStaff: gameState.hiredStaff,
        hasCompletedTutorial: gameState.hasCompletedTutorial,
      },
      fuelState: {
        fuelCount: fuelState.fuelCount,
        lastRaceTime: fuelState.lastRaceTime,
        fuelRefillTime: fuelState.fuelRefillTime,
      }
    };

    try {
      // Сохраняем в localStorage для локального бэкапа
      localStorage.setItem(`gameBackup_${userId}`, JSON.stringify(backupData));
      console.log('💾 Резервная копия создана локально');
      return backupData;
    } catch (err) {
      console.error('❌ Ошибка создания резервной копии:', err.message);
      return null;
    }
  }, [getUserId]);

  return {
    // Основные функции
    saveGameState,
    loadGameData,
    saveFuelData,
    saveExitTime,
    
    // ✅ НОВАЯ функция с retry логикой
    apiRequestWithRetry,
    
    // Вспомогательные функции
    parseTimestamp,
    validateLoadedData,
    createBackup,
    cleanupSaveTimers,
    createSaveFunction,
    
    // Служебные функции
    debouncedSave,
    
    // Refs
    saveTimeoutRef,
  };
};