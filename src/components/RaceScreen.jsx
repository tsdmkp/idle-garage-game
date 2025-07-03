import React, { useState, useEffect, useRef } from 'react';
import './RaceScreen.css';

const RaceScreen = ({ 
  playerCar, 
  onStartRace, 
  onAdReward,
  fuelCount: propsFuelCount,
  lastRaceTime: propsLastRaceTime,
  fuelRefillTime: propsFuelRefillTime,
  onFuelUpdate,
  onFuelRefillByAd
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [raceState, setRaceState] = useState('ready');
  const [countdown, setCountdown] = useState(0);
  const [raceResult, setRaceResult] = useState(null);
  const [winStreak, setWinStreak] = useState(0);
  const [totalRaces, setTotalRaces] = useState(0);
  const [wins, setWins] = useState(0);
  
  // Система топлива - используем пропсы от App.jsx
  const [fuelCount, setFuelCount] = useState(propsFuelCount || 5);
  const [lastRaceTime, setLastRaceTime] = useState(propsLastRaceTime);
  const [fuelRefillTime, setFuelRefillTime] = useState(propsFuelRefillTime);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [adsgramReady, setAdsgramReady] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  
  const playerCarRef = useRef(null);
  const opponentCarRef = useRef(null);

  // Константы топливной системы
  const MAX_FUEL = 5;
  const FUEL_REFILL_HOUR = 60 * 60 * 1000; // 1 час в миллисекундах

  // Загрузка Adsgram SDK
  useEffect(() => {
    const loadAdsgram = () => {
      console.log('🔄 Начинаем загрузку Adsgram...');
      
      if (window.Adsgram) {
        console.log('✅ Adsgram уже доступен');
        setAdsgramReady(true);
        return;
      }

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
        
        setTimeout(() => {
          try {
            console.log('🔍 Диагностика Adsgram API...');
            
            if (window.Adsgram && typeof window.Adsgram.init === 'function') {
              console.log('🚀 Инициализируем Adsgram...');
              
              // Определяем режим работы
              const isProduction = window.location.hostname !== 'localhost' && 
                                 !window.location.hostname.includes('vercel.app') &&
                                 !window.location.hostname.includes('netlify.app');
              
              const debugMode = !isProduction;
              console.log('🔧 Режим работы:', isProduction ? 'ПРОДАКШЕН' : 'РАЗРАБОТКА');
              
              const adsgramController = window.Adsgram.init({
                blockId: "12355",
                debug: debugMode,
                debugBannerType: "RewardedVideo"
              });
              
              window.adsgramController = adsgramController;
              
              // Добавляем обработчики событий
              if (adsgramController && typeof adsgramController.addEventListener === 'function') {
                console.log('🎧 Добавляем обработчики событий...');
                
                adsgramController.addEventListener('onReward', () => {
                  console.log('🎁 Событие onReward: пользователь досмотрел рекламу');
                });
                
                adsgramController.addEventListener('onError', (error) => {
                  console.log('❌ Событие onError:', error);
                });
                
                adsgramController.addEventListener('onBannerNotFound', () => {
                  console.log('🚫 Событие onBannerNotFound: нет рекламы для показа');
                });
              }
              
              setAdsgramReady(true);
              console.log('✅ Adsgram успешно инициализирован');
            } else {
              console.error('❌ Adsgram объект не найден');
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
    };

  // Синхронизация с пропсами от App.jsx
  useEffect(() => {
    if (propsFuelCount !== undefined) {
      setFuelCount(propsFuelCount);
    }
    if (propsLastRaceTime !== undefined) {
      setLastRaceTime(propsLastRaceTime);
    }
    if (propsFuelRefillTime !== undefined) {
      setFuelRefillTime(propsFuelRefillTime);
    }
  }, [propsFuelCount, propsLastRaceTime, propsFuelRefillTime]);

    return () => {
      const script = document.querySelector('script[src*="sad.min.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  // Загрузка данных топлива
  const loadFuelData = () => {
    const savedFuel = localStorage.getItem('fuelCount');
    const savedLastRaceTime = localStorage.getItem('lastRaceTime');
    const savedRefillTime = localStorage.getItem('fuelRefillTime');
    
    if (savedFuel) {
      setFuelCount(parseInt(savedFuel));
    }
    
    if (savedLastRaceTime) {
      setLastRaceTime(parseInt(savedLastRaceTime));
    }
    
    if (savedRefillTime) {
      setFuelRefillTime(parseInt(savedRefillTime));
    }
    
    console.log('⛽ Загружены данные топлива:', {
      fuel: savedFuel || MAX_FUEL,
      lastRace: savedLastRaceTime ? new Date(parseInt(savedLastRaceTime)).toLocaleString() : 'нет',
      refillTime: savedRefillTime ? new Date(parseInt(savedRefillTime)).toLocaleString() : 'нет'
    });
    
    // Проверяем, нужно ли восстановить топливо
    checkFuelRefill();
  };

  // Проверка восстановления топлива
  const checkFuelRefill = () => {
    const now = Date.now();
    const refillTime = fuelRefillTime || (lastRaceTime ? lastRaceTime + FUEL_REFILL_HOUR : null);
    
    if (refillTime && now >= refillTime && fuelCount < MAX_FUEL) {
      console.log('⛽ Топливо восстановлено!');
      const newFuelCount = MAX_FUEL;
      const newLastRaceTime = now;
      
      setFuelCount(newFuelCount);
      setLastRaceTime(newLastRaceTime);
      setFuelRefillTime(null);
      
      // Уведомляем App.jsx об обновлении
      if (onFuelUpdate) {
        onFuelUpdate(newFuelCount, newLastRaceTime, null);
      }
    }
  };

  // Таймер для проверки восстановления топлива
  useEffect(() => {
    const interval = setInterval(() => {
      checkFuelRefill();
    }, 1000);

    return () => clearInterval(interval);
  }, [fuelCount, lastRaceTime, fuelRefillTime]);

  // Сохранение данных топлива - теперь через App.jsx
  const saveFuelData = (newFuelCount, newLastRaceTime, newRefillTime = null) => {
    console.log('💾 Обновляем данные топлива через App.jsx:', {
      fuel: newFuelCount,
      lastRace: new Date(newLastRaceTime).toLocaleString(),
      refillTime: newRefillTime ? new Date(newRefillTime).toLocaleString() : 'нет'
    });
    
    // Уведомляем App.jsx об обновлении
    if (onFuelUpdate) {
      onFuelUpdate(newFuelCount, newLastRaceTime, newRefillTime);
    }
  };

  // Получение времени до восстановления топлива
  const getTimeUntilRefill = () => {
    if (fuelCount >= MAX_FUEL) return null;
    
    const now = Date.now();
    const refillTime = fuelRefillTime || (lastRaceTime ? lastRaceTime + FUEL_REFILL_HOUR : null);
    
    if (!refillTime) return null;
    
    const timeLeft = refillTime - now;
    if (timeLeft <= 0) return null;
    
    const minutes = Math.floor(timeLeft / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Показ рекламы для восстановления топлива
  const showAdForFuel = async () => {
    console.log('⛽ Попытка показать рекламу для восстановления топлива...');
    
    setIsAdLoading(true);

    try {
      if (!window.adsgramController) {
        console.error('❌ AdController не найден');
        alert('😔 Реклама временно недоступна');
        setIsAdLoading(false);
        return;
      }
      
      console.log('🎬 Показываем рекламу для восстановления топлива...');
      
      const result = await window.adsgramController.show();
      
      console.log('✅ Реклама успешно просмотрена! Восстанавливаем топливо');
      
      // Восстанавливаем топливо
      const now = Date.now();
      const newFuelCount = MAX_FUEL;
      const newLastRaceTime = now;
      
      setFuelCount(newFuelCount);
      setLastRaceTime(newLastRaceTime);
      setFuelRefillTime(null);
      
      // Уведомляем App.jsx
      if (onFuelRefillByAd) {
        onFuelRefillByAd();
      }
      
      // Закрываем модалку
      setShowFuelModal(false);
      
      // Уведомление пользователю
      alert('⛽ Топливный бак заправлен!\nМожете продолжать гонки!');
      
      // Тактильная обратная связь
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
    } catch (error) {
      console.log('⏭️ Реклама была пропущена:', error);
      alert('📺 Для заправки нужно досмотреть рекламу до конца');
    } finally {
      setIsAdLoading(false);
    }
  };

  // Проверка топлива перед гонкой
  const checkFuelBeforeRace = () => {
    console.log('⛽ Проверка топлива перед гонкой. Текущий уровень:', fuelCount);
    
    if (fuelCount <= 0) {
      console.log('⛽ Топливо закончилось, показываем модалку');
      setShowFuelModal(true);
      return false;
    }
    
    return true;
  };

  // Расход топлива после гонки
  const consumeFuel = () => {
    const now = Date.now();
    const newFuelCount = fuelCount - 1;
    
    setFuelCount(newFuelCount);
    setLastRaceTime(now);
    
    // Если топливо закончилось, устанавливаем время восстановления
    if (newFuelCount <= 0) {
      const refillTime = now + FUEL_REFILL_HOUR;
      setFuelRefillTime(refillTime);
      saveFuelData(newFuelCount, now, refillTime);
    } else {
      saveFuelData(newFuelCount, now);
    }
    
    console.log(`⛽ Потрачено топливо. Осталось: ${newFuelCount}/${MAX_FUEL}`);
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
    // Проверяем топливо перед стартом
    if (!checkFuelBeforeRace()) {
      return;
    }
    
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
      
      // Тратим топливо после завершения гонки
      consumeFuel();
      
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

  const canStartRace = raceState === 'ready' && fuelCount > 0;
  
  const buttonText = () => {
    if (fuelCount <= 0) {
      return '⛽ Нет топлива';
    }
    
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

  const timeUntilRefill = getTimeUntilRefill();

  return (
    <div className="race-screen">
      <div className="race-screen__content">
        
        <div className="race-header">
          <h2>🏁 Гонки</h2>
          
          {/* Индикатор топлива */}
          <div className="fuel-indicator">
            <div className="fuel-bar">
              <div className="fuel-label">⛽ Топливо:</div>
              <div className="fuel-tanks">
                {[...Array(MAX_FUEL)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`fuel-tank ${i < fuelCount ? 'full' : 'empty'}`}
                  >
                    {i < fuelCount ? '🟢' : '⚫'}
                  </div>
                ))}
              </div>
              <div className="fuel-count">{fuelCount}/{MAX_FUEL}</div>
            </div>
            
            {timeUntilRefill && (
              <div className="fuel-refill-timer">
                ⏰ Восстановление через: {timeUntilRefill}
              </div>
            )}
            
            {fuelCount <= 0 && (
              <div className="fuel-empty-message">
                ⛽ Топливо закончилось! Подождите час или посмотрите рекламу
              </div>
            )}
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
            className={`start-race-button ${raceState === 'countdown' ? 'countdown' : ''} ${raceState === 'racing' ? 'racing' : ''} ${!canStartRace ? 'disabled' : ''}`}
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

      {/* Модалка топлива */}
      {showFuelModal && (
        <div className="fuel-modal-overlay">
          <div className="fuel-modal">
            <div className="fuel-modal-header">
              <h3>⛽ Топливо закончилось!</h3>
            </div>
            <div className="fuel-modal-content">
              <div className="fuel-modal-icon">🚗💨</div>
              <p>Ваш автомобиль нуждается в заправке!</p>
              <div className="fuel-options">
                <div className="fuel-option">
                  <strong>⏰ Подождать час</strong>
                  <div>Топливо восстановится автоматически</div>
                  {timeUntilRefill && (
                    <div className="time-remaining">
                      Осталось: {timeUntilRefill}
                    </div>
                  )}
                </div>
                <div className="fuel-option-or">ИЛИ</div>
                <div className="fuel-option">
                  <strong>📺 Посмотреть рекламу</strong>
                  <div>Мгновенная заправка бака</div>
                </div>
              </div>
              {isAdLoading && (
                <div className="ad-loading">⏳ Загрузка рекламы...</div>
              )}
            </div>
            <div className="fuel-modal-actions">
              <button 
                className="fuel-modal-button wait"
                onClick={() => setShowFuelModal(false)}
              >
                ⏰ Подождать
              </button>
              <button 
                className="fuel-modal-button watch"
                onClick={showAdForFuel}
                disabled={isAdLoading || !adsgramReady}
              >
                📺 Заправиться (реклама)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RaceScreen;