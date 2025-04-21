import React from 'react';
import './TuningScreen.css'; // Стили

// Функция для расчета стоимости улучшения (пример)
const calculateUpgradeCost = (partType, currentLevel) => {
  // Простая экспоненциальная стоимость
  const baseCost = {
    engine: 100,
    tires: 50,
    style_body: 75,
    reliability_base: 60,
  };
  return Math.floor((baseCost[partType] || 100) * Math.pow(1.5, currentLevel));
};

function TuningScreen({ car, gameCoins, onUpgradePart, onClose }) {
  if (!car) return null; // Не рендерим, если нет данных о машине

  // Получаем объект деталей из машины
  const { parts, name: carName } = car;

  return (
    // Используем оверлей для затемнения фона
    <div className="tuning-overlay" onClick={onClose}>
      {/* Контейнер самого окна, клик по нему не должен закрывать окно */}
      <div className="tuning-screen" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Тюнинг: {carName}</h2>

        <div className="tuning-parts-list">
          {/* Преобразуем объект parts в массив и итерируем */}
          {Object.entries(parts).map(([partId, partData]) => {
            const cost = calculateUpgradeCost(partId, partData.level);
            const canAfford = gameCoins >= cost;

            return (
              <div className="part-item" key={partId}>
                <span className="part-name">{partData.name} (Ур. {partData.level})</span>
                <div className="part-actions">
                  <span className={`part-cost ${!canAfford ? 'insufficient' : ''}`}>
                    💰 {cost.toLocaleString()}
                  </span>
                  <button
                    className="upgrade-button"
                    onClick={() => onUpgradePart(partId)} // Передаем ID детали
                    disabled={!canAfford} // Неактивна, если не хватает монет
                  >
                    Улучшить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TuningScreen;