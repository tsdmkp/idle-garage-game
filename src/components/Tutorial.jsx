import React, { useState, useEffect } from 'react';
import './Tutorial.css';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в Idle Garage! 🚗',
    content: 'Здесь ты станешь владельцем автомастерской и будешь развивать свой бизнес!',
    target: null,
    position: 'center',
    action: null
  },
  {
    id: 'car',
    title: 'Это твоя первая машина',
    content: 'Она приносит тебе доход каждый час. Чем лучше машина - тем больше дохода!',
    target: '.car-showcase',
    position: 'bottom',
    action: null
  },
  {
    id: 'income',
    title: 'Накопление дохода',
    content: 'Здесь показан твой текущий доход. Когда полоска заполнится, ты сможешь собрать монеты.',
    target: '.income-progress-section',
    position: 'top',
    action: null
  },
  {
    id: 'collect',
    title: 'Собирай монеты!',
    content: 'Нажми на эту кнопку, чтобы собрать накопленные монеты. Не забывай делать это регулярно!',
    target: '.collect-button-main',
    position: 'top',
    action: 'waitForCollect'
  },
  {
    id: 'tuning',
    title: 'Улучшай свою машину',
    content: 'Нажми сюда, чтобы открыть тюнинг. Улучшения увеличат доход от машины!',
    target: '.floating-action-button.right',
    position: 'left',
    action: null
  },
  {
    id: 'buildings',
    title: 'Строй здания',
    content: 'Раскрой этот раздел, чтобы увидеть доступные постройки. Они дают дополнительный доход!',
    target: '.buildings-toggle',
    position: 'top',
    action: 'expandBuildings'
  },
  {
    id: 'navigation',
    title: 'Исследуй игру',
    content: 'Внизу экрана есть навигация. Участвуй в гонках, покупай новые машины и нанимай персонал!',
    target: '.navbar',
    position: 'top',
    action: null
  },
  {
    id: 'finish',
    title: 'Удачи! 🎉',
    content: 'Теперь ты знаешь основы игры. Развивай свой гараж и стань лучшим!',
    target: null,
    position: 'center',
    action: null
  }
];

const Tutorial = ({ onComplete, gameState, onAction }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightBox, setHighlightBox] = useState(null);
  
  const step = TUTORIAL_STEPS[currentStep];
  
  // Проверяем, нужно ли показывать туториал
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('tutorialCompleted');
    if (!tutorialCompleted && gameState.isFirstTime) {
      setIsVisible(true);
    }
  }, [gameState.isFirstTime]);
  
  // Обновляем подсветку при смене шага
  useEffect(() => {
    if (!isVisible || !step.target) {
      setHighlightBox(null);
      return;
    }
    
    const updateHighlight = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightBox({
          top: rect.top - 5,
          left: rect.left - 5,
          width: rect.width + 10,
          height: rect.height + 10
        });
      }
    };
    
    // Даем время на рендер
    setTimeout(updateHighlight, 100);
    
    // Обновляем при изменении размера окна
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [currentStep, isVisible, step.target]);
  
  // Обработка специальных действий
  useEffect(() => {
    if (!step.action || !isVisible) return;
    
    switch (step.action) {
      case 'waitForCollect':
        // Слушаем событие сбора монет
        const checkCollect = () => {
          if (gameState.justCollected) {
            handleNext();
          }
        };
        const interval = setInterval(checkCollect, 500);
        return () => clearInterval(interval);
        
      case 'expandBuildings':
        // Автоматически раскрываем постройки
        setTimeout(() => {
          onAction('expandBuildings');
        }, 500);
        break;
    }
  }, [step.action, gameState, isVisible]);
  
  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };
  
  const handleSkip = () => {
    if (window.confirm('Вы уверены, что хотите пропустить обучение?')) {
      handleComplete();
    }
  };
  
  const handleComplete = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };
  
  if (!isVisible) return null;
  
  // Позиционирование подсказки
  const getTooltipPosition = () => {
    if (!step.target || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }
    
    if (!highlightBox) return {};
    
    const positions = {
      top: {
        bottom: `${window.innerHeight - highlightBox.top + 10}px`,
        left: `${highlightBox.left + highlightBox.width / 2}px`,
        transform: 'translateX(-50%)'
      },
      bottom: {
        top: `${highlightBox.top + highlightBox.height + 10}px`,
        left: `${highlightBox.left + highlightBox.width / 2}px`,
        transform: 'translateX(-50%)'
      },
      left: {
        top: `${highlightBox.top + highlightBox.height / 2}px`,
        right: `${window.innerWidth - highlightBox.left + 10}px`,
        transform: 'translateY(-50%)'
      },
      right: {
        top: `${highlightBox.top + highlightBox.height / 2}px`,
        left: `${highlightBox.left + highlightBox.width + 10}px`,
        transform: 'translateY(-50%)'
      }
    };
    
    return positions[step.position] || {};
  };
  
  return (
    <div className="tutorial-overlay">
      {/* Затемнение фона */}
      <div className="tutorial-backdrop" onClick={handleSkip} />
      
      {/* Подсветка элемента */}
      {highlightBox && (
        <div 
          className="tutorial-highlight"
          style={highlightBox}
        />
      )}
      
      {/* Подсказка */}
      <div 
        className="tutorial-tooltip"
        style={getTooltipPosition()}
      >
        <div className="tutorial-header">
          <span className="tutorial-step-counter">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </span>
          <button className="tutorial-skip" onClick={handleSkip}>
            Пропустить
          </button>
        </div>
        
        <h3 className="tutorial-title">{step.title}</h3>
        <p className="tutorial-content">{step.content}</p>
        
        <div className="tutorial-actions">
          {currentStep > 0 && (
            <button 
              className="tutorial-button secondary"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Назад
            </button>
          )}
          <button 
            className="tutorial-button primary"
            onClick={handleNext}
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Начать игру!' : 'Далее'}
          </button>
        </div>
        
        {/* Индикатор прогресса */}
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((_, index) => (
            <div 
              key={index}
              className={`progress-dot ${index <= currentStep ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
      
      {/* Стрелка указатель */}
      {highlightBox && step.position !== 'center' && (
        <div 
          className={`tutorial-arrow arrow-${step.position}`}
          style={getArrowPosition()}
        />
      )}
    </div>
  );
  
  function getArrowPosition() {
    if (!highlightBox) return {};
    
    const arrowPositions = {
      top: {
        bottom: `${window.innerHeight - highlightBox.top + 5}px`,
        left: `${highlightBox.left + highlightBox.width / 2}px`,
        transform: 'translateX(-50%) rotate(180deg)'
      },
      bottom: {
        top: `${highlightBox.top + highlightBox.height + 5}px`,
        left: `${highlightBox.left + highlightBox.width / 2}px`,
        transform: 'translateX(-50%)'
      },
      left: {
        top: `${highlightBox.top + highlightBox.height / 2}px`,
        right: `${window.innerWidth - highlightBox.left + 5}px`,
        transform: 'translateY(-50%) rotate(90deg)'
      },
      right: {
        top: `${highlightBox.top + highlightBox.height / 2}px`,
        left: `${highlightBox.left + highlightBox.width + 5}px`,
        transform: 'translateY(-50%) rotate(-90deg)'
      }
    };
    
    return arrowPositions[step.position] || {};
  }
};

export default Tutorial;