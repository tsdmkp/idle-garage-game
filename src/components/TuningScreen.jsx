import React from 'react';
import { calculateUpgradeCost } from '../utils';
import './TuningScreen.css';

function TuningScreen({ car, gameCoins, onClose, onUpgrade }) {
  if (!car || !car.parts) {
    console.error('TuningScreen: No car or parts provided', car);
    return <div className="tuning-screen-overlay">Ошибка: Нет данных машины</div>;
  }

  const handleUpgradeClick = (partId) => {
    console.log('TuningScreen: Upgrading part:', partId, 'Car:', car, 'GameCoins:', gameCoins);
    if (car.parts[partId]) {
      onUpgrade(partId);
    } else {
      console.error('TuningScreen: Part not found:', partId);
    }
  };

  return (
    <div className="tuning-screen-overlay">
      <div className="tuning-screen">
        <h2>Тюнинг: {car.name}</h2>
        <button className="close-button" onClick={onClose}>×</button>
        <div className="parts-list">
          {Object.entries(car.parts).map(([partId, part]) => {
            const cost = calculateUpgradeCost(partId, part.level);
            const canAfford = gameCoins >= cost && cost !== Infinity;
            console.log(`TuningScreen: Part ${partId}, Cost: ${cost}, CanAfford: ${canAfford}`);
            return (
              <div key={partId} className="part-item">
                <span>{part.name} (Уровень: {part.level})</span>
                <button
                  className="upgrade-button"
                  onClick={() => handleUpgradeClick(partId)}
                  disabled={!canAfford}
                >
                  Улучшить ({cost} 💰)
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TuningScreen;