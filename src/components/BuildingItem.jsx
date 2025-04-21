import React from 'react';
import './BuildingItem.css'; // Стили добавим

function BuildingItem({ name, level, icon, isLocked = false, onClick }) {
  const handleClick = () => {
    if (!isLocked && onClick) {
      onClick(name); // Передаем имя здания при клике
    }
  };

  return (
    <div
      className={`building-item ${isLocked ? 'locked' : ''} ${level > 0 ? 'active' : ''}`}
      onClick={handleClick}
      title={isLocked ? "Недоступно" : `${name} (Ур. ${level}) ${level > 0 ? '' : '(Не построено)'}`}
    >
      <div className="building-icon">{isLocked ? '🔒' : icon}</div>
      <div className="building-name">{name}</div>
      {level > 0 && !isLocked && <div className="building-level">Ур. {level}</div>}
      {level === 0 && !isLocked && <div className="building-level build-prompt">Построить</div>}
    </div>
  );
}

export default BuildingItem;