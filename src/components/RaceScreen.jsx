import React, { useState, useEffect } from 'react';
import './RaceScreen.css';
// --- ИМПОРТИРУЕМ КАТАЛОГ МАШИН ---
import { CAR_CATALOG } from '../utils'; // Убедись, что путь ../utils правильный

// --- Функция получения случайной картинки ---
const getRandomOpponentImage = () => {
    if (!CAR_CATALOG || CAR_CATALOG.length === 0) {
        return '/placeholder-car.png';
    }
    const randomIndex = Math.floor(Math.random() * CAR_CATALOG.length);
    return CAR_CATALOG[randomIndex]?.imageUrl || '/placeholder-car.png';
};
// --------------------------------------------

function RaceScreen({ playerCar, onStartRace }) {
  // --- Состояния Компонента ---
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [raceResult, setRaceResult] = useState(null);
  const [reward, setReward] = useState(null);
  const [isRacing, setIsRacing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [opponentCarImageUrl, setOpponentCarImageUrl] = useState(() => getRandomOpponentImage());

  // --- Обработчик Смены Сложности ---
  const handleDifficultyChange = (difficulty) => {
    if (isRacing) return;
    setSelectedDifficulty(difficulty);
    setRaceResult(null);
    setReward(null);
    setShouldAnimate(false); // Сбрасываем анимацию
    setOpponentCarImageUrl(getRandomOpponentImage()); // Новая картинка
    console.log(`RaceScreen: Difficulty changed to ${difficulty}.`);
  };

  // --- Обработчик Клика по Кнопке "Начать Заезд!" ---
  const handleRaceClick = async () => {
    if (isRacing || !playerCar) return;
    setIsRacing(true);
    setRaceResult(null);
    setReward(null);
    setShouldAnimate(true); // Запускаем анимацию
    setOpponentCarImageUrl(getRandomOpponentImage()); // Новая картинка
    console.log(`RaceScreen: Starting race...`);
    const resultData = await onStartRace(selectedDifficulty); // Симуляция в App.jsx
    console.log("RaceScreen: onStartRace returned:", resultData);
    setIsRacing(false); // Снимаем флаг гонки СРАЗУ
    if (resultData && typeof resultData.result === 'string') {
      setRaceResult(resultData.result);
      setReward(resultData.reward || null);
    } else {
      setRaceResult('error'); setReward(null);
    }
    // Анимация сбросится через useEffect
    console.log("RaceScreen: Race logic finished.");
  };

  // --- Эффект для Сброса Анимации ---
  // (Как в твоей рабочей версии)
  useEffect(() => {
    let timer;
    if (!isRacing && raceResult) {
      timer = setTimeout(() => {
        console.log("RaceScreen: Resetting animation via timer.");
        setShouldAnimate(false);
      }, 1000); // Задержка после результата
    } else if (!isRacing && !raceResult && shouldAnimate) {
      console.log("RaceScreen: Resetting animation immediately.");
      setShouldAnimate(false);
    }
    return () => clearTimeout(timer);
  }, [isRacing, raceResult, shouldAnimate]);

  // Получаем данные машины игрока
  const { name: carName, stats: carStats, imageUrl: playerImageUrl } = playerCar || {};

  // --- Рендер Компонента ---
  return (
    <div className="race-screen">
      <div className="race-screen__content">
        <h2>Уличные Гонки (PvE)</h2>
        {/* Информация об игроке */}
        {playerCar ? (
          <div className="player-car-info">
            <h3>Твоя машина: {carName}</h3>
            <p>P: {carStats?.power} | S: {carStats?.speed} | R: {carStats?.reliability}</p>
          </div>
        ) : (
          <div className="player-car-info"><p>Машина не выбрана!</p></div>
        )}

        {/* Выбор Сложности */}
        <div className="difficulty-selector">
          <h4>Выбери сложность:</h4>
          <button onClick={() => handleDifficultyChange('easy')} className={selectedDifficulty === 'easy' ? 'active' : ''} disabled={isRacing}>Легко</button>
          <button onClick={() => handleDifficultyChange('medium')} className={selectedDifficulty === 'medium' ? 'active' : ''} disabled={isRacing}>Средне</button>
          <button onClick={() => handleDifficultyChange('hard')} className={selectedDifficulty === 'hard' ? 'active' : ''} disabled={isRacing}>Сложно</button>
        </div>

        {/* ЗОНА АНИМАЦИИ ГОНКИ */}
        <div className="race-animation-area">
          <div className="race-track">
            <div className={`race-car player-car ${shouldAnimate ? 'animate' : ''}`}>
              {playerImageUrl ? <img src={playerImageUrl} alt={carName || 'Player Car'} /> : <span>🚗</span>}
            </div>
            <div className={`race-car opponent-car ${shouldAnimate ? 'animate' : ''}`}>
              {opponentCarImageUrl ? <img src={opponentCarImageUrl} alt="Opponent Car" /> : <span>🏎️</span>}
            </div>
            <div className="finish-line"></div>
          </div>
        </div>

        {/* --- ИЗМЕНЕНИЕ: Контейнер для кнопки и результата --- */}
        <div className="race-controls-area">
            {/* Кнопка Старта */}
            <button
              className="start-race-button"
              onClick={handleRaceClick}
              disabled={isRacing || !playerCar}
            >
              {isRacing ? 'Гонка...' : 'Начать Заезд!'}
            </button>

            {/* Отображение Результата Гонки */}
            {/* Показываем только если гонка НЕ идет И есть результат */}
            {/* Отображение Результата Гонки */}
        {!isRacing && raceResult && (
          <div className={`race-result ${raceResult}`}>
            <h3>{ raceResult === 'win' ? 'ПОБЕДА!' : raceResult === 'lose' ? 'Поражение' : 'Ошибка!' }</h3>
            {/* --- ИЗМЕНЯЕМ ЛОГИКУ ЗДЕСЬ --- */}
            {reward ? ( // Проверяем, что объект reward вообще есть
              <p>
                {/* Показываем слово "Награда:" ТОЛЬКО если есть ПОЛОЖИТЕЛЬНАЯ награда */}
                {(reward.coins > 0 || reward.xp > 0) && 'Награда:'}

                {/* Показываем монеты (положительные или отрицательные) */}
                {reward.coins !== 0 && ` 💰 ${reward.coins.toLocaleString()} GC`}

                {/* Показываем XP (только если > 0) */}
                {reward.xp > 0 && ` ✨ ${reward.xp} XP`}

                {/* Сообщение при поражении БЕЗ монет (штраф уже показан выше, если был) */}
                {(reward.coins === 0 && reward.xp === 0 && raceResult === 'lose') && ' Удачи в следующий раз!'}
                {/* Сообщение при победе БЕЗ монет и XP */}
                {(reward.coins === 0 && reward.xp === 0 && raceResult === 'win') && ' Без награды'}
              </p>
            ) : (
              // Сообщение, если объект reward отсутствует (и не ошибка)
              raceResult !== 'error' && <p>Нет данных о награде.</p>
            )}
             {/* ---------------------------- */}
          </div>
        )}
        </div>
        {/* --------------------------------------------------- */}

      </div> {/* Конец race-screen__content */}
    </div> /* Конец race-screen */
  );
}

export default RaceScreen;