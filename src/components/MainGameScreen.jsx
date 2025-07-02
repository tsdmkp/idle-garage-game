import React, { useState, useEffect } from 'react';
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
  onAdReward // Пока скрыт, включим позже
}) => {
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

  // Функция для расчета стоимости зданий
  const calculateBuildingCost = (building) => {
    if (building.level === 0) {
      return building.baseCost || 1000;
    }
    return Math.floor((building.baseCost || 1000) * Math.pow(1.5, building.level));
  };
  
  return (
    <div className="main-game-screen">
      {/* Фоновый градиент */}
      <div className="game-background"></div>
      
      {/* Основная игровая зона */}
      <div className="game-content">
        
        {/* Секция машины */}
        <div className="car-section">
          <div className="car-showcase">
            <div className="car-name-plate">
              <h2>{car?.name || 'Загрузка...'}</h2>
              <div className="car-income-badge">
                <span className="income-icon">💰</span>
                <span className="income-text">{formatNumber(incomeRate)}/час</span>
              </div>
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
            
            {/* Компактные статы машины */}
            <div className="car-stats-compact">
              <div className="stat-item">
                <span className="stat-icon">⚡</span>
                <span className="stat-value">{car?.stats?.power || 0}</span>
                <span className="stat-label">Мощность</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🏎️</span>
                <span className="stat-value">{car?.stats?.speed || 0}</span>
                <span className="stat-label">Скорость</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🎯</span>
                <span className="stat-value">{car?.stats?.handling || 0}</span>
                <span className="stat-label">Управление</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🔧</span>
                <span className="stat-value">{car?.stats?.reliability || 0}</span>
                <span className="stat-label">Надежность</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Секция прогресса и сбора */}
        <div className="income-section">
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

        {/* Секция зданий - УЛУЧШЕННАЯ */}
        <div className="buildings-section">
          <div className="buildings-header">
            <h3>🏢 Здания</h3>
            <div className="buildings-subtitle">Развивайте автосервис для увеличения дохода</div>
          </div>
          
          <div className="buildings-grid">
            {buildings.map((building) => {
              const cost = calculateBuildingCost(building);
              const canAfford = gameCoins >= cost;
              const isUnlocked = !building.isLocked; // Разблокируем все здания
              const currentIncome = building.incomePerHour * building.level;
              const nextIncome = building.incomePerHour * (building.level + 1);
              const incomeIncrease = nextIncome - currentIncome;

              return (
                <div 
                  key={building.id}
                  className={`building-card ${!isUnlocked ? 'locked' : canAfford ? 'affordable' : 'expensive'}`}
                  onClick={() => isUnlocked && onBuildingClick(building.name)}
                >
                  <div className="building-card-header">
                    <div className="building-icon">{building.icon}</div>
                    <div className="building-level-badge">
                      {!isUnlocked ? '🔒' : building.level}
                    </div>
                  </div>
                  
                  <div className="building-info">
                    <div className="building-name">{building.name}</div>
                    <div className="building-description">
                      {building.level === 0 ? 'Не построено' : `Уровень ${building.level}`}
                    </div>
                    
                    {isUnlocked && (
                      <>
                        <div className="building-income">
                          <span className="income-current">💰 {formatNumber(currentIncome)}/час</span>
                          {building.level > 0 && incomeIncrease > 0 && (
                            <span className="income-increase">+{formatNumber(incomeIncrease)}</span>
                          )}
                        </div>
                        
                        <div className={`building-cost ${canAfford ? 'affordable' : 'expensive'}`}>
                          <span className="cost-icon">💎</span>
                          <span className="cost-amount">{formatNumber(cost)}</span>
                        </div>
                        
                        <button 
                          className={`building-upgrade-btn ${canAfford ? 'can-upgrade' : 'cant-upgrade'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canAfford) onBuildingClick(building.name);
                          }}
                          disabled={!canAfford}
                        >
                          {building.level === 0 ? 'Построить' : 'Улучшить'}
                        </button>
                      </>
                    )}
                    
                    {!isUnlocked && (
                      <div className="building-locked-text">
                        Откроется позже
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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