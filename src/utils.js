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
      {/* Чистый заголовок без "Премиум автосалон" */}
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

                {/* Изображение машины - ГЛАВНЫЙ АКЦЕНТ */}
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
                  
                  {/* Характеристики - УВЕЛИЧЕННЫЕ НО КОМПАКТНЫЕ */}
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
    </div>
  );
}

export default ShopScreen;