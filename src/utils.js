// src/utils.js

// --- Базовые статы для разных машин ---
// Добавляем export
export const BASE_CAR_STATS = {
  'car_001': { power: 40, speed: 70, style: 5, reliability: 25, baseIncome: 20 },
  'car_002': { power: 60, speed: 95, style: 10, reliability: 35, baseIncome: 35 },
  'car_003': { power: 75, speed: 110, style: 15, reliability: 45, baseIncome: 50 },
};

// --- Параметры Ботов ---
// Добавляем export
export const BOT_STATS = {
easy:   { power: 35, speed: 65, reliability: 55 },
medium: { power: 62, speed: 92, reliability: 45 },
hard:   { power: 90, speed: 120, reliability: 35 },
};

// --- Описание Персонала ---
// Добавляем export
export const STAFF_CATALOG = {
  mechanic: { id: 'mechanic', name: 'Механик', icon: '👨‍🔧', description: 'Ускоряет тюнинг.', baseHireCost: 200, costMultiplier: 1.8, maxLevel: 10, getBonus: (level) => ({ speedBoostPercent: level * 5 }) },
  manager: { id: 'manager', name: 'Менеджер', icon: '💼', description: 'Увеличивает доход.', baseHireCost: 500, costMultiplier: 2.0, maxLevel: 5, getBonus: (level) => ({ incomeBoostPercent: level * 3 }) },
};

// --- Каталог Машин для Магазина ---
// Добавляем export
export const CAR_CATALOG = [
{ id: 'car_001', name: 'Ржавая "Копейка"', imageUrl: '/placeholder-car.png', price: 0, baseStats: BASE_CAR_STATS['car_001'], initialParts: { engine: { level: 1, name: 'Двигатель' }, tires: { level: 0, name: 'Шины' }, style_body: { level: 0, name: 'Кузов (Стиль)' }, reliability_base: { level: 1, name: 'Надежность (База)' },}},
{ id: 'car_002', name: 'Бодрая "Девятка"', imageUrl: '/placeholder-car-2.png', price: 5000, baseStats: BASE_CAR_STATS['car_002'], initialParts: { engine: { level: 1, name: 'Двигатель' }, tires: { level: 1, name: 'Шины' }, style_body: { level: 0, name: 'Кузов (Стиль)' }, reliability_base: { level: 1, name: 'Надежность (База)' },}},
{ id: 'car_003', name: 'Старый "Японец"', imageUrl: '/placeholder-car-3.png', price: 15000, baseStats: BASE_CAR_STATS['car_003'], initialParts: { engine: { level: 2, name: 'Двигатель' }, tires: { level: 1, name: 'Шины' }, style_body: { level: 1, name: 'Кузов (Стиль)' }, reliability_base: { level: 2, name: 'Надежность (База)' },}},
];

// --- Начальное состояние зданий ---
// Добавляем export
export const INITIAL_BUILDINGS = [
  { id: 'wash', name: 'Автомойка', level: 1, icon: '🧼', isLocked: false },
  { id: 'service', name: 'Сервис', level: 0, icon: '🔧', isLocked: false },
  { id: 'tires', name: 'Шиномонтаж', level: 0, icon: '🔘', isLocked: true },
  { id: 'drift', name: 'Шк. Дрифта', level: 0, icon: '🏫', isLocked: true },
];

// --- Функция инициализации первой машины ---
// НЕ делаем export, так как она использует другие функции этого модуля
// и вызывается только при инициализации state в App.jsx (перенесем ее туда)
/*
const getInitialPlayerCar = () => {
  // ... код инициализации ...
};
*/

// --- Начальное состояние машины ---
// НЕ делаем export, так как начальное состояние будет создаваться в App.jsx
// с использованием getInitialPlayerCar
/*
export const INITIAL_CAR = { ... };
*/

// --- ДАЛЬШЕ ИДУТ ФУНКЦИИ РАСЧЕТА ---
// src/utils.js (продолжение)

// --- Функция пересчета СТАТОВ машины и БОНУСА дохода от деталей ---
// Добавляем export
export const recalculateStatsAndIncomeBonus = (carId, parts) => {
  const baseStats = BASE_CAR_STATS[carId] || { power: 0, speed: 0, style: 0, reliability: 0 };
  if (!parts || typeof parts !== 'object') { return { stats: { ...baseStats }, carIncomeBonus: 0 }; }
  let newPower = baseStats?.power || 0; let newSpeed = baseStats?.speed || 0; let newStyle = baseStats?.style || 0; let newReliability = baseStats?.reliability || 0; let carIncomeBonus = 0;
  if (parts.engine) { newPower += parts.engine.level * 5; }
  if (parts.tires) { newSpeed += parts.tires.level * 3; newReliability -= Math.floor(parts.tires.level / 5) * 1; }
  if (parts.style_body) { newStyle += parts.style_body.level * 4; carIncomeBonus += parts.style_body.level * 2; }
  if (parts.reliability_base) { newReliability += parts.reliability_base.level * 5; }
  newReliability = Math.max(1, newReliability); newPower = Math.max(1, newPower); newSpeed = Math.max(1, newSpeed); newStyle = Math.max(1, newStyle);
  return { stats: { power: newPower, speed: newSpeed, style: newStyle, reliability: newReliability }, carIncomeBonus: carIncomeBonus };
};

// --- Функция расчета ОБЩЕЙ ставки дохода в час ---
// Добавляем export
export const calculateTotalIncomeRate = (buildingsState, carState, currentStaffState = {}) => {
  if (!carState) return 0;
  const incomeFromBuildings = buildingsState.reduce((sum, b) => { if (b.level > 0 && !b.isLocked) { switch (b.id) { case 'wash': return sum + b.level * 5; case 'service': return sum + b.level * 10; default: return sum; }} return sum; }, 0);
  const baseStats = BASE_CAR_STATS[carState?.id] || { baseIncome: 0, power: 0, speed: 0, style: 0, reliability: 0 };
  // Вызываем другую утилиту ИЗ ЭТОГО ЖЕ ФАЙЛА
  const { carIncomeBonus } = recalculateStatsAndIncomeBonus(carState?.id, carState?.parts);
  const totalCarIncome = (baseStats.baseIncome || 0) + carIncomeBonus;
  let totalRate = totalCarIncome + incomeFromBuildings;
  const managerLevel = currentStaffState?.manager || 0;
  // Используем STAFF_CATALOG, который тоже определен в этом файле
  if (managerLevel > 0 && STAFF_CATALOG.manager?.getBonus) {
      const managerBonus = STAFF_CATALOG.manager.getBonus(managerLevel);
      if(managerBonus?.incomeBoostPercent) { totalRate *= (1 + (managerBonus.incomeBoostPercent / 100)); }
  }
  return Math.round(totalRate);
};

// --- Функция расчета СТОИМОСТИ апгрейда детали ---
// Добавляем export
export const calculateUpgradeCost = (partType, currentLevel) => {
  const baseCost = { engine: 100, tires: 50, style_body: 75, reliability_base: 60 };
  return Math.floor((baseCost[partType] || 100) * Math.pow(1.5, currentLevel));
};

// --- Функция Симуляции Гонки ---
// Добавляем export
export const simulateRace = async (playerCar, difficulty, currentCoins, currentXp) => {
  if (!playerCar?.stats) { console.error("SimulateRace: Player car or stats missing."); return null; }
  // console.log(`Simulating race logic for difficulty: ${difficulty}`);
  const baseBotStats = BOT_STATS[difficulty]; // Используем BOT_STATS из этого файла
  if (!baseBotStats) { console.error(`SimulateRace: Invalid difficulty: "${difficulty}"`); return null; }
  const currentBot = { power: baseBotStats.power * (0.9 + Math.random() * 0.2), speed: baseBotStats.speed * (0.9 + Math.random() * 0.2), reliability: baseBotStats.reliability * (0.9 + Math.random() * 0.2) };
  const playerPowerScore = (playerCar.stats.power * 0.5) + (playerCar.stats.speed * 0.4) + (playerCar.stats.reliability * 0.1 * (0.8 + Math.random() * 0.4));
  const botPowerScore = (currentBot.power * 0.5) + (currentBot.speed * 0.4) + (currentBot.reliability * 0.1 * (0.8 + Math.random() * 0.4));
  // console.log(`SimulateRace Scores - Player: ${playerPowerScore.toFixed(2)}, Bot: ${botPowerScore.toFixed(2)}`);
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // Задержка
  let result = 'lose'; let reward = { coins: 0, xp: 0 }; let newGameCoins = currentCoins; let newCurrentXp = currentXp;
  if (playerPowerScore > botPowerScore) { result = 'win'; const baseWinCoins = { easy: 25, medium: 75, hard: 150 }; const baseWinXp = { easy: 5, medium: 15, hard: 30 }; const coinsWon = Math.floor(baseWinCoins[difficulty]*(0.9+Math.random()*0.2)); const xpWon = Math.floor(baseWinXp[difficulty]*(0.9+Math.random()*0.2)); reward={ coins: coinsWon, xp: xpWon }; newGameCoins+=coinsWon; newCurrentXp+=xpWon; }
  else { result = 'lose'; const consolationCoins = Math.floor(({ easy: 2, medium: 5, hard: 10 }[difficulty] || 0)*Math.random()); reward={ coins: consolationCoins, xp: 0 }; if(consolationCoins > 0){ newGameCoins+=consolationCoins; } newCurrentXp=currentXp; }
  // console.log(`SimulateRace finished. Result: ${result}. Returning new state: Coins=${newGameCoins}, XP=${newCurrentXp}, Reward=${JSON.stringify(reward)}`);
  return { result, reward, newGameCoins, newCurrentXp }; // Возвращаем полный результат
};

console.log("--- utils.js module loaded and exports defined ---"); // Лог для проверки загрузки модуля