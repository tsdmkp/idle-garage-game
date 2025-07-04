import React from 'react';
import './ShopScreen.css';

function ShopScreen({ catalog = [], playerCars = [], gameCoins = 0, onBuyCar }) {
  const ownedCarIds = new Set(playerCars.map(car => car.id));

  // Функция для определения рарности машины
  const getCarRarity = (price) => {
    if (price === 0) return { class: 'starter', label: 'Стартовая', color: '#9E9E9E' };
    if (price <= 10000) return { class: 'common', label: 'Обычная', color: '#4CAF50' };
    if (price <= 50000) return { class: 'rare', label: 'Редкая', color: '#2196F3' };
    if (price <= 150000) return { class: 'epic', label: 'Эпическая', color: '#9C27B0' };
    return { class: 'legendary', label: 'Легендарная', color: '#FF9800' };
  };

  // Функция для форматирования больших чисел
  const formatPrice = (price) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  // Группировка машин по рарности
  const groupedCars = catalog.reduce((groups, car) => {
    const rarity = getCarRarity(car.price);
    if (!groups[rarity.class]) {
      groups[rarity.class] = { rarity, cars: [] };
    }
    groups[rarity.class].cars.push(car);
    return groups;
  }, {});

  const rarityOrder = ['starter', 'common', 'rare', 'epic', 'legendary'];

  return (
    <div className="shop-screen">
      <div className="shop-header">
        <h2>🏪 Премиум Автосалон</h2>
        <div className="shop-balance">
          💰 Баланс: <span className="balance-amount">{gameCoins.toLocaleString()}</span> GC
        </div>
      </div>

      <div className="shop-content">
        {rarityOrder.map(rarityClass => {
          const group = groupedCars[rarityClass];
          if (!group) return null;

          return (
            <div key={rarityClass} className={`rarity-section ${rarityClass}`}>
              <div className="rarity-header">
                <div 
                  className="rarity-badge"
                  style={{ backgroundColor: group.rarity.color }}
                >
                  {group.rarity.label}
                </div>
                <div className="rarity-count">
                  {group.cars.length} машин{group.cars.length === 1 ? 'а' : ''}
                </div>
              </div>

              <div className="cars-grid">
                {group.cars.map((car) => {
                  if (!car || !car.id) {
                    console.warn("ShopScreen: Skipping invalid car data:", car);
                    return null;
                  }

                  const isOwned = ownedCarIds.has(car.id);
                  const price = typeof car.price === 'number' ? car.price : Infinity;
                  const canAfford = gameCoins >= price;
                  const canBuy = !isOwned && canAfford && price > 0;

                  const currentBaseStats = car.baseStats || {};
                  const displayPower = currentBaseStats.power ?? '?';
                  const displaySpeed = currentBaseStats.speed ?? '?';
                  const displayStyle = currentBaseStats.style ?? '?';
                  const displayReliability = currentBaseStats.reliability ?? '?';
                  const displayIncome = currentBaseStats.baseIncome ?? '?';

                  return (
                    <div 
                      key={car.id} 
                      className={`car-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'unaffordable' : ''}`}
                    >
                      {/* Статус машины */}
                      {isOwned && (
                        <div className="ownership-badge">
                          ✅ В гараже
                        </div>
                      )}

                      {/* Изображение машины */}
                      <div className="car-image-container">
                        <img 
                          src={car.imageUrl || '/placeholder-car.png'} 
                          alt={car.name || 'Машина'} 
                          className="car-image"
                          onError={(e) => { 
                            e.target.onerror = null; 
                            e.target.src = '/placeholder-car.png'; 
                          }}
                        />
                        <div className="car-overlay">
                          <div className="income-indicator">
                            💰 {displayIncome}/час
                          </div>
                        </div>
                      </div>

                      {/* Информация о машине */}
                      <div className="car-info">
                        <h3 className="car-name">{car.name || 'Без названия'}</h3>
                        
                        <div className="car-stats">
                          <div className="stat-item">
                            <span className="stat-icon">⚡</span>
                            <span className="stat-value">{displayPower}</span>
                            <span className="stat-label">Мощность</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">🏎️</span>
                            <span className="stat-value">{displaySpeed}</span>
                            <span className="stat-label">Скорость</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">✨</span>
                            <span className="stat-value">{displayStyle}</span>
                            <span className="stat-label">Стиль</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">🔧</span>
                            <span className="stat-value">{displayReliability}</span>
                            <span className="stat-label">Надежность</span>
                          </div>
                        </div>

                        {/* Цена и кнопка */}
                        <div className="car-purchase">
                          <div className="car-price">
                            {price === 0 ? (
                              <span className="free-price">🎁 Бесплатно</span>
                            ) : price === Infinity ? (
                              <span className="unknown-price">❓ Не продается</span>
                            ) : (
                              <>
                                <span className="price-amount">{formatPrice(price)}</span>
                                <span className="price-currency">GC</span>
                              </>
                            )}
                          </div>

                          <button
                            className={`purchase-button ${isOwned ? 'owned' : canAfford ? 'available' : 'unaffordable'}`}
                            onClick={() => { if(canBuy) onBuyCar(car.id) }}
                            disabled={isOwned || !canAfford || price === 0}
                          >
                            {isOwned ? (
                              <>
                                <span className="button-icon">✅</span>
                                <span className="button-text">Куплена</span>
                              </>
                            ) : canAfford && price > 0 ? (
                              <>
                                <span className="button-icon">🛒</span>
                                <span className="button-text">Купить</span>
                              </>
                            ) : price === 0 ? (
                              <>
                                <span className="button-icon">🎁</span>
                                <span className="button-text">Получена</span>
                              </>
                            ) : (
                              <>
                                <span className="button-icon">💰</span>
                                <span className="button-text">Копить</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ShopScreen;