import React from 'react';
import './CarSelector.css'; // Стили

// Принимает список машин игрока, ID выбранной, функцию выбора и функцию закрытия
function CarSelector({ playerCars, selectedCarId, onSelectCar, onClose }) {

  // Обработчик клика по карточке машины
  const handleCarClick = (carId) => {
    if (carId !== selectedCarId) { // Выбираем, только если это другая машина
      onSelectCar(carId);
    }
    onClose(); // Закрываем окно после выбора (или клика по текущей)
  };

  return (
    // Оверлей для затемнения фона
    <div className="car-selector-overlay" onClick={onClose}>
      {/* Контейнер окна, клик не закрывает */}
      <div className="car-selector-window" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Выбор Машины</h2>
        <div className="car-selector-list">
          {playerCars.map((car) => (
            <div
              key={car.id}
              // Добавляем класс 'selected', если машина выбрана
              className={`car-selector-item ${car.id === selectedCarId ? 'selected' : ''}`}
              onClick={() => handleCarClick(car.id)} // Вызываем обработчик с ID машины
            >
              <img src={car.imageUrl || '/placeholder-car.png'} alt={car.name} className="car-selector-image" />
              <div className="car-selector-name">{car.name}</div>
              {/* Можно добавить отображение основных статов */}
              <div className="car-selector-stats">
                <span>P:{car.stats?.power}</span>
                <span>S:{car.stats?.speed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CarSelector;