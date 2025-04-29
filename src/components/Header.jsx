import React from 'react';
import './Header.css'; // Убедись, что файл стилей существует и импортирован

// Компонент Header для отображения верхней панели игры
// Принимает данные об игроке и ресурсах через props

// --- ДОБАВЛЕНЫ ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ для gameCoins и jetCoins ---
function Header({
    level = 1,                // Уровень игрока (по умолчанию 1)
    playerName = "Игрок",   // Имя игрока (по умолчанию "Игрок")
    gameCoins = 0,            // Игровые монеты (по умолчанию 0)
    jetCoins = 0,             // Токены (по умолчанию 0)
    xpPercentage = 0          // Процент опыта (по умолчанию 0)
}) {

  // Теперь gameCoins и jetCoins гарантированно будут числами (или 0),
  // даже если из App придет undefined или null.

  return (
    // Основной контейнер хедера
    <div className="header">

      {/* Блок с информацией об игроке (уровень, имя, XP) */}
      <div className="player-info">
        <span className="player-level">LVL {level}</span> {/* Отображаем уровень */}
        <span className="player-name">{playerName}</span> {/* Отображаем имя */}
        {/* Контейнер для полосы опыта */}
        <div className="xp-bar-container">
          {/* Заполняющая часть полосы опыта, ширина зависит от xpPercentage */}
          <div
            className="xp-bar-fill"
            style={{ width: `${xpPercentage}%` }} // Динамический стиль ширины
          ></div>
        </div>
      </div>

      {/* Блок с ресурсами (монеты, токены) */}
      <div className="resources">
        {/* Отображаем игровые монеты с форматированием */}
        <span className="resource-item">💰 {gameCoins.toLocaleString()}</span>
        {/* Отображаем токены с форматированием */}
        <span className="resource-item">💎 {jetCoins.toLocaleString()}</span>
      </div>

      {/* Блок с кнопками действий (бустеры, настройки) */}
      <div className="header-actions">
        {/* Иконка бустеров (пока неактивна) */}
        <span className="header-icon" title="Бустеры">🚀</span>
        {/* Иконка настроек (пока неактивна) */}
        <span className="header-icon" title="Настройки">⚙️</span>
        {/* TODO: Сделать эти иконки кликабельными кнопками */}
      </div>

    </div> // Закрываем основной контейнер хедера
  );
}

// Экспортируем компонент для использования в других частях приложения
export default Header;