import React from 'react';
import './ShopScreen.css';

// --- ИСПРАВЛЕНО: Проверяем синтаксис определения props ---
function ShopScreen({
    catalog = [],       // Массив машин из каталога
    playerCars = [],    // Массив машин игрока
    gameCoins = 0,      // Баланс монет игрока
    onBuyCar            // Функция для покупки машины (запятая после не нужна, если это последний параметр)
}) { // <--- Убедись, что здесь нет лишних символов перед {
// ----------------------------------------------------

  // Множество ID купленных машин для быстрой проверки
  const ownedCarIds = new Set(playerCars.map(car => car.id));

  return (
    <div className="shop-screen">
      <h2>Автосалон</h2>
      <p className="shop-balance">Ваш баланс: 💰 {gameCoins.toLocaleString()} GC</p>

      <div className="car-catalog-list">
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

          const displayPriceText = isOwned
            ? 'Уже в гараже'
            : (price === 0 ? 'Бесплатно' : (price === Infinity ? '???' : `Цена: 💰 ${price.toLocaleString()} GC`));


          return (
            <div key={car.id} className={`car-item ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'unaffordable' : ''}`}>
              <img src={car.imageUrl || '/placeholder-car.png'} alt={car.name || 'Машина'} className="car-item-image" />
              <div className="car-item-info">
                <h3>{car.name || 'Без названия'}</h3>
                <p className="car-item-stats">
                  Базовые статы: P: {displayPower} | S: {displaySpeed}
                </p>
                <p className="car-item-price">{displayPriceText}</p>
              </div>
              <button
                className={`buy-button ${isOwned ? 'owned-btn' : ''} ${!canAfford && !isOwned ? 'cant-afford-btn' : ''}`}
                // Вызываем onBuyCar ТОЛЬКО если можно купить
                onClick={() => { if(canBuy) onBuyCar(car.id) }}
                disabled={isOwned || !canAfford || price === 0} // Бесплатные тоже дизейблим
              >
                {isOwned
                    ? 'В гараже'
                    : (canAfford && price > 0
                          ? 'Купить'
                          : (price <= 0 ? 'Бесплатно' : 'Не хватает')
                      )
                }
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ShopScreen;