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
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState(null);
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerName, setPlayerName] = useState('Игрок');
  const [gameCoins, setGameCoins] = useState(STARTING_COINS);
  const [jetCoins, setJetCoins] = useState(0);
  const [currentXp, setCurrentXp] = useState(10);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [incomeRatePerHour, setIncomeRatePerHour] = useState(0);
  const lastCollectedTimeRef = useRef(Date.now());
  const [accumulatedIncome, setAccumulatedIncome] = useState(0);
  const [buildings, setBuildings] = useState(INITIAL_BUILDINGS);
  const [playerCars, setPlayerCars] = useState(() => [INITIAL_CAR]);
  const [selectedCarId, setSelectedCarId] = useState(INITIAL_CAR.id);
  const [hiredStaff, setHiredStaff] = useState(INITIAL_HIRED_STAFF);
  const [activeScreen, setActiveScreen] = useState('garage');
  const [isTuningVisible, setIsTuningVisible] = useState(false);
  const [isCarSelectorVisible, setIsCarSelectorVisible] = useState(false);
  
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;

  // Определяем userId правильно
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
      ...updates
    };

    try {
      console.log('📤 Сохранение состояния для userId:', userId, stateToSave);
      await apiClient('/game_state', 'POST', { body: stateToSave });
      console.log('✅ Состояние успешно сохранено');
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err.message);
    }
  }, [
    getUserId, playerLevel, playerName, gameCoins, jetCoins, currentXp, xpToNextLevel,
    incomeRatePerHour, buildings, playerCars, selectedCarId, hiredStaff, hasCompletedTutorial
  ]);

  // Инициализация Telegram WebApp И загрузка данных
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Инициализация приложения...');
      
      // Сначала инициализируем Telegram
      const tg = window.Telegram?.WebApp;
      if (tg) {
        console.log('✅ Telegram WebApp найден');
        setIsTgApp(true);
        const userData = tg.initDataUnsafe?.user || null;
        console.log('👤 Telegram user data:', JSON.stringify(userData, null, 2));
        setTgUserData(userData);
        
        if (userData && typeof userData === 'object') {
          const firstName = userData.first_name || userData.firstName || userData.username || 'Игрок';
          setPlayerName(firstName);
          console.log('📝 Player name установлен:', firstName);
        } else {
          console.warn('⚠️ Нет валидных данных пользователя в userData:', userData);
        }
        
        tg.ready();
        tg.expand();
        tg.BackButton.hide();
        tg.MainButton.hide();

        // Теперь загружаем данные с правильным userId
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
        // Загружаем данные для standalone режима
        await loadGameData('default');
      }
    };

    const loadGameData = async (userId) => {
      if (hasLoadedData) {
        console.log('⏭️ Данные уже загружены, пропускаем...');
        return;
      }

      console.log('📥 Начинаем загрузку данных для userId:', userId);
      setHasLoadedData(true);
      
      try {
        const initialState = await apiClient('/game_state', 'GET', { params: { userId } });
        console.log('📦 Получено состояние с бэкенда:', initialState);

        if (initialState && typeof initialState === 'object') {
          // Обновляем состояние из бэкенда
          setPlayerLevel(initialState.player_level ?? playerLevel);
          if (initialState.first_name && initialState.first_name !== 'Игрок') {
            setPlayerName(initialState.first_name);
            console.log('📝 Имя обновлено с бэкенда:', initialState.first_name);
          }
          
          let coinsToSet = initialState.game_coins;
          if (typeof coinsToSet === 'string') {
            coinsToSet = parseInt(coinsToSet) || STARTING_COINS;
          }
          setGameCoins(coinsToSet || STARTING_COINS);
          console.log('💰 Монеты установлены:', coinsToSet || STARTING_COINS);
          
          setJetCoins(parseInt(initialState.jet_coins) || 0);
          setCurrentXp(initialState.current_xp ?? currentXp);
          setXpToNextLevel(initialState.xp_to_next_level ?? xpToNextLevel);
          
          const savedTutorial = initialState.has_completed_tutorial;
          setHasCompletedTutorial(savedTutorial || false);
          console.log('🎓 Туториал завершен:', savedTutorial);
          
          // Запускаем туториал только если не завершен И это новый игрок
          if (!savedTutorial && (initialState.player_level === 1 || !initialState.player_level)) {
            console.log('🎯 Запускаем туториал для нового игрока');
            setTimeout(() => {
              setIsTutorialActive(true);
              setTutorialStep(0);
            }, 1000);
          } else {
            console.log('⏭️ Туториал пропущен:', { 
              tutorialCompleted: savedTutorial, 
              playerLevel: initialState.player_level 
            });
          }

          const loadedLastCollectedTime = initialState.last_collected_time ? new Date(initialState.last_collected_time).getTime() : Date.now();
          const loadedLastExitTime = initialState.last_exit_time ? new Date(initialState.last_exit_time).getTime() : loadedLastCollectedTime;
          lastCollectedTimeRef.current = isFinite(loadedLastCollectedTime) ? loadedLastCollectedTime : Date.now();
          console.log('⏰ Время последнего сбора:', new Date(lastCollectedTimeRef.current).toISOString());

          const now = Date.now();
          const offlineTimeMs = Math.max(0, now - loadedLastExitTime);
          console.log('⏱️ Оффлайн время (мс):', offlineTimeMs);

          let loadedBuildings = INITIAL_BUILDINGS;
          if (initialState?.buildings && Array.isArray(initialState.buildings) && initialState.buildings.length > 0) {
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
              console.log('🏢 Загружены здания с бэкенда:', loadedBuildings);
            } else {
              console.warn('⚠️ Невалидные здания, используем дефолтные');
            }
          } else {
            console.log('🏢 Используем дефолтные здания');
          }
          setBuildings(loadedBuildings);

          const loadedHiredStaff = initialState.hired_staff ?? INITIAL_HIRED_STAFF;
          setHiredStaff(loadedHiredStaff);
          console.log('👥 Загружен персонал:', loadedHiredStaff);

          const loadedPlayerCarsRaw = Array.isArray(initialState.player_cars) ? initialState.player_cars : [INITIAL_CAR];
          const loadedPlayerCars = loadedPlayerCarsRaw.map(sc =>
            sc && sc.id && sc.parts ? { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats } : null
          ).filter(Boolean);
          const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR];
          setPlayerCars(actualPlayerCars);
          console.log('🚗 Загружены машины:', actualPlayerCars);

          const loadedSelectedCarId = initialState.selected_car_id;
          const finalSelectedCarId = loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
            ? loadedSelectedCarId
            : actualPlayerCars[0]?.id || INITIAL_CAR.id;
          setSelectedCarId(finalSelectedCarId);
          console.log('🎯 Выбранная машина:', finalSelectedCarId);

          const carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0] || INITIAL_CAR;
          const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
          setIncomeRatePerHour(initialTotalRate);
          console.log('💸 Рассчитана скорость дохода:', initialTotalRate);
          
          let offlineIncome = 0;
          if (offlineTimeMs > 0 && initialTotalRate > 0) {
            offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600);
            console.log('💰 Рассчитан оффлайн доход:', offlineIncome);
          }
          setAccumulatedIncome(offlineIncome);
        } else {
          console.error('❌ Бэкенд вернул невалидные данные');
          setError('Не удалось получить данные игрока');
          setBuildings(INITIAL_BUILDINGS);
          setPlayerCars([INITIAL_CAR]);
          setSelectedCarId(INITIAL_CAR.id);
          setHiredStaff(INITIAL_HIRED_STAFF);
          setIncomeRatePerHour(calculateTotalIncomeRate(INITIAL_BUILDINGS, INITIAL_CAR, INITIAL_HIRED_STAFF));
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки данных:', err.message);
        setError(`Ошибка загрузки: ${err.message}`);
      } finally {
        setIsLoading(false);
        console.log('✅ Загрузка завершена, isLoading = false');
      }
    };

    // Запускаем инициализацию только один раз
    if (!hasLoadedData) {
      initializeApp();
    }

    return () => {
      // Сохраняем время выхода при размонтировании
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
  }, []); // Пустой массив - запускаем только один раз

  // Таймер дохода
  useEffect(() => {
    if (incomeRatePerHour <= 0 || isLoading) {
      console.log('⏸️ Таймер дохода не запущен:', { incomeRatePerHour, isLoading });
      return;
    }
    
    console.log('▶️ Таймер дохода запущен со скоростью:', incomeRatePerHour);
    const incomePerSecond = incomeRatePerHour / 3600;
    const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
    
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000;
      if (!isFinite(timePassedTotalSeconds) || !isFinite(incomePerSecond) || timePassedTotalSeconds < 0) {
        console.error('❌ Ошибка в таймере дохода:', { timePassedTotalSeconds, incomePerSecond });
        return;
      }
      const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
      const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
      setAccumulatedIncome(isFinite(newAccumulated) && newAccumulated >= 0 ? newAccumulated : 0);
    }, UPDATE_INTERVAL);
    
    return () => {
      console.log('⏹️ Таймер дохода остановлен');
      clearInterval(intervalId);
    };
  }, [incomeRatePerHour, isLoading]);

  const handleCollect = () => {
    const incomeToAdd = Math.floor(accumulatedIncome);
    console.log('💰 Сбор дохода:', incomeToAdd);
    if (incomeToAdd > 0) {
      const newTotalCoins = gameCoins + incomeToAdd;
      setGameCoins(newTotalCoins);
      setAccumulatedIncome(0);
      const collectionTime = Date.now();
      lastCollectedTimeRef.current = collectionTime;
      
      if (isTutorialActive && tutorialStep === 3) {
        console.log('🎓 Шаг туториала 3 завершен, переход к 4');
        setTimeout(() => {
          setTutorialStep(4);
        }, 500);
      }
      
      saveGameState({
        game_coins: newTotalCoins,
        last_collected_time: new Date(collectionTime).toISOString(),
      });
    }
  };

  const handleBuildingClick = (buildingName) => {
    console.log('🏢 Клик по зданию:', buildingName);
    const targetBuilding = buildings.find(b => b.name === buildingName);
    if (!targetBuilding || targetBuilding.isLocked) {
      console.log('❌ Здание заблокировано или не найдено');
      return;
    }
    const cost = calculateBuildingCost(targetBuilding.id, targetBuilding.level);
    console.log('💸 Стоимость улучшения здания:', cost);
    if (gameCoins >= cost) {
      const newCoins = gameCoins - cost;
      const updatedBuildings = buildings.map(b =>
        b.name === buildingName ? { ...b, level: b.level + 1 } : b
      );
      const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar, hiredStaff);

      setGameCoins(newCoins);
      setBuildings(updatedBuildings);
      setIncomeRatePerHour(newTotalRate);
      console.log('✅ Здание улучшено, новая скорость дохода:', newTotalRate);
      
      saveGameState({
        game_coins: newCoins,
        buildings: updatedBuildings,
        income_rate_per_hour: newTotalRate,
      });
    } else {
      console.log('❌ Недостаточно монет для улучшения здания');
    }
  };

  const handleOpenTuning = () => {
    console.log('🔧 Открытие тюнинга');
    setIsTuningVisible(true);
  };

  const handleCloseTuning = () => {
    console.log('❌ Закрытие тюнинга');
    setIsTuningVisible(false);
  };

  const handleUpgradePart = (partId) => {
    console.log('🔧 Улучшение детали:', partId);
    if (!currentCar?.parts?.[partId]) {
      console.log('❌ Деталь не найдена');
      return;
    }
    const part = currentCar.parts[partId];
    const cost = calculateUpgradeCost(partId, part.level);
    console.log('💸 Стоимость улучшения детали:', cost);
    if (gameCoins >= cost && cost !== Infinity) {
      const newCoins = gameCoins - cost;
      const updatedParts = { ...currentCar.parts, [partId]: { ...part, level: part.level + 1 } };
      const { stats: newStats } = recalculateStatsAndIncomeBonus(currentCar.id, updatedParts);
      
      const updatedPlayerCars = playerCars.map(car =>
        car.id === selectedCarId ? { ...car, parts: updatedParts, stats: newStats } : car
      );
      
      const updatedCarForRate = updatedPlayerCars.find(c => c.id === selectedCarId);
      let newTotalRate = incomeRatePerHour;
      if (updatedCarForRate) {
        newTotalRate = calculateTotalIncomeRate(buildings, updatedCarForRate, hiredStaff);
        setIncomeRatePerHour(newTotalRate);
      }
      
      setGameCoins(newCoins);
      setPlayerCars(updatedPlayerCars);
      console.log('✅ Деталь улучшена, новая скорость дохода:', newTotalRate);
      
      saveGameState({
        game_coins: newCoins,
        player_cars: updatedPlayerCars,
        income_rate_per_hour: newTotalRate,
      });
    } else {
      console.log('❌ Недостаточно монет для улучшения детали');
    }
  };

  const handleStartRace = async (difficulty) => {
    console.log('🏎️ Старт гонки, сложность:', difficulty);
    if (!currentCar) return { result: 'error', reward: null };
    const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp);
    if (raceOutcome) {
      setGameCoins(raceOutcome.newGameCoins);
      setCurrentXp(raceOutcome.newCurrentXp);
      console.log('🏁 Результат гонки:', raceOutcome);
      
      saveGameState({
        game_coins: raceOutcome.newGameCoins,
        current_xp: raceOutcome.newCurrentXp,
      });
      return { result: raceOutcome.result, reward: raceOutcome.reward };
    } else {
      return { result: 'error', reward: null };
    }
  };

  const handleBuyCar = (carIdToBuy) => {
    console.log('🛒 Покупка машины:', carIdToBuy);
    const carData = CAR_CATALOG.find(c => c.id === carIdToBuy);
    if (!carData || gameCoins < carData.price || playerCars.some(c => c.id === carIdToBuy)) {
      console.log('❌ Невозможно купить машину');
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
    console.log('✅ Машина куплена:', carData.name);
    
    saveGameState({
      game_coins: newCoins,
      player_cars: updatedPlayerCars,
    });
  };

  const handleHireOrUpgradeStaff = (staffId) => {
    console.log('👥 Найм/улучшение персонала:', staffId);
    const cost = calculateStaffCost(staffId, hiredStaff);
    console.log('💸 Стоимость персонала:', cost);
    if (gameCoins >= cost && cost !== Infinity) {
      const newCoins = gameCoins - cost;
      const updatedHiredStaff = { ...hiredStaff, [staffId]: (hiredStaff[staffId] || 0) + 1 };
      const newTotalRate = calculateTotalIncomeRate(buildings, currentCar, updatedHiredStaff);

      setGameCoins(newCoins);
      setHiredStaff(updatedHiredStaff);
      setIncomeRatePerHour(newTotalRate);
      console.log('✅ Персонал нанят, новая скорость дохода:', newTotalRate);
      
      saveGameState({
        game_coins: newCoins,
        hired_staff: updatedHiredStaff,
        income_rate_per_hour: newTotalRate,
      });
    } else {
      console.log('❌ Недостаточно монет для найма персонала');
    }
  };

  const handleNavClick = (screenId) => {
    console.log('🧭 Навигация:', screenId);
    setIsTuningVisible(false);
    setIsCarSelectorVisible(false);
    setActiveScreen(screenId);
  };

  const handleOpenCarSelector = () => {
    console.log('🚗 Открытие выбора машины');
    setIsCarSelectorVisible(true);
  };
  
  const handleCloseCarSelector = () => {
    console.log('❌ Закрытие выбора машины');
    setIsCarSelectorVisible(false);
  };

  const handleSelectCar = (carId) => {
    console.log('🎯 Выбор машины:', carId);
    if (carId !== selectedCarId) {
      setSelectedCarId(carId);
      const newSelectedCar = playerCars.find(c => c.id === carId);
      let newTotalRate = incomeRatePerHour;
      if (newSelectedCar) {
        newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff);
        setIncomeRatePerHour(newTotalRate);
      }
      console.log('✅ Машина выбрана, новая скорость дохода:', newTotalRate);
      
      saveGameState({
        selected_car_id: carId,
        income_rate_per_hour: newTotalRate,
      });
    }
    setIsCarSelectorVisible(false);
  };

  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;
  
  const handleTutorialNext = () => {
    console.log('➡️ Туториал: следующий шаг');
    setTutorialStep(prev => prev + 1);
  };
  
  const handleTutorialComplete = () => {
    console.log('🎓 Туториал завершен');
    setIsTutorialActive(false);
    setHasCompletedTutorial(true);
    
    saveGameState({
      has_completed_tutorial: true,
    });
  };
  
  const handleTutorialAction = (action) => {
    console.log('🎯 Действие туториала:', action);
    if (action === 'expand-buildings') {
      // Больше не нужно
    } else if (action === 'close-tuning') {
      setIsTuningVisible(false);
    }
  };

  if (isLoading) {
    return <div className="loading-screen">Загрузка данных...</div>;
  }
  if (error) {
    return <div className="error-screen">Ошибка: {error}</div>;
  }

  return (
    <div className="App">
      <div className="header-container">
        <Header
          level={playerLevel}
          playerName={playerName}
          gameCoins={gameCoins}
          jetCoins={jetCoins}
          xpPercentage={xpPercentage}
          onShowTutorial={() => {
            console.log('🎓 Ручной запуск туториала');
            setIsTutorialActive(true);
            setTutorialStep(0);
          }}
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
        {activeScreen === 'p2e' && (
          <div className="placeholder-screen">
            <div>
              <div style={{ fontSize: '3em', marginBottom: '10px' }}>🎮</div>
              <div>Play to Earn</div>
              <div style={{ fontSize: '0.8em', opacity: 0.6, marginTop: '10px' }}>
                Скоро здесь появятся новые возможности!
              </div>
            </div>
          </div>
        )}
      </main>
      {isTuningVisible && (
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
      <NavBar
        activeScreen={activeScreen}
        onScreenChange={handleNavClick}
      />
      
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