import React from 'react';
import './TuningScreen.css';
import { calculateUpgradeCost } from '../utils';

function TuningScreen({ car, gameCoins, onUpgradePart, onClose }) {
    if (!car) return null;

    const { parts, name: carName } = car;

    return (
        <div className="tuning-overlay" onClick={onClose}>
            <div className="tuning-screen" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>
                <h2>Тюнинг: {carName}</h2>

                <div className="tuning-parts-list">
                    {Object.entries(parts).map(([partId, part]) => {
                        const cost = calculateUpgradeCost(partId, part.level);
                        const canAfford = gameCoins >= cost;

                        return (
                            <div className="part-item" key={partId}>
                                <span className="part-name">
                                    {part.name || (partId.charAt(0).toUpperCase() + partId.slice(1).replace('_', ' '))} (Ур. {part.level})
                                </span>
                                <div className="part-actions">
                                    <span className={`part-cost ${!canAfford ? 'insufficient' : ''}`}>
                                        💰 {cost.toLocaleString()}
                                    </span>
                                    <button
                                        className="upgrade-button"
                                        onClick={() => onUpgradePart(car.id, partId)}
                                        disabled={!canAfford}
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