import React from 'react';
import BuildingItem from './BuildingItem'; // Импортируем компонент здания
import './BuildingArea.css'; // Стили

// Принимает массив зданий и обработчик клика
function BuildingArea({ buildings, onBuildingClick }) {

  const handleItemClick = (buildingName) => {
    console.log("Клик по зданию:", buildingName);
    if (onBuildingClick) {
      onBuildingClick(buildingName); // Вызываем переданную функцию
    }
    // В будущем здесь может быть логика открытия окна улучшения/постройки
  };

  return (
    <div className="building-area">
      <h3 className="area-title">Постройки</h3>
      <div className="buildings-grid">
        {buildings.map((building) => (
          <BuildingItem
            key={building.id} // Ключ для React
            name={building.name}
            level={building.level}
            icon={building.icon}
            isLocked={building.isLocked}
            onClick={handleItemClick}
          />
        ))}
      </div>
    </div>
  );
}

export default BuildingArea;