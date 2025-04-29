import React from 'react';
import './Header.css';

function Header({
    level = 1,
    playerName = "Игрок",
    gameCoins = 0,
    jetCoins = 0,
    xpPercentage = 0,
    onChangeName
}) {
  return (
    <div className="header">
      <div className="player-info">
        <span className="player-level">LVL {level}</span>
        <span className="player-name">{playerName}</span>
        <button className="change-name-btn" onClick={onChangeName}>Изменить имя</button>
        <div className="xp-bar-container">
          <div
            className="xp-bar-fill"
            style={{ width: `${xpPercentage}%` }}
          ></div>
        </div>
      </div>
      <div className="resources">
        <span className="resource-item">💰 {gameCoins.toLocaleString()}</span>
        <span className="resource-item">💎 {jetCoins.toLocaleString()}</span>
      </div>
      <div className="header-actions">
        <span className="header-icon" title="Бустеры">🚀</span>
        <span className="header-icon" title="Настройки">⚙️</span>
      </div>
    </div>
  );
}

export default Header;