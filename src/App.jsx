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
import { useGameState } from './hooks/useGameState';
import { useGameSave } from './hooks/useGameSave';
import { useTelegram } from './hooks/useTelegram';
import { useFuelSystem } from './hooks/useFuelSystem';
import {
  calculateStaffCost,
  CAR_CATALOG,
  STAFF_CATALOG,
  MAX_OFFLINE_HOURS,
  UPDATE_INTERVAL,
} from './utils';
import './App.css';

function App() {
  // ЗАЩИТА ОТ ДВОЙНОЙ ИНИЦИАЛИЗАЦИИ (более мягкая)
  const initializationRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // ✅ МИНИМАЛЬНЫЕ СОСТОЯНИЯ ПРИЛОЖЕНИЯ
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState(null);
  
  // UI состояния
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false);

  // ✅ ИСПОЛЬЗУЕМ ВСЕ КАСТОМНЫЕ ХУКИ
  const telegram = useTelegram();
  const saveHook = useGameSave(telegram.getUserId);
  const fuelSystem = useFuelSystem(saveHook, telegram.sendHapticFeedback);
  
  // Создаем функцию сохранения для gameState
  const saveGameState = useCallback((updates = {}) => {
    return saveHook.saveGameState(gameState, fuelSystem.fuelState, updates);
  }, [saveHook, fuelSystem.fuelState]);

  const gameState = useGameState(saveGameState);

  // ✅ ОБРАБОТЧИК ЗАВЕРШЕНИЯ ЗАГРУЗКИ
  const handleLoadingComplete = useCallback(() => {
    console.log('🎮 Заставка завершена, показываем игру');
    setIsLoading(false);
  }, []);

  // ✅ УЛУЧШЕННАЯ ИНИЦИАЛИЗАЦИЯ (минимальные изменения)
  useEffect(() => {
    // УБИРАЕМ жесткую блокировку повторной инициализации
    // if (initializationRef.current) {
    //   console.log('⚠️ Повторная инициализация заблокирована');
    //   return;
    // }
    
    const initializeApp = async () => {
      console.log('🚀 Инициализация приложения...');
      
      // Ждем инициализации Telegram
      if (!telegram.isInitialized) {
        console.log('⏳ Ожидание инициализации Telegram...');
        return;
      }
      
      // Устанавливаем имя игрока из Telegram
      const userName = telegram.getUserName();
      if (userName && userName !== 'Игрок') {
        gameState.setPlayerName(userName);
        console.log('📝 Player name установлен из Telegram:', userName);
      }
      
      // Получаем user ID и загружаем данные
      const userId = telegram.getUserId();
      if (userId) {
        await loadGameData(userId);
      } else {
        console.error('❌ Не удалось получить userId');
        setError('Ошибка получения данных пользователя');
        setIsLoading(false);
      }
    };

    // ✅ УЛУЧШЕННАЯ загрузка с обработкой retry из хука
    const loadGameData = async (userId) => {
      if (hasLoadedData && isInitializedRef.current) {
        console.log('⏭️ Данные уже успешно загружены, пропускаем...');
        return;
      }

      console.log('📥 Загрузка данных игрока...', userId);
      
      // Используем улучшенный метод из хука с retry логикой
      const result = await saveHook.loadGameData(
        userId, 
        gameState, 
        fuelSystem.fuelState, 
        fuelSystem.checkAndRestoreFuel
      );
      
      if (result.success) {
        // Инициализируем топливную систему
        fuelSystem.initializeFuelSystem(result.data);
        
        // Отмечаем как успешно загруженные
        setHasLoadedData(true);
        isInitializedRef.current = true;
        initializationRef.current = true;
        
        console.log('✅ Приложение успешно инициализировано');
      } else {
        console.error('❌ Ошибка инициализации:', result.error);
        
        // Если это сетевая ошибка и нужно использовать дефолты
        if (result.isNetworkError && result.useDefaults) {
          console.log('🔄 Запускаем с дефолтными данными из-за недоступности сервера');
          
          // Устанавливаем дефолтные данные
          const userName = telegram.getUserName();
          gameState.setPlayerLevel(1);
          gameState.setPlayerName(userName || 'Игрок');
          gameState.setGameCoins(500);
          gameState.setJetCoins(0);
          
          setHasLoadedData(true);
          isInitializedRef.current = true;
          initializationRef.current = true;
          
          // Показываем предупреждение пользователю
          setTimeout(() => {
            if (telegram.showAlert) {
              telegram.showAlert('⚠️ Сервер временно недоступен.\nИгра запущена в автономном режиме.');
            }
          }, 1000);
        } else {
          setError(result.error);
          setIsLoading(false);
        }
      }
    };

    initializeApp();

    // ✅ УПРОЩЕННЫЙ CLEANUP
    return () => {
      saveHook.cleanupSaveTimers();
      saveHook.saveExitTime();
    };
  }, [
    telegram.isInitialized, 
    telegram.getUserId, 
    telegram.getUserName,
    telegram.showAlert,
    saveHook,
    gameState,
    fuelSystem,
    hasLoadedData
  ]);

  // ✅ ТАЙМЕР ДОХОДА (БЕЗ ИЗМЕНЕНИЙ)
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
  }, [gameState.incomeRatePerHour, isLoading, gameState]);

  // ✅ UI ОБРАБОТЧИКИ С HAPTIC FEEDBACK
  const handleNavClick = useCallback((screenId) => {
    setIsTuningVisible(false);
    setIsCarSelectorVisible(false);
    setActiveScreen(screenId);
    telegram.sendHapticFeedback('selection');
  }, [telegram]);

  const handleOpenTuning = useCallback(() => {
    setIsTuningVisible(true);
    telegram.sendHapticFeedback('light');
  }, [telegram]);

  const handleCloseTuning = useCallback(() => {
    setIsTuningVisible(false);
    telegram.sendHapticFeedback('light');
  }, [telegram]);

  const handleOpenCarSelector = useCallback(() => {
    setIsCarSelectorVisible(true);
    telegram.sendHapticFeedback('light');
  }, [telegram]);
  
  const handleCloseCarSelector = useCallback(() => {
    setIsCarSelectorVisible(false);
    telegram.sendHapticFeedback('light');
  }, [telegram]);

  const handleSelectCarAndClose = useCallback((carId) => {
    gameState.handleSelectCar(carId);
    setIsCarSelectorVisible(false);
    telegram.sendHapticFeedback('medium');
  }, [gameState, telegram]);

  const handleTutorialAction = useCallback((action) => {
    if (action === 'close-tuning') {
      setIsTuningVisible(false);
      telegram.sendHapticFeedback('light');
    }
  }, [telegram]);

  // ✅ ОБЕРТКИ ДЛЯ ИГРОВЫХ ДЕЙСТВИЙ С HAPTIC FEEDBACK
  const gameActionsWithHaptic = {
    handleCollect: useCallback(() => {
      const result = gameState.handleCollect();
      if (gameState.accumulatedIncome > 0) {
        telegram.sendHapticFeedback('success');
      }
      return result;
    }, [gameState, telegram]),

    handleBuildingClick: useCallback((buildingName) => {
      return gameState.handleBuildingClick(buildingName);
    }, [gameState]),

    handleUpgradePart: useCallback((partId) => {
      const result = gameState.handleUpgradePart(partId);
      telegram.sendHapticFeedback('medium');
      return result;
    }, [gameState, telegram]),

    handleBuyCar: useCallback((carId) => {
      const result = gameState.handleBuyCar(carId);
      telegram.sendHapticFeedback('success');
      return result;
    }, [gameState, telegram]),

    handleHireOrUpgradeStaff: useCallback((staffId) => {
      const result = gameState.handleHireOrUpgradeStaff(staffId);
      telegram.sendHapticFeedback('medium');
      return result;
    }, [gameState, telegram]),

    handleAdReward: useCallback((amount) => {
      const result = gameState.handleAdReward(amount);
      telegram.sendHapticFeedback('success');
      return result;
    }, [gameState, telegram]),
  };

  // ✅ ПОКАЗ ЗАСТАВКИ ЗАГРУЗКИ
  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  // ✅ РЕНДЕР ОШИБКИ
  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <div className="error-icon">❌</div>
          <div className="error-title">Ошибка загрузки</div>
          <div className="error-message">{error}</div>
          <button 
            onClick={() => {
              telegram.sendHapticFeedback('light');
              setError(null);
              setIsLoading(true);
              setHasLoadedData(false);
              isInitializedRef.current = false;
              initializationRef.current = false;
              // Принудительно перезапускаем инициализацию
              window.location.reload();
            }} 
            className="retry-button"
          >
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // ✅ ОСНОВНОЙ РЕНДЕР ПРИЛОЖЕНИЯ
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
            onCollect={gameActionsWithHaptic.handleCollect}
            onTuneClick={handleOpenTuning}
            onOpenCarSelector={handleOpenCarSelector}
            onBuildingClick={gameActionsWithHaptic.handleBuildingClick}
          />
        )}

        {activeScreen === 'race' && gameState.currentCar && (
          <RaceScreen
            playerCar={gameState.currentCar}
            onStartRace={gameState.handleStartRace}
            onAdReward={gameActionsWithHaptic.handleAdReward}
            fuelCount={fuelSystem.fuelCount}
            lastRaceTime={fuelSystem.lastRaceTime}
            fuelRefillTime={fuelSystem.fuelRefillTime}
            onFuelUpdate={fuelSystem.handleFuelUpdate}
            onFuelRefillByAd={fuelSystem.handleFuelRefillByAd}
          />
        )}

        {activeScreen === 'shop' && (
          <ShopScreen
            catalog={CAR_CATALOG}
            playerCars={gameState.playerCars}
            gameCoins={gameState.gameCoins}
            onBuyCar={gameActionsWithHaptic.handleBuyCar}
          />
        )}

        {activeScreen === 'staff' && (
          <StaffScreen
            staffCatalog={STAFF_CATALOG}
            hiredStaff={gameState.hiredStaff}
            gameCoins={gameState.gameCoins}
            onHireOrUpgrade={gameActionsWithHaptic.handleHireOrUpgradeStaff}
            calculateCost={(staffId) => calculateStaffCost(staffId, gameState.hiredStaff)}
          />
        )}

        {activeScreen === 'leaderboard' && (
          <LeaderboardScreen
            tgUserData={telegram.tgUserData}
          />
        )}

        {activeScreen === 'friends' && (
          <FriendsScreen
            tgUserData={telegram.tgUserData}
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
          onUpgrade={gameActionsWithHaptic.handleUpgradePart}
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