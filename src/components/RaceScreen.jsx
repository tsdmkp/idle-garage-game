import React, { useState, useEffect, useRef } from 'react';
import './RaceScreen.css';
import { CAR_CATALOG } from '../utils';

// Функция получения случайной картинки оппонента
const getRandomOpponentImage = () => {
    if (!CAR_CATALOG || CAR_CATALOG.length === 0) {
        return '/placeholder-car.png';
    }
    const randomIndex = Math.floor(Math.random() * CAR_CATALOG.length);
    return CAR_CATALOG[randomIndex]?.imageUrl || '/placeholder-car.png';
};

// Генерируем случайное имя оппонента
const getRandomOpponentName = () => {
    const names = [
        'Вихрь', 'Молния', 'Ракета', 'Ураган', 'Гроза', 'Буря', 'Комета', 'Метеор',
        'Феникс', 'Дракон', 'Тигр', 'Орел', 'Сокол', 'Барс', 'Пума', 'Кобра',
        'Турбо', 'Нитро', 'Форсаж', 'Спидстер', 'Гонщик', 'Дрифтер'
    ];
    return names[Math.floor(Math.random() * names.length)];
};

function RaceScreen({ playerCar, onStartRace }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [raceResult, setRaceResult] = useState(null);
  const [reward, setReward] = useState(null);
  const [isRacing, setIsRacing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isReturning, setIsReturning] = useState(false); // Новое состояние для возврата
  const [opponentCarImageUrl, setOpponentCarImageUrl] = useState(() => getRandomOpponentImage());
  const [opponentName, setOpponentName] = useState(() => getRandomOpponentName());
  const [countdown, setCountdown] = useState(0); // Обратный отсчет
  const [winStreak, setWinStreak] = useState(0); // Серия побед
  const [totalRaces, setTotalRaces] = useState(0); // Всего гонок
  
  const raceStartSound = useRef(null);
  const raceFinishSound = useRef(null);

  // Инициализация звуков (если нужно)
  useEffect(() => {
    // Можно добавить звуковые эффекты позже
    // raceStartSound.current = new Audio('/sounds/race-start.mp3');
    // raceFinishSound.current = new Audio('/sounds/race-finish.mp3');
  }, []);

  // Функция смены оппонента
  const changeOpponent = () => {
    setOpponentCarImageUrl(getRandomOpponentImage());
    setOpponentName(getRandomOpponentName());
  };

  // Обработчик смены сложности
  const handleDifficultyChange = (difficulty) => {
    if (isRacing || isReturning) return;
    setSelectedDifficulty(difficulty);
    setRaceResult(null);
    setReward(null);
    changeOpponent();
    console.log(`🏁 Difficulty changed to ${difficulty}`);
  };

  // Обратный отсчет перед стартом
  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 800);
  };

  // Главный обработчик гонки
  const handleRaceClick = async () => {
    if (isRacing || isReturning || !playerCar) return;
    
    // Сбрасываем предыдущие результаты
    setRaceResult(null);
    setReward(null);
    
    // Запускаем обратный отсчет
    console.log('🏁 Starting countdown...');
    startCountdown();
    
    // Ждем завершения обратного отсчета
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Начинаем гонку
    setIsRacing(true);
    setShouldAnimate(true);
    setTotalRaces(prev => prev + 1);
    
    console.log('🏁 Race started!');
    
    // Имитируем звук старта
    // raceStartSound.current?.play();
    
    // Ждем анимацию гонки (2.5 секунды)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Получаем результат гонки
    const resultData = await onStartRace(selectedDifficulty);
    console.log('🏁 Race result:', resultData);
    
    // Имитируем звук финиша
    // raceFinishSound.current?.play();
    
    // Устанавливаем результат
    if (resultData && typeof resultData.result === 'string') {
      setRaceResult(resultData.result);
      setReward(resultData.reward || null);
      
      // Обновляем серию побед
      if (resultData.result === 'win') {
        setWinStreak(prev => prev + 1);
      } else {
        setWinStreak(0);
      }
    } else {
      setRaceResult('error');
      setReward(null);
      setWinStreak(0);
    }
    
    setIsRacing(false);
    
    // Показываем результат 2 секунды, затем возвращаем машины
    setTimeout(() => {
      console.log('🏁 Starting return animation...');
      setIsReturning(true);
      setShouldAnimate(false);
      
      // Через 2.5 секунды возврата меняем оппонента и разрешаем новую гонку
      setTimeout(() => {
        setIsReturning(false);
        changeOpponent();
        console.log('🏁 Cars returned to start, new opponent ready!');
      }, 2500);
    }, 2000);
  };

  // Определяем текст сложности с описанием
  const getDifficultyInfo = (difficulty) => {
    switch(difficulty) {
      case 'easy': return { name: 'Легко', desc: 'Новички', reward: '+50 GC' };
      case 'medium': return { name: 'Средне', desc: 'Опытные', reward: '+150 GC' };
      case 'hard': return { name: 'Сложно', desc: 'Профи', reward: '+300 GC' };
      default: return { name: 'Легко', desc: 'Новички', reward: '+50 GC' };
    }
  };

  // Определяем статус кнопки
  const getButtonStatus = () => {
    if (countdown > 0) return `${countdown}`;
    if (isRacing) return 'Гонка!';
    if (isReturning) return 'Возврат...';
    return 'Начать Заезд!';
  };

  const isButtonDisabled = isRacing || isReturning || !playerCar || countdown > 0;

  // Получаем данные машины игрока
  const { name: carName, stats: carStats, imageUrl: playerImageUrl } = playerCar || {};
  const currentDifficulty = getDifficultyInfo(selectedDifficulty);

  return (
    <div className="race-screen">
      <div className="race-screen__content">
        {/* Поднимаем заголовок выше */}
        <div className="race-header">
          <h2>🏁 Уличные Гонки</h2>
          {winStreak > 1 && (
            <div className="win-streak">
              🔥 Серия побед: {winStreak}
            </div>
          )}
          {totalRaces > 0 && (
            <div className="race-stats">
              Всего гонок: {totalRaces}
            </div>
          )}
        </div>

        {/* Информация об участниках */}
        <div className="participants-info">
          <div className="participant player">
            <div className="participant-header">👤 ВЫ</div>
            {playerCar ? (
              <div className="car-info">
                <div className="car-name">{carName}</div>
                <div className="car-stats">
                  💪 {carStats?.power} | ⚡ {carStats?.speed} | 🔧 {carStats?.reliability}
                </div>
              </div>
            ) : (
              <div className="car-info">Машина не выбрана!</div>
            )}
          </div>

          <div className="vs-divider">VS</div>

          <div className="participant opponent">
            <div className="participant-header">🤖 {opponentName}</div>
            <div className="car-info">
              <div className="car-name">{currentDifficulty.name}</div>
              <div className="car-stats">{currentDifficulty.desc}</div>
            </div>
          </div>
        </div>

        {/* Выбор сложности */}
        <div className="difficulty-selector">
          <h4>Выберите соперника:</h4>
          <div className="difficulty-buttons">
            {['easy', 'medium', 'hard'].map(difficulty => {
              const info = getDifficultyInfo(difficulty);
              return (
                <button
                  key={difficulty}
                  onClick={() => handleDifficultyChange(difficulty)}
                  className={selectedDifficulty === difficulty ? 'active' : ''}
                  disabled={isRacing || isReturning}
                >
                  <div className="difficulty-name">{info.name}</div>
                  <div className="difficulty-reward">{info.reward}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Трек с анимацией */}
        <div className="race-animation-area">
          <div className="race-track">
            {/* Обратный отсчет */}
            {countdown > 0 && (
              <div className="countdown-overlay">
                <div className="countdown-number">{countdown}</div>
              </div>
            )}
            
            {/* Машина игрока */}
            <div className={`race-car player-car ${shouldAnimate ? 'animate' : ''} ${isReturning ? 'returning' : ''}`}>
              {playerImageUrl ? 
                <img src={playerImageUrl} alt={carName || 'Player Car'} /> : 
                <span>🚗</span>
              }
            </div>
            
            {/* Машина оппонента */}
            <div className={`race-car opponent-car ${shouldAnimate ? 'animate' : ''} ${isReturning ? 'returning' : ''}`}>
              {opponentCarImageUrl ? 
                <img src={opponentCarImageUrl} alt="Opponent Car" /> : 
                <span>🏎️</span>
              }
            </div>
            
            {/* Финишная линия */}
            <div className="finish-line"></div>
            
            {/* Эффекты скорости во время гонки */}
            {isRacing && (
              <div className="speed-lines">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`speed-line speed-line-${i + 1}`}></div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Контейнер для кнопки и результата */}
        <div className="race-controls-area">
          {/* Кнопка старта */}
          <button
            className={`start-race-button ${countdown > 0 ? 'countdown' : ''} ${isRacing ? 'racing' : ''}`}
            onClick={handleRaceClick}
            disabled={isButtonDisabled}
          >
            {getButtonStatus()}
          </button>

          {/* Результат гонки - показываем как только есть результат */}
          {raceResult && countdown === 0 && (
            <div className={`race-result ${raceResult}`}>
              <h3>
                {raceResult === 'win' ? '🏆 ПОБЕДА!' : 
                 raceResult === 'lose' ? '😞 Поражение' : 
                 '⚠️ Ошибка!'}
              </h3>
              {reward ? (
                <p>
                  {/* Награда за победу */}
                  {(reward.coins > 0 || reward.xp > 0) && '🎁 Награда: '}
                  
                  {/* Монеты */}
                  {reward.coins !== 0 && `💰 ${reward.coins > 0 ? '+' : ''}${reward.coins.toLocaleString()} GC`}
                  
                  {/* XP */}
                  {reward.xp > 0 && ` ✨ +${reward.xp} XP`}
                  
                  {/* Сообщения при отсутствии награды */}
                  {(reward.coins === 0 && reward.xp === 0 && raceResult === 'lose') && '💪 Удачи в следующий раз!'}
                  {(reward.coins === 0 && reward.xp === 0 && raceResult === 'win') && '🎉 Моральная победа!'}
                </p>
              ) : (
                raceResult !== 'error' && <p>📊 Нет данных о награде</p>
              )}
              
              {/* Дополнительные советы */}
              {raceResult === 'lose' && (
                <div className="race-tip">
                  💡 Совет: Улучшайте машину в тюнинге!
                </div>
              )}
              {raceResult === 'win' && winStreak > 0 && (
                <div className="race-tip">
                  🔥 Серия побед: {winStreak}! Так держать!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RaceScreen;