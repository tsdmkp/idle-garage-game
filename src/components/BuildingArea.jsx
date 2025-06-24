import React from 'react';
import BuildingItem from './BuildingItem';
import './BuildingArea.css';

// ✅ ЭКСТРЕННОЕ РЕШЕНИЕ: Хардкод зданий прямо в компоненте
const FALLBACK_BUILDINGS = [
    { id: 'wash', name: 'Автомойка', level: 1, icon: '🧼', isLocked: false },
    { id: 'service', name: 'Сервис', level: 0, icon: '🔧', isLocked: false },
    { id: 'tires', name: 'Шиномонтаж', level: 0, icon: '🔘', isLocked: true },
    { id: 'drift', name: 'Шк. Дрифта', level: 0, icon: '🏫', isLocked: true },
];

function BuildingArea({ buildings, onBuildingClick }) {

  console.log("BuildingArea: buildings received:", buildings);
  
  // ✅ ЭКСТРЕННАЯ ЗАЩИТА: Используем fallback если данные плохие
  const safeBuildings = React.useMemo(() => {
    
    // Если нет зданий или данные плохие - используем fallback
    if (!buildings || !Array.isArray(buildings) || buildings.length === 0) {
      console.warn("BuildingArea: No buildings received, using FALLBACK_BUILDINGS");
      return FALLBACK_BUILDINGS;
    }
    
    // Проверяем первое здание
    const firstBuilding = buildings[0];
    if (!firstBuilding || 
        typeof firstBuilding.name !== 'string' || 
        typeof firstBuilding.icon !== 'string' ||
        firstBuilding.name === 'undefined' ||
        firstBuilding.icon === 'undefined') {
      console.warn("BuildingArea: Buildings have invalid data, using FALLBACK_BUILDINGS");
      console.log("First building:", firstBuilding);
      return FALLBACK_BUILDINGS;
    }
    
    console.log("BuildingArea: Using received buildings:", buildings);
    return buildings;
  }, [buildings]);
  
  const handleItemClick = (buildingName) => {
    console.log("Клик по зданию:", buildingName);
    if (onBuildingClick) {
      onBuildingClick(buildingName);
    } else {
      console.warn("onBuildingClick не передан!");
    }
  };

  return (
    <div className="building-area">
      <h3 className="area-title">Постройки</h3>
      <div className="buildings-grid">
        {safeBuildings.map((building) => {
          console.log(`Rendering building: ${building.name}, icon: ${building.icon}, level: ${building.level}, locked: ${building.isLocked}`);
          
          return (
            <BuildingItem
              key={building.id}
              name={building.name}
              level={building.level}
              icon={building.icon}
              isLocked={building.isLocked}
              onClick={handleItemClick}
            />
          );
        })}
      </div>
    </div>
  );
}

export default BuildingArea;