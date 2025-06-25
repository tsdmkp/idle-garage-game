import React, { useState } from 'react';
import './Header.css';

const Header = ({ 
  level, 
  playerName, 
  gameCoins, 
  jetCoins, 
  xpPercentage, 
  onChangeName,
  onShowTutorial 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  console.log('Header rendering with playerName:', playerName);

  return (
    <div className="header">
      <div className="player-info">
        <div className="player-level">Lv.{level}</div>
        <div 
          className="player-name" 
          onClick={onChangeName}
          title="Нажмите, чтобы изменить имя"
        >
          {playerName || 'DefaultPlayer'}
        </div>
        <div className="xp-bar-container">
          <div className="xp-bar-fill" style={{ width: `${xpPercentage}%` }}></div>
        </div>
      </div>
      <div className="resources">
        <div className="resource-item game-coins">
          <span>💰</span>
          <span>{formatNumber(gameCoins)}</span>
        </div>
        <div className="resource-item jet-coins">
          <span>💎</span>
          <span>{formatNumber(jetCoins)}</span>
        </div>
      </div>
      <div className="header-actions">
        <div 
          className="header-icon" 
          title="Настройки" 
          onClick={() => setShowMenu(!showMenu)}
        >
          ⚙️
        </div>
        <div className="header-icon" title="Профиль" onClick={() => console.log('Profile clicked')}>
          👤
        </div>
        
        {/* Выпадающее меню настроек */}
        {showMenu && (
          <div className="settings-dropdown">
            <button 
              className="dropdown-item"
              onClick={() => {
                onShowTutorial && onShowTutorial();
                setShowMenu(false);
              }}
            >
              <span className="dropdown-icon">📖</span>
              <span>Обучение</span>
            </button>
            <button 
              className="dropdown-item"
              onClick={() => {
                console.log('Sound settings');
                setShowMenu(false);
              }}
            >
              <span className="dropdown-icon">🔊</span>
              <span>Звук</span>
            </button>
            <button 
              className="dropdown-item"
              onClick={() => {
                console.log('About game');
                setShowMenu(false);
              }}
            >
              <span className="dropdown-icon">ℹ️</span>
              <span>О игре</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;