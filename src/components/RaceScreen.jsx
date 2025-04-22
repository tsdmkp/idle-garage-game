import React, { useState, useEffect } from 'react';
import './RaceScreen.css'; // Подключаем стили

// Компонент экрана гонок
function RaceScreen({ playerCar, onStartRace }) {
  // Состояния компонента
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy'); // Выбранная сложность
  const [raceResult, setRaceResult] = useState(null); // Результат последней гонки ('win', 'lose', 'error', null)
  const [reward, setReward] = useState(null); // Награда за последнюю гонку { coins: number, xp: number }
  const [isRacing, setIsRacing] = useState(false); // Флаг: идет ли симуляция гонки
  const [shouldAnimate, setShouldAnimate] = useState(false); // Флаг: нужно ли анимировать машинки

  // Обработчик смены сложности
  const handleDifficultyChange = (difficulty) => {
    if (isRacing) return; // Не меняем сложность во время гонки
    setSelectedDifficulty(difficulty);
    setRaceResult(null); // Сбрасываем предыдущий результат
    setReward(null);     // Сбрасываем предыдущую награду
    setShouldAnimate(false); // Сбрасываем анимацию
  };

  // Обработчик нажатия кнопки "Начать Заезд!"
  const handleRaceClick = async () => {
    // Не запускаем, если уже идет гонка или нет машины игрока
    if (isRacing || !playerCar) return;

    setIsRacing(true);       // Устанавливаем флаг гонки (блокирует кнопку)
    setRaceResult(null);     // Сбрасываем результат
    setReward(null);         // Сбрасываем награду
    setShouldAnimate(true);  // Запускаем CSS-анимацию (добавляем класс .animate)

    console.log(`RaceScreen: Starting race with difficulty: ${selectedDifficulty}`);
    console.log("RaceScreen: Calling onStartRace...");

    // Вызываем асинхронную функцию симуляции из App.jsx
    const resultData = await onStartRace(selectedDifficulty);
    console.log("RaceScreen: onStartRace returned:", resultData);

    // Обрабатываем полученный результат
    if (resultData && typeof resultData.result === 'string') {
        console.log("RaceScreen: Processing resultData:", resultData);
        setRaceResult(resultData.result); // Устанавливаем результат (win/lose/error)
        setReward(resultData.reward || null); // Устанавливаем награду (или null)
        console.log("RaceScreen: States updated (result, reward).");
    } else {
        // Если функция симуляции вернула некорректные данные
        console.error("RaceScreen: onStartRace returned invalid data:", resultData);
        setRaceResult('error'); // Показываем статус ошибки
        setReward(null);        // Сбрасываем награду
    }

    setIsRacing(false); // Снимаем флаг гонки ПОСЛЕ получения результата
    console.log("RaceScreen: setIsRacing set to false.");
    // Анимация будет сброшена через useEffect ниже
  };

  // Эффект для сброса анимации после гонки
  useEffect(() => {
      let timer;
      // Если гонка НЕ идет И есть какой-то результат (win/lose/error)
      if (!isRacing && raceResult) {
          // Ставим таймер, чтобы анимация успела "доехать" до финиша
          timer = setTimeout(() => {
              console.log("RaceScreen: Resetting animation via timer.");
              setShouldAnimate(false); // Убираем класс .animate
          }, 1000); // Задержка в 1 секунду после показа результата
      }
      // Если гонка не идет и результата нет (например, при смене сложности)
      else if (!isRacing && !raceResult) {
          console.log("RaceScreen: Resetting animation immediately.");
          setShouldAnimate(false); // Сбрасываем анимацию сразу
      }

      // Функция очистки таймера при размонтировании или изменении зависимостей
      return () => clearTimeout(timer);
  }, [isRacing, raceResult]); // Зависит от флага гонки и наличия результата


  // Получаем данные машины игрока для отображения
  const { name: carName, stats: carStats, imageUrl } = playerCar || {};
  const opponentIcon = '🏎️'; // Иконка для машины оппонента

  // Рендер компонента
  return (
    <div className="race-screen">
      <h2>Уличные Гонки (PvE)</h2>

      {/* Отображение информации о машине игрока */}
      {playerCar ? (
          <div className="player-car-info">
              <h3>Твоя машина: {carName}</h3>
              {/* Безопасный доступ к статам через ?. */}
              <p>P: {carStats?.power} | S: {carStats?.speed} | R: {carStats?.reliability}</p>
          </div>
      ) : (
          <div className="player-car-info">
              <p>Машина не выбрана!</p>
          </div>
      )}


      {/* Выбор Сложности */}
      <div className="difficulty-selector">
        <h4>Выбери сложность:</h4>
        {/* Кнопки сложности, активная подсвечивается */}
        <button onClick={() => handleDifficultyChange('easy')} className={selectedDifficulty === 'easy' ? 'active' : ''} disabled={isRacing}>Легко</button>
        <button onClick={() => handleDifficultyChange('medium')} className={selectedDifficulty === 'medium' ? 'active' : ''} disabled={isRacing}>Средне</button>
        <button onClick={() => handleDifficultyChange('hard')} className={selectedDifficulty === 'hard' ? 'active' : ''} disabled={isRacing}>Сложно</button>
      </div>

      {/* --- Зона Анимации Гонки --- */}
      <div className="race-animation-area">
        <div className="race-track">
          {/* Машина игрока */}
          {/* Класс 'animate' добавляется, когда shouldAnimate === true */}
          <div className={`race-car player-car ${shouldAnimate ? 'animate' : ''}`}>
            {/* Отображаем картинку машины, если она есть, иначе иконку */}
            {imageUrl ? <img src={imageUrl} alt={carName}/> : <span>🚗</span>}
          </div>
          {/* Машина оппонента */}
          <div className={`race-car opponent-car ${shouldAnimate ? 'animate' : ''}`}>
            <span>{opponentIcon}</span>
          </div>
          {/* Финишная черта */}
          <div className="finish-line"></div>
        </div>
      </div>
      {/* --- Конец Зоны Анимации --- */}


      {/* Кнопка Старта Заезда */}
      <button
        className="start-race-button"
        onClick={handleRaceClick}
        disabled={isRacing || !playerCar} // Неактивна во время гонки или если нет машины
      >
        {/* Текст кнопки меняется в зависимости от статуса гонки */}
        {isRacing ? 'Гонка...' : 'Начать Заезд!'}
      </button>

      {/* --- Область Отображения Результата --- */}
      {/* Показываем результат только после завершения гонки (!isRacing) */}
      {!isRacing && raceResult && (
            <div className={`race-result ${raceResult}`}>
                <h3>
                    {raceResult === 'win' ? 'ПОБЕДА!' : raceResult === 'lose' ? 'Поражение' : 'Ошибка гонки!'}
                </h3>
                {/* Проверяем, что объект награды существует */}
                {reward ? (
                    <p>
                      Награда:
                      {/* Показываем монеты, только если их > 0 */}
                      {reward.coins > 0 && ` 💰 ${reward.coins.toLocaleString()} GC`}
                      {/* Показываем XP, только если их > 0 */}
                      {reward.xp > 0 && ` ✨ ${reward.xp} XP`}
                      {/* Сообщение при поражении без награды */}
                      {(reward.coins === 0 && reward.xp === 0 && raceResult === 'lose') && ' Удачи в следующий раз!'}
                      {/* Сообщение при победе без награды (маловероятно) */}
                      {(reward.coins === 0 && reward.xp === 0 && raceResult === 'win') && ' Без награды'}
                    </p>
                ) : (
                    // Если объект награды null (например, при ошибке)
                    raceResult !== 'error' && <p>Награда не получена.</p>
                )}
            </div>
        )}
      {/* --- Конец Области Результата --- */}

    </div> // Закрываем .race-screen
  );
}

export default RaceScreen; // Экспортируем компонент