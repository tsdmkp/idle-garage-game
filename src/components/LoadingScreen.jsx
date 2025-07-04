import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // Этапы загрузки
  const loadingSteps = [
    { text: 'Запуск двигателя...', duration: 800 },
    { text: 'Загрузка гаража...', duration: 600 },
    { text: 'Подготовка машин...', duration: 700 },
    { text: 'Настройка трассы...', duration: 500 },
    { text: 'Подключение к серверу...', duration: 600 },
    { text: 'Финальная проверка...', duration: 400 }
  ];

  useEffect(() => {
    let currentProgress = 0;
    let stepIndex = 0;
    
    const totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0);
    
    const loadingInterval = setInterval(() => {
      // Обновляем текущий этап
      if (stepIndex < loadingSteps.length) {
        setCurrentStep(loadingSteps[stepIndex].text);
      }
      
      // Увеличиваем прогресс
      currentProgress += 2;
      setProgress(Math.min(currentProgress, 100));
      
      // Переходим к следующему этапу
      if (currentProgress >= (stepIndex + 1) * (100 / loadingSteps.length)) {
        stepIndex++;
      }
      
      // Завершение загрузки
      if (currentProgress >= 100) {
        clearInterval(loadingInterval);
        setTimeout(() => {
          if (onLoadingComplete) {
            onLoadingComplete();
          }
        }, 500);
      }
    }, 50);

    return () => clearInterval(loadingInterval);
  }, [onLoadingComplete]);

  return (
    <div className="loading-screen">
      <div className="loading-background"></div>
      
      {/* Анимированный фон */}
      <div className="loading-particles">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              '--delay': `${i * 0.3}s`,
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`
            }}
          ></div>
        ))}
      </div>

      {/* Основной контент */}
      <div className="loading-content">
        {/* Логотип/Заголовок */}
        <div className="loading-header">
          <div className="game-logo">
            <div className="logo-icon">🏎️</div>
            <h1 className="game-title">IDLE GARAGE</h1>
            <p className="game-subtitle">Твой путь к автомобильной империи</p>
          </div>
        </div>

        {/* Машинка */}
        <div className="loading-car-container">
          <div className="loading-car">
            🚗
          </div>
          <div className="car-trail"></div>
        </div>

        {/* Прогресс бар */}
        <div className="loading-progress-section">
          <div className="progress-container">
            <div className="progress-track">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              >
                <div className="progress-shine"></div>
              </div>
              <div className="progress-car" style={{ left: `${progress}%` }}>
                🏁
              </div>
            </div>
          </div>
          
          <div className="progress-info">
            <div className="progress-text">{currentStep}</div>
            <div className="progress-percentage">{progress}%</div>
          </div>
        </div>

        {/* Подсказки */}
        <div className="loading-tips">
          <p>💡 Улучшай машины, чтобы побеждать в гонках!</p>
        </div>
      </div>

      {/* Дорожная разметка */}
      <div className="road-markings">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="road-line" style={{ '--delay': `${i * 0.2}s` }}></div>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;