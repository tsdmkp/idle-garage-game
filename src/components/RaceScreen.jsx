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

function RaceScreen({ playerCar, onStartRace, onAdReward }) { // Добавлен пропс onAdReward
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [raceResult, setRaceResult] = useState(null);
  const [reward, setReward] = useState(null);
  const [isRacing, setIsRacing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isReturning, setIsReturning] = useState(false); 
  const [isWaitingForReturn, setIsWaitingForReturn] = useState(false);
  const [opponentCarImageUrl, setOpponentCarImageUrl] = useState(() => getRandomOpponentImage());
  const [opponentName, setOpponentName] = useState(() => getRandomOpponentName());
  const [countdown, setCountdown] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [totalRaces, setTotalRaces] = useState(0);
  
  // 🆕 НОВЫЕ СОСТОЯНИЯ ДЛЯ РЕКЛАМЫ
  const [racesCount, setRacesCount] = useState(() => {
    const saved = localStorage.getItem('racesCount');
    return saved ? parseInt(saved) : 0;
  });
  const [showAdOffer, setShowAdOffer] = useState(false);
  
  const raceStartSound = useRef(null);
  const raceFinishSound = useRef(null);

  // Инициализация звуков (если нужно)
  useEffect(() => {
    // Можно добавить звуковые эффекты позже
    // raceStartSound.current = new Audio('/sounds/race-start.mp3');
    // raceFinishSound.current = new Audio('/sounds/race-finish.mp3');
  }, []);

  // 🆕 СОХРАНЕНИЕ СЧЕТЧИКА ЗАЕЗДОВ
  useEffect(() => {
    localStorage.setItem('racesCount', racesCount.toString());
  }, [racesCount]);

  // Функция смены оппонента
  const changeOpponent = () => {
    setOpponentCarImageUrl(getRandomOpponentImage());
    setOpponentName(getRandomOpponentName());
  };

  // Обработчик смены сложности
  const handleDifficultyChange = (difficulty) => {
    if (isRacing || isReturning || isWaitingForReturn) return;
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

  // 🆕 ФУНКЦИИ ОБРАБОТКИ РЕКЛАМЫ
  const handleAdOfferAccept = () => {
    setShowAdOffer(false);
    // Здесь будет показ рекламы через Adsgram когда настроят домены
    console.log('🎬 Показ рекламы после 5 заездов');
    
    // Временная имитация награды за рекламу
    if (onAdReward) {
      setTimeout(() => {
        onAdReward(100); // 100 монет за просмотр
        alert('🎉 Получено 100 монет за просмотр рекламы!');
      }, 2000);
    }
  };

  const handleAdOfferDecline = () => {
    setShowAdOffer(false);
  };

  // Главный обработчик гонки
  const handleRaceClick = async () => {
    if (isRacing || isReturning || isWaitingForReturn || !playerCar) {
      console.log('🚫 Race blocked:', { isRacing, isReturning, isWaitingForReturn, playerCar: !!playerCar });
      return;
    }
    
    console.log('🏁 Starting race sequence...');
    
    // 🆕 УВЕЛИЧИВАЕМ СЧЕТЧИК ЗАЕЗДОВ
    const newRacesCount = racesCount + 1;
    setRacesCount(newRacesCount);
    
    // Сбрасываем предыдущие результаты
    setRaceResult(null);
    setReward(null);
    
    // Запускаем обратный отсчет
    console.log('⏰ Starting countdown...');
    startCountdown();
    
    // Ждем завершения обратного отсчета
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Начинаем гонку
    console.log('🚗 Race animation started');
    setIsRacing(true);
    setShouldAnimate(true);
    setTotalRaces(prev => prev + 1);
    
    // Ждем анимацию гонки (2.5 секунды)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // КРИТИЧНО: СРАЗУ блокируем кнопку, как только гонка закончилась
    setIsRacing(false);
    setIsWaitingForReturn(true);
    console.log('🏁 Race animation finished, button blocked for return...');
    
    // Получаем результат гонки
    const resultData = await onStartRace(selectedDifficulty);
    console.log('🏁 Race result received:', resultData);
    
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
    
    console.log('🏁 Race results processed, still waiting for return...');
    
    // Показываем результат 2 секунды, затем возвращаем машины
    setTimeout(() => {
      console.log('🔄 Starting return animation...');
      setIsReturning(true);
      setShouldAnimate(false);
      
      // Через 2.5 секунды возврата машины полностью вернулись
      setTimeout(() => {
        console.log('✅ Cars returned, button should be active now');
        setIsReturning(false);
        setIsWaitingForReturn(false);
        changeOpponent();
        console.log('🏁 Full cycle complete, ready for next race');
        
        // 🆕 ПРОВЕРЯЕМ НУЖНО ЛИ ПОКАЗАТЬ РЕКЛАМУ (каждые 5 заездов)
        if (newRacesCount > 0 && newRacesCount % 5 === 0) {
          setTimeout(() => setShowAdOffer(true), 1000); // Показываем через секунду после завершения
        }
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
    if (isWaitingForReturn) return 'Ждем возврата...';
    if (isReturning) return 'Возврат...';
    return 'Начать Заезд!';
  };

  // ИСПРАВЛЕННАЯ ЛОГИКА: кнопка неактивна до полного завершения ВСЕГО цикла
  const isButtonDisabled = isRacing || isReturning || isWaitingForReturn || !playerCar || countdown > 0;

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
          
          {/* 🆕 ПРОГРЕСС ДО РЕКЛАМЫ */}
          <div className="ad-progress" style={{
            fontSize: '0.8rem',
            color: '#ff9800',
            margin: '5px 0',
            padding: '5px 10px',
            background: 'rgba(255, 152, 0, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 152, 0, 0.3)'
          }}>
            📺 До бонусной рекламы: {5 - (racesCount % 5)} заездов
            <div style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255, 152, 0, 0.2)',
              borderRadius: '2px',
              marginTop: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${((racesCount % 5) / 5) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff9800, #f57c00)',
                borderRadius: '2px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
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
            style={{
              // Добавляем визуальную индикацию заблокированной кнопки
              opacity: isButtonDisabled ? 0.6 : 1,
              cursor: isButtonDisabled ? 'not-allowed' : 'pointer'
            }}
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

        {/* 🆕 МОДАЛКА ПРЕДЛОЖЕНИЯ РЕКЛАМЫ */}
        {showAdOffer && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'modalAppear 0.3s ease-out'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '350px',
              width: '100%',
              border: '1px solid #4a9eff',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
              color: 'white'
            }}>
              <h3 style={{
                color: '#4a9eff',
                fontSize: '22px',
                margin: '0 0 10px 0'
              }}>
                🎁 Бонусная реклама!
              </h3>
              <p style={{
                color: '#bbb',
                fontSize: '16px',
                margin: '0 0 20px 0'
              }}>
                Вы совершили 5 заездов!
              </p>
              
              <div style={{ fontSize: '48px', margin: '20px 0' }}>📺</div>
              
              <p style={{
                color: 'white',
                fontSize: '16px',
                lineHeight: '1.4',
                margin: '0 0 10px 0'
              }}>
                Посмотрите короткую рекламу и получите <strong style={{ color: '#ff9800' }}>100 монет</strong> бонусом!
              </p>
              <p style={{
                fontSize: '14px',
                color: '#999',
                fontStyle: 'italic',
                margin: '0 0 25px 0'
              }}>
                Это не обязательно, но поможет развитию игры
              </p>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <button 
                  onClick={handleAdOfferAccept}
                  style={{
                    padding: '15px 20px',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  📺 Смотреть рекламу (+100 💰)
                </button>
                <button 
                  onClick={handleAdOfferDecline}
                  style={{
                    padding: '15px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#bbb',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.color = '#bbb';
                  }}
                >
                  ❌ Пропустить
                </button>
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#888'
              }}>
                Следующее предложение через 5 заездов
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RaceScreen;