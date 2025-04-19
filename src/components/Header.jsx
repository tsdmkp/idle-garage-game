import React from 'react';
import './Header.css'; // Создадим этот файл для стилей позже

// Принимаем данные как props (свойства)
function Header({ level, playerName, gameCoins, jetCoins, xpPercentage = 0 }) {
  // xpPercentage - для заполнения полосы опыта, пока просто 0

  return (
    <div className="header">
      <div className="player-info">
        <span className="player-level">LVL {level}</span>
        <span className="player-name">{playerName}</span>
        <div className="xp-bar-container">
          <div
            className="xp-bar-fill"
            style={{ width: `${xpPercentage}%` }}
          ></div>
        </div>
      </div>
      <div className="resources">
        <span className="resource-item">💰 {gameCoins.toLocaleString()}</span> {/* Форматируем число */}
        <span className="resource-item">💎 {jetCoins.toLocaleString()}</span> {/* Форматируем число */}
      </div>
      <div className="header-actions">
        {/* Пока просто иконки-заглушки, потом сделаем кнопками */}
        <span className="header-icon">🚀</span> {/* Бустеры */}
        <span className="header-icon">⚙️</span> {/* Настройки */}
      </div>
    </div>
  );
}

export default Header;