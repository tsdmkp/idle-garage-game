import React from 'react';
import './ShopScreen.css';

function ShopScreen({ catalog = [], playerCars = [], gameCoins = 0, onBuyCar }) {
  const ownedCarIds = new Set(playerCars.map(car => car.id));

  // Функция для форматирования больших чисел
  const formatPrice = (price) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  return (
    <div className="shop-screen">
      {/* Чистый заголовок */}
      <div className="shop-header">
        <h2>🏪 Автосалон</h2>
        <div className="shop-balance">
          💰 Баланс: <span className="balance-amount">{gameCoins.toLocaleString()}</span> GC
        </div>
      </div>

      <div className="shop-content">
        {/* Убираем группировку по рарности - просто показываем все машины */}
        <div className="cars-grid">
          {catalog.map((car) => {
            if (!car || !car.id) {
              console.warn("ShopScreen: Skipping invalid car data:", car);
              return null;
            }

            const isOwned = ownedCarIds.has(car.id);
            const price = typeof car.price === 'number' ? car.price : Infinity;
            const canAfford = gameCoins >= price;
            const canBuy = !isOwned && canAfford && price > 0;

            // ИСПРАВЛЕННОЕ получение характеристик
            const currentBaseStats = car.baseStats || {};
            const displayPower = currentBaseStats.power ?? '?';
            const displaySpeed = currentBaseStats.speed ?? '?';
            const displayStyle = currentBaseStats.style ?? '?';
            const displayReliability = currentBaseStats.reliability ?? '?';
            const displayIncome = currentBaseStats.baseIncome ?? '?';
            
            // Логирование для отладки
            if (!car.baseStats) {
              console.warn(`ShopScreen: Нет baseStats для машины ${car.id}:`, car);
            }

            return (
              <div 
                key={car.id} 
                className={`shop-car-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'unaffordable' : ''}`}
              >
                {/* Статус машины */}
                {isOwned && (
                  <div className="shop-ownership-badge">
                    ✅ В гараже
                  </div>
                )}

                {/* Изображение машины - ГЛАВНЫЙ АКЦЕНТ */}
                <div className="shop-car-image-container">
                  <img 
                    src={car.imageUrl || '/placeholder-car.png'} 
                    alt={car.name || 'Машина'} 
                    className="shop-car-image"
                    onError={(e) => { 
                      e.target.onerror = null; 
                      e.target.src = '/placeholder-car.png'; 
                    }}
                  />
                  <div className="shop-car-overlay">
                    <div className="shop-income-indicator">
                      💰 {displayIncome}/час
                    </div>
                  </div>
                </div>

                {/* Информация о машине */}
                <div className="shop-car-info">
                  <h3 className="shop-car-name">{car.name || 'Без названия'}</h3>
                  
                  {/* Характеристики - УВЕЛИЧЕННЫЕ НО КОМПАКТНЫЕ */}
                  <div className="shop-car-stats">
                    <div className="shop-stat-item">
                      <span className="shop-stat-icon">⚡</span>
                      <span className="shop-stat-value">{displayPower}</span>
                      <span className="shop-stat-label">Мощность</span>
                    </div>
                    <div className="shop-stat-item">
                      <span className="shop-stat-icon">🏎️</span>
                      <span className="shop-stat-value">{displaySpeed}</span>
                      <span className="shop-stat-label">Скорость</span>
                    </div>
                    <div className="shop-stat-item">
                      <span className="shop-stat-icon">✨</span>
                      <span className="shop-stat-value">{displayStyle}</span>
                      <span className="shop-stat-label">Стиль</span>
                    </div>
                    <div className="shop-stat-item">
                      <span className="shop-stat-icon">🔧</span>
                      <span className="shop-stat-value">{displayReliability}</span>
                      <span className="shop-stat-label">Надежность</span>
                    </div>
                  </div>

                  {/* Цена и кнопка */}
                  <div className="shop-car-purchase">
                    <div className="shop-car-price">
                      {price === 0 ? (
                        <span className="shop-free-price">🎁 Бесплатно</span>
                      ) : price === Infinity ? (
                        <span className="shop-unknown-price">❓ Не продается</span>
                      ) : (
                        <>
                          <span className="shop-price-amount">{formatPrice(price)}</span>
                          <span className="shop-price-currency">GC</span>
                        </>
                      )}
                    </div>

                    <button
                      className={`shop-purchase-button ${isOwned ? 'owned' : canAfford ? 'available' : 'unaffordable'}`}
                      onClick={() => { if(canBuy) onBuyCar(car.id) }}
                      disabled={isOwned || !canAfford || price === 0}
                    >
                      {isOwned ? (
                        <>
                          <span className="shop-button-icon">✅</span>
                          <span className="shop-button-text">Куплена</span>
                        </>
                      ) : canAfford && price > 0 ? (
                        <>
                          <span className="shop-button-icon">🛒</span>
                          <span className="shop-button-text">Купить</span>
                        </>
                      ) : price === 0 ? (
                        <>
                          <span className="shop-button-icon">🎁</span>
                          <span className="shop-button-text">Получена</span>
                        </>
                      ) : (
                        <>
                          <span className="shop-button-icon">💰</span>
                          <span className="shop-button-text">Копить</span>
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
    </div>
  );
}

export default ShopScreen;