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
import { useGameState } from './hooks/useGameState'; // ✅ НОВЫЙ ИМПОРТ
import {
  calculateStaffCost,
  CAR_CATALOG,
  STAFF_CATALOG,
  MAX_OFFLINE_HOURS,
  UPDATE_INTERVAL,
} from './utils';
import apiClient from './apiClient';
import './App.css';

function App() {
  // ЗАЩИТА ОТ ДВОЙНОЙ ИНИЦИАЛИЗАЦИИ
  const initializationRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // Основные состояния приложения
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState(null);
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);
  
  // UI состояния
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false);

  // Топливная система (пока оставляем здесь, вынесем в следующий хук)
  const [fuelCount, setFuelCount] = useState(5);
  const [lastRaceTime, setLastRaceTime] = useState(null);
  const [fuelRefillTime, setFuelRefillTime] = useState(null);

  // Refs
  const saveTimeoutRef = useRef(null);

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

  // Debounced save function
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

  // Основная функция сохранения состояния
  const saveGameState = useCallback(async (updates = {}) => {
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
      // Топливные данные (пока здесь)
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
    fuelCount, lastRaceTime, fuelRefillTime,
    getUserId, debouncedSave
  ]);

  // ✅ ИСПОЛЬЗУЕМ КАСТОМНЫЙ ХУК
  const gameState = useGameState(saveGameState);

  // Обработчик завершения загрузки
  const handleLoadingComplete = useCallback(() => {
    console.log('🎮 Заставка завершена, показываем игру');
    setIsLoading(false);
  }, []);

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
    if (initializationRef.current) {
      console.log('⚠️ Повторная инициализация заблокирована');
      return;
    }
    
    const initializeApp = async () => {
      console.log('🚀 Инициализация приложения...');
      initializationRef.current = true;
      
      // Инициализация Telegram WebApp
      const tg = window.Telegram?.WebApp;
      if (tg) {
        console.log('✅ Telegram WebApp найден');
        
        setIsTgApp(true);
        const userData = tg.initDataUnsafe?.user || null;
        setTgUserData(userData);
        
        if (userData && typeof userData === 'object') {
          const firstName = userData.first_name || userData.firstName || userData.username || 'Игрок';
          gameState.setPlayerName(firstName); // ✅ ИСПОЛЬЗУЕМ МЕТОД ИЗ ХУКА
          console.log('📝 Player name установлен:', firstName);
        }
        
        tg.ready();
        tg.expand();
        tg.BackButton.hide();
        tg.MainButton.hide();
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
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
          // ✅ ИСПОЛЬЗУЕМ МЕТОД ИНИЦИАЛИЗАЦИИ ИЗ ХУКА
          const { incomeRate } = gameState.initializeGameState(initialState);
          
          // Загрузка топливных данных с валидацией
          const loadedFuelCount = Math.min(Math.max(Number(initialState.fuel_count) || 5, 0), 5);
          const loadedLastRaceTime = parseTimestamp(initialState.last_race_time);
          const loadedFuelRefillTime = parseTimestamp(initialState.fuel_refill_time);
          
          // Проверяем восстановление топлива
          const fuelResult = checkAndRestoreFuel(loadedFuelCount, loadedLastRaceTime, loadedFuelRefillTime);
          
          setFuelCount(fuelResult.fuel);
          setLastRaceTime(fuelResult.newLastRaceTime || loadedLastRaceTime);
          setFuelRefillTime(fuelResult.newRefillTime !== undefined ? fuelResult.newRefillTime : loadedFuelRefillTime);
          
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
          }
          gameState.setAccumulatedIncome(Math.max(offlineIncome, 0));
          
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
  }, []);

  // Таймер дохода
  useEffect(() => {
    if (gameState.incomeRatePerHour <= 0 || isLoading) {
      return;
    }
    
    const incomePerSecond = gameState.incomeRatePerHour / 3600;
    const maxAccumulationCap = gameState.incomeRatePerHour * MAX_OFFLINE_HOURS;
    
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timePassedTotalSeconds = (now - gameState.lastCollectedTimeRef.current) / 1000;
      
      if (!isFinite(timePassedTotalSeconds) || !isFinite(incomePerSecond) || timePassedTotalSeconds < 0) {
        return;
      }
      
      const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
      const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
      
      if (isFinite(newAccumulated) && newAccumulated >= 0) {
        gameState.setAccumulatedIncome(newAccumulated);
      }
    }, UPDATE_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [gameState.incomeRatePerHour, isLoading]);

  // Топливные обработчики (пока здесь, потом вынесем в отдельный хук)
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

  // Расширенные обработчики для UI
  const handleSelectCarAndClose = useCallback((carId) => {
    gameState.handleSelectCar(carId);
    setIsCarSelectorVisible(false);
  }, [gameState]);

  const handleTutorialAction = useCallback((action) => {
    if (action === 'close-tuning') {
      setIsTuningVisible(false);
    }
  }, []);

  // Показ заставки загрузки
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
          level={gameState.playerLevel}
          playerName={gameState.playerName}
          gameCoins={gameState.gameCoins}
          jetCoins={gameState.jetCoins}
          xpPercentage={gameState.xpPercentage}
          onShowTutorial={gameState.handleShowTutorial}
        />
      </div>

      <main className="main-content">
        {activeScreen === 'garage' && gameState.currentCar && (
          <MainGameScreen
            car={gameState.currentCar}
            incomeRate={gameState.incomeRatePerHour}
            accumulatedIncome={gameState.accumulatedIncome}
            maxAccumulation={gameState.incomeRatePerHour * MAX_OFFLINE_HOURS}
            gameCoins={gameState.gameCoins}
            buildings={gameState.buildings}
            onCollect={gameState.handleCollect}
            onTuneClick={handleOpenTuning}
            onOpenCarSelector={handleOpenCarSelector}
            onBuildingClick={gameState.handleBuildingClick}
          />
        )}

        {activeScreen === 'race' && gameState.currentCar && (
          <RaceScreen
            playerCar={gameState.currentCar}
            onStartRace={gameState.handleStartRace}
            onAdReward={gameState.handleAdReward}
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
            playerCars={gameState.playerCars}
            gameCoins={gameState.gameCoins}
            onBuyCar={gameState.handleBuyCar}
          />
        )}

        {activeScreen === 'staff' && (
          <StaffScreen
            staffCatalog={STAFF_CATALOG}
            hiredStaff={gameState.hiredStaff}
            gameCoins={gameState.gameCoins}
            onHireOrUpgrade={gameState.handleHireOrUpgradeStaff}
            calculateCost={(staffId) => calculateStaffCost(staffId, gameState.hiredStaff)}
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
            onBalanceUpdate={gameState.handleReferralRewardUpdate}
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
      {isTuningVisible && gameState.currentCar && (
        <TuningScreen
          car={gameState.currentCar}
          gameCoins={gameState.gameCoins}
          onClose={handleCloseTuning}
          onUpgrade={gameState.handleUpgradePart}
        />
      )}

      {isCarSelectorVisible && (
        <CarSelector
          playerCars={gameState.playerCars}
          selectedCarId={gameState.selectedCarId}
          onSelectCar={handleSelectCarAndClose}
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
        isActive={gameState.isTutorialActive}
        currentStep={gameState.tutorialStep}
        onNext={gameState.handleTutorialNext}
        onComplete={gameState.handleTutorialComplete}
        onAction={handleTutorialAction}
        gameState={{
          gameCoins: gameState.gameCoins,
          incomeRate: gameState.incomeRatePerHour,
          accumulatedIncome: gameState.accumulatedIncome
        }}
      />
    </div>
  );
}

export default App;