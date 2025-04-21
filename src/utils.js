// src/utils.js

// --- Базовые статы для разных машин ---
export const BASE_CAR_STATS = {
    'car_001': { power: 40, speed: 70, style: 5, reliability: 25, baseIncome: 20 },
    // 'другой_id': { power: 60, speed: 90, style: 15, reliability: 40, baseIncome: 30 },
};

// --- Функция расчета СТОИМОСТИ апгрейда детали ---
export const calculateUpgradeCost = (partType, currentLevel) => {
  const baseCost = { engine: 100, tires: 50, style_body: 75, reliability_base: 60 };
  // Простая экспоненциальная стоимость
  return Math.floor((baseCost[partType] || 100) * Math.pow(1.5, currentLevel));
};

// --- Функция пересчета СТАТОВ машины и БОНУСА дохода от деталей ---
export const recalculateStatsAndIncomeBonus = (carId, parts) => {
  // Получаем базовые статы для этой машины
  const baseStats = BASE_CAR_STATS[carId] || { power: 0, speed: 0, style: 0, reliability: 0 };

  // Проверка, что parts - это объект
  if (!parts || typeof parts !== 'object') {
    console.warn("recalculateStatsAndIncomeBonus: 'parts' is not a valid object, returning base stats.");
    return { stats: { ...baseStats }, carIncomeBonus: 0 };
  }

  // Копируем базовые статы, чтобы не изменять их напрямую
  let newPower = baseStats.power;
  let newSpeed = baseStats.speed;
  let newStyle = baseStats.style;
  let newReliability = baseStats.reliability;
  let carIncomeBonus = 0; // Дополнительный доход от ДЕТАЛЕЙ

  // Применяем эффекты от деталей
  if (parts.engine) { newPower += parts.engine.level * 5; }
  if (parts.tires) { newSpeed += parts.tires.level * 3; newReliability -= Math.floor(parts.tires.level / 5) * 1; }
  if (parts.style_body) { newStyle += parts.style_body.level * 4; carIncomeBonus += parts.style_body.level * 2; }
  if (parts.reliability_base) { newReliability += parts.reliability_base.level * 5; }

  // Ограничиваем минимальные значения
  newReliability = Math.max(1, newReliability);
  newPower = Math.max(1, newPower);
  newSpeed = Math.max(1, newSpeed);
  newStyle = Math.max(1, newStyle);

  // Возвращаем объект с новыми статами и бонусом дохода от деталей
  return {
    stats: { power: newPower, speed: newSpeed, style: newStyle, reliability: newReliability },
    carIncomeBonus: carIncomeBonus,
  };
};

// --- Функция расчета ОБЩЕЙ ставки дохода в час ---
export const calculateTotalIncomeRate = (buildingsState, carState) => {
    // Доход от зданий
    const incomeFromBuildings = buildingsState.reduce((sum, b) => {
        if (b.level > 0 && !b.isLocked) {
            switch (b.id) {
                case 'wash': return sum + b.level * 5;
                case 'service': return sum + b.level * 10;
                // Добавить другие здания
                default: return sum;
            }
        } return sum;
    }, 0);

    // Доход от машины (базовый + бонус от деталей)
    const baseStats = BASE_CAR_STATS[carState?.id] || { baseIncome: 0 }; // Безопасный доступ к ID
    // --- Используем уже рассчитанные статы и пересчитываем только бонус ---
    // Важно: предполагаем, что carState.parts уже актуальны
    const { carIncomeBonus } = recalculateStatsAndIncomeBonus(carState?.id, carState?.parts);
    const totalCarIncome = (baseStats.baseIncome || 0) + carIncomeBonus;

    return totalCarIncome + incomeFromBuildings;
};