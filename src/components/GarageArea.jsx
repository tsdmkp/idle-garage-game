import React from 'react';
import './GarageArea.css'; // Убедись, что стили подключены и обновлены

// Компонент принимает:
// car - объект текущей машины
// onTuneClick - функция для открытия окна тюнинга
// onOpenCarSelector - функция для открытия окна выбора машины
function GarageArea({ car, onTuneClick, onOpenCarSelector }) {

  // Проверка наличия данных машины
  if (!car || !car.stats) {
    return (
      <div className="garage-area">
        <p style={{ color: '#888', textAlign: 'center' }}>Машина не загружена.</p>
      </div>
    );
  }

  // Деструктуризация для удобства
  const { name, imageUrl, stats } = car;
  const { power, speed, style, reliability } = stats;

  // Обработчик для кнопки тюнинга остается прежним
  const handleTuneButtonClick = () => {
      if (onTuneClick) {
          onTuneClick();
      } else {
          console.warn("Обработчик onTuneClick не передан в GarageArea");
      }
  };

   // Обработчик для кнопки смены машины
   const handleChangeCarButtonClick = () => {
        if (onOpenCarSelector) {
            onOpenCarSelector(); // Вызываем функцию из App.jsx
        } else {
            console.warn("Обработчик onOpenCarSelector не передан в GarageArea");
        }
   };

  return (
    // Основной контейнер гаража
    <div className="garage-area">

      {/* Блок отображения машины */}
      <div className="car-display">
        {/* Обёртка для названия и кнопки смены */}
        <div className="car-header">
          <h2 className="car-name">{name}</h2>
          {/* Кнопка смены машины */}
          <button
            onClick={handleChangeCarButtonClick} // Привязываем новый обработчик
            className="change-car-button"
            title="Сменить машину" // Всплывающая подсказка
          >
            🔄 {/* Иконка */}
          </button>
        </div>
        {/* Изображение машины */}
        <img
          src={imageUrl || '/placeholder-car.png'} // Используем плейсхолдер, если нет картинки
          alt={name}
          className="car-image"
          onError={(e) => { e.target.onerror = null; e.target.src="/placeholder-car.png" }} // Обработка ошибки загрузки
        />
      </div>

      {/* Блок характеристик С ИКОНКАМИ */}
      <div className="car-stats">
        <span title={`Мощность: ${power}`}>
          <span className="stat-icon">⚡</span>
          <span className="stat-value">{power}</span>
        </span>
        <span title={`Скорость: ${speed}`}>
          <span className="stat-icon">🏎️</span>
          <span className="stat-value">{speed}</span>
        </span>
        <span title={`Стиль: ${style}`}>
          <span className="stat-icon">✨</span>
          <span className="stat-value">{style}</span>
        </span>
        <span title={`Надежность: ${reliability}`}>
          <span className="stat-icon">🔧</span>
          <span className="stat-value">{reliability}</span>
        </span>
      </div>

      {/* Кнопка тюнинга */}
      <button
        className="tune-button"
        onClick={handleTuneButtonClick} // Используем старый обработчик
      >
        ТЮНИНГ
      </button>
    </div> // Закрываем .garage-area
  );
}

export default GarageArea;