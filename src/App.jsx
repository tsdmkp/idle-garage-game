import React, { useState, useEffect, useRef } from 'react';
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
import LeaderboardScreen from './components/LeaderboardScreen';
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
    const [logs, setLogs] = useState([]);

    const currentCar = playerCars.find(car => car.id === selectedCarId) || playerCars[0] || null;

    const addLog = (message) => {
        setLogs((prevLogs) => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    useEffect(() => {
        addLog('Initializing Telegram WebApp');
        const initializeTelegram = () => {
            const tg = window.Telegram?.WebApp;
            if (tg) {
                addLog('Telegram WebApp detected');
                try {
                    tg.ready();
                    addLog('Posting web_app_ready event');
                    tg.expand();
                    addLog('Posting web_app_expand event');
                    const user = tg.initDataUnsafe?.user;
                    addLog(`User data: ${JSON.stringify(user)}`);
                    if (user) {
                        addLog('User data received, setting tgUserData');
                        setTgUserData(user);
                        setIsTgApp(true);
                        setPlayerName(user.first_name || 'Игрок');
                    } else {
                        addLog('No user data found, setting error');
                        setIsTgApp(false);
                        setError('Не удалось получить данные пользователя Telegram');
                    }
                } catch (error) {
                    addLog(`Error initializing Telegram WebApp: ${error.message}`);
                    setIsTgApp(false);
                    setError('Ошибка инициализации Telegram WebApp');
                }
            } else {
                addLog('Telegram WebApp not found');
                setIsTgApp(false);
                setError('Telegram WebApp не найден');
            }
        };

        initializeTelegram();
    }, []);

    useEffect(() => {
        if (tgUserData !== null) {
            addLog('tgUserData initialized, starting loadInitialData');
            loadInitialData();
        }
    }, [tgUserData]);

    const loadInitialData = async () => {
        addLog('loadInitialData started...');
        let loadedBuildings = buildings;
        let loadedHiredStaff = hiredStaff;
        let carToCalculateFrom = currentCar || INITIAL_CAR;

        try {
            const userId = tgUserData?.id?.toString() || 'default';
            addLog(`Using userId: ${userId}`);
            const initialState = await apiClient('/game_state', 'GET', { params: { userId } });
            addLog(`Received initial state from backend: ${JSON.stringify(initialState)}`);

            if (initialState && typeof initialState === 'object') {
                setPlayerLevel(Number(initialState.player_level) || playerLevel);
                setPlayerName(tgUserData?.first_name || initialState.first_name || 'Игрок');
                setGameCoins(Number(initialState.game_coins) || gameCoins);
                setJetCoins(Number(initialState.jet_coins) || jetCoins);
                setCurrentXp(Number(initialState.current_xp) || currentXp);
                setXpToNextLevel(Number(initialState.xp_to_next_level) || xpToNextLevel);
                setIncomeRatePerHour(Number(initialState.income_rate_per_hour) || 0);
                const loadedTime = initialState.last_collected_time
                    ? Number(initialState.last_collected_time)
                    : Date.now();
                lastCollectedTimeRef.current = loadedTime;

                loadedBuildings = Array.isArray(initialState.buildings)
                    ? initialState.buildings
                    : INITIAL_BUILDINGS;
                setBuildings(loadedBuildings);

                loadedHiredStaff = initialState.hired_staff || hiredStaff;
                setHiredStaff(loadedHiredStaff);

                const loadedPlayerCarsRaw = Array.isArray(initialState.player_cars)
                    ? initialState.player_cars
                    : [INITIAL_CAR];
                const loadedPlayerCars = loadedPlayerCarsRaw
                    .map(sc =>
                        sc && sc.id && sc.parts
                            ? { ...sc, stats: recalculateStatsAndIncomeBonus(sc.id, sc.parts).stats }
                            : null
                    )
                    .filter(Boolean);
                const actualPlayerCars = loadedPlayerCars.length > 0 ? loadedPlayerCars : [INITIAL_CAR];
                setPlayerCars(actualPlayerCars);

                const loadedSelectedCarId = initialState.selected_car_id;
                const finalSelectedCarId =
                    loadedSelectedCarId && actualPlayerCars.some(c => c.id === loadedSelectedCarId)
                        ? loadedSelectedCarId
                        : actualPlayerCars[0]?.id || INITIAL_CAR.id;
                setSelectedCarId(finalSelectedCarId);

                carToCalculateFrom = actualPlayerCars.find(c => c.id === finalSelectedCarId) || actualPlayerCars[0];
                addLog(`Loaded carToCalculateFrom: ${JSON.stringify(carToCalculateFrom)}`);

                if (!carToCalculateFrom) throw new Error('Ошибка определения машины после загрузки');
            } else {
                addLog('Backend returned invalid initial state. Using current state as defaults.');
                setError('Не удалось получить данные игрока.');
                loadedBuildings = buildings;
                carToCalculateFrom = currentCar || INITIAL_CAR;
                loadedHiredStaff = hiredStaff;
            }
        } catch (err) {
            addLog(`Failed to fetch initial game state: ${err.message}`);
            setError(`Ошибка загрузки: ${err.message}`);
            loadedBuildings = buildings;
            carToCalculateFrom = currentCar || INITIAL_CAR;
            loadedHiredStaff = hiredStaff;
        } finally {
            addLog('Entering finally block...');
            if (carToCalculateFrom) {
                const initialTotalRate = calculateTotalIncomeRate(loadedBuildings, carToCalculateFrom, loadedHiredStaff);
                setIncomeRatePerHour(Number(initialTotalRate) || 0);
                const now = Date.now();
                const offlineTimeMs = now - lastCollectedTimeRef.current;
                let offlineIncome = 0;
                if (offlineTimeMs > 0 && initialTotalRate > 0) {
                    offlineIncome =
                        (initialTotalRate / 3600) * Math.min(offlineTimeMs / 1000, MAX_OFFLINE_HOURS * 3600);
                }
                setAccumulatedIncome(Number(offlineIncome) || 0);
                addLog(`Final calculated rate: ${initialTotalRate}/h, offline income: ${offlineIncome.toFixed(2)}`);
            } else {
                addLog('Finally block: carToCalculateFrom is not set!');
                setIncomeRatePerHour(0);
                setAccumulatedIncome(0);
                if (!error) setError('Критическая ошибка инициализации.');
            }
            setIsLoading(false);
            addLog('isLoading set to false. Initialization finished.');
        }
    };

    useEffect(() => {
        if (incomeRatePerHour <= 0 || isLoading) return;
        const incomePerSecond = incomeRatePerHour / 3600;
        const maxAccumulationCap = incomeRatePerHour * MAX_OFFLINE_HOURS;
        const intervalId = setInterval(() => {
            const now = Date.now();
            const lastTime = Number(lastCollectedTimeRef.current) || now;
            const timePassedTotalSeconds = (now - lastTime) / 1000;
            const potentialTotalIncome = timePassedTotalSeconds * incomePerSecond;
            const newAccumulated = Math.min(potentialTotalIncome, maxAccumulationCap);
            setAccumulatedIncome(Number(newAccumulated) || 0);
            addLog(`Accumulated income: ${newAccumulated}`);
        }, UPDATE_INTERVAL);
        return () => clearInterval(intervalId);
    }, [incomeRatePerHour, isLoading]);

    const handleCollect = () => {
        const incomeToAdd = Math.floor(Number(accumulatedIncome) || 0);
        if (incomeToAdd > 0) {
            const newTotalCoins = Number(gameCoins) + incomeToAdd;
            setGameCoins(newTotalCoins);
            setAccumulatedIncome(0);
            const collectionTime = Date.now();
            lastCollectedTimeRef.current = collectionTime;
            addLog(`Collected ${incomeToAdd} GC.`);
            apiClient('/game_state', 'POST', {
                body: {
                    userId: tgUserData?.id?.toString() || 'default',
                    first_name: tgUserData?.first_name || 'Игрок',
                    game_coins: newTotalCoins,
                    last_collected_time: collectionTime,
                    income_rate_per_hour: incomeRatePerHour
                }
            }).catch(err => addLog(`Failed to save collect: ${err.message}`));
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
            addLog(`Building ${buildingName} upgraded. New rate: ${newTotalRate}/hour.`);
            apiClient('/game_state', 'POST', {
                body: {
                    userId: tgUserData?.id?.toString() || 'default',
                    first_name: tgUserData?.first_name || 'Игрок',
                    game_coins: newCoins,
                    buildings: updatedBuildings,
                    income_rate_per_hour: newTotalRate
                }
            }).catch(err => addLog(`Failed to save building: ${err.message}`));
        }
    };

    const handleOpenTuning = () => setIsTuningVisible(true);
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
            addLog(`Part "${part.name}" upgraded. New rate: ${incomeRatePerHour}/hour.`);
            apiClient('/game_state', 'POST', {
                body: {
                    userId: tgUserData?.id?.toString() || 'default',
                    first_name: tgUserData?.first_name || 'Игрок',
                    game_coins: newCoins,
                    player_cars: updatedPlayerCars,
                    income_rate_per_hour: incomeRatePerHour
                }
            }).catch(err => addLog(`Failed to save part upgrade: ${err.message}`));
        }
    };

    const handleStartRace = async (difficulty) => {
        if (!currentCar) return { result: 'error', reward: null };
        const raceOutcome = await simulateRace(currentCar, difficulty, gameCoins, currentXp);
        if (raceOutcome) {
            setGameCoins(raceOutcome.newGameCoins);
            setCurrentXp(raceOutcome.newCurrentXp);
            addLog(`Race result: ${raceOutcome.result}, reward: ${raceOutcome.reward}`);
            apiClient('/game_state', 'POST', {
                body: {
                    userId: tgUserData?.id?.toString() || 'default',
                    first_name: tgUserData?.first_name || 'Игрок',
                    game_coins: raceOutcome.newGameCoins,
                    current_xp: raceOutcome.newCurrentXp,
                    income_rate_per_hour: incomeRatePerHour
                }
            }).catch(err => addLog(`Failed to save race: ${err.message}`));
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
        addLog(`Bought car ${carData.name}.`);
        apiClient('/game_state', 'POST', {
            body: {
                userId: tgUserData?.id?.toString() || 'default',
                first_name: tgUserData?.first_name || 'Игрок',
                game_coins: newCoins,
                player_cars: updatedPlayerCars,
                income_rate_per_hour: incomeRatePerHour
            }
        }).catch(err => addLog(`Failed to save car purchase: ${err.message}`));
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
            addLog(`Hired/upgraded staff ${staffId}. New rate: ${newTotalRate}/hour.`);
            apiClient('/game_state', 'POST', {
                body: {
                    userId: tgUserData?.id?.toString() || 'default',
                    first_name: tgUserData?.first_name || 'Игрок',
                    game_coins: newCoins,
                    hired_staff: updatedHiredStaff,
                    income_rate_per_hour: newTotalRate
                }
            }).catch(err => addLog(`Failed to save staff: ${err.message}`));
        }
    };

    const handleNavClick = (screenId) => {
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
            addLog(`Selected car ${carId}. New rate: ${incomeRatePerHour}/hour.`);
            apiClient('/game_state', 'POST', {
                body: {
                    userId: tgUserData?.id?.toString() || 'default',
                    first_name: tgUserData?.first_name || 'Игрок',
                    selected_car_id: carId,
                    income_rate_per_hour: incomeRatePerHour
                }
            }).catch(err => addLog(`Failed to save car selection: ${err.message}`));
        }
        setIsCarSelectorVisible(false);
    };

    const xpPercentage = xpToNextLevel > 0 ? Math.min((currentXp / xpToNextLevel) * 100, 100) : 0;

    if (isLoading) {
        return (
            <div className="loading-screen">
                <h2>Загрузка данных...</h2>
                <p>Логи:</p>
                <ul className="log-list">
                    {logs.map((log, index) => (
                        <li key={index}>{log}</li>
                    ))}
                </ul>
                <style>
                    {`
                        .loading-screen {
                            padding: 20px;
                            color: #fff;
                            background-color: #222;
                            min-height: 100vh;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .log-list {
                            list-style: none;
                            padding: 0;
                            max-height: 200px;
                            overflow-y: auto;
                            width: 90%;
                        }
                    `}
                </style>
            </div>
        );
    }
    if (error) {
        return (
            <div className="error-screen">
                <h2>Ошибка</h2>
                <p>{error}</p>
                <p>Логи:</p>
                <ul className="log-list">
                    {logs.map((log, index) => (
                        <li key={index}>{log}</li>
                    ))}
                </ul>
                <button onClick={() => window.location.reload()}>Попробовать снова</button>
                <style>
                    {`
                        .error-screen {
                            padding: 20px;
                            color: #fff;
                            background-color: #222;
                            min-height: 100vh;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .log-list {
                            list-style: none;
                            padding: 0;
                            max-height: 200px;
                            overflow-y: auto;
                            width: 90%;
                        }
                    `}
                </style>
            </div>
        );
    }

    return (
        <div className="App" style={{ paddingBottom: '70px' }}>
            <div className="header-container">
                <Header
                    level={playerLevel}
                    playerName={playerName}
                    gameCoins={gameCoins}
                    jetCoins={jetCoins}
                    xpPercentage={xpPercentage}
                />
            </div>
            <main className="main-content">
                {activeScreen === 'garage' && currentCar && (
                    <>
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
                    </>
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
                        calculateCost={(id) => calculateStaffCost(id, hiredStaff)}
                    />
                )}
                {activeScreen === 'leaderboard' && (
                    <LeaderboardScreen tgUserData={tgUserData} />
                )}
                {activeScreen === 'p2e' && (
                    <div className="placeholder-screen" style={placeholderStyle}>
                        P2E
                    </div>
                )}
            </main>
            {isTuningVisible && currentCar && (
                <TuningScreen
                    car={currentCar}
                    gameCoins={gameCoins}
                    onUpgradePart={handleUpgradePart}
                    onClose={handleCloseTuning}
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
                onNavClick={handleNavClick}
            />
        </div>
    );
}

const placeholderStyle = {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'white',
    fontSize: '1.2em',
    opacity: 0.7
};

export default App;