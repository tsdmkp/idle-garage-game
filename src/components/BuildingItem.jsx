import React from 'react';
import './BuildingItem.css'; // Стили добавим

function BuildingItem({ name, level, icon, isLocked = false, onClick }) {
  
  // ✅ ДОБАВЛЯЕМ ОТЛАДОЧНЫЕ ЛОГИ
  console.log(`BuildingItem render: name=${name}, icon="${icon}", level=${level}, isLocked=${isLocked}`);
  
  const handleClick = () => {
    if (!isLocked && onClick) {
      console.log(`BuildingItem clicked: ${name}`);
      onClick(name); // Передаем имя здания при клике
    } else {
      console.log(`BuildingItem click blocked: locked=${isLocked}, onClick=${!!onClick}`);
    }
  };

  // ✅ ПРОВЕРЯЕМ ЧТО ОТОБРАЖАЕТСЯ В ИКОНКЕ
  const displayIcon = isLocked ? '🔒' : icon;
  console.log(`BuildingItem ${name} will display icon: "${displayIcon}"`);

  return (
    <div
      className={`building-item ${isLocked ? 'locked' : ''} ${level > 0 ? 'active' : ''}`}
      onClick={handleClick}
      title={isLocked ? "Недоступно" : `${name} (Ур. ${level}) ${level > 0 ? '' : '(Не построено)'}`}
    >
      <div className="building-icon" style={{ border: '1px solid red', minHeight: '30px' }}>
        {displayIcon}
      </div>
      <div className="building-name">{name}</div>
      {level > 0 && !isLocked && <div className="building-level">Ур. {level}</div>}
      {level === 0 && !isLocked && <div className="building-level build-prompt">Построить</div>}
    </div>
  );
}

export default BuildingItem;