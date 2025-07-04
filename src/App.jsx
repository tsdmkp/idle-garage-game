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
import {
  calculateUpgradeCost,
  calculateBuildingCost,
  recalculateStatsAndIncomeBonus,
  calculateTotalIncomeRate,
  simulateRace,
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

  // ✅ ИСПОЛЬЗУЕМ НАШ ОБНОВЛЕННЫЙ ХУК - теперь с топливной системой
  const {
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
    
    // ✅ ТОПЛИВНАЯ система - теперь объект
    fuelSystem,
    
    // Функции
    saveGameState,
    loadGameData,
    cleanup
  } = useGameState(getUserId);

  // ✅ ОБРАБОТЧИК ЗАВЕРШЕНИЯ ЗАГРУЗКИ (без изменений)
  const handleLoadingComplete = useCallback(() => {
    console.log('🎮 Заставка завершена, показываем игру');
    setIsLoading(false);
  }, []);

  // ✅ ИНИЦИАЛИЗАЦИЯ (без изменений, но использует обновленный loadGameData)
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
          setPlayerName(firstName);
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
        const result = await loadGameData(userId);
        
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
      cleanup();
    };
  }, []);

  // ✅ Таймер дохода (без изменений)
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
  }, [incomeRatePerHour, isLoading, lastCollectedTimeRef, setAccumulatedIncome]);

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

  // ✅ ОБРАБОТЧИКИ ИГРОВЫХ ДЕЙСТВИЙ (без изменений, используют хук)
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
  }, [accumulatedIncome, gameCoins, isTutorialActive, tutorialStep, setGameCoins, setAccumulatedIncome, setTutorialStep, lastCollectedTimeRef, saveGameState]);

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
  }, [buildings, gameCoins, currentCar, hiredStaff, setGameCoins, setBuildings, setIncomeRatePerHour, saveGameState]);

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
  }, [currentCar, hiredStaff, gameCoins, playerCars, selectedCarId, buildings, setIncomeRatePerHour, setGameCoins, setPlayerCars, saveGameState]);

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
  }, [currentCar, gameCoins, currentXp, hiredStaff, setGameCoins, setCurrentXp, saveGameState]);

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
  }, [gameCoins, playerCars, setGameCoins, setPlayerCars, saveGameState]);

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
  }, [hiredStaff, gameCoins, buildings, currentCar, setGameCoins, setHiredStaff, setIncomeRatePerHour, saveGameState]);

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
  }, [selectedCarId, playerCars, buildings, hiredStaff, setSelectedCarId, setIncomeRatePerHour, saveGameState]);

  // ✅ ТОПЛИВНЫЕ ОБРАБОТЧИКИ - теперь используют fuelSystem
  const handleFuelUpdate = useCallback((newFuelCount, newLastRaceTime, newRefillTime = null) => {
    // ✅ Используем функцию из топливного хука
    fuelSystem.handleFuelUpdate(newFuelCount, newLastRaceTime, newRefillTime);
  }, [fuelSystem]);

  const handleFuelRefillByAd = useCallback(() => {
    // ✅ Используем функцию из топливного хука
    fuelSystem.handleFuelRefillByAd();
  }, [fuelSystem]);

  // ✅ Остальные обработчики (без изменений)
  const handleReferralRewardUpdate = useCallback((coinsEarned) => {
    if (coinsEarned > 0) {
      const newTotalCoins = gameCoins + coinsEarned;
      setGameCoins(newTotalCoins);
      
      saveGameState({
        game_coins: newTotalCoins,
      });
    }
  }, [gameCoins, setGameCoins, saveGameState]);

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
  }, [gameCoins, setGameCoins, saveGameState]);

  // UI обработчики (без изменений)
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

  // ✅ Туториал обработчики (без изменений)
  const handleTutorialNext = useCallback(() => {
    setTutorialStep(prev => prev + 1);
  }, [setTutorialStep]);
  
  const handleTutorialComplete = useCallback(() => {
    setIsTutorialActive(false);
    setHasCompletedTutorial(true);
    
    saveGameState({
      has_completed_tutorial: true,
    });
  }, [setIsTutorialActive, setHasCompletedTutorial, saveGameState]);
  
  const handleTutorialAction = useCallback((action) => {
    if (action === 'close-tuning') {
      setIsTuningVisible(false);
    }
  }, []);

  const handleShowTutorial = useCallback(() => {
    setIsTutorialActive(true);
    setTutorialStep(0);
  }, [setIsTutorialActive, setTutorialStep]);

  // ✅ Вычисляемые значения (без изменений)
  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

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

  // ✅ Основной рендер приложения (ОБНОВЛЕН для работы с fuelSystem)
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
            // ✅ ТОПЛИВНЫЕ пропсы теперь из fuelSystem
            fuelCount={fuelSystem.fuelCount}
            lastRaceTime={fuelSystem.lastRaceTime}
            fuelRefillTime={fuelSystem.fuelRefillTime}
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

export default App;