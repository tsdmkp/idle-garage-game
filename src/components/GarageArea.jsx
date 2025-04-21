import React from 'react';
import './GarageArea.css'; // Подключаем стили

// Компонент принимает объект 'car' и функцию 'onTuneClick' в качестве props
function GarageArea({ car, onTuneClick }) {

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

  // Обработчик клика по кнопке "ТЮНИНГ" вызывает функцию из props
  const handleTuneButtonClick = () => {
      if (onTuneClick) {
          onTuneClick(); // Вызываем функцию, переданную из App.jsx
      } else {
          console.warn("Обработчик onTuneClick не передан в GarageArea");
      }
  };

  return (
    <div className="garage-area">
      {/* ИЗМЕНЕН ПОРЯДОК: Сначала название, потом картинка */}
      <div className="car-display">
        <h2 className="car-name">{name}</h2> {/* Название машины */}
        <img
          src={imageUrl}
          alt={name}
          className="car-image"
          onError={(e) => { e.target.onerror = null; e.target.src="/placeholder-car.png" }}
        />
      </div>

      {/* Блок характеристик */}
      <div className="car-stats">
        <span title={`Мощность: ${power}`}>P: {power}</span>
        <span title={`Скорость: ${speed}`}>S: {speed}</span>
        <span title={`Стиль: ${style}`}>St: {style}</span>
        <span title={`Надежность: ${reliability}`}>R: {reliability}</span>
      </div>

      {/* Кнопка тюнинга */}
      <button
        className="tune-button"
        onClick={handleTuneButtonClick}
      >
        ТЮНИНГ
      </button>
    </div>
  );
}

export default GarageArea;