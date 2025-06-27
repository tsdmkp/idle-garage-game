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
  BASE_CAR_STATS, // Возможно не используется напрямую, но оставлено для полноты
  CAR_CATALOG,
  STAFF_CATALOG,
  INITIAL_BUILDINGS,
  MAX_OFFLINE_HOURS,
  UPDATE_INTERVAL,
  STARTING_COINS
} from './utils';
import apiClient from './apiClient';
import './App.css';

// Инициализация начальных значений, чтобы избежать проблем с 'undefined'
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
  const [hasLoadedData, setHasLoadedData] = useState(false); // Защита от повторной загрузки
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
  
  // Состояния для туториала
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  // Определяем текущую машину. Используем currentCar || playerCars[0] || null для безопасности.
  const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;

  // Глобальная функция для сохранения состояния игры
  // Это помогает убедиться, что мы всегда отправляем полный и консистентный набор данных
  // при каждом вызове сохранения, чтобы избежать частичной перезаписи.
  const saveGameState = useCallback(async (updates = {}) => {
    // Определяем userId надежно
    const userId = tgUserData?.id?.toString();

    // Если userId отсутствует или это Telegram приложение и userId еще не установлен,
    // не пытаемся сохранить данные.
    if (!userId && isTgApp) {
      console.warn('⚠️ Отмена сохранения: tgUserData.id отсутствует в Telegram приложении.');
      return;
    }
    // Если это не Telegram приложение, используем 'default' userId
    const finalUserId = userId || 'default';
    if (finalUserId === 'default' && isTgApp) {
        console.warn('⚠️ ВНИМАНИЕ: Используется userId по умолчанию в Telegram приложении. Проверьте инициализацию tgUserData.');
    }

    // Собираем полное текущее состояние для отправки
    const stateToSave = {
      userId: finalUserId,
      player_level: playerLevel,
      first_name: playerName, // Отправляем имя, может пригодиться на бэкенде
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
      // Дополнительные поля, которые могут быть важны для бэкенда
      last_exit_time: new Date().toISOString(), // Обновляем время выхода при каждом сохранении
      ...updates // Применяем любые специфичные обновления, переданные в функцию
    };

    try {
      console.log('📤 Сохранение состояния игры:', stateToSave);
      await apiClient('/game_state', 'POST', { body: stateToSave });
      console.log('✅ Состояние игры успешно сохранено.');
    } catch (err) {
      console.error('❌ Ошибка при сохранении состояния игры:', err.message);
      // Можно добавить UI-уведомление об ошибке сохранения
    }
  }, [
    tgUserData, isTgApp, playerLevel, playerName, gameCoins, jetCoins, currentXp, xpToNextLevel,
    incomeRatePerHour, accumulatedIncome, buildings, playerCars, selectedCarId, hiredStaff,
    hasCompletedTutorial // Добавлена зависимость hasCompletedTutorial
  ]);

  // Эффект для инициализации Telegram Web App
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setIsTgApp(true);
      const userData = tg.initDataUnsafe?.user || null;
      setTgUserData(userData);
      console.log('App: Telegram user data structure:', JSON.stringify(userData, null, 2));
      if (userData && typeof userData === 'object') {
        const firstName = userData.first_name || userData.firstName || userData.username || 'Игрок';
        setPlayerName(firstName);
        console.log('Player name set to:', firstName);
      } else {
        console.warn('No valid user data in tgUserData:', userData);
      }
      tg.ready();
      tg.expand();
      // Установка кнопки "Назад" или других элементов UI Telegram
      tg.BackButton.hide();
      tg.MainButton.hide();
    } else {
      setIsTgApp(false);
      console.warn('App: Telegram initData not found. Running in standalone mode.');
    }
    
    // При размонтировании компонента пытаемся сохранить время выхода
    // Это теперь будет делать saveGameState, но мы можем вызвать ее здесь
    // для фиксации последнего времени выхода перед закрытием
    return () => {
      // Здесь мы не можем использовать saveGameState напрямую, так как состояния могут быть устаревшими
      // Лучше использовать ссылку на функцию для чистой функции
      const userIdOnExit = tgUserData?.id?.toString() || 'default';
      if (userIdOnExit) {
        apiClient('/game_state', 'POST', {
          body: {
            userId: userIdOnExit,
            last_exit_time: new Date().toISOString(),
          }
        }).catch(err => console.error('Failed to save last exit time on unmount:', err));
      }
    };
  }, []); // Пустой массив зависимостей: эффект запускается только один раз при монтировании

  // Отдельный useEffect для загрузки данных
  useEffect(() => {
    const loadData = async () => {
      // Защита от повторной загрузки
      if (hasLoadedData) {
        console.log('Data already loaded, skipping...');
        return;
      }
      
      // КРИТИЧЕСКАЯ ПРОВЕРКА - ждем tgUserData
      if (isTgApp && (!tgUserData || !tgUserData.id)) {
        console.log('❌ Невозможно загрузить данные - tgUserData еще не готов!');
        return;
      }
      
      console.log('loadInitialData started...');
      setHasLoadedData(true);
      
      // Правильно определяем userId для загрузки
      const userId = tgUserData?.id?.toString() || 'default';
      console.log('Loading data for userId:', userId);
      
      try {
        const initialState = await apiClient('/game_state', 'GET', { params: { userId } });
        console.log('Получено начальное состояние от бэкенда:', initialState);

        if (initialState && typeof initialState === 'object') {
          // Обновляем состояние на основе загруженных данных
          setPlayerLevel(initialState.player_level ?? playerLevel);
          if (initialState.first_name && initialState.first_name !== 'Игрок') {
            setPlayerName(initialState.first_name);
            console.log('Имя игрока обновлено с бэкенда:', initialState.first_name);
          }
          
          // Преобразуем строки в числа и проверяем на адекватность
          let coinsToSet = initialState.game_coins;
          if (typeof coinsToSet === 'string') {
            coinsToSet = parseInt(coinsToSet) || STARTING_COINS;
          }
          
          // Если это первый запуск (уровень 1) и монет подозрительно много - сбрасываем
          if (playerLevel === 1 && coinsToSet > 10000 && coinsToSet !== STARTING_COINS) {
            console.warn('🚨 Сброс подозрительного баланса:', coinsToSet, '→', STARTING_COINS);
            coinsToSet = STARTING_COINS;
            // Здесь можно вызвать saveGameState, чтобы сбросить баланс на бэкенде
            saveGameState({ game_coins: STARTING_COINS });
          }
          
          setGameCoins(coinsToSet || STARTING_COINS);
          setJetCoins(parseInt(initialState.jet_coins) || 0);
          setCurrentXp(initialState.current_xp ?? currentXp);
          setXpToNextLevel(initialState.xp_to_next_level ?? xpToNextLevel);
          
          const savedTutorial = initialState.has_completed_tutorial;
          setHasCompletedTutorial(savedTutorial || false);
          
          if (!savedTutorial) {
            setTimeout(() => {
              setIsTutorialActive(true);
              setTutorialStep(0);
            }, 1000);
          }

          const loadedLastCollectedTime = initialState.last_collected_time ? new Date(initialState.last_collected_time).getTime() : Date.now();
          const loadedLastExitTime = initialState.last_exit_time ? new Date(initialState.last_exit_time).getTime() : loadedLastCollectedTime;
          lastCollectedTimeRef.current = isFinite(loadedLastCollectedTime) ? loadedLastCollectedTime : Date.now();
          console.log('Загружено время последнего сбора:', lastCollectedTimeRef.current);
          console.log('Загружено время последнего выхода:', loadedLastExitTime);

          const now = Date.now();
          const offlineTimeMs = Math.max(0, now - loadedLastExitTime);
          console.log('Оффлайн время (мс) с момента выхода:', offlineTimeMs);

          let loadedBuildings = INITIAL_BUILDINGS;
          if (initialState?.buildings && Array.isArray(initialState.buildings) && initialState.buildings.length > 0) {
              // Дополнительная проверка на валидность загруженных данных о зданиях
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
                  console.log("Используются здания из API:", loadedBuildings);
              } else {
                  console.warn("Здания из API недействительны, используются начальные здания.");
                  loadedBuildings = INITIAL_BUILDINGS;
              }
          } else {
              console.warn("Нет действительных зданий из API, используются начальные здания.");
              loadedBuildings = INITIAL_BUILDINGS;
          }
          setBuildings(loadedBuildings);

          const loadedHiredStaff = initialState.hired_staff ?? INITIAL_HIRED_STAFF;
          setHiredStaff(loadedHiredStaff);

          const loadedPlayerCarsRaw = Array.isArray(initialState.player_cars) ? initialState.player_cars : [INITIAL_CAR];
          const loadedPlayerCars = loadedPlayerCarsRaw.map(sc =>
            sc && sc.id && sc.parts ? { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats } : null
          ).filter(Boolean); // Фильтруем null, если есть невалидные объекты
          const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR];
          setPlayerCars(actualPlayerCars);

          const loadedSelectedCarId = initialState.selected_car_id;
          const finalSelectedCarId = loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
            ? loadedSelectedCarId
            : actualPlayerCars[0]?.id || INITIAL_CAR.id;
          setSelectedCarId(finalSelectedCarId);

          const carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0] || INITIAL_CAR;

          // Важно: если carToCalculateFrom отсутствует, это может привести к ошибкам
          if (!carToCalculateFrom) {
            console.error('Не удалось определить машину для расчета дохода. Используется INITIAL_CAR.');
            // Можно установить carToCalculateFrom в INITIAL_CAR для продолжения работы
          }

          const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
          setIncomeRatePerHour(initialTotalRate);
          let offlineIncome = 0;
          if (offlineTimeMs > 0 && initialTotalRate > 0) {
            offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600);
            console.log(`Рассчитан оффлайн доход: ${offlineIncome.toFixed(2)} за ${offlineTimeMs / 1000} секунд`);
          }
          setAccumulatedIncome(offlineIncome);
          console.log(`Финальный рассчитанный доход: ${initialTotalRate}/час, оффлайн доход: ${offlineIncome.toFixed(2)}`);
        } else {
          console.warn('Бэкенд вернул недействительное начальное состояние. Используются значения по умолчанию.');
          setError('Не удалось получить данные игрока');
          // Если данные невалидны, убедитесь, что состояния сброшены или установлены в разумные значения
          setBuildings(INITIAL_BUILDINGS);
          setPlayerCars([INITIAL_CAR]);
          setSelectedCarId(INITIAL_CAR.id);
          setHiredStaff(INITIAL_HIRED_STAFF);
          setIncomeRatePerHour(calculateTotalIncomeRate(INITIAL_BUILDINGS, INITIAL_CAR, INITIAL_HIRED_STAFF));
        }
      } catch (err) {
        console.error('Ошибка при получении начального состояния игры:', err.message);
        setError(`Ошибка загрузки: ${err.message}. Попробуйте позже.`);
      } finally {
        setIsLoading(false);
        console.log('isLoading установлено в false. Инициализация завершена.');
      }
    };

    // Запускаем загрузку, как только tgUserData.id или факт того, что это не TgApp, будет определен
    if (tgUserData?.id || !isTgApp) {
        loadData();
    } else {
        console.log('Ожидание tgUserData или определения режима работы (Telegram/Standalone)...');
    }
  }, [tgUserData?.id, isTgApp, hasLoadedData, saveGameState]); // Добавлена saveGameState в зависимости

  // Эффект для обновления дохода в реальном времени
  useEffect(() => {
    if (incomeRatePerHour <= 0 || isLoading) return;
    console.log('Таймер дохода запущен со скоростью:', incomeRatePerHour);
    const incomePerSecond = incomeRatePerHour / 3600;
    const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000;
      if (!isFinite(timePassedTotalSeconds) || !isFinite(incomePerSecond) || timePassedTotalSeconds < 0) {
        console.error('Неверное время или скорость дохода:', { timePassedTotalSeconds, incomePerSecond, now, lastCollectedTime: lastCollectedTimeRef.current });
        return;
      }
      const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
      const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
      setAccumulatedIncome(isFinite(newAccumulated) && newAccumulated >= 0 ? newAccumulated : 0);
    }, UPDATE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [incomeRatePerHour, isLoading]);

  const handleCollect = () => {
    const incomeToAdd = Math.floor(accumulatedIncome);
    if (incomeToAdd > 0) {
      const newTotalCoins = gameCoins + incomeToAdd;
      setGameCoins(newTotalCoins);
      setAccumulatedIncome(0);
      const collectionTime = Date.now();
      lastCollectedTimeRef.current = collectionTime;
      console.log(`Собрано ${incomeToAdd} GC.`);
      
      // Проверяем шаг туториала
      if (isTutorialActive && tutorialStep === 3) {
        setTimeout(() => {
          setTutorialStep(4);
        }, 500);
      }
      
      // Вызываем глобальную функцию сохранения
      saveGameState({
        game_coins: newTotalCoins,
        last_collected_time: new Date(collectionTime).toISOString(),
      });
    }
  };

  const handleBuildingClick = (buildingName) => {
    const targetBuilding = buildings.find(b => b.name === buildingName);
    if (!targetBuilding || targetBuilding.isLocked) return;
    const cost = calculateBuildingCost(targetBuilding.id, targetBuilding.level);
    if (gameCoins >= cost) {
      const newCoins = gameCoins - cost;
      const updatedBuildings = buildings.map(b =>
        b.name === buildingName ? { ...b, level: b.level + 1 } : b
      );
      // Важно: пересчитываем ставку ДО сохранения, чтобы она была актуальной
      const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar, hiredStaff);

      setGameCoins(newCoins);
      setBuildings(updatedBuildings);
      setIncomeRatePerHour(newTotalRate); // Обновляем состояние ставки дохода
      console.log(`Здание ${buildingName} улучшено. Новая ставка: ${newTotalRate}/час.`);
      
      // Вызываем глобальную функцию сохранения с обновленными зданиями и ставкой
      saveGameState({
        game_coins: newCoins,
        buildings: updatedBuildings,
        income_rate_per_hour: newTotalRate, // Отправляем новую ставку
      });
    }
  };

  const handleOpenTuning = () => {
    console.log('Открытие экрана тюнинга');
    setIsTuningVisible(true);
  };

  const handleCloseTuning = () => setIsTuningVisible(false);

  const handleUpgradePart = (partId) => {
    console.log('handleUpgradePart вызван с partId:', partId, 'Текущая машина:', currentCar);
    if (!currentCar?.parts?.[partId]) {
      console.error('Неверная деталь или машина:', partId, currentCar);
      return;
    }
    const part = currentCar.parts[partId];
    const cost = calculateUpgradeCost(partId, part.level);
    console.log('Стоимость улучшения:', cost, 'Игровые монеты:', gameCoins);
    if (gameCoins >= cost && cost !== Infinity) {
      const newCoins = gameCoins - cost;
      const updatedParts = { ...currentCar.parts, [partId]: { ...part, level: part.level + 1 } };
      const { stats: newStats } = recalculateStatsAndIncomeBonus(currentCar.id, updatedParts);
      
      const updatedPlayerCars = playerCars.map(car =>
        car.id === selectedCarId ? { ...car, parts: updatedParts, stats: newStats } : car
      );
      
      const updatedCarForRate = updatedPlayerCars.find(c => c.id === selectedCarId);
      let newTotalRate = incomeRatePerHour; // Сохраняем текущую ставку на случай, если машина не найдена
      if (updatedCarForRate) {
        newTotalRate = calculateTotalIncomeRate(buildings, updatedCarForRate, hiredStaff);
        setIncomeRatePerHour(newTotalRate);
        console.log('Новая ставка дохода после улучшения:', newTotalRate);
      } else {
        console.warn('Не удалось найти обновленную машину для пересчета ставки дохода.');
      }
      
      setGameCoins(newCoins);
      setPlayerCars(updatedPlayerCars);
      console.log(`Деталь "${part.name}" улучшена. Новые монеты: ${newCoins}`);
      
      // Вызываем глобальную функцию сохранения
      saveGameState({
        game_coins: newCoins,
        player_cars: updatedPlayerCars,
        income_rate_per_hour: newTotalRate,
      });
    } else {
      console.log('Недостаточно монет для улучшения или неверная стоимость:', cost);
    }
  };

  const handleStartRace = async (difficulty) => {
    if (!currentCar) return { result: 'error', reward: null };
    const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp);
    if (raceOutcome) {
      setGameCoins(raceOutcome.newGameCoins);
      setCurrentXp(raceOutcome.newCurrentXp);
      
      // Вызываем глобальную функцию сохранения
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
    const carData = CAR_CATALOG.find(c => c.id === carIdToBuy);
    if (!carData || gameCoins < carData.price || playerCars.some(c => c.id === carIdToBuy)) return;
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
    console.log(`Куплена машина ${carData.name}.`);
    
    // Вызываем глобальную функцию сохранения
    saveGameState({
      game_coins: newCoins,
      player_cars: updatedPlayerCars,
    });
  };

  const handleHireOrUpgradeStaff = (staffId) => {
    console.log('handleHireOrUpgradeStaff вызван с staffId:', staffId);
    const cost = calculateStaffCost(staffId, hiredStaff);
    console.log('Стоимость персонала:', cost, 'Игровые монеты:', gameCoins);
    if (gameCoins >= cost && cost !== Infinity) {
      const newCoins = gameCoins - cost;
      const updatedHiredStaff = { ...hiredStaff, [staffId]: (hiredStaff[staffId] || 0) + 1 };
      
      // Важно: пересчитываем ставку ДО сохранения, чтобы она была актуальной
      const newTotalRate = calculateTotalIncomeRate(buildings, currentCar, updatedHiredStaff);

      setGameCoins(newCoins);
      setHiredStaff(updatedHiredStaff);
      setIncomeRatePerHour(newTotalRate); // Обновляем состояние ставки дохода
      console.log(`Нанят/улучшен персонал ${staffId}. Новая ставка: ${newTotalRate}/час`);
      
      // Вызываем глобальную функцию сохранения
      saveGameState({
        game_coins: newCoins,
        hired_staff: updatedHiredStaff,
        income_rate_per_hour: newTotalRate, // Отправляем новую ставку
      });
    } else {
      console.log('Недостаточно монет для найма/улучшения персонала:', cost);
    }
  };

  const handleNavClick = (screenId) => {
    console.log('Навигация:', screenId);
    setIsTuningVisible(false);
    setIsCarSelectorVisible(false);
    setActiveScreen(screenId);
  };

  const handleOpenCarSelector = () => setIsCarSelectorVisible(true);
  const handleCloseCarSelector = () => setIsCarSelectorVisible(false);

  const handleSelectCar = (carId) => {
    if (carId !== selectedCarId) {
      setSelectedCarId(carId);
      const newSelectedCar = playerCars.find(c => c.id === carId);
      let newTotalRate = incomeRatePerHour;
      if (newSelectedCar) {
        newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff);
        setIncomeRatePerHour(newTotalRate);
      }
      
      // Вызываем глобальную функцию сохранения
      saveGameState({
        selected_car_id: carId,
        income_rate_per_hour: newTotalRate,
      });
    }
    setIsCarSelectorVisible(false);
  };

  const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;
  
  // Функции для туториала
  const handleTutorialNext = () => {
    setTutorialStep(prev => prev + 1);
  };
  
  const handleTutorialComplete = () => {
    setIsTutorialActive(false);
    setHasCompletedTutorial(true);
    
    // При завершении туториала сохраняем все текущее состояние
    saveGameState({
      has_completed_tutorial: true,
      // Остальные поля уже будут включены в saveGameState
    });
  };
  
  const handleTutorialAction = (action) => {
    if (action === 'expand-buildings') {
      // Больше не нужно, так как здания всегда видимы
    } else if (action === 'close-tuning') {
      // Закрываем тюнинг если он открыт
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
      
      {/* Компонент туториала */}
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
