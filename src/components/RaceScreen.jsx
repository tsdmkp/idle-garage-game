import React, { useState, useEffect, useRef } from 'react';
import './RaceScreen.css';

const RaceScreen = ({ playerCar, onStartRace, onAdReward }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [raceState, setRaceState] = useState('ready');
  const [countdown, setCountdown] = useState(0);
  const [raceResult, setRaceResult] = useState(null);
  const [winStreak, setWinStreak] = useState(0);
  const [totalRaces, setTotalRaces] = useState(0);
  const [wins, setWins] = useState(0);
  
  // Состояния для рекламы
  const [raceCount, setRaceCount] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adsgramReady, setAdsgramReady] = useState(false);
  
  const playerCarRef = useRef(null);
  const opponentCarRef = useRef(null);

  // Загрузка Adsgram SDK
  useEffect(() => {
    const loadAdsgram = () => {
      if (window.Adsgram) {
        setAdsgramReady(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sad.adsgram.ai/js/sad.min.js';
      script.async = true;
      
      script.onload = () => {
        try {
          window.Adsgram.init({
            blockId: "12355"
          });
          setAdsgramReady(true);
          console.log('✅ Adsgram SDK загружен');
        } catch (error) {
          console.error('❌ Ошибка Adsgram:', error);
        }
      };
      
      script.onerror = () => {
        console.error('❌ Ошибка загрузки Adsgram SDK');
      };
      
      document.head.appendChild(script);
    };

    loadAdsgram();

    const savedRaceCount = localStorage.getItem('raceCount');
    if (savedRaceCount) {
      setRaceCount(parseInt(savedRaceCount));
    }

    return () => {
      const script = document.querySelector('script[src*="sad.min.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  // Показ рекламы
  const showRealAd = async () => {
    if (!adsgramReady || !window.Adsgram) {
      showMockAd();
      return;
    }

    try {
      const result = await window.Adsgram.show();
      
      if (result.done) {
        onAdReward(100);
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (error) {
      console.error('❌ Ошибка рекламы:', error);
      showMockAd();
    }
  };

  // Имитация рекламы
  const showMockAd = () => {
    setTimeout(() => {
      const watchAd = window.confirm('🎥 Реклама загружена!\n\nПросмотреть рекламу за +100 монет?');
      
      if (watchAd) {
        setTimeout(() => {
          onAdReward(100);
          alert('🎉 Спасибо за просмотр!\n+100 монет добавлено!');
          
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
        }, 1500);
      }
    }, 800);
  };

  // Обработка модалки рекламы
  const handleAdModalAction = (watchAd) => {
    setShowAdModal(false);
    
    if (watchAd) {
      showRealAd();
    }
  };

  // Прогресс до рекламы
  const getAdProgress = () => {
    const remaining = 5 - (raceCount % 5);
    return remaining === 5 ? 0 : 5 - remaining;
  };

  // Увеличение счетчика заездов
  const incrementRaceCount = () => {
    const newCount = raceCount + 1;
    setRaceCount(newCount);
    localStorage.setItem('raceCount', newCount.toString());
    
    if (newCount % 5 === 0) {
      setTimeout(() => {
        setShowAdModal(true);
      }, 2000);
    }
  };

  const difficulties = {
    easy: { 
      name: 'Легкий', 
      reward: '+50 GC', 
      penalty: '-5%',
      description: 'Новичок' 
    },
    medium: { 
      name: 'Средний', 
      reward: '+150 GC', 
      penalty: '-10%',
      description: 'Опытный' 
    },
    hard: { 
      name: 'Сложный', 
      reward: '+300 GC', 
      penalty: '-15%',
      description: 'Профи' 
    }
  };

  const startCountdown = () => {
    setRaceState('countdown');
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startRaceAnimation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRaceAnimation = () => {
    setRaceState('racing');
    
    if (playerCarRef.current && opponentCarRef.current) {
      playerCarRef.current.classList.add('animate');
      opponentCarRef.current.classList.add('animate');
    }
    
    setTimeout(async () => {
      const result = await onStartRace(selectedDifficulty);
      setRaceResult(result);
      setTotalRaces(prev => prev + 1);
      
      if (result.result === 'win') {
        setWins(prev => prev + 1);
        setWinStreak(prev => prev + 1);
      } else {
        setWinStreak(0);
      }
      
      setRaceState('finished');
      incrementRaceCount();
      
      setTimeout(() => {
        if (playerCarRef.current && opponentCarRef.current) {
          playerCarRef.current.classList.remove('animate');
          playerCarRef.current.classList.add('returning');
          opponentCarRef.current.classList.remove('animate');
          opponentCarRef.current.classList.add('returning');
        }
        
        setTimeout(() => {
          if (playerCarRef.current && opponentCarRef.current) {
            playerCarRef.current.classList.remove('returning');
            opponentCarRef.current.classList.remove('returning');
          }
          setRaceState('ready');
          setRaceResult(null);
        }, 2500);
      }, 3000);
    }, 2500);
  };

  const canStartRace = raceState === 'ready';
  
  const buttonText = () => {
    switch (raceState) {
      case 'countdown':
        return countdown.toString();
      case 'racing':
        return 'Гонка!';
      case 'finished':
        return raceResult?.result === 'win' ? 'Победа!' : 'Поражение!';
      default:
        return 'Начать Заезд!';
    }
  };

  return (
    <div className="race-screen">
      <div className="race-screen__content">
        
        <div className="race-header">
          <h2>🏁 Гонки</h2>
          {raceCount > 0 && (
            <div className="ad-progress-container">
              <div className="ad-progress-bar">
                <div 
                  className="ad-progress-fill"
                  style={{ width: `${(getAdProgress() / 5) * 100}%` }}
                ></div>
              </div>
              <div className="ad-progress-text">
                📺 До рекламы: {5 - (raceCount % 5)} заездов
              </div>
            </div>
          )}
          {winStreak > 1 && (
            <div className="win-streak">🔥 Серия побед: {winStreak}</div>
          )}
          <div className="race-stats">
            Побед: {wins}/{totalRaces} ({totalRaces > 0 ? Math.round((wins/totalRaces) * 100) : 0}%)
          </div>
        </div>

        <div className="participants-info">
          <div className="participant">
            <div className="participant-header">Ваша машина</div>
            <div className="car-info">
              <div className="car-name">{playerCar?.name}</div>
              <div className="car-stats">
                ⚡{playerCar?.stats?.power} 🏎️{playerCar?.stats?.speed}<br/>
                ✨{playerCar?.stats?.style} 🔧{playerCar?.stats?.reliability}
              </div>
            </div>
          </div>
          
          <div className="vs-divider">VS</div>
          
          <div className="participant">
            <div className="participant-header">Соперник</div>
            <div className="car-info">
              <div className="car-name">Противник</div>
              <div className="car-stats">
                {difficulties[selectedDifficulty].description}<br/>
                {difficulties[selectedDifficulty].name}
              </div>
            </div>
          </div>
        </div>

        <div className="difficulty-selector">
          <h4>Выберите сложность:</h4>
          <div className="difficulty-buttons">
            {Object.entries(difficulties).map(([key, diff]) => (
              <button
                key={key}
                className={`${selectedDifficulty === key ? 'active' : ''}`}
                onClick={() => setSelectedDifficulty(key)}
                disabled={!canStartRace}
              >
                <div className="difficulty-name">{diff.name}</div>
                <div className="difficulty-reward">
                  {diff.reward} / {diff.penalty}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="race-animation-area">
          <div className="race-track">
            {raceState === 'countdown' && (
              <div className="countdown-overlay">
                <div className="countdown-number">{countdown}</div>
              </div>
            )}
            
            {raceState === 'racing' && (
              <div className="speed-lines">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`speed-line speed-line-${i}`}></div>
                ))}
              </div>
            )}
            
            <div className="race-car player-car" ref={playerCarRef}>
              <img src={playerCar?.imageUrl || '/placeholder-car.png'} alt="Player car" />
            </div>
            
            <div className="race-car opponent-car" ref={opponentCarRef}>
              <img src="/placeholder-car-2.png" alt="Opponent car" />
            </div>
            
            <div className="finish-line"></div>
          </div>
        </div>

        <div className="race-controls-area">
          <button
            className={`start-race-button ${raceState === 'countdown' ? 'countdown' : ''} ${raceState === 'racing' ? 'racing' : ''}`}
            onClick={startCountdown}
            disabled={!canStartRace}
          >
            {buttonText()}
          </button>

          {raceResult && raceState === 'finished' && (
            <div className={`race-result ${raceResult.result}`}>
              <h3>
                {raceResult.result === 'win' ? '🏆 Победа!' : 
                 raceResult.result === 'lose' ? '💔 Поражение!' : '❌ Ошибка!'}
              </h3>
              <p>
                {raceResult.result === 'win' 
                  ? `Вы выиграли ${raceResult.reward?.coins} монет и ${raceResult.reward?.xp} XP!`
                  : raceResult.result === 'lose'
                  ? `Вы потеряли ${Math.abs(raceResult.reward?.coins || 0)} монет. Попробуйте еще раз!`
                  : 'Произошла ошибка в гонке.'
                }
              </p>
              {raceResult.result === 'lose' && (
                <div className="race-tip">
                  💡 Совет: Улучшите свою машину в тюнинге для лучших результатов!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAdModal && (
        <div className="ad-modal-overlay">
          <div className="ad-modal">
            <div className="ad-modal-header">
              <h3>📺 Реклама доступна!</h3>
            </div>
            <div className="ad-modal-content">
              <p>Просмотрите короткую рекламу и получите <strong>+100 монет</strong>!</p>
              <div className="ad-modal-subtitle">
                Это добровольно - вы можете пропустить
              </div>
            </div>
            <div className="ad-modal-actions">
              <button 
                className="ad-modal-button watch"
                onClick={() => handleAdModalAction(true)}
              >
                📺 Смотреть (+100 💰)
              </button>
              <button 
                className="ad-modal-button skip"
                onClick={() => handleAdModalAction(false)}
              >
                ⏭️ Пропустить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RaceScreen;