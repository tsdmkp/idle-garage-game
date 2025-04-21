import React from 'react';
import './GarageArea.css'; // Подключаем стили для этого компонента

// Компонент принимает объект 'car' в качестве свойства (props)
function GarageArea({ car }) {

  // Проверка: если объект 'car' не передан или пуст, отображаем сообщение
  if (!car || !car.stats) {
    // Можно вернуть null или отобразить заглушку
    return (
      <div className="garage-area">
        <p style={{ color: '#888', textAlign: 'center' }}>Гараж пуст или машина не выбрана.</p>
      </div>
    );
  }

  // Извлекаем нужные данные из объекта 'car' для удобства использования в JSX
  const { name, imageUrl, stats } = car;
  // Извлекаем отдельные характеристики из объекта 'stats'
  const { power, speed, style, reliability } = stats;

  // Функция-обработчик для кнопки "ТЮНИНГ"
  // Пока просто выводит сообщение в консоль
  const handleTuneClick = () => {
    console.log(`Нажата кнопка ТЮНИНГ для машины: ${name} (ID: ${car.id})`);
    // В будущем здесь будет логика перехода на экран тюнинга
    // Например, вызов функции, переданной через props: props.onTuneClick(car.id);
  };

  // Возвращаем JSX-разметку компонента
  return (
    // Основной контейнер области гаража
    <div className="garage-area">

      {/* Блок для отображения изображения и названия машины */}
      <div className="car-display">
        <img
          src={imageUrl} // Путь к изображению машины
          alt={name}     // Альтернативный текст для изображения
          className="car-image" // CSS класс для стилизации
          // Можно добавить обработчик ошибок, если картинка не загрузится
          onError={(e) => { e.target.onerror = null; e.target.src="/placeholder-car.png" }}
        />
        <h2 className="car-name">{name}</h2> {/* Название машины */}
      </div>

      {/* Блок для отображения характеристик машины */}
      <div className="car-stats">
        {/* Каждый стат в отдельном span для стилизации */}
        <span title={`Мощность: ${power}`}>P: {power}</span>
        <span title={`Скорость: ${speed}`}>S: {speed}</span>
        <span title={`Стиль: ${style}`}>St: {style}</span>
        <span title={`Надежность: ${reliability}`}>R: {reliability}</span>
      </div>

      {/* Кнопка для перехода к тюнингу */}
      <button
        className="tune-button" // CSS класс для стилизации
        onClick={handleTuneClick} // Привязываем обработчик клика
      >
        ТЮНИНГ
      </button>

    </div> // Закрываем основной контейнер
  );
}

// Экспортируем компонент, чтобы его можно было использовать в других файлах (например, в App.jsx)
export default GarageArea;