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
import { useGameHandlers } from './hooks/useGameHandlers'; // ✅ НОВЫЙ ИМПОРТ
import {
  calculateStaffCost,
  CAR_CATALOG,
  STAFF_CATALOG,
  MAX_OFFLINE_HOURS,
  UPDATE_INTERVAL
} from './utils';
import './App.css';

function App() {
  // ЗАЩИТА ОТ ДВОЙНОЙ ИНИЦИАЛИЗАЦИИ (без изменений)
  const initializationRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // Telegram и UI состояния (без изменений)
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState(null);
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);
  
  // UI состояния (без изменений)
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false);

  // ✅ getUserId функция (без изменений)
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

  // ✅ ИСПОЛЬЗУЕМ useGameState хук (без изменений)
  const gameState = useGameState(getUserId);

  // ✅ ИСПОЛЬЗУЕМ НОВЫЙ useGameHandlers хук - передаем все необходимые состояния
  const gameHandlers = useGameHandlers({
    // Состояния игрока
    gameCoins: gameState.gameCoins,
    setGameCoins: gameState.setGameCoins,
    currentXp: gameState.currentXp,
    setCurrentXp: gameState.setCurrentXp,
    accumulatedIncome: gameState.accumulatedIncome,
    setAccumulatedIncome: gameState.setAccumulatedIncome,
    lastCollectedTimeRef: gameState.lastCollectedTimeRef,
    incomeRatePerHour: gameState.incomeRatePerHour,
    setIncomeRatePerHour: gameState.setIncomeRatePerHour,
    
    // Игровые объекты
    buildings: gameState.buildings,
    setBuildings: gameState.setBuildings,
    playerCars: gameState.playerCars,
    setPlayerCars: gameState.setPlayerCars,
    selectedCarId: gameState.selectedCarId,
    setSelectedCarId: gameState.setSelectedCarId,
    hiredStaff: gameState.hiredStaff,
    setHiredStaff: gameState.setHiredStaff,
    currentCar: gameState.currentCar,
    
    // Туториал
    isTutorialActive: gameState.isTutorialActive,
    tutorialStep: gameState.tutorialStep,
    setTutorialStep: gameState.setTutorialStep,
    setIsTutorialActive: gameState.setIsTutorialActive,
    setHasCompletedTutorial: gameState.setHasCompletedTutorial,
    
    // Топливная система
    fuelSystem: gameState.fuelSystem,
    
    // Функции
    saveGameState: gameState.saveGameState
  });

  // ✅ ОБРАБОТЧИК ЗАВЕРШЕНИЯ ЗАГРУЗКИ (без изменений)
  const handleLoadingComplete = useCallback(() => {
    console.log('🎮 Заставка завершена, показываем игру');
    setIsLoading(false);
  }, []);

  // ✅ ИНИЦИАЛИЗАЦИЯ (без изменений)
  useEffect(() => {
    if (initializationRef.current) {
      console.log('⚠️ Повторная инициализация заблокирована');
      return;
    }
    
    const initializeApp = async () => {
      console.log('🚀 Инициализация приложения...');
      initializationRef.current = true;
      
      const tg = window.Telegram?.WebApp;
      if (tg) {
        console.log('✅ Telegram WebApp найден');
        
        setIsTgApp(true);
        const userData = tg.initDataUnsafe?.user || null;
        setTgUserData(userData);
        
        if (userData && typeof userData === 'object') {
          const firstName = userData.first_name || userData.firstName || userData.username || 'Игрок';
          gameState.setPlayerName(firstName);
          console.log('📝 Player name установлен:', firstName);
        }
        
        tg.ready();
        tg.expand();
        tg.BackButton.hide();
        tg.MainButton.hide();
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (userData?.id) {
          await loadGameDataWrapper(userData.id.toString());
        } else {
          console.error('❌ Нет userId в Telegram данных');
          setError('Ошибка получения данных пользователя Telegram');
          setIsLoading(false);
        }
      } else {
        console.log('⚠️ Telegram WebApp не найден, режим standalone');
        setIsTgApp(false);
        await loadGameDataWrapper('default');
      }
    };

    const loadGameDataWrapper = async (userId) => {
      if (hasLoadedData || isInitializedRef.current) {
        console.log('⏭️ Данные уже загружены, пропускаем...');
        return;
      }

      setHasLoadedData(true);
      isInitializedRef.current = true;
      
      try {
        const result = await gameState.loadGameData(userId);
        
        if (result.success) {
          console.log('✅ Данные успешно загружены через хук');
        } else {
          console.error('❌ Ошибка загрузки через хук:', result.error);
          setError(result.error);
        }
      } catch (err) {
        console.error('❌ Ошибка в loadGameDataWrapper:', err.message);
        setError(`Ошибка загрузки: ${err.message}`);
      }
    };

    initializeApp();

    return () => {
      gameState.cleanup();
    };
  }, []);

  // ✅ Таймер дохода (без изменений)
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
  }, [gameState.incomeRatePerHour, isLoading, gameState.lastCollectedTimeRef, gameState.setAccumulatedIncome]);

  // ✅ ESC handler (без изменений)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && isLoading) {
        console.log('🔧 Заставка пропущена (ESC)');
        setIsLoading(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLoading]);

  // ✅ UI обработчики (только UI, игровые теперь в useGameHandlers)
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

  // ✅ СПЕЦИАЛЬНЫЕ обработчики (расширяют логику из useGameHandlers)
  const handleSelectCarWithClose = useCallback((carId) => {
    gameHandlers.handleSelectCar(carId);
    setIsCarSelectorVisible(false); // ✅ Дополнительная логика UI
  }, [gameHandlers.handleSelectCar]);

  const handleTutorialActionWithUI = useCallback((action) => {
    const result = gameHandlers.handleTutorialAction(action);
    
    // ✅ Дополнительная UI логика на основе результата
    if (result === 'close-tuning') {
      setIsTuningVisible(false);
    }
  }, [gameHandlers.handleTutorialAction]);

  // ✅ Вычисляемые значения (используют состояния из gameState)
  const xpPercentage = gameState.xpToNextLevel > 0 ? Math.min((gameState.currentXp / gameState.xpToNextLevel) * 100, 100) : 0;

  // ✅ ПОКАЗ ЗАСТАВКИ ЗАГРУЗКИ (без изменений)
  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  // Рендер ошибки (без изменений)
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

  // ✅ ФИНАЛЬНЫЙ ЧИСТЫЙ РЕНДЕР - используем обработчики из gameHandlers
  return (
    <div className="App">
      <div className="header-container">
        <Header
          level={gameState.playerLevel}
          playerName={gameState.playerName}
          playerPhoto={gameState.playerPhoto} // ✅ ДОБАВИТЬ ЭТУ СТРОКУ!
          gameCoins={gameState.gameCoins}
          jetCoins={gameState.jetCoins}
          xpPercentage={xpPercentage}
          onShowTutorial={gameHandlers.handleShowTutorial}
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
            onCollect={gameHandlers.handleCollect}
            onTuneClick={handleOpenTuning}
            onOpenCarSelector={handleOpenCarSelector}
            onBuildingClick={gameHandlers.handleBuildingClick}
          />
        )}

        {activeScreen === 'race' && gameState.currentCar && (
          <RaceScreen
            playerCar={gameState.currentCar}
            onStartRace={gameHandlers.handleStartRace}
            onAdReward={gameHandlers.handleAdReward}
            fuelCount={gameState.fuelSystem.fuelCount}
            lastRaceTime={gameState.fuelSystem.lastRaceTime}
            fuelRefillTime={gameState.fuelSystem.fuelRefillTime}
            onFuelUpdate={gameHandlers.handleFuelUpdate}
            onFuelRefillByAd={gameHandlers.handleFuelRefillByAd}
          />
        )}

        {activeScreen === 'shop' && (
          <ShopScreen
            catalog={CAR_CATALOG}
            playerCars={gameState.playerCars}
            gameCoins={gameState.gameCoins}
            onBuyCar={gameHandlers.handleBuyCar}
          />
        )}

        {activeScreen === 'staff' && (
          <StaffScreen
            staffCatalog={STAFF_CATALOG}
            hiredStaff={gameState.hiredStaff}
            gameCoins={gameState.gameCoins}
            onHireOrUpgrade={gameHandlers.handleHireOrUpgradeStaff}
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
            onBalanceUpdate={gameHandlers.handleReferralRewardUpdate}
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
          onUpgrade={gameHandlers.handleUpgradePart}
        />
      )}

      {isCarSelectorVisible && (
        <CarSelector
          playerCars={gameState.playerCars}
          selectedCarId={gameState.selectedCarId}
          onSelectCar={handleSelectCarWithClose}
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
        onNext={gameHandlers.handleTutorialNext}
        onComplete={gameHandlers.handleTutorialComplete}
        onAction={handleTutorialActionWithUI}
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