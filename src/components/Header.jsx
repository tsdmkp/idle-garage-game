import React, { useState } from 'react';
import './Header.css';

// 🔥 НОВЫЙ КОМПОНЕНТ: Аватарка пользователя
const UserAvatar = ({ photoUrl, playerName, size = 40 }) => {
  const [imageError, setImageError] = useState(false);
  
  // Если есть фото и нет ошибки загрузки
  if (photoUrl && !imageError) {
    return (
      <div 
        className="user-avatar"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid #3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
          flexShrink: 0
        }}
      >
        <img
          src={photoUrl}
          alt={`Аватар ${playerName}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={() => {
            console.log('❌ Ошибка загрузки аватарки, показываем fallback');
            setImageError(true);
          }}
        />
      </div>
    );
  }
  
  // Fallback - первая буква имени
  const firstLetter = playerName ? playerName.charAt(0).toUpperCase() : '?';
  
  return (
    <div 
      className="user-avatar user-avatar-fallback"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid #3b82f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        fontSize: size * 0.4,
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
        flexShrink: 0
      }}
    >
      {firstLetter}
    </div>
  );
};

const Header = ({ 
  level, 
  playerName, 
  playerPhoto, // ✅ НОВЫЙ ПРОП: аватарка пользователя
  gameCoins, 
  jetCoins, 
  xpPercentage, 
  onChangeName,
  onShowTutorial 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const formatNumber = (num) => {
    // Преобразуем в число если это строка
    const number = typeof num === 'string' ? parseInt(num) || 0 : num;
    
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
  };

  console.log('Header rendering with playerName:', playerName, 'playerPhoto:', playerPhoto);

  return (
    <div className="header">
      <div className="player-info">
        {/* ✅ ЗАМЕНИЛИ уровень на аватарку */}
        <UserAvatar 
          photoUrl={playerPhoto} 
          playerName={playerName} 
          size={42} 
        />
        
        <div className="player-details">
          <div 
            className="player-name" 
            onClick={onChangeName}
            title="Нажмите, чтобы изменить имя"
          >
            {playerName || 'DefaultPlayer'}
          </div>
          {/* ✅ Уровень теперь под именем */}
          <div className="player-level-text">Уровень {level}</div>
        </div>
        
        {/* XP бар остается */}
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
          <div className="settings-dropdown" onClick={(e) => e.stopPropagation()}>
            <button 
              className="dropdown-item"
              onClick={() => {
                console.log('Tutorial button clicked');
                if (onShowTutorial) {
                  onShowTutorial();
                }
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