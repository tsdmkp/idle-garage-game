import { useState, useEffect, useCallback } from 'react';

export const useFuelSystem = (saveHook, sendHapticFeedback) => {
  const [fuelCount, setFuelCount] = useState(5);
  const [lastRaceTime, setLastRaceTime] = useState(null);
  const [fuelRefillTime, setFuelRefillTime] = useState(null);

  // Создаем объект состояния топлива для передачи в saveHook
  const fuelState = {
    fuelCount,
    lastRaceTime,
    fuelRefillTime,
    setFuelCount,
    setLastRaceTime,
    setFuelRefillTime,
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

  // Функция инициализации топливной системы из загруженных данных
  const initializeFuelSystem = useCallback((initialState) => {
    console.log('⛽ Инициализация топливной системы...');
    
    // Загрузка топливных данных с валидацией
    const parseTimestamp = (dateString) => {
      if (!dateString) return null;
      const timestamp = new Date(dateString).getTime();
      return isNaN(timestamp) ? null : timestamp;
    };

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
        saveFuelData({
          fuel_count: 5,
          fuel_refill_time: null,
          last_race_time: new Date(fuelResult.newLastRaceTime).toISOString()
        });
      }, 2000);
    }

    return fuelResult;
  }, [checkAndRestoreFuel]);

  // Функция сохранения топливных данных
  const saveFuelData = useCallback(async (updates = {}) => {
    if (!saveHook?.saveFuelData) {
      console.warn('⚠️ saveHook.saveFuelData недоступен');
      return;
    }

    try {
      await saveHook.saveFuelData(fuelState, updates);
    } catch (err) {
      console.error('❌ Ошибка сохранения топлива:', err);
    }
  }, [saveHook, fuelState]);

  // Обработчик обновления топлива
  const handleFuelUpdate = useCallback((newFuelCount, newLastRaceTime, newRefillTime = null) => {
    console.log('⛽ Обновление топлива:', {
      fuel: newFuelCount,
      lastRace: newLastRaceTime ? new Date(newLastRaceTime).toLocaleString() : 'нет',
      refillTime: newRefillTime ? new Date(newRefillTime).toLocaleString() : 'нет'
    });
    
    const validFuelCount = Math.min(Math.max(Number(newFuelCount) || 0, 0), 5);
    const validLastRaceTime = Number(newLastRaceTime) || Date.now();
    
    setFuelCount(validFuelCount);
    setLastRaceTime(validLastRaceTime);
    
    if (newRefillTime !== undefined) {
      setFuelRefillTime(newRefillTime ? Number(newRefillTime) : null);
    }
    
    const updateData = {
      fuel_count: validFuelCount,
      last_race_time: new Date(validLastRaceTime).toISOString(),
    };
    
    if (newRefillTime !== undefined) {
      updateData.fuel_refill_time = newRefillTime ? new Date(newRefillTime).toISOString() : null;
    }
    
    saveFuelData(updateData);
  }, [saveFuelData]);

  // Обработчик восстановления топлива за просмотр рекламы
  const handleFuelRefillByAd = useCallback(() => {
    const now = Date.now();
    console.log('📺 Топливо восстановлено за просмотр рекламы');
    
    setFuelCount(5);
    setLastRaceTime(now);
    setFuelRefillTime(null);
    
    // Haptic feedback для успешного действия
    if (sendHapticFeedback) {
      sendHapticFeedback('success');
    }
    
    saveFuelData({
      fuel_count: 5,
      last_race_time: new Date(now).toISOString(),
      fuel_refill_time: null,
    });
  }, [saveFuelData, sendHapticFeedback]);

  // Функция потребления топлива (для гонок)
  const consumeFuel = useCallback((amount = 1) => {
    if (fuelCount <= 0) {
      console.warn('⚠️ Нет топлива для потребления');
      return false;
    }
    
    const newFuelCount = Math.max(0, fuelCount - amount);
    const now = Date.now();
    
    setFuelCount(newFuelCount);
    setLastRaceTime(now);
    
    // Если топливо закончилось, устанавливаем время восстановления
    if (newFuelCount === 0) {
      const refillTime = now + (60 * 60 * 1000); // 1 час
      setFuelRefillTime(refillTime);
      
      saveFuelData({
        fuel_count: newFuelCount,
        last_race_time: new Date(now).toISOString(),
        fuel_refill_time: new Date(refillTime).toISOString(),
      });
    } else {
      saveFuelData({
        fuel_count: newFuelCount,
        last_race_time: new Date(now).toISOString(),
      });
    }
    
    console.log(`⛽ Потрачено ${amount} топлива. Осталось: ${newFuelCount}`);
    return true;
  }, [fuelCount, saveFuelData]);

  // Функция проверки возможности заправки
  const canRefillFuel = useCallback(() => {
    if (fuelCount >= 5) return false;
    
    const now = Date.now();
    
    // Проверяем естественное восстановление
    if (fuelRefillTime && now >= fuelRefillTime) {
      return 'natural'; // Естественное восстановление
    }
    
    // Проверяем восстановление по времени последней гонки
    if (lastRaceTime && now >= (lastRaceTime + (60 * 60 * 1000))) {
      return 'natural';
    }
    
    return 'ad'; // Только за рекламу
  }, [fuelCount, fuelRefillTime, lastRaceTime]);

  // Функция получения времени до восстановления
  const getTimeToRefill = useCallback(() => {
    if (fuelCount >= 5) return 0;
    
    const now = Date.now();
    let targetTime = null;
    
    if (fuelRefillTime) {
      targetTime = fuelRefillTime;
    } else if (lastRaceTime) {
      targetTime = lastRaceTime + (60 * 60 * 1000);
    }
    
    if (targetTime) {
      const timeLeft = Math.max(0, targetTime - now);
      return timeLeft;
    }
    
    return 0;
  }, [fuelCount, fuelRefillTime, lastRaceTime]);

  // Функция форматирования времени восстановления
  const formatRefillTime = useCallback(() => {
    const timeLeft = getTimeToRefill();
    
    if (timeLeft <= 0) return null;
    
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, [getTimeToRefill]);

  // Функция проверки достаточности топлива
  const hasFuel = useCallback((amount = 1) => {
    return fuelCount >= amount;
  }, [fuelCount]);

  // Функция получения индикатора топлива для UI
  const getFuelIndicator = useCallback(() => {
    const tanks = [];
    for (let i = 0; i < 5; i++) {
      tanks.push({
        id: i,
        isFull: i < fuelCount,
        isEmpty: i >= fuelCount
      });
    }
    return tanks;
  }, [fuelCount]);

  // Автоматическая проверка восстановления топлива каждую минуту
  useEffect(() => {
    if (fuelCount >= 5) return;
    
    const checkInterval = setInterval(() => {
      const refillType = canRefillFuel();
      
      if (refillType === 'natural') {
        console.log('⛽ Автоматическое восстановление топлива');
        const now = Date.now();
        
        setFuelCount(5);
        setLastRaceTime(now);
        setFuelRefillTime(null);
        
        saveFuelData({
          fuel_count: 5,
          last_race_time: new Date(now).toISOString(),
          fuel_refill_time: null,
        });
      }
    }, 60000); // Проверяем каждую минуту
    
    return () => clearInterval(checkInterval);
  }, [fuelCount, canRefillFuel, saveFuelData]);

  // Функция полного сброса топливной системы (для отладки)
  const resetFuelSystem = useCallback(() => {
    console.log('🔄 Сброс топливной системы');
    
    setFuelCount(5);
    setLastRaceTime(null);
    setFuelRefillTime(null);
    
    saveFuelData({
      fuel_count: 5,
      last_race_time: null,
      fuel_refill_time: null,
    });
  }, [saveFuelData]);

  return {
    // Состояния
    fuelCount,
    lastRaceTime,
    fuelRefillTime,
    fuelState, // Для передачи в другие хуки
    
    // Основные функции
    initializeFuelSystem,
    handleFuelUpdate,
    handleFuelRefillByAd,
    consumeFuel,
    checkAndRestoreFuel,
    
    // Проверочные функции
    canRefillFuel,
    hasFuel,
    getTimeToRefill,
    formatRefillTime,
    getFuelIndicator,
    
    // Служебные функции
    saveFuelData,
    resetFuelSystem,
    
    // Сеттеры (для прямого управления, если нужно)
    setFuelCount,
    setLastRaceTime,
    setFuelRefillTime,
  };
};