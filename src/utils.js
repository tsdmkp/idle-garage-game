// src/utils.js - ИСПРАВЛЕННЫЙ БАЛАНС ДЛЯ ЛУЧШЕГО ГЕЙМПЛЕЯ + РАЗБЛОКИРОВАННЫЕ ЗДАНИЯ

console.log("--- utils.js loading ---");

// --- Константы Игры ---
export const MAX_OFFLINE_HOURS = 2;
export const UPDATE_INTERVAL = 1000;
export const STARTING_COINS = 500; // ✅ НОВЫЙ БАЛАНС: достаточно для 2-3 первых апгрейдов

// --- ИСПРАВЛЕННОЕ начальное состояние зданий - ВСЕ РАЗБЛОКИРОВАНЫ ---
export const INITIAL_BUILDINGS = [
    { id: 'wash', name: 'car_wash', level: 1, icon: '🧼', isLocked: false },
    { id: 'service', name: 'service_station', level: 0, icon: '🔧', isLocked: false },
    { id: 'tires', name: 'tire_shop', level: 0, icon: '🛞', isLocked: false },
    { id: 'drift', name: 'drift_school', level: 0, icon: '🏁', isLocked: false },
];

// --- Базовые статы для разных машин (НОВЫЙ БАЛАНС ДОХОДА) ---
export const BASE_CAR_STATS = {
    'car_001': { power: 40, speed: 70, style: 5, reliability: 25, baseIncome: 10 },   // ✅ 10 монет/час - старт
    'car_002': { power: 60, speed: 95, style: 10, reliability: 35, baseIncome: 50 },  // ✅ 50 монет/час - средняя
    'car_003': { power: 75, speed: 110, style: 15, reliability: 45, baseIncome: 150 }, // ✅ 150 монет/час - продвинутая
};

// --- Функция пересчета СТАТОВ машины и БОНУСА дохода от деталей ---
export const recalculateStatsAndIncomeBonus = (carId, parts) => {
    const baseStats = BASE_CAR_STATS[carId] || { power: 0, speed: 0, style: 0, reliability: 0 };
    if (!parts || typeof parts !== 'object') {
        console.warn("recalculateStatsAndIncomeBonus: Invalid 'parts' for carId:", carId);
        return { stats: { ...baseStats }, carIncomeBonus: 0 };
    }
    let newPower = baseStats.power || 0; 
    let newSpeed = baseStats.speed || 0; 
    let newStyle = baseStats.style || 0; 
    let newReliability = baseStats.reliability || 0; 
    let carIncomeBonus = 0;
    
    if (parts.engine) { 
        newPower += (parts.engine.level || 0) * 5; 
        carIncomeBonus += (parts.engine.level || 0) * 2; // ✅ +2 монет/час за уровень
    }
    if (parts.tires) { 
        newSpeed += (parts.tires.level || 0) * 3; 
        newReliability -= Math.floor((parts.tires.level || 0) / 5) * 1; 
        carIncomeBonus += (parts.tires.level || 0) * 1; // ✅ +1 монета/час за уровень
    }
    if (parts.style_body) { 
        newStyle += (parts.style_body.level || 0) * 4; 
        carIncomeBonus += (parts.style_body.level || 0) * 3; // ✅ +3 монеты/час за уровень
    }
    if (parts.reliability_base) { 
        newReliability += (parts.reliability_base.level || 0) * 5; 
        carIncomeBonus += (parts.reliability_base.level || 0) * 1; // ✅ +1 монета/час за уровень
    }
    
    newReliability = Math.max(1, newReliability); 
    newPower = Math.max(1, newPower); 
    newSpeed = Math.max(1, newSpeed); 
    newStyle = Math.max(1, newStyle);
    
    return { 
        stats: { power: newPower, speed: newSpeed, style: newStyle, reliability: newReliability }, 
        carIncomeBonus: carIncomeBonus 
    };
};

// --- Каталог Машин для Магазина (НОВЫЕ ЦЕНЫ) ---
export const CAR_CATALOG = [
  { 
    id: 'car_001', 
    name: 'Ржавая "Копейка"', 
    imageUrl: '/placeholder-car.png', 
    price: 0, // Бесплатная стартовая
    baseStats: BASE_CAR_STATS['car_001'], 
    initialParts: { 
      engine: { level: 1, name: 'Двигатель' }, 
      tires: { level: 0, name: 'Шины' }, 
      style_body: { level: 0, name: 'Кузов (Стиль)' }, 
      reliability_base: { level: 1, name: 'Надежность (База)' }
    }
  },
  { 
    id: 'car_002', 
    name: 'Бодрая "Девятка"', 
    imageUrl: '/placeholder-car-2.png', 
    price: 5000, // ✅ Доступна после ~5-10 часов игры
    baseStats: BASE_CAR_STATS['car_002'], 
    initialParts: { 
      engine: { level: 1, name: 'Двигатель' }, 
      tires: { level: 1, name: 'Шины' }, 
      style_body: { level: 0, name: 'Кузов (Стиль)' }, 
      reliability_base: { level: 1, name: 'Надежность (База)' }
    }
  },
  { 
    id: 'car_003', 
    name: 'Старый "Японец"', 
    imageUrl: '/placeholder-car-3.png', 
    price: 20000, // ✅ Цель для продвинутых игроков
    baseStats: BASE_CAR_STATS['car_003'], 
    initialParts: { 
      engine: { level: 2, name: 'Двигатель' }, 
      tires: { level: 1, name: 'Шины' }, 
      style_body: { level: 1, name: 'Кузов (Стиль)' }, 
      reliability_base: { level: 2, name: 'Надежность (База)' }
    }
  }
];

// --- Функция инициализации первой машины ---
export const getInitialPlayerCar = () => {
    const carData = CAR_CATALOG.find(c => c.id === 'car_001');
    if (!carData || !carData.initialParts) {
        console.error("Could not find initial car data for car_001!");
        return {id: 'error', name:'Error', imageUrl:'/error.png', stats:{power:1,speed:1,style:1,reliability:1}, parts:{}};
    }
    const { stats } = recalculateStatsAndIncomeBonus(carData.id, carData.initialParts);
    return { 
        id: carData.id, 
        name: carData.name, 
        imageUrl: carData.imageUrl, 
        stats: stats, 
        parts: { ...carData.initialParts }
    };
};
export const INITIAL_CAR = getInitialPlayerCar();

// --- Параметры Ботов (адаптированы под новый баланс) ---
export const BOT_STATS = {
  easy:   { power: 35, speed: 65, reliability: 55 },
  medium: { power: 62, speed: 92, reliability: 45 },
  hard:   { power: 90, speed: 120, reliability: 35 },
};

// --- Описание Персонала (НОВЫЕ ЦЕНЫ) ---
export const STAFF_CATALOG = {
    mechanic: { 
        id: 'mechanic', 
        name: 'Механик', 
        icon: '👨‍🔧', 
        description: 'Ускоряет тюнинг.', 
        baseHireCost: 1000, // ✅ Доступен на ранней стадии
        costMultiplier: 1.5, 
        maxLevel: 10, 
        getBonus: (level) => ({ speedBoostPercent: level * 5 }) 
    },
    manager: { 
        id: 'manager', 
        name: 'Менеджер', 
        icon: '💼', 
        description: 'Увеличивает доход.', 
        baseHireCost: 2500, // ✅ Средняя стадия игры
        costMultiplier: 1.8, 
        maxLevel: 5, 
        getBonus: (level) => ({ incomeBoostPercent: level * 10 }) // ✅ +10% дохода за уровень
    }
};

// --- Функция расчета СТОИМОСТИ апгрейда детали (НОВЫЙ БАЛАНС) ---
export const calculateUpgradeCost = (partType, currentLevel) => {
  const partCostSettings = { 
    engine: { base: 50, multiplier: 1.5 },         // ✅ 50, 75, 112, 168...
    tires: { base: 30, multiplier: 1.4 },          // ✅ 30, 42, 58, 81...
    style_body: { base: 40, multiplier: 1.45 },    // ✅ 40, 58, 84, 121...
    reliability_base: { base: 35, multiplier: 1.4 }, // ✅ 35, 49, 68, 95...
    default: { base: 40, multiplier: 1.5 } 
  };
  const settings = partCostSettings[partType] || partCostSettings.default;
  const level = typeof currentLevel === 'number' && !isNaN(currentLevel) ? currentLevel : 0;
  const cost = Math.round(settings.base * Math.pow(settings.multiplier, level));
  return Math.max(cost, 10);
};

// --- Функция расчета ОБЩЕЙ ставки дохода в час (ИСПРАВЛЕННЫЕ ID) ---
export const calculateTotalIncomeRate = (buildingsState, carState, currentStaffState = {}) => {
    if (!carState || !carState.id || !carState.parts) { return 0; }
    
    // ✅ НОВЫЙ БАЛАНС дохода от зданий с правильными ID
    const incomeFromBuildings = buildingsState.reduce((sum, b) => { 
        if (b.level > 0 && !b.isLocked) { 
            switch (b.id) { 
                case 'wash': return sum + b.level * 5;      // ✅ +5 монет/час за уровень
                case 'service': return sum + b.level * 10;  // ✅ +10 монет/час за уровень
                case 'tires': return sum + b.level * 15;    // ✅ +15 монет/час за уровень
                case 'drift': return sum + b.level * 25;    // ✅ +25 монет/час за уровень
                default: 
                    console.log('🏢 Неизвестное здание:', b.id, b.name);
                    return sum; 
            }
        } 
        return sum; 
    }, 0);
    
    const baseStats = BASE_CAR_STATS[carState.id] || { baseIncome: 0 };
    const { carIncomeBonus } = recalculateStatsAndIncomeBonus(carState.id, carState.parts);
    const validCarIncomeBonus = typeof carIncomeBonus === 'number' && !isNaN(carIncomeBonus) ? carIncomeBonus : 0;
    const totalCarIncome = (baseStats.baseIncome || 0) + validCarIncomeBonus;
    let totalRate = totalCarIncome + incomeFromBuildings;
    
    console.log('💰 Расчет дохода:', {
        машина: totalCarIncome,
        здания: incomeFromBuildings,
        итого: totalRate
    });
    
    // Применяем бонус от менеджера
    const managerLevel = currentStaffState?.manager || 0;
    if (managerLevel > 0 && STAFF_CATALOG.manager?.getBonus) {
        try { 
            const bonus = STAFF_CATALOG.manager.getBonus(managerLevel); 
            const percent = bonus?.incomeBoostPercent; 
            if(typeof percent === 'number' && !isNaN(percent)) { 
                totalRate *= (1 + (percent / 100)); 
                console.log(`💼 Бонус менеджера: +${percent}%, итого: ${totalRate}`);
            } 
        } catch (e) { 
            console.error(e); 
        }
    }
    
    const roundedRate = Math.round(totalRate);
    return isNaN(roundedRate) ? 0 : roundedRate;
};

// --- Функция расчета стоимости найма/улучшения персонала ---
export const calculateStaffCost = (staffId, hiredStaff) => {
    const staffInfo = STAFF_CATALOG[staffId]; 
    if (!staffInfo) return Infinity;
    const { maxLevel = 0, baseHireCost = 0, costMultiplier = 1 } = staffInfo;
    let currentLevel = hiredStaff?.[staffId] || 0;
    if (currentLevel >= maxLevel) { return Infinity; }
    let cost = (currentLevel === 0) 
        ? baseHireCost 
        : Math.floor(baseHireCost * Math.pow(costMultiplier, currentLevel));
    return isNaN(cost) ? Infinity : cost;
};

// --- Функция Симуляции Гонки (УЛУЧШЕННЫЕ НАГРАДЫ) ---
export const simulateRace = async (playerCar, difficulty, currentCoins, currentXp) => {
  if (!playerCar?.stats) { 
    console.error("SimulateRace: Player car/stats missing."); 
    return null; 
  }
  console.log(`Simulating race logic for difficulty: ${difficulty}`);
  const baseBotStats = BOT_STATS[difficulty];
  if (!baseBotStats) { 
    console.error(`SimulateRace: Invalid difficulty: "${difficulty}"`); 
    return null; 
  }
  
  // Расчет статов бота
  const currentBot = { 
    power: baseBotStats.power*(0.9+Math.random()*0.2), 
    speed: baseBotStats.speed*(0.9+Math.random()*0.2), 
    reliability: baseBotStats.reliability*(0.9+Math.random()*0.2) 
  };
  
  // Расчет силы
  const playerPowerScore = (playerCar.stats.power*0.5) + (playerCar.stats.speed*0.4) + (playerCar.stats.reliability*0.1*(0.8+Math.random()*0.4));
  const botPowerScore = (currentBot.power*0.5) + (currentBot.speed*0.4) + (currentBot.reliability*0.1*(0.8+Math.random()*0.4));
  console.log(`SimulateRace Scores - Player: ${playerPowerScore.toFixed(1)}, Bot: ${botPowerScore.toFixed(1)}`);
  
  // Задержка
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // --- НОВЫЕ НАГРАДЫ (улучшенный баланс) ---
  let result = 'lose';
  let reward = { coins: 0, xp: 0 };
  let coinsChange = 0;
  let xpChange = 0;

  // ✅ НОВЫЕ награды монет (значительно увеличены)
  const coinRewards = { 
    easy: 50,    // ✅ Было 1, стало 50
    medium: 150, // ✅ Было 2, стало 150
    hard: 300    // ✅ Было 3, стало 300
  };
  
  // ✅ Штрафы теперь процентные (не уходим в минус)
  const coinPenaltyPercent = { 
    easy: 5,    // -5% от текущих монет
    medium: 10, // -10% от текущих монет
    hard: 15    // -15% от текущих монет
  };

  // ✅ XP награды остаются прежними
  const xpRewards = { easy: 5, medium: 15, hard: 30 };

  if (playerPowerScore > botPowerScore) { // Победа
    result = 'win';
    coinsChange = coinRewards[difficulty] || 50;
    xpChange = xpRewards[difficulty] || 5;
    reward = { coins: coinsChange, xp: xpChange };
    console.log(`SimulateRace: Win! +${coinsChange} GC, +${xpChange} XP`);
  } else { // Поражение
    result = 'lose';
    const penaltyPercent = coinPenaltyPercent[difficulty] || 5;
    coinsChange = -Math.floor(currentCoins * penaltyPercent / 100);
    xpChange = 0;
    reward = { coins: coinsChange, xp: xpChange };
    console.log(`SimulateRace: Lose. Penalty: ${coinsChange} GC (${penaltyPercent}%).`);
  }

  // Рассчитываем НОВЫЙ итоговый баланс монет (не уходим в минус)
  const newGameCoins = Math.max(0, currentCoins + coinsChange);
  const newCurrentXp = currentXp + xpChange;

  console.log(`SimulateRace finished. Result: ${result}. Returning new state: Coins=${newGameCoins}, XP=${newCurrentXp}, Reward=${JSON.stringify(reward)}`);
  return { result, reward, newGameCoins, newCurrentXp };
};

// --- Стоимость улучшения зданий (НОВЫЙ БАЛАНС) ---
export const calculateBuildingCost = (buildingId, currentLevel) => {
  const buildingCostSettings = {
    wash: { base: 100, multiplier: 2 },     // 100, 200, 400, 800...
    service: { base: 250, multiplier: 2 },  // 250, 500, 1000, 2000...
    tires: { base: 500, multiplier: 2 },    // 500, 1000, 2000, 4000...
    drift: { base: 1000, multiplier: 2 },   // 1000, 2000, 4000, 8000...
    default: { base: 100, multiplier: 2 }
  };
  const settings = buildingCostSettings[buildingId] || buildingCostSettings.default;
  const level = typeof currentLevel === 'number' && !isNaN(currentLevel) ? currentLevel : 0;
  const cost = Math.round(settings.base * Math.pow(settings.multiplier, level));
  return cost;
};

console.log("--- utils.js finished defining exports ---");