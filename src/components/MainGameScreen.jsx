import React, { useState, useEffect } from 'react';
import AdsgramButton from './AdsgramButton'; // Импортируем компонент рекламы
import './MainGameScreen.css';

const MainGameScreen = ({ 
  car, 
  incomeRate, 
  accumulatedIncome, 
  maxAccumulation,
  gameCoins,
  buildings,
  onCollect, 
  onTuneClick, 
  onOpenCarSelector,
  onBuildingClick,
  onAdReward // Новый пропс для обработки наград за рекламу
}) => {
  const [showBuildings, setShowBuildings] = useState(true); // Теперь всегда открыты
  const [collectAnimation, setCollectAnimation] = useState(false);
  const [coins, setCoins] = useState([]);
  
  // Проценты для прогресс бара
  const progressPercentage = maxAccumulation > 0 
    ? Math.min((accumulatedIncome / maxAccumulation) * 100, 100) 
    : 0;
    
  const canCollect = Math.floor(accumulatedIncome) > 0;
  
  // Функция сбора с анимацией
  const handleCollect = () => {
    if (!canCollect) return;
    
    // Запускаем анимацию монет
    const coinCount = Math.min(Math.floor(accumulatedIncome / 10), 20) + 5;
    const newCoins = [];
    
    for (let i = 0; i < coinCount; i++) {
      newCoins.push({
        id: Date.now() + i,
        left: 30 + Math.random() * 40,
        delay: Math.random() * 0.5
      });
    }
    
    setCoins(newCoins);
    setCollectAnimation(true);
    
    // Вызываем функцию сбора
    onCollect();
    
    // Очищаем анимацию
    setTimeout(() => {
      setCollectAnimation(false);
      setCoins([]);
    }, 2000);
  };
  
  // Форматирование чисел
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };
  
  // Активные постройки
  const activeBuildings = buildings.filter(b => b.level > 0 && !b.isLocked);
  
  return (
    <div className="main-game-screen">
      {/* Основная игровая зона */}
      <div className="game-area">
        {/* Отображение машины */}
        <div className="car-showcase">
          <div className="car-name-plate">
            <h2>{car?.name || 'Загрузка...'}</h2>
          </div>
          
          <div className="car-image-container">
            <img 
              src={car?.imageUrl || '/placeholder-car.png'} 
              alt={car?.name}
              className={`car-main-image ${canCollect ? 'car-earning' : ''}`}
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = '/placeholder-car.png'; 
              }}
            />
            
            {/* Индикатор дохода */}
            <div className="income-indicator">
              <span className="income-icon">💰</span>
              <span className="income-text">+{formatNumber(incomeRate)}/час</span>
            </div>
          </div>
          
          {/* Статы машины (компактно) */}
          <div className="car-stats-compact">
            <div className="stat-item">
              <span className="stat-icon">⚡</span>
              <span className="stat-value">{car?.stats?.power || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏎️</span>
              <span className="stat-value">{car?.stats?.speed || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">✨</span>
              <span className="stat-value">{car?.stats?.style || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🔧</span>
              <span className="stat-value">{car?.stats?.reliability || 0}</span>
            </div>
          </div>
        </div>
        
        {/* Прогресс накопления */}
        <div className="income-progress-section">
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="progress-shine"></div>
              </div>
              <div className="progress-text">
                {formatNumber(accumulatedIncome)} / {formatNumber(maxAccumulation)}
              </div>
            </div>
          </div>
          
          {/* Большая кнопка сбора */}
          <button 
            className={`collect-button-main ${canCollect ? 'can-collect' : ''} ${collectAnimation ? 'collecting' : ''}`}
            onClick={handleCollect}
            disabled={!canCollect}
          >
            <span className="button-icon">💰</span>
            <span className="button-text">
              {canCollect ? `СОБРАТЬ ${formatNumber(accumulatedIncome)}` : 'НАКАПЛИВАЕТСЯ...'}
            </span>
          </button>
        </div>

        {/* 🆕 НОВАЯ СЕКЦИЯ - Реклама за награды */}
        <div className="ad-rewards-section" style={{
          margin: '15px 0',
          padding: '15px',
          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(238, 90, 36, 0.1))',
          borderRadius: '12px',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          textAlign: 'center'
        }}>
          <h3 style={{ 
            color: '#ff6b6b', 
            marginBottom: '8px', 
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            🎁 Бесплатные награды
          </h3>
          <p style={{ 
            color: '#ccc', 
            fontSize: '12px', 
            marginBottom: '12px',
            lineHeight: '1.3'
          }}>
            Смотрите рекламу и получайте бонусные монеты!
          </p>
          
          {/* Компонент рекламы Adsgram */}
          {onAdReward && (
            <AdsgramButton
              onReward={onAdReward}
              rewardAmount={100}
              buttonText="📺 Получить 100 монет"
              blockId="12355"
            />
          )}
          
          <div style={{
            fontSize: '10px',
            color: '#888',
            marginTop: '8px'
          }}>
            Кулдаун: 5 минут между просмотрами
          </div>
        </div>
        
        {/* Плавающие кнопки действий */}
        <button 
          className="floating-action-button left"
          onClick={onOpenCarSelector}
          title="Выбрать машину"
        >
          🚗
        </button>
        
        <button 
          className="floating-action-button right"
          onClick={onTuneClick}
          title="Тюнинг"
        >
          🔧
        </button>
      </div>
      
      {/* Зона построек - интегрированная */}
      <div className="buildings-integrated">
        <div className="buildings-grid-minimal">
          {buildings.map((building) => (
            <div 
              key={building.id}
              className={`building-item-minimal ${building.isLocked ? 'locked' : ''} ${building.level > 0 ? 'active' : ''}`}
              onClick={() => !building.isLocked && onBuildingClick(building.name)}
              title={building.name}
            >
              <div className="building-icon">{building.icon}</div>
              <div className="building-level-badge">
                {building.isLocked ? '🔒' : building.level > 0 ? building.level : '+'}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Анимация монет */}
      <div className="coins-animation-container">
        {coins.map(coin => (
          <div 
            key={coin.id} 
            className="flying-coin"
            style={{ 
              left: `${coin.left}%`,
              animationDelay: `${coin.delay}s`
            }}
          >
            💰
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainGameScreen;