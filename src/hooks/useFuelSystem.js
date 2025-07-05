// hooks/useFuelSystem.js - Управление топливной системой (ИСПРАВЛЕНО!)
import { useState, useCallback } from 'react';

export const useFuelSystem = (saveGameState) => {
  // ПРОВЕРКА 1: Состояния топливной системы - точно как в useGameState.js
  const [fuelCount, setFuelCount] = useState(5);
  const [lastRaceTime, setLastRaceTime] = useState(null);
  const [fuelRefillTime, setFuelRefillTime] = useState(null);

  // ПРОВЕРКА 2: Функция валидации временных меток - точно как в useGameState.js
  const parseTimestamp = useCallback((dateString) => {
    if (!dateString) return null;
    const timestamp = new Date(dateString).getTime();
    return isNaN(timestamp) ? null : timestamp;
  }, []);

  // 🔥 ИСПРАВЛЕНИЕ: Функция проверки и восстановления топлива - КРИТИЧЕСКИ ВАЖНО!
  const checkAndRestoreFuel = useCallback((currentFuel, lastRace, refillTime) => {
    console.log('🔍 Проверка топлива:', {
      currentFuel,
      lastRace: lastRace ? new Date(lastRace).toLocaleString() : 'нет',
      refillTime: refillTime ? new Date(refillTime).toLocaleString() : 'нет'
    });

    // ✅ ВАЖНО: Если топливо полное - не трогаем
    if (currentFuel >= 5) return { fuel: currentFuel, shouldUpdate: false };
    
    const now = Date.now();
    
    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная логика восстановления
    let timeToCheck = null;
    
    // Если есть время заправки - используем его
    if (refillTime) {
      timeToCheck = refillTime;
    } 
    // Если нет времени заправки, но есть последняя гонка - считаем от неё
    else if (lastRace) {
      timeToCheck = lastRace + (60 * 60 * 1000); // +1 час от последней гонки
    }
    
    console.log('⏰ Время проверки:', timeToCheck ? new Date(timeToCheck).toLocaleString() : 'нет');
    
    // ✅ ВАЖНО: Если время восстановления прошло - восстанавливаем топливо
    if (timeToCheck && now >= timeToCheck) {
      console.log('🎉 ТОПЛИВО ДОЛЖНО БЫТЬ ВОССТАНОВЛЕНО!');
      return { 
        fuel: 5, 
        shouldUpdate: true, 
        newLastRaceTime: now, 
        newRefillTime: null 
      };
    }
    
    // ✅ ДОБАВЛЯЕМ: Если топливо 0 и нет времени заправки - устанавливаем его
    if (currentFuel === 0 && !refillTime && lastRace) {
      const autoRefillTime = lastRace + (60 * 60 * 1000);
      if (now >= autoRefillTime) {
        console.log('🎉 АВТОВОССТАНОВЛЕНИЕ топлива по времени последней гонки!');
        return { 
          fuel: 5, 
          shouldUpdate: true, 
          newLastRaceTime: now, 
          newRefillTime: null 
        };
      } else {
        // Устанавливаем время заправки для корректного отображения таймера
        return {
          fuel: currentFuel,
          shouldUpdate: true,
          newRefillTime: autoRefillTime
        };
      }
    }
    
    return { fuel: currentFuel, shouldUpdate: false };
  }, []);

  // 🔥 ИСПРАВЛЕНИЕ: Функция загрузки топливных данных - КРИТИЧЕСКИ ВАЖНО!
  const loadFuelData = useCallback((initialState, debouncedSave, userId) => {
    console.log('📥 Загрузка топливных данных:', {
      fuel_count: initialState.fuel_count,
      last_race_time: initialState.last_race_time,
      fuel_refill_time: initialState.fuel_refill_time
    });

    // ПРОВЕРКА 3: Загрузка топливных данных с валидацией - точно как в useGameState.js
    const loadedFuelCount = Math.min(Math.max(Number(initialState.fuel_count) || 5, 0), 5);
    const loadedLastRaceTime = parseTimestamp(initialState.last_race_time);
    const loadedFuelRefillTime = parseTimestamp(initialState.fuel_refill_time);
    
    console.log('⛽ Загружены данные топлива:', {
      fuel: loadedFuelCount,
      lastRace: loadedLastRaceTime ? new Date(loadedLastRaceTime).toLocaleString() : 'нет',
      refillTime: loadedFuelRefillTime ? new Date(loadedFuelRefillTime).toLocaleString() : 'нет'
    });
    
    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Обязательная проверка восстановления при загрузке!
    const fuelResult = checkAndRestoreFuel(loadedFuelCount, loadedLastRaceTime, loadedFuelRefillTime);
    
    console.log('🔄 Результат проверки топлива:', fuelResult);
    
    // ✅ Устанавливаем состояние
    setFuelCount(fuelResult.fuel);
    setLastRaceTime(fuelResult.newLastRaceTime || loadedLastRaceTime);
    setFuelRefillTime(fuelResult.newRefillTime !== undefined ? fuelResult.newRefillTime : loadedFuelRefillTime);
    
    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем восстановленное состояние немедленно!
    if (fuelResult.shouldUpdate) {
      console.log('💾 Сохраняем восстановленное топливо!');
      
      // Сохраняем немедленно, без таймаута
      const saveData = {
        userId,
        fuel_count: fuelResult.fuel,
        fuel_refill_time: fuelResult.newRefillTime ? new Date(fuelResult.newRefillTime).toISOString() : null,
        last_race_time: fuelResult.newLastRaceTime ? new Date(fuelResult.newLastRaceTime).toISOString() : 
                       (loadedLastRaceTime ? new Date(loadedLastRaceTime).toISOString() : null)
      };
      
      // Используем немедленное сохранение
      if (saveGameState) {
        saveGameState(saveData);
      } else {
        debouncedSave(saveData);
      }
    }
    
    return {
      fuelCount: fuelResult.fuel,
      lastRaceTime: fuelResult.newLastRaceTime || loadedLastRaceTime,
      fuelRefillTime: fuelResult.newRefillTime !== undefined ? fuelResult.newRefillTime : loadedFuelRefillTime
    };
  }, [parseTimestamp, checkAndRestoreFuel]);

  // ПРОВЕРКА 2: Обработчик обновления топлива - КРИТИЧЕСКИ ВАЖНО, точно как в App.jsx
  const handleFuelUpdate = useCallback((newFuelCount, newLastRaceTime, newRefillTime = null) => {
    console.log('⛽ Обновление топлива:', {
      fuel: newFuelCount,
      lastRace: newLastRaceTime ? new Date(newLastRaceTime).toLocaleString() : 'нет',
      refillTime: newRefillTime ? new Date(newRefillTime).toLocaleString() : 'нет'
    });
    
    // ПРОВЕРКА 3: Валидация данных - точно как в App.jsx
    const validFuelCount = Math.min(Math.max(Number(newFuelCount) || 0, 0), 5);
    const validLastRaceTime = Number(newLastRaceTime) || Date.now();
    
    setFuelCount(validFuelCount);
    setLastRaceTime(validLastRaceTime);
    
    if (newRefillTime !== undefined) {
      setFuelRefillTime(newRefillTime ? Number(newRefillTime) : null);
    }
    
    // ПРОВЕРКА 3: Структура данных для сохранения - точно как в App.jsx
    const updateData = {
      fuel_count: validFuelCount,
      last_race_time: new Date(validLastRaceTime).toISOString(),
    };
    
    if (newRefillTime !== undefined) {
      updateData.fuel_refill_time = newRefillTime ? new Date(newRefillTime).toISOString() : null;
    }
    
    // ПРОВЕРКА 3: Используем переданный saveGameState
    if (saveGameState) {
      saveGameState(updateData);
    }
  }, [saveGameState]);

  // ПРОВЕРКА 2: Обработчик восстановления топлива за рекламу - КРИТИЧЕСКИ ВАЖНО, точно как в App.jsx
  const handleFuelRefillByAd = useCallback(() => {
    const now = Date.now();
    console.log('📺 Топливо восстановлено за просмотр рекламы');
    
    setFuelCount(5);
    setLastRaceTime(now);
    setFuelRefillTime(null);
    
    // ПРОВЕРКА 3: Структура данных для сохранения - точно как в App.jsx
    if (saveGameState) {
      saveGameState({
        fuel_count: 5,
        last_race_time: new Date(now).toISOString(),
        fuel_refill_time: null,
      });
    }
  }, [saveGameState]);

  // ПРОВЕРКА 2: Функция проверки доступности гонки
  const canStartRace = useCallback(() => {
    return fuelCount > 0;
  }, [fuelCount]);

  // ПРОВЕРКА 2: Функция расчета времени до восстановления топлива
  const getTimeUntilRefill = useCallback(() => {
    if (fuelCount >= 5) return 0;
    
    const now = Date.now();
    let refillTime;
    
    if (fuelRefillTime) {
      refillTime = fuelRefillTime;
    } else if (lastRaceTime) {
      refillTime = lastRaceTime + (60 * 60 * 1000); // 1 час
    } else {
      return 0;
    }
    
    const timeRemaining = Math.max(0, refillTime - now);
    return timeRemaining;
  }, [fuelCount, fuelRefillTime, lastRaceTime]);

  // ПРОВЕРКА 2: Функция расчета времени восстановления в человекочитаемом формате
  const getRefillTimeText = useCallback(() => {
    const timeRemaining = getTimeUntilRefill();
    
    if (timeRemaining <= 0) return null;
    
    const minutes = Math.floor(timeRemaining / (60 * 1000));
    const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `0:${seconds.toString().padStart(2, '0')}`;
    }
  }, [getTimeUntilRefill]);

  // 🔥 ИСПРАВЛЕНИЕ: Функция потребления топлива (для гонок) - КРИТИЧЕСКИ ВАЖНА!
  const consumeFuel = useCallback(() => {
    console.log('🏁 Попытка потратить топливо, текущее:', fuelCount);
    
    if (fuelCount > 0) {
      const newFuelCount = fuelCount - 1;
      const now = Date.now();
      
      setFuelCount(newFuelCount);
      setLastRaceTime(now);
      
      console.log('⛽ Топливо потрачено:', {
        старое: fuelCount,
        новое: newFuelCount,
        время: new Date(now).toLocaleString()
      });
      
      // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная логика установки времени заправки
      if (newFuelCount === 0) {
        const refillTime = now + (60 * 60 * 1000); // 1 час
        setFuelRefillTime(refillTime);
        
        console.log('🚨 Топливо закончилось! Время заправки:', new Date(refillTime).toLocaleString());
        
        // ✅ ВАЖНО: Сохраняем немедленно, включая fuel_count = 0!
        if (saveGameState) {
          saveGameState({
            fuel_count: newFuelCount, // 0!
            last_race_time: new Date(now).toISOString(),
            fuel_refill_time: new Date(refillTime).toISOString(),
          });
        }
      } else {
        // Топливо еще есть
        if (saveGameState) {
          saveGameState({
            fuel_count: newFuelCount,
            last_race_time: new Date(now).toISOString(),
          });
        }
      }
      
      return true; // Топливо успешно потрачено
    }
    
    console.log('❌ Нет топлива для гонки!');
    return false; // Топлива нет
  }, [fuelCount, saveGameState]);

  // ПРОВЕРКА 2: Функция форсированного обновления состояния топлива
  const updateFuelState = useCallback((newFuelCount, newLastRaceTime, newRefillTime) => {
    // ПРОВЕРКА 3: Валидация параметров
    const validFuelCount = Math.min(Math.max(Number(newFuelCount) || 0, 0), 5);
    const validLastRaceTime = newLastRaceTime ? Number(newLastRaceTime) : null;
    const validRefillTime = newRefillTime ? Number(newRefillTime) : null;
    
    console.log('🔄 Форсированное обновление топлива:', {
      fuel: validFuelCount,
      lastRace: validLastRaceTime ? new Date(validLastRaceTime).toLocaleString() : 'нет',
      refillTime: validRefillTime ? new Date(validRefillTime).toLocaleString() : 'нет'
    });
    
    setFuelCount(validFuelCount);
    setLastRaceTime(validLastRaceTime);
    setFuelRefillTime(validRefillTime);
  }, []);

  // ПРОВЕРКА 1: Возвращаемый объект - все состояния и функции
  return {
    // Состояния
    fuelCount,
    lastRaceTime, 
    fuelRefillTime,
    
    // Setters (для прямого управления из App.jsx если нужно)
    setFuelCount,
    setLastRaceTime,
    setFuelRefillTime,
    
    // Основные функции
    handleFuelUpdate,
    handleFuelRefillByAd,
    loadFuelData,
    
    // Вспомогательные функции
    checkAndRestoreFuel,
    parseTimestamp,
    
    // Утилиты
    canStartRace,
    getTimeUntilRefill,
    getRefillTimeText,
    consumeFuel,
    updateFuelState
  };
};