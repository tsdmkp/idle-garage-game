import React, { useState } from 'react';
import './RaceScreen.css'; // Стили

// Компонент принимает текущую машину игрока и функцию для запуска гонки
function RaceScreen({ playerCar, onStartRace }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy'); // 'easy', 'medium', 'hard'
  const [raceResult, setRaceResult] = useState(null); // null, 'win', 'lose'
  const [reward, setReward] = useState(null); // { coins: number, xp: number }
  const [isRacing, setIsRacing] = useState(false); // Флаг, идет ли гонка

  const handleDifficultyChange = (difficulty) => {
    setSelectedDifficulty(difficulty);
    setRaceResult(null); // Сбрасываем результат при смене сложности
    setReward(null);
  };

  const handleRaceClick = async () => {
    if (isRacing || !playerCar) return; // Не запускаем, если уже гонка или нет машины

    setIsRacing(true);
    setRaceResult(null);
    setReward(null);

    console.log(`Starting race with difficulty: ${selectedDifficulty}`);

    // Вызываем функцию из App.jsx для симуляции гонки
    // Она должна вернуть результат { result: 'win'/'lose', reward: { coins, xp } }
    const resultData = await onStartRace(selectedDifficulty);

    // Отображаем результат после симуляции
    if (resultData) {
        setRaceResult(resultData.result);
        setReward(resultData.reward);
        console.log("Race finished:", resultData);
    } else {
        console.error("Race simulation failed to return data.");
        // Можно показать сообщение об ошибке
    }


    setIsRacing(false);
  };

  // Простая информация о машине игрока для отображения
  const { name: carName, stats: carStats } = playerCar || {};

  return (
    <div className="race-screen">
      <h2>Уличные Гонки (PvE)</h2>

      {/* Отображение машины игрока */}
      {playerCar && (
          <div className="player-car-info">
              <h3>Твоя машина: {carName}</h3>
              <p>P: {carStats?.power} | S: {carStats?.speed} | R: {carStats?.reliability}</p>
          </div>
      )}

      {/* Выбор Сложности */}
      <div className="difficulty-selector">
        <h4>Выбери сложность:</h4>
        <button onClick={() => handleDifficultyChange('easy')} className={selectedDifficulty === 'easy' ? 'active' : ''}>Легко</button>
        <button onClick={() => handleDifficultyChange('medium')} className={selectedDifficulty === 'medium' ? 'active' : ''}>Средне</button>
        <button onClick={() => handleDifficultyChange('hard')} className={selectedDifficulty === 'hard' ? 'active' : ''}>Сложно</button>
      </div>

      {/* Кнопка Старта */}
      <button
        className="start-race-button"
        onClick={handleRaceClick}
        disabled={isRacing || !playerCar} // Неактивна во время гонки или если нет машины
      >
        {isRacing ? 'Гонка...' : 'Начать Заезд!'}
      </button>

      {/* Область Отображения Результата */}
      {isRacing && <div className="race-in-progress">Симуляция гонки... ⏱️</div>}

      {!isRacing && raceResult && (
        <div className={`race-result ${raceResult}`}>
          <h3>{raceResult === 'win' ? 'ПОБЕДА!' : 'Поражение'}</h3>
          {reward && (
            <p>
              Награда:
              {reward.coins > 0 && ` 💰 ${reward.coins.toLocaleString()} GC`}
              {reward.xp > 0 && ` ✨ ${reward.xp} XP`}
              {!reward.coins && !reward.xp && raceResult === 'lose' && ' Удачи в следующий раз!'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default RaceScreen;