import React from 'react';
import './IncomeArea.css'; // Стили подключим ниже

// Принимаем данные и функцию через props
function IncomeArea({ incomeRate, accumulatedIncome, onCollect, maxAccumulation = 1 }) {
  // Рассчитываем процент заполнения для прогресс-бара
  // Делаем maxAccumulation > 0, чтобы избежать деления на ноль
  const progressPercent = maxAccumulation > 0
    ? Math.min((accumulatedIncome / maxAccumulation) * 100, 100)
    : 0;

  // Определяем, можно ли собирать доход (накопилось хотя бы > 0)
  const canCollect = accumulatedIncome >= 1; // Собираем только целые монеты

  // Форматируем числа для отображения
  const formattedAccumulated = Math.floor(accumulatedIncome).toLocaleString();
  const formattedRate = incomeRate.toLocaleString();

  return (
    <div className="income-area">
      <div className="income-info">
        <span className="income-label">Доход в час:</span>
        <span className="income-value">💰 +{formattedRate}</span>
      </div>

      {/* Прогресс-бар накопления */}
      <div className="progress-bar-container income-progress">
        <div
          className="progress-bar-fill income-fill"
          style={{ width: `${progressPercent}%` }}
        ></div>
         {/* Текст поверх прогресс-бара */}
         <span className="progress-bar-text">
            Накоплено: {formattedAccumulated} GC
         </span>
      </div>

      {/* Кнопка сбора дохода */}
      <button
        className="collect-button"
        onClick={onCollect} // Вызываем функцию из props при клике
        disabled={!canCollect} // Кнопка неактивна, если нечего собирать
      >
        Собрать {formattedAccumulated} GC
      </button>
    </div>
  );
}

export default IncomeArea;