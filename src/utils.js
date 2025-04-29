// src/utils.js

console.log("--- utils.js loading ---");

// --- Константы Игры ---
export const MAX_OFFLINE_HOURS = 2;
export const UPDATE_INTERVAL = 1000;
export const STARTING_COINS = 1000; // Вернул 100к для теста

// --- Начальное состояние зданий ---
export const INITIAL_BUILDINGS = [
    { id: 'wash', name: 'Автомойка', level: 1, icon: '🧼', isLocked: false },
    { id: 'service', name: 'Сервис', level: 0, icon: '🔧', isLocked: false },
    { id: 'tires', name: 'Шиномонтаж', level: 0, icon: '🔘', isLocked: true },
    { id: 'drift', name: 'Шк. Дрифта', level: 0, icon: '🏫', isLocked: true },
];

// --- Базовые статы для разных машин ---
export const BASE_CAR_STATS = {
    'car_001': { power: 40, speed: 70, style: 5, reliability: 25, baseIncome: 20 },
    'car_002': { power: 60, speed: 95, style: 10, reliability: 35, baseIncome: 35 },
    'car_003': { power: 75, speed: 110, style: 15, reliability: 45, baseIncome: 50 },
};

// --- Функция пересчета СТАТОВ машины и БОНУСА дохода от деталей ---
export const recalculateStatsAndIncomeBonus = (carId, parts) => {
    const baseStats = BASE_CAR_STATS[carId] || { power: 0, speed: 0, style: 0, reliability: 0 };
    if (!parts || typeof parts !== 'object') {
        console.warn("recalculateStatsAndIncomeBonus: Invalid 'parts' for carId:", carId);
        return { stats: { ...baseStats }, carIncomeBonus: 0 };
    }
    let newPower = baseStats.power || 0; let newSpeed = baseStats.speed || 0; let newStyle = baseStats.style || 0; let newReliability = baseStats.reliability || 0; let carIncomeBonus = 0;
    if (parts.engine) { newPower += (parts.engine.level || 0) * 5; }
    if (parts.tires) { newSpeed += (parts.tires.level || 0) * 3; newReliability -= Math.floor((parts.tires.level || 0) / 5) * 1; }
    if (parts.style_body) { newStyle += (parts.style_body.level || 0) * 4; carIncomeBonus += (parts.style_body.level || 0) * 2; }
    if (parts.reliability_base) { newReliability += (parts.reliability_base.level || 0) * 5; }
    newReliability = Math.max(1, newReliability); newPower = Math.max(1, newPower); newSpeed = Math.max(1, newSpeed); newStyle = Math.max(1, newStyle);
    return { stats: { power: newPower, speed: newSpeed, style: newStyle, reliability: newReliability }, carIncomeBonus: carIncomeBonus };
};

// --- Каталог Машин для Магазина (с базовыми статами) ---
export const CAR_CATALOG = [
  { id: 'car_001', name: 'Ржавая "Копейка"', imageUrl: '/placeholder-car.png', price: 0, baseStats: BASE_CAR_STATS['car_001'], initialParts: { engine: { level: 1, name: 'Двигатель' }, tires: { level: 0, name: 'Шины' }, style_body: { level: 0, name: 'Кузов (Стиль)' }, reliability_base: { level: 1, name: 'Надежность (База)' },}},
  { id: 'car_002', name: 'Бодрая "Девятка"', imageUrl: '/placeholder-car-2.png', price: 5000, baseStats: BASE_CAR_STATS['car_002'], initialParts: { engine: { level: 1, name: 'Двигатель' }, tires: { level: 1, name: 'Шины' }, style_body: { level: 0, name: 'Кузов (Стиль)' }, reliability_base: { level: 1, name: 'Надежность (База)' },}},
  { id: 'car_003', name: 'Старый "Японец"', imageUrl: '/placeholder-car-3.png', price: 15000, baseStats: BASE_CAR_STATS['car_003'], initialParts: { engine: { level: 2, name: 'Двигатель' }, tires: { level: 1, name: 'Шины' }, style_body: { level: 1, name: 'Кузов (Стиль)' }, reliability_base: { level: 2, name: 'Надежность (База)' },}},
];

// --- Функция инициализации первой машины ---
export const getInitialPlayerCar = () => {
    const carData = CAR_CATALOG.find(c => c.id === 'car_001');
    if (!carData || !carData.initialParts) {
        console.error("Could not find initial car data for car_001!");
        return {id: 'error', name:'Error', imageUrl:'/error.png', stats:{power:1,speed:1,style:1,reliability:1}, parts:{}};
    }
    const { stats } = recalculateStatsAndIncomeBonus(carData.id, carData.initialParts);
    return { id: carData.id, name: carData.name, imageUrl: carData.imageUrl, stats: stats, parts: { ...carData.initialParts }};
};
export const INITIAL_CAR = getInitialPlayerCar();


// --- Параметры Ботов ---
export const BOT_STATS = {
  easy:   { power: 35, speed: 65, reliability: 55 },
  medium: { power: 62, speed: 92, reliability: 45 },
  hard:   { power: 90, speed: 120, reliability: 35 },
};

// --- Описание Персонала ---
export const STAFF_CATALOG = {
    mechanic: { id: 'mechanic', name: 'Механик', icon: '👨‍🔧', description: 'Ускоряет тюнинг.', baseHireCost: 200, costMultiplier: 1.8, maxLevel: 10, getBonus: (level) => ({ speedBoostPercent: level * 5 }) },
    manager: { id: 'manager', name: 'Менеджер', icon: '💼', description: 'Увеличивает доход.', baseHireCost: 500, costMultiplier: 2.0, maxLevel: 5, getBonus: (level) => ({ incomeBoostPercent: level * 3 }) },
};

// --- Функция расчета СТОИМОСТИ апгрейда детали ---
export const calculateUpgradeCost = (partType, currentLevel) => {
  const partCostSettings = { engine: { base: 150, multiplier: 1.18 }, tires: { base: 70,  multiplier: 1.15 }, style_body: { base: 100, multiplier: 1.12 }, reliability_base: { base: 80,  multiplier: 1.16 }, default: { base: 100, multiplier: 1.15 } };
  const settings = partCostSettings[partType] || partCostSettings.default;
  const level = typeof currentLevel === 'number' && !isNaN(currentLevel) ? currentLevel : 0;
  const cost = Math.round(settings.base * Math.pow(settings.multiplier, level));
  return Math.max(cost, 10);
};

// --- Функция расчета ОБЩЕЙ ставки дохода в час ---
export const calculateTotalIncomeRate = (buildingsState, carState, currentStaffState = {}) => {
    if (!carState || !carState.id || !carState.parts) { return 0; }
    const incomeFromBuildings = buildingsState.reduce((sum, b) => { if (b.level > 0 && !b.isLocked) { switch (b.id) { case 'wash': return sum + b.level * 5; case 'service': return sum + b.level * 10; default: return sum; }} return sum; }, 0);
    const baseStats = BASE_CAR_STATS[carState.id] || { baseIncome: 0 };
    const { carIncomeBonus } = recalculateStatsAndIncomeBonus(carState.id, carState.parts);
    const validCarIncomeBonus = typeof carIncomeBonus === 'number' && !isNaN(carIncomeBonus) ? carIncomeBonus : 0;
    const totalCarIncome = (baseStats.baseIncome || 0) + validCarIncomeBonus;
    let totalRate = totalCarIncome + incomeFromBuildings;
    const managerLevel = currentStaffState?.manager || 0;
    if (managerLevel > 0 && STAFF_CATALOG.manager?.getBonus) {
        try { const bonus = STAFF_CATALOG.manager.getBonus(managerLevel); const percent = bonus?.incomeBoostPercent; if(typeof percent === 'number' && !isNaN(percent)) { totalRate *= (1 + (percent / 100)); } } catch (e) { console.error(e); }
    }
    const roundedRate = Math.round(totalRate);
    return isNaN(roundedRate) ? 0 : roundedRate;
};

// --- Функция расчета стоимости найма/улучшения персонала ---
export const calculateStaffCost = (staffId, hiredStaff) => {
    const staffInfo = STAFF_CATALOG[staffId]; if (!staffInfo) return Infinity;
    const { maxLevel = 0, baseHireCost = 0, costMultiplier = 1 } = staffInfo;
    let currentLevel = hiredStaff?.[staffId] || 0;
    if (currentLevel >= maxLevel) { return Infinity; }
    let cost = (currentLevel === 0) ? baseHireCost : Math.floor(baseHireCost * Math.pow(costMultiplier, currentLevel));
    return isNaN(cost) ? Infinity : cost;
};

// --- Функция Симуляции Гонки ---
export const simulateRace = async (playerCar, difficulty, currentCoins, currentXp) => {
  if (!playerCar?.stats) { console.error("SimulateRace: Player car/stats missing."); return null; }
  console.log(`Simulating race logic for difficulty: ${difficulty}`);
  const baseBotStats = BOT_STATS[difficulty];
  if (!baseBotStats) { console.error(`SimulateRace: Invalid difficulty: "${difficulty}"`); return null; }
  // Расчет статов бота
  const currentBot = { power: baseBotStats.power*(0.9+Math.random()*0.2), speed: baseBotStats.speed*(0.9+Math.random()*0.2), reliability: baseBotStats.reliability*(0.9+Math.random()*0.2) };
  // Расчет силы
  const playerPowerScore = (playerCar.stats.power*0.5) + (playerCar.stats.speed*0.4) + (playerCar.stats.reliability*0.1*(0.8+Math.random()*0.4));
  const botPowerScore = (currentBot.power*0.5) + (currentBot.speed*0.4) + (currentBot.reliability*0.1*(0.8+Math.random()*0.4));
  console.log(`SimulateRace Scores - Player: ${playerPowerScore.toFixed(1)}, Bot: ${botPowerScore.toFixed(1)}`);
  // Задержка
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // --- НОВАЯ ЛОГИКА НАГРАД И ШТРАФОВ ---
  let result = 'lose';
  let reward = { coins: 0, xp: 0 }; // Чистая награда/штраф для UI
  let coinsChange = 0; // Сколько монет добавить или отнять
  let xpChange = 0;    // Сколько XP добавить

  // Определяем награду/штраф за монеты
  const coinRewards = { easy: 1, medium: 2, hard: 3 };
  const coinPenalty = { easy: -1, medium: -2, hard: -3 }; // Штраф за проигрыш

  // Определяем награду за XP (только за победу)
  const xpRewards = { easy: 5, medium: 15, hard: 30 };

  if (playerPowerScore > botPowerScore) { // Победа
    result = 'win';
    coinsChange = coinRewards[difficulty] || 1; // Награда монетами
    xpChange = xpRewards[difficulty] || 5;      // Награда XP
    reward = { coins: coinsChange, xp: xpChange }; // Записываем награду для UI
    console.log(`SimulateRace: Win! +${coinsChange} GC, +${xpChange} XP`);
    // TODO: Проверка Level Up
  } else { // Поражение
    result = 'lose';
    coinsChange = coinPenalty[difficulty] || -1; // Штраф монетами
    xpChange = 0; // Нет XP за поражение
    reward = { coins: coinsChange, xp: xpChange }; // Записываем ШТРАФ для UI
    console.log(`SimulateRace: Lose. Penalty: ${coinsChange} GC.`);
  }

  // Рассчитываем НОВЫЙ итоговый баланс монет (не уходим в минус)
  const newGameCoins = Math.max(0, currentCoins + coinsChange);
  // Рассчитываем НОВЫЙ итоговый XP
  const newCurrentXp = currentXp + xpChange;
  // ----------------------------------------

  console.log(`SimulateRace finished. Result: ${result}. Returning new state: Coins=${newGameCoins}, XP=${newCurrentXp}, Reward=${JSON.stringify(reward)}`);
  // Возвращаем результат, ЧИСТУЮ награду/штраф, и НОВЫЕ значения монет и XP
  return { result, reward, newGameCoins, newCurrentXp };
  // -----------------------------------------------------------------------
};

console.log("--- utils.js finished defining exports ---");