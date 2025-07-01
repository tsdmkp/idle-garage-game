import React, { useEffect, useState } from 'react';

const AdsgramButton = ({ 
  onReward, 
  disabled = false, 
  rewardAmount = 100,
  buttonText = "📺 Бонусные монеты",
  blockId = "12355"
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [adsgram, setAdsgram] = useState(null);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;

    const initAdsgram = () => {
      if (window.Adsgram && blockId) {
        try {
          console.log('📺 Инициализируем Adsgram с Block ID:', blockId);
          const adsgramInstance = window.Adsgram.init({ 
            blockId: blockId,
            debug: false // Поставить true для тестирования
          });
          setAdsgram(adsgramInstance);
          setIsReady(true);
          setError(null);
          console.log('✅ Adsgram успешно инициализирован');
        } catch (error) {
          console.error('❌ Ошибка инициализации Adsgram:', error);
          setError('Ошибка инициализации');
        }
      } else if (!window.Adsgram && retryCount < maxRetries) {
        retryCount++;
        console.warn(`⚠️ Adsgram SDK не загружен, попытка ${retryCount}/${maxRetries}...`);
        setTimeout(initAdsgram, 1000);
      } else if (retryCount >= maxRetries) {
        console.error('❌ Adsgram SDK не загрузился после всех попыток');
        setError('SDK не загружен');
      }
    };

    // Инициализируем сразу или ждем загрузки
    if (document.readyState === 'complete') {
      initAdsgram();
    } else {
      window.addEventListener('load', initAdsgram);
      return () => window.removeEventListener('load', initAdsgram);
    }
  }, [blockId]);

  // Кулдаун таймер
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownTime]);

  const handleShowAd = async () => {
    if (!adsgram || isLoading || disabled || cooldownTime > 0 || !isReady) {
      console.log('🚫 Показ рекламы заблокирован:', {
        hasAdsgram: !!adsgram,
        isLoading,
        disabled,
        cooldownTime,
        isReady
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log('📺 Показываем рекламу Adsgram...');

    try {
      await adsgram.show().then(() => {
        console.log('✅ Реклама успешно просмотрена, начисляем награду:', rewardAmount);
        onReward(rewardAmount);
        setCooldownTime(300); // 5 минут кулдаун
        
        // Тактильная обратная связь
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      }).catch((result) => {
        console.warn('⚠️ Проблема с показом рекламы:', result);
        
        switch (result?.error) {
          case 'AdBlock':
            setError('Отключите AdBlock');
            break;
          case 'TimeLimit':
            setError('Слишком часто');
            setCooldownTime(60);
            break;
          case 'NotReady':
            setError('Загружается...');
            setTimeout(() => {
              setError(null);
              setIsReady(true);
            }, 3000);
            break;
          default:
            console.error('❌ Неизвестная ошибка:', result);
            setError('Попробуйте позже');
            break;
        }
      });
    } catch (error) {
      console.error('❌ Критическая ошибка рекламы:', error);
      setError('Ошибка рекламы');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isButtonDisabled = disabled || isLoading || cooldownTime > 0 || !isReady || !adsgram;

  return (
    <div style={{ textAlign: 'center' }}>
      <button 
        onClick={handleShowAd}
        disabled={isButtonDisabled}
        style={{
          padding: '12px 20px',
          borderRadius: '10px',
          border: 'none',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
          background: isButtonDisabled 
            ? 'linear-gradient(135deg, #666, #555)' 
            : 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
          color: 'white',
          transition: 'all 0.3s ease',
          opacity: isButtonDisabled ? 0.6 : 1,
          minWidth: '180px',
          boxShadow: isButtonDisabled 
            ? 'none' 
            : '0 4px 12px rgba(255, 107, 107, 0.3)',
          transform: isLoading ? 'scale(0.95)' : 'scale(1)'
        }}
      >
        {isLoading ? (
          '🔄 Загрузка...'
        ) : cooldownTime > 0 ? (
          `⏰ ${formatTime(cooldownTime)}`
        ) : error ? (
          `⚠️ ${error}`
        ) : !isReady || !adsgram ? (
          '⏳ Подготовка...'
        ) : (
          `${buttonText} (+${rewardAmount} 💰)`
        )}
      </button>
      
      {/* Статус под кнопкой */}
      {(error || !isReady) && (
        <div style={{
          fontSize: '11px',
          color: error ? '#ff6b6b' : '#999',
          marginTop: '5px'
        }}>
          {error ? `Ошибка: ${error}` : 'Инициализация...'}
        </div>
      )}
    </div>
  );
};

export default AdsgramButton;