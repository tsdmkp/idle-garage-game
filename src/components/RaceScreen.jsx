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
  const [isAdLoading, setIsAdLoading] = useState(false);
  
  const playerCarRef = useRef(null);
  const opponentCarRef = useRef(null);

  // Загрузка Adsgram SDK
  useEffect(() => {
    const loadAdsgram = () => {
      console.log('🔄 Начинаем загрузку Adsgram...');
      
      // Проверяем, уже ли загружен
      if (window.Adsgram) {
        console.log('✅ Adsgram уже доступен');
        setAdsgramReady(true);
        return;
      }

      // Проверяем, не загружается ли уже скрипт
      if (document.querySelector('script[src*="sad.min.js"]')) {
        console.log('⏳ Adsgram уже загружается...');
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sad.adsgram.ai/js/sad.min.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('📦 Adsgram скрипт загружен');
        
        // Даем время браузеру обработать скрипт
        setTimeout(() => {
          try {
            if (window.Adsgram && typeof window.Adsgram.init === 'function') {
              console.log('🚀 Инициализируем Adsgram...');
              
              window.Adsgram.init({
                blockId: "12355", // ✅ Ваш блок ID
                debug: true, // Включаем отладку
              });
              
              setAdsgramReady(true);
              console.log('✅ Adsgram успешно инициализирован');
            } else {
              console.error('❌ Adsgram объект не найден после загрузки');
              setAdsgramReady(false);
            }
          } catch (error) {
            console.error('❌ Ошибка инициализации Adsgram:', error);
            setAdsgramReady(false);
          }
        }, 100);
      };
      
      script.onerror = (error) => {
        console.error('❌ Ошибка загрузки Adsgram SDK:', error);
        setAdsgramReady(false);
      };
      
      document.head.appendChild(script);
      console.log('📡 Adsgram скрипт добавлен в <head>');
    };

    loadAdsgram();

    // Загружаем счетчик заездов из localStorage
    const savedRaceCount = localStorage.getItem('raceCount');
    if (savedRaceCount) {
      const count = parseInt(savedRaceCount) || 0;
      setRaceCount(count);
      console.log('📊 Загружен счетчик заездов:', count);
    }

    return () => {
      // Cleanup при размонтировании
      const script = document.querySelector('script[src*="sad.min.js"]');
      if (script) {
        console.log('🧹 Убираем Adsgram скрипт');
        script.remove();
      }
    };
  }, []);

  // Показ настоящей рекламы Adsgram
  const showRealAd = async () => {
    console.log('📺 Попытка показать Adsgram рекламу...');
    
    if (!adsgramReady || !window.Adsgram) {
      console.warn('⚠️ Adsgram не готов, показываем моковую рекламу');
      showMockAd();
      return;
    }

    setIsAdLoading(true);

    try {
      console.log('🎬 Вызываем Adsgram.show()...');
      
      // Показываем рекламу
      const result = await window.Adsgram.show();
      
      console.log('📊 Результат Adsgram:', result);
      
      if (result && result.done) {
        console.log('✅ Реклама успешно просмотрена');
        
        // Даем награду игроку
        onAdReward(100);
        
        // Тактильная обратная связь
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        
        // Показываем уведомление
        alert('🎉 Спасибо за просмотр рекламы!\n+100 монет добавлено!');
        
      } else if (result && result.error) {
        console.error('❌ Ошибка показа рекламы:', result.error);
        alert('😔 К сожалению, реклама недоступна.\nПопробуйте позже!');
      } else {
        console.log('⏭️ Реклама была пропущена пользователем');
      }
      
    } catch (error) {
      console.error('❌ Исключение при показе рекламы:', error);
      
      // Fallback на моковую рекламу при ошибке
      showMockAd();
    } finally {
      setIsAdLoading(false);
    }
  };

  // Имитация рекламы (для тестирования)
  const showMockAd = () => {
    console.log('🎭 Показываем моковую рекламу...');
    
    setIsAdLoading(true);
    
    setTimeout(() => {
      const watchAd = window.confirm('🎥 [ТЕСТ] Реклама загружена!\n\nПросмотреть рекламу за +100 монет?');
      
      if (watchAd) {
        setTimeout(() => {
          onAdReward(100);
          alert('🎉 [ТЕСТ] Спасибо за просмотр!\n+100 монет добавлено!');
          
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
        }, 1500);
      }
      
      setIsAdLoading(false);
    }, 800);
  };

  // Обработка модалки рекламы
  const handleAdModalAction = (watchAd) => {
    console.log('🎯 Действие в модалке рекламы:', watchAd ? 'Смотреть' : 'Пропустить');
    
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

  // Увеличение счетчика заездов и проверка показа рекламы
  const incrementRaceCount = () => {
    const newCount = raceCount + 1;
    setRaceCount(newCount);
    localStorage.setItem('raceCount', newCount.toString());
    
    console.log('🏁 Заезд завершен. Всего заездов:', newCount);
    
    // Показываем рекламу каждые 5 заездов
    if (newCount % 5 === 0) {
      console.log('📺 Время показать рекламу! (каждые 5 заездов)');
      
      setTimeout(() => {
        setShowAdModal(true);
      }, 2000); // Показываем модалку через 2 секунды после завершения гонки
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
    console.log('🚀 Начинаем обратный отсчет...');
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
    console.log('🏎️ Запускаем анимацию гонки...');
    setRaceState('racing');
    
    if (playerCarRef.current && opponentCarRef.current) {
      playerCarRef.current.classList.add('animate');
      opponentCarRef.current.classList.add('animate');
    }
    
    setTimeout(async () => {
      console.log('🏁 Обрабатываем результат гонки...');
      
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
      
      // Увеличиваем счетчик заездов (тут может запуститься реклама)
      incrementRaceCount();
      
      // Возвращаем машины на старт
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
          
          {/* Прогресс-бар до рекламы */}
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
          
          {/* Индикатор статуса Adsgram */}
          <div className="adsgram-status">
            {adsgramReady ? 
              <span style={{color: 'green'}}>📺 Реклама готова</span> : 
              <span style={{color: 'orange'}}>⏳ Загрузка рекламы...</span>
            }
          </div>
          
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

          {/* Кнопка принудительного теста рекламы (для отладки) */}
          <button 
            className="test-ad-button"
            onClick={() => setShowAdModal(true)}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          >
            🧪 Тест рекламы
          </button>
        </div>
      </div>

      {/* Модалка рекламы */}
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
              {isAdLoading && (
                <div className="ad-loading">⏳ Загрузка рекламы...</div>
              )}
            </div>
            <div className="ad-modal-actions">
              <button 
                className="ad-modal-button watch"
                onClick={() => handleAdModalAction(true)}
                disabled={isAdLoading}
              >
                📺 Смотреть (+100 💰)
              </button>
              <button 
                className="ad-modal-button skip"
                onClick={() => handleAdModalAction(false)}
                disabled={isAdLoading}
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