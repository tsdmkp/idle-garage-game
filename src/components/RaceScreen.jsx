import React, { useState, useEffect } from 'react';
import './RaceScreen.css';

function RaceScreen({ playerCar, onStartRace }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [raceResult, setRaceResult] = useState(null);
  const [reward, setReward] = useState(null);
  const [isRacing, setIsRacing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const handleDifficultyChange = (difficulty) => {
    if (isRacing) return;
    setSelectedDifficulty(difficulty);
    setRaceResult(null);
    setReward(null);
    setShouldAnimate(false);
  };

  const handleRaceClick = async () => {
    if (isRacing || !playerCar) return;
    setIsRacing(true);
    setRaceResult(null);
    setReward(null);
    setShouldAnimate(true);
    console.log(`RaceScreen: Starting race with difficulty: ${selectedDifficulty}`);
    console.log("RaceScreen: Calling onStartRace...");
    const resultData = await onStartRace(selectedDifficulty);
    console.log("RaceScreen: onStartRace returned:", resultData);
    if (resultData && typeof resultData.result === 'string') {
      console.log("RaceScreen: Processing resultData:", resultData);
      setRaceResult(resultData.result);
      setReward(resultData.reward || null);
      console.log("RaceScreen: States updated (result, reward).");
    } else {
      console.error("RaceScreen: onStartRace returned invalid data:", resultData);
      setRaceResult('error');
      setReward(null);
    }
    setIsRacing(false);
    console.log("RaceScreen: setIsRacing set to false.");
  };

  useEffect(() => {
    let timer;
    if (!isRacing && raceResult) {
      timer = setTimeout(() => {
        console.log("RaceScreen: Resetting animation via timer.");
        setShouldAnimate(false);
      }, 1000);
    } else if (!isRacing && !raceResult) {
      console.log("RaceScreen: Resetting animation immediately.");
      setShouldAnimate(false);
    }
    return () => clearTimeout(timer);
  }, [isRacing, raceResult]);

  const { name: carName, stats: carStats, imageUrl } = playerCar || {};
  const opponentIcon = '🏎️';

  return (
    <div className="race-screen">
      <div className="race-screen__content">
        <h2>Уличные Гонки (PvE)</h2>
        {playerCar ? (
          <div className="player-car-info">
            <h3>Твоя машина: {carName}</h3>
            <p>P: {carStats?.power} | S: {carStats?.speed} | R: {carStats?.reliability}</p>
          </div>
        ) : (
          <div className="player-car-info">
            <p>Машина не выбрана!</p>
          </div>
        )}
        <div className="difficulty-selector">
          <h4>Выбери сложность:</h4>
          <button
            onClick={() => handleDifficultyChange('easy')}
            className={selectedDifficulty === 'easy' ? 'active' : ''}
            disabled={isRacing}
          >
            Легко
          </button>
          <button
            onClick={() => handleDifficultyChange('medium')}
            className={selectedDifficulty === 'medium' ? 'active' : ''}
            disabled={isRacing}
          >
            Средне
          </button>
          <button
            onClick={() => handleDifficultyChange('hard')}
            className={selectedDifficulty === 'hard' ? 'active' : ''}
            disabled={isRacing}
          >
            Сложно
          </button>
        </div>
        <div className="race-animation-area">
          <div className="race-track">
            <div className={`race-car player-car ${shouldAnimate ? 'animate' : ''}`}>
              {imageUrl ? <img src={imageUrl} alt={carName} /> : <span>🚗</span>}
            </div>
            <div className={`race-car opponent-car ${shouldAnimate ? 'animate' : ''}`}>
              <span>{opponentIcon}</span>
            </div>
            <div className="finish-line"></div>
          </div>
        </div>
        <button
          className="start-race-button"
          onClick={handleRaceClick}
          disabled={isRacing || !playerCar}
        >
          {isRacing ? 'Гонка...' : 'Начать Заезд!'}
        </button>
        {!isRacing && raceResult && (
          <div className={`race-result ${raceResult}`}>
            <h3>
              {raceResult === 'win'
                ? 'ПОБЕДА!'
                : raceResult === 'lose'
                ? 'Поражение'
                : 'Ошибка гонки!'}
            </h3>
            {reward ? (
              <p>
                Награда:
                {reward.coins > 0 && ` 💰 ${reward.coins.toLocaleString()} GC`}
                {reward.xp > 0 && ` ✨ ${reward.xp} XP`}
                {(reward.coins === 0 && reward.xp === 0 && raceResult === 'lose') &&
                  ' Удачи в следующий раз!'}
                {(reward.coins === 0 && reward.xp === 0 && raceResult === 'win') &&
                  ' Без награды'}
              </p>
            ) : (
              raceResult !== 'error' && <p>Награда не получена.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RaceScreen;