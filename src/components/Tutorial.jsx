import React, { useState, useEffect } from 'react';
import './Tutorial.css';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в Idle Garage! 🚗',
    text: 'Начни свой путь от ржавой машины до империи автобизнеса!',
    target: null,
    position: 'center',
    action: 'next'
  },
  {
    id: 'car',
    title: 'Это твоя первая машина',
    text: 'Она генерирует доход каждый час. Чем лучше машина - тем больше доход!',
    target: '.car-showcase',
    position: 'bottom',
    action: 'next',
    offset: { top: 20 } // Добавляем отступ
  },
  {
    id: 'income',
    title: 'Накопление дохода',
    text: 'Здесь показано, сколько монет накопилось. Максимум - за 2 часа офлайн режима.',
    target: '.progress-container',
    position: 'bottom', // Изменено с 'top' на 'bottom'
    action: 'next',
    offset: { top: 20 }
  },
  {
    id: 'collect',
    title: 'Собирай монеты!',
    text: 'Нажми эту кнопку, чтобы собрать накопленный доход.',
    target: '.collect-button-main',
    position: 'bottom', // Изменено с 'top' на 'bottom'
    action: 'collect',
    highlight: true,
    offset: { top: 20 }
  },
  {
    id: 'tuning',
    title: 'Улучшай свою машину',
    text: 'Нажми сюда, чтобы открыть тюнинг и улучшить детали машины.',
    target: '.floating-action-button.right',
    position: 'left',
    action: 'next',
    offset: { left: -20 }
  },
  {
    id: 'buildings',
    title: 'Развивай бизнес',
    text: 'Постройки дают дополнительный доход. Нажми, чтобы посмотреть доступные здания.',
    target: '.buildings-toggle',
    position: 'bottom',
    action: 'expand-buildings',
    offset: { top: 10 }
  },
  {
    id: 'navigation',
    title: 'Исследуй игру',
    text: 'Внизу находится меню с разными разделами: гонки, магазин машин, персонал и другое.',
    target: '.navbar',
    position: 'top',
    action: 'next',
    offset: { top: -20 }
  },
  {
    id: 'complete',
    title: 'Ты готов! 🎉',
    text: 'Собирай монеты, улучшай машины, развивай бизнес и стань магнатом автоиндустрии!',
    target: null,
    position: 'center',
    action: 'finish'
  }
];

const Tutorial = ({ 
  isActive, 
  currentStep, 
  onNext, 
  onComplete,
  onAction,
  gameState 
}) => {
  const [highlightRect, setHighlightRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: '50%', left: '50%' });
  const [isVisible, setIsVisible] = useState(false);

  const step = TUTORIAL_STEPS[currentStep] || TUTORIAL_STEPS[0];

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    // Небольшая задержка перед показом
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 300);

    // Обновляем позицию подсказки
    const updatePosition = () => {
      if (step.target) {
        const element = document.querySelector(step.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
          
          // Рассчитываем позицию тултипа
          let top, left;
          const tooltipWidth = 300;
          const tooltipHeight = 150;
          const padding = 20;
          const offset = step.offset || {};
          
          switch (step.position) {
            case 'top':
              top = rect.top - tooltipHeight - padding + (offset.top || 0);
              left = rect.left + rect.width / 2 - tooltipWidth / 2 + (offset.left || 0);
              break;
            case 'bottom':
              top = rect.bottom + padding + (offset.top || 0);
              left = rect.left + rect.width / 2 - tooltipWidth / 2 + (offset.left || 0);
              break;
            case 'left':
              top = rect.top + rect.height / 2 - tooltipHeight / 2 + (offset.top || 0);
              left = rect.left - tooltipWidth - padding + (offset.left || 0);
              break;
            case 'right':
              top = rect.top + rect.height / 2 - tooltipHeight / 2 + (offset.top || 0);
              left = rect.right + padding + (offset.left || 0);
              break;
            default:
              top = window.innerHeight / 2 - tooltipHeight / 2;
              left = window.innerWidth / 2 - tooltipWidth / 2;
          }
          
          // Проверяем границы экрана
          top = Math.max(10, Math.min(window.innerHeight - tooltipHeight - 10, top));
          left = Math.max(10, Math.min(window.innerWidth - tooltipWidth - 10, left));
          
          setTooltipPosition({ top: `${top}px`, left: `${left}px` });
        }
      } else {
        // Центрируем для шагов без target
        setHighlightRect(null);
        setTooltipPosition({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, step, currentStep]);

  if (!isActive || !isVisible) return null;

  const handleAction = () => {
    switch (step.action) {
      case 'next':
        onNext();
        break;
      case 'collect':
        // Ждем, пока игрок соберет монеты
        if (onAction) {
          onAction('collect');
        }
        break;
      case 'expand-buildings':
        if (onAction) {
          onAction('expand-buildings');
        }
        onNext();
        break;
      case 'finish':
        onComplete();
        break;
      default:
        onNext();
    }
  };

  const handleOverlayClick = (e) => {
    // Позволяем кликать только по подсвеченным элементам
    if (step.highlight && highlightRect) {
      const x = e.clientX;
      const y = e.clientY;
      if (
        x >= highlightRect.left &&
        x <= highlightRect.right &&
        y >= highlightRect.top &&
        y <= highlightRect.bottom
      ) {
        // Клик по целевому элементу - пропускаем
        return;
      }
    }
    // Иначе переходим к следующему шагу
    if (step.action === 'next') {
      handleAction();
    }
  };

  return (
    <div className={`tutorial-overlay ${isVisible ? 'visible' : ''}`}>
      {/* Затемнение фона */}
      <div className="tutorial-backdrop" />
      
      {/* Подсветка элемента */}
      {highlightRect && (
        <div 
          className="tutorial-highlight"
          style={{
            top: `${highlightRect.top - 5}px`,
            left: `${highlightRect.left - 5}px`,
            width: `${highlightRect.width + 10}px`,
            height: `${highlightRect.height + 10}px`,
          }}
        />
      )}
      
      {/* Создаем прозрачную область для кликов по подсвеченному элементу */}
      {highlightRect && step.highlight && (
        <div
          style={{
            position: 'fixed',
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
            pointerEvents: 'all',
            zIndex: 9999
          }}
        />
      )}
      
      {/* Подсказка */}
      <div 
        className={`tutorial-tooltip ${step.position || 'center'}`}
        style={tooltipPosition}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tutorial-step-indicator">
          Шаг {currentStep + 1} из {TUTORIAL_STEPS.length}
        </div>
        
        <h3 className="tutorial-title">{step.title}</h3>
        <p className="tutorial-text">{step.text}</p>
        
        <div className="tutorial-actions">
          {step.action === 'collect' ? (
            <div className="tutorial-hint">Нажми на кнопку сбора ⬇️</div>
          ) : step.action === 'finish' ? (
            <button className="tutorial-button primary" onClick={handleAction}>
              Начать игру! 🚀
            </button>
          ) : (
            <button className="tutorial-button" onClick={handleAction}>
              Далее →
            </button>
          )}
        </div>
        
        <button className="tutorial-skip" onClick={onComplete}>
          Пропустить обучение
        </button>
      </div>
      
      {/* Анимированная стрелка для подсвеченных элементов */}
      {highlightRect && step.highlight && (
        <div 
          className="tutorial-arrow"
          style={{
            top: `${highlightRect.top - 40}px`,
            left: `${highlightRect.left + highlightRect.width / 2}px`,
          }}
        >
          ⬇️
        </div>
      )}
    </div>
  );
};

export default Tutorial;