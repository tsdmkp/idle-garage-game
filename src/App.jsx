import React, { useState, useEffect, useRef } from 'react';
// Импорты компонентов
import Header from './components/Header';
import GarageArea from './components/GarageArea';
import IncomeArea from './components/IncomeArea';
import BuildingArea from './components/BuildingArea';
import NavBar from './components/NavBar';
import TuningScreen from './components/TuningScreen';
import RaceScreen from './components/RaceScreen';
import ShopScreen from './components/ShopScreen';
import StaffScreen from './components/StaffScreen';
import CarSelector from './components/CarSelector';
// Импорт утилит
import {
    calculateUpgradeCost,
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
// Импорт API клиента
import apiClient from './apiClient';
import './App.css';

// Начальное состояние машины (константа)
const INITIAL_CAR = getInitialPlayerCar();
// Начальное состояние персонала (константа)
const INITIAL_HIRED_STAFF = (() => {
    const init = {};
    for (const id in STAFF_CATALOG) {
        init[id] = 0;
    }
    return init;
})();

// ========= КОМПОНЕНТ APP =========
function App() {
    // --- Состояния ---
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tgUserData, setTgUserData] = useState(null);
    const [isTgApp, setIsTgApp] = useState(false);
    const [playerLevel, setPlayerLevel] = useState(1);
    const [playerName, setPlayerName] = useState("Игрок");
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

    // --- Вычисляемая переменная для текущей выбранной машины ---
    const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;

    // --- Эффект для Telegram и имени ---
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            setIsTgApp(true);
            const userData = tg.initDataUnsafe?.user || null;
            setTgUserData(userData);
            console.log('App: Telegram user data:', userData);
            if (userData?.first_name) {
                setPlayerName(userData.first_name);
            }
            tg.ready();
            tg.expand();
        } else {
            setIsTgApp(false);
            console.warn('App: Telegram initData not found.');
        }
        loadInitialData();
    }, []);

    // --- Асинхронная Функция Загрузки Данных ---
    const loadInitialData = async () => {
        console.log("loadInitialData started...");
        let loadedBuildings = buildings;
        let loadedHiredStaff = hiredStaff;
        let carToCalculateFrom = currentCar || INITIAL_CAR;

        try {
            console.log("Attempting apiClient call...");
            const userId = tgUserData?.id?.toString() || 'default';
            const initialState = await apiClient('/game_state', 'GET', { params: { userId } });
            console.log("Received initial state from backend:", initialState);

            if (initialState && typeof initialState === 'object') {
                // --- Установка простых состояний ---
                setPlayerLevel(initialState.player_level ?? playerLevel);
                setPlayerName(initialState.first_name || tgUserData?.first_name || playerName);
                setGameCoins(initialState.game_coins ?? gameCoins);
                setJetCoins(initialState.jet_coins ?? jetCoins);
                setCurrentXp(initialState.current_xp ?? currentXp);
                setXpToNextLevel(initialState.xp_to_next_level ?? xpToNextLevel);
                const loadedTime = initialState.last_collected_time ? new Date(initialState.last_collected_time).getTime() : Date.now();
                lastCollectedTimeRef.current = loadedTime;

                // --- Обработка сложных состояний ---
                loadedBuildings = Array.isArray(initialState.buildings) ? initialState.buildings : INITIAL_BUILDINGS;
                setBuildings(loadedBuildings);

                loadedHiredStaff = initialState.hired_staff ?? hiredStaff;
                setHiredStaff(loadedHiredStaff);

                const loadedPlayerCarsRaw = Array.isArray(initialState.player_cars) ? initialState.player_cars : [INITIAL_CAR];
                const loadedPlayerCars = loadedPlayerCarsRaw.map(sc =>
                    sc && sc.id && sc.parts ? { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats } : null
                ).filter(Boolean);
                const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR];
                setPlayerCars(actualPlayerCars);

                const loadedSelectedCarId = initialState.selected_car_id;
                const finalSelectedCarId = loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
                    ? loadedSelectedCarId
                    : actualPlayerCars[0]?.id || INITIAL_CAR.id;
                setSelectedCarId(finalSelectedCarId);

                carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0];

                if (!carToCalculateFrom) throw new Error("Ошибка определения машины после загрузки");
            } else {
                console.warn("Backend returned invalid initial state. Using current state as defaults.");
                setError("Не удалось получить данные игрока.");
                loadedBuildings = buildings;
                carToCalculateFrom = currentCar || INITIAL_CAR;
                loadedHiredStaff = hiredStaff;
                setPlayerName(tgUserData?.first_name || playerName);
            }
        } catch (err) {
            console.error("Failed to fetch initial game state:", err.message);
            setError(`Ошибка загрузки: ${err.message}`);
            loadedBuildings = buildings;
            carToCalculateFrom = currentCar || INITIAL_CAR;
            loadedHiredStaff = hiredStaff;
        } finally {
            console.log("Entering finally block...");
            if (carToCalculateFrom) {
                const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
                setIncomeRatePerHour(initialTotalRate);
                const now = Date.now();
                const offlineTimeMs = now - lastCollectedTimeRef.current;
                let offlineIncome = 0;
                if (offlineTimeMs > 0 && initialTotalRate > 0) {
                    offlineIncome = (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600);
                }
                setAccumulatedIncome(offlineIncome);
                console.log(`Final calculated rate: ${initialTotalRate}/h, offline income: ${offlineIncome.toFixed(2)}`);
            } else {
                console.error("Finally block: carToCalculateFrom is not set!");
                setIncomeRatePerHour(0);
                setAccumulatedIncome(0);
                if (!error) setError("Критическая ошибка инициализации.");
            }
            setIsLoading(false);
            console.log("isLoading set to false. Initialization finished.");
        }
    };

    // --- Эффект Таймера Дохода ---
    useEffect(() => {
        if (incomeRatePerHour <= 0 || isLoading) return;
        console.log("Income timer started with rate:", incomeRatePerHour);
        const incomePerSecond = incomeRatePerHour / 3600;
        const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
        const intervalId = setInterval(() => {
            const now = Date.now();
            const timePassedTotalSeconds = (now - lastCollectedTimeRef.current) / 1000;
            if (!isFinite(timePassedTotalSeconds) || !isFinite(incomePerSecond)) {
                console.error("Invalid time or income rate:", { timePassedTotalSeconds, incomePerSecond });
                return;
            }
            const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
            const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
            console.log("Accumulated income:", newAccumulated);
            setAccumulatedIncome(isFinite(newAccumulated) && newAccumulated > 0 ? newAccumulated : 0);
        }, UPDATE_INTERVAL);
        return () => clearInterval(intervalId);
    }, [incomeRatePerHour, isLoading]);

    // --- Функции Обработчики ---
    const handleCollect = () => {
        const incomeToAdd = Math.floor(accumulatedIncome);
        if (incomeToAdd > 0) {
            const newTotalCoins = gameCoins + incomeToAdd;
            setGameCoins(newTotalCoins);
            setAccumulatedIncome(0);
            const collectionTime = Date.now();
            lastCollectedTimeRef.current = collectionTime;
            console.log(`Collected ${incomeToAdd} GC.`);
            const userId = tgUserData?.id?.toString() || 'default';
            apiClient('/game_state', 'POST', {
                userId,
                game_coins: newTotalCoins,
                last_collected_time: collectionTime,
                income_rate_per_hour: incomeRatePerHour,
                buildings,
                player_cars: playerCars,
                hired_staff: hiredStaff,
                selected_car_id: selectedCarId
            }).catch(err => console.error('Failed to save collect:', err));
        }
    };

    const handleBuildingClick = (buildingName) => {
        const targetBuilding = buildings.find(b => b.name === buildingName);
        if (!targetBuilding || targetBuilding.isLocked) return;
        const cost = 100 * Math.pow(2, targetBuilding.level);
        if (gameCoins >= cost) {
            const newCoins = gameCoins - cost;
            const updatedBuildings = buildings.map(b =>
                b.name === buildingName ? { ...b, level: b.level + 1 } : b
            );
            const newTotalRate = calculateTotalIncomeRate(updatedBuildings, currentCar, hiredStaff);
            setGameCoins(newCoins);
            setBuildings(updatedBuildings);
            setIncomeRatePerHour(newTotalRate);
            console.log(`Building ${buildingName} upgraded. New rate: ${newTotalRate}/hour.`);
            const userId = tgUserData?.id?.toString() || 'default';
            apiClient('/game_state', 'POST', {
                userId,
                game_coins: newCoins,
                buildings: updatedBuildings,
                income_rate_per_hour: newTotalRate,
                player_cars: playerCars,
                hired_staff: hiredStaff,
                selected_car_id: selectedCarId
            }).catch(err => console.error('Failed to save building:', err));
        }
    };

    const handleOpenTuning = () => {
        console.log("Opening Tuning Screen");
        setIsTuningVisible(true);
    };
    const handleCloseTuning = () => setIsTuningVisible(false);

    const handleUpgradePart = (partId) => {
        if (!currentCar?.parts?.[partId]) return;
        const part = currentCar.parts[partId];
        const cost = calculateUpgradeCost(partId, part.level);
        if (gameCoins >= cost) {
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
            }
            setGameCoins(newCoins);
            setPlayerCars(updatedPlayerCars);
            console.log(`Part "${part.name}" upgraded. New rate: ${incomeRatePerHour}/hour.`);
            const userId = tgUserData?.id?.toString() || 'default';
            apiClient('/game_state', 'POST', {
                userId,
                game_coins: newCoins,
                player_cars: updatedPlayerCars,
                income_rate_per_hour: incomeRatePerHour,
                buildings,
                hired_staff: hiredStaff,
                selected_car_id: selectedCarId
            }).catch(err => console.error('Failed to save part upgrade:', err));
        }
    };

    const handleStartRace = async (difficulty) => {
        if (!currentCar) return { result: 'error', reward: null };
        const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp);
        if (raceOutcome) {
            setGameCoins(raceOutcome.newGameCoins);
            setCurrentXp(raceOutcome.newCurrentXp);
            const userId = tgUserData?.id?.toString() || 'default';
            apiClient('/game_state', 'POST', {
                userId,
                game_coins: raceOutcome.newGameCoins,
                current_xp: raceOutcome.newCurrentXp,
                income_rate_per_hour: incomeRatePerHour,
                buildings,
                player_cars: playerCars,
                hired_staff: hiredStaff,
                selected_car_id: selectedCarId
            }).catch(err => console.error('Failed to save race:', err));
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
        console.log(`Bought car ${carData.name}.`);
        const userId = tgUserData?.id?.toString() || 'default';
        apiClient('/game_state', 'POST', {
            userId,
            game_coins: newCoins,
            player_cars: updatedPlayerCars,
            income_rate_per_hour: incomeRatePerHour,
            buildings,
            hired_staff: hiredStaff,
            selected_car_id: selectedCarId
        }).catch(err => console.error('Failed to save car purchase:', err));
    };

    const handleHireOrUpgradeStaff = (staffId) => {
        const cost = calculateStaffCost(staffId, hiredStaff);
        if (gameCoins >= cost && cost !== Infinity) {
            const newCoins = gameCoins - cost;
            const updatedHiredStaff = { ...hiredStaff, [staffId]: (hiredStaff[staffId] || 0) + 1 };
            const newTotalRate = calculateTotalIncomeRate(buildings, currentCar, updatedHiredStaff);
            setGameCoins(newCoins);
            setHiredStaff(updatedHiredStaff);
            setIncomeRatePerHour(newTotalRate);
            console.log(`Hired/upgraded staff ${staffId}. New rate: ${newTotalRate}/hour.`);
            const userId = tgUserData?.id?.toString() || 'default';
            apiClient('/game_state', 'POST', {
                userId,
                game_coins: newCoins,
                hired_staff: updatedHiredStaff,
                income_rate_per_hour: newTotalRate,
                buildings,
                player_cars: playerCars,
                selected_car_id: selectedCarId
            }).catch(err => console.error('Failed to save staff:', err));
        }
    };

    const handleNavClick = (screenId) => {
        console.log("Nav click:", screenId);
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
            if (newSelectedCar) {
                const newTotalRate = calculateTotalIncomeRate(buildings, newSelectedCar, hiredStaff);
                setIncomeRatePerHour(newTotalRate);
            }
            const userId = tgUserData?.id?.toString() || 'default';
            apiClient('/game_state', 'POST', {
                userId,
                selected_car_id: carId,
                income_rate_per_hour: incomeRatePerHour,
                buildings,
                player_cars: playerCars,
                hired_staff: hiredStaff
            }).catch(err => console.error('Failed to save car selection:', err));
        }
        setIsCarSelectorVisible(false);
    };

    // --- Расчеты для Рендера ---
    const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

    // --- Рендер Компонента ---
    if (isLoading) {
        return <div className="loading-screen">Загрузка данных...</div>;
    }
    if (error) {
        return <div className="error-screen">Ошибка: {error}</div>;
    }

    return (
        <div className="App">
            {/* ФИКСИРОВАННЫЙ ХЕДЕР */}
            <div className="header-container">
                <Header
                    level={playerLevel}
                    playerName={playerName}
                    gameCoins={gameCoins}
                    jetCoins={jetCoins}
                    xpPercentage={xpPercentage}
                />
            </div>

            {/* ОСНОВНОЙ КОНТЕНТ */}
            <main className="main-content">
                {/* ЭКРАН ГАРАЖА - КОМПАКТНАЯ КОМПОНОВКА */}
                {activeScreen === 'garage' && currentCar && (
                    <div className="garage-screen-layout">
                        <GarageArea
                            car={currentCar}
                            onTuneClick={handleOpenTuning}
                            onOpenCarSelector={handleOpenCarSelector}
                        />
                        <IncomeArea
                            incomeRate={incomeRatePerHour}
                            accumulatedIncome={accumulatedIncome}
                            maxAccumulation={incomeRatePerHour * MAX_OFFLINE_HOURS}
                            onCollect={handleCollect}
                        />
                        <BuildingArea
                            buildings={buildings}
                            onBuildingClick={handleBuildingClick}
                        />
                    </div>
                )}

                {/* ЭКРАН ГОНОК */}
                {activeScreen === 'race' && currentCar && (
                    <RaceScreen
                        playerCar={currentCar}
                        onStartRace={handleStartRace}
                    />
                )}

                {/* ЭКРАН АВТОСАЛОНА */}
                {activeScreen === 'shop' && (
                    <ShopScreen
                        catalog={CAR_CATALOG}
                        playerCars={playerCars}
                        gameCoins={gameCoins}
                        onBuyCar={handleBuyCar}
                    />
                )}

                {/* ЭКРАН ПЕРСОНАЛА */}
                {activeScreen === 'staff' && (
                    <StaffScreen
                        staffCatalog={STAFF_CATALOG}
                        hiredStaff={hiredStaff}
                        gameCoins={gameCoins}
                        onHireOrUpgrade={handleHireOrUpgradeStaff}
                        calculateCost={(id) => calculateStaffCost(id, hiredStaff)}
                    />
                )}

                {/* ЭКРАН P2E */}
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

            {/* МОДАЛЬНЫЕ ОКНА */}
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

            {/* НИЖНЯЯ НАВИГАЦИЯ */}
            <NavBar
                activeScreen={activeScreen}
                onScreenChange={handleNavClick}
            />
        </div>
    );
}

export default App;