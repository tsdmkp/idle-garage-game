import React from 'react';
import './StaffScreen.css'; // Убедись, что CSS файл подключен

// Компонент для отображения экрана Персонала
// Получает:
// - staffCatalog: Объект с описанием всех доступных сотрудников
// - hiredStaff: Объект с текущими уровнями нанятых сотрудников { staffId: level }
// - gameCoins: Текущий баланс монет игрока
// - onHireOrUpgrade: Функция из App.jsx для найма/улучшения сотрудника (принимает staffId)
// - calculateCost: Функция из App.jsx для расчета стоимости найма/улучшения (принимает staffId)
function StaffScreen({ staffCatalog, hiredStaff, gameCoins, onHireOrUpgrade, calculateCost }) {

  // Проверка на случай, если основные данные не переданы
  if (!staffCatalog || !hiredStaff || calculateCost === undefined) {
    console.error("StaffScreen: Missing required props (staffCatalog, hiredStaff, or calculateCost).");
    return <div className="staff-screen error">Ошибка загрузки данных персонала!</div>;
  }

  // Рассчитываем общее количество нанятого персонала
  const totalStaffCount = Object.values(hiredStaff).reduce((sum, level) => sum + level, 0);

  // Лог при каждом рендере для отладки
  // console.log("StaffScreen rendering with hiredStaff:", hiredStaff, "gameCoins:", gameCoins);

  return (
    <div className="staff-screen">
      <div className="staff-header">
        <h2>👥 Персонал</h2>
        <div className="staff-summary">
          <div className="total-staff-count">
            <span className="count-icon">👨‍💼</span>
            <span className="count-text">Всего нанято: {totalStaffCount}</span>
          </div>
        </div>
      </div>
      
      <div className="staff-list">
        {/* Преобразуем объект каталога в массив его значений и итерируем */}
        {/* Используем Object.entries, чтобы получить и ID (ключ) и данные (значение) */}
        {Object.entries(staffCatalog).map(([staffId, staffInfo]) => {

          // Проверка на случай некорректных данных в каталоге
          if (!staffInfo || !staffId || typeof staffInfo.maxLevel !== 'number') {
              console.warn("StaffScreen: Skipping invalid staff catalog entry:", staffInfo);
              return null; // Пропускаем рендер этой карточки
          }

          // Получаем текущий уровень сотрудника (или 0, если не нанят)
          const currentLevel = hiredStaff[staffId] || 0;
          // Проверяем, достиг ли сотрудник максимального уровня
          const isMaxLevel = currentLevel >= staffInfo.maxLevel;

          // --- Логи для расчета стоимости ---
          // console.log(`StaffScreen: Processing ${staffId} - Level: ${currentLevel}, MaxLevel: ${staffInfo.maxLevel}, IsMax: ${isMaxLevel}`);

          // Рассчитываем стоимость следующего действия (найма или улучшения)
          let cost = Infinity; // Начинаем с Infinity по умолчанию
          if (!isMaxLevel && typeof calculateCost === 'function') {
              try {
                  cost = calculateCost(staffId); // Получаем стоимость из App.jsx
                  // Добавим проверку на NaN, на всякий случай
                  if (isNaN(cost)) {
                      console.error(`StaffScreen: calculateCost returned NaN for ${staffId}`);
                      cost = Infinity;
                  }
              } catch (error) {
                  console.error("Error calling calculateCost for", staffId, error);
                  cost = Infinity; // Ставим Infinity при ошибке
              }
          } else if (isMaxLevel) {
              cost = Infinity; // Явно ставим Infinity для макс. уровня
          }
          // Логируем рассчитанную стоимость и ее тип
          // console.log(`StaffScreen: Calculated cost for ${staffId}:`, cost, "(type:", typeof cost, ")");

          // Проверяем, хватает ли монет (cost должен быть числом и не Infinity)
          const canAfford = typeof cost === 'number' && cost !== Infinity && gameCoins >= cost;
          // console.log(`StaffScreen: Can afford ${staffId}? Cost=${cost}, Coins=${gameCoins}, Afford=${canAfford}`);

          // --- Рендер Карточки Сотрудника ---
          return (
            <div
              key={staffId} // Используем ID как ключ
              className={`staff-item ${currentLevel > 0 ? 'hired' : ''} ${isMaxLevel ? 'max-level' : ''}`}
            >
              {/* Иконка сотрудника с бейджем количества */}
              <div className="staff-icon-container">
                <div className="staff-icon">{staffInfo.icon || '?'}</div>
                {currentLevel > 0 && (
                  <div className="staff-count-badge">
                    <span className="count-number">{currentLevel}</span>
                  </div>
                )}
              </div>

              {/* Блок с детальной информацией */}
              <div className="staff-details">
                <div className="staff-name-row">
                  <h3>{staffInfo.name || 'Неизвестный'}</h3>
                  {currentLevel > 0 && (
                    <span className="staff-quantity">×{currentLevel}</span>
                  )}
                </div>
                <p className="staff-description">{staffInfo.description || 'Нет описания'}</p>
                <div className="staff-progress">
                  <span className="staff-level">Уровень: {currentLevel} / {staffInfo.maxLevel}</span>
                  <div className="level-progress-bar">
                    <div 
                      className="level-progress-fill" 
                      style={{ width: `${(currentLevel / staffInfo.maxLevel) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {/* Отображаем текущий бонус, если сотрудник нанят и функция бонуса есть */}
                {currentLevel > 0 && typeof staffInfo.getBonus === 'function' && (
                    <p className="staff-bonus">
                        {/* Пытаемся отобразить бонус */}
                        💪 Бонус: +
                        {staffInfo.getBonus(currentLevel).incomeBoostPercent !== undefined
                            ? `${staffInfo.getBonus(currentLevel).incomeBoostPercent}% к доходу`
                            : staffInfo.getBonus(currentLevel).speedBoostPercent !== undefined
                            ? `${staffInfo.getBonus(currentLevel).speedBoostPercent}% к скорости`
                            : 'Неизвестный бонус' // Fallback
                        }
                    </p>
                )}
              </div>

              {/* Блок с кнопкой действия (Нанять/Улучшить или Макс.Уровень) */}
              <div className="staff-action">
                {/* Показываем цену и кнопку, если уровень не максимальный */}
                {!isMaxLevel ? (
                  <>
                    {/* Отображаем стоимость */}
                    <div className={`staff-cost ${!canAfford ? 'insufficient' : ''}`}>
                      <span className="cost-icon">💰</span>
                      <span className="cost-amount">
                        {/* --- ПРОВЕРКА перед toLocaleString --- */}
                        {(typeof cost !== 'number' || cost === Infinity)
                            ? 'N/A' // Показываем N/A если стоимость не число или бесконечность
                            : cost.toLocaleString() // Иначе форматируем число
                        }
                        {/* ------------------------------------ */}
                      </span>
                    </div>
                    {/* Кнопка Нанять/Улучшить */}
                    <button
                      onClick={() => onHireOrUpgrade(staffId)}
                      // Кнопка неактивна, если не хватает монет ИЛИ стоимость не число/бесконечность
                      disabled={!canAfford}
                      className="hire-upgrade-button"
                    >
                      <span className="button-icon">
                        {currentLevel === 0 ? '👋' : '⬆️'}
                      </span>
                      <span className="button-text">
                        {/* Текст кнопки зависит от текущего уровня */}
                        {currentLevel === 0 ? 'Нанять' : 'Улучшить'}
                      </span>
                    </button>
                  </>
                ) : (
                  // Показываем метку, если достигнут максимальный уровень
                  <div className="max-level-indicator">
                    <span className="max-level-icon">⭐</span>
                    <span className="max-level-label">МАКС. УРОВЕНЬ</span>
                  </div>
                )}
              </div>
            </div> // Закрываем .staff-item
          );
        })} {/* Конец .map */}
      </div> {/* Закрываем .staff-list */}
    </div> // Закрываем .staff-screen
  );
}

export default StaffScreen; // Экспортируем компонент