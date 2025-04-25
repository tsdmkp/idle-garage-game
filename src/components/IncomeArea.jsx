// src/components/IncomeArea.jsx
import React from 'react';
import './IncomeArea.css';

// --- ДОБАВЛЕНО ЗНАЧЕНИЕ ПО УМОЛЧАНИЮ для incomeRate ---
function IncomeArea({ incomeRate = 0, accumulatedIncome, onCollect, maxAccumulation = 1 }) {
  // ----------------------------------------------------

  // Рассчитываем процент заполнения для прогресс-бара
  const progressPercent = maxAccumulation > 0 ? Math.min((accumulatedIncome / maxAccumulation) * 100, 100) : 0;
  const canCollect = accumulatedIncome >= 1;
  const formattedAccumulated = Math.floor(accumulatedIncome).toLocaleString();
  // --- ИСПРАВЛЕНО: Теперь incomeRate всегда число ---
  const formattedRate = incomeRate.toLocaleString();
  // -----------------------------------------------

  return (
    <div className="income-area">
      <div className="income-info">
        <span className="income-label">Доход в час:</span>
        <span className="income-value">💰 +{formattedRate}</span>
      </div>
      <div className="progress-bar-container income-progress">
        <div className="progress-bar-fill income-fill" style={{ width: `${progressPercent}%` }}></div>
         <span className="progress-bar-text">Накоплено: {formattedAccumulated} GC</span>
      </div>
      <button className="collect-button" onClick={onCollect} disabled={!canCollect}>
        Собрать {formattedAccumulated} GC
      </button>
    </div>
  );
}
export default IncomeArea;