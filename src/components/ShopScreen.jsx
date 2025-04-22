import React from 'react';
import './ShopScreen.css'; // Стили

// Принимает каталог, машины игрока, баланс и функцию покупки
function ShopScreen({ catalog, playerCars, gameCoins, onBuyCar }) {

  // Получаем ID машин, которые уже есть у игрока
  const ownedCarIds = playerCars.map(car => car.id);

  return (
    <div className="shop-screen">
      <h2>Автосалон</h2>
      <div className="shop-items">
        {catalog.map(car => {
          const isOwned = ownedCarIds.includes(car.id);
          const canAfford = gameCoins >= car.price;

          // Не показываем стартовую машину (с ценой 0) или можно показывать как "В наличии"
          if (car.price === 0 && isOwned) return null;

          return (
            <div key={car.id} className={`shop-item ${isOwned ? 'owned' : ''}`}>
              <img src={car.imageUrl || '/placeholder-car.png'} alt={car.name} className="shop-item-image" />
              <h3>{car.name}</h3>
              <div className="shop-item-stats">
                 {/* Можно показать базовые статы или разницу с текущей */}
                 <span>P: {car.baseStats.power}</span>
                 <span>S: {car.baseStats.speed}</span>
                 <span>St: {car.baseStats.style}</span>
                 <span>R: {car.baseStats.reliability}</span>
              </div>
              <div className="shop-item-buy">
                {!isOwned && (
                  <>
                    <span className={`shop-item-price ${!canAfford ? 'insufficient' : ''}`}>
                      💰 {car.price.toLocaleString()}
                    </span>
                    <button
                      className="buy-button"
                      onClick={() => onBuyCar(car.id)}
                      disabled={!canAfford} // Нельзя купить, если не хватает монет
                    >
                      Купить
                    </button>
                  </>
                )}
                {isOwned && (
                  <span className="owned-label">В гараже</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ShopScreen;