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
  const [sdkStatus, setSdkStatus] = useState('loading'); // loading, loaded, failed

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 15; // Увеличиваем количество попыток
    let timeoutId;

    const checkSDK = () => {
      console.log(`🔍 Проверка Adsgram SDK, попытка ${retryCount + 1}/${maxRetries}`);
      
      // Проверяем наличие window.Adsgram
      if (window.Adsgram) {
        console.log('✅ Adsgram SDK найден!');
        initAdsgram();
        return;
      }
      
      // Проверяем есть ли скрипт в DOM
      const script = document.querySelector('script[src*="adsgram"]');
      if (script) {
        console.log('📜 Adsgram скрипт найден в DOM, ждем загрузки...');
      } else {
        console.warn('⚠️ Adsgram скрипт НЕ найден в DOM!');
      }
      
      retryCount++;
      
      if (retryCount < maxRetries) {
        // Увеличиваем интервал с каждой попыткой
        const delay = Math.min(1000 + (retryCount * 500), 5000);
        timeoutId = setTimeout(checkSDK, delay);
      } else {
        console.error('❌ Adsgram SDK не загрузился после всех попыток');
        setSdkStatus('failed');
        setError('SDK не загружен');
        
        // Попробуем загрузить SDK принудительно
        loadSDKManually();
      }
    };

    const initAdsgram = () => {
      try {
        if (!blockId) {
          throw new Error('Block ID не указан');
        }
        
        console.log('🚀 Инициализируем Adsgram с Block ID:', blockId);
        const adsgramInstance = window.Adsgram.init({ 
          blockId: blockId,
          debug: true // Включаем debug для диагностики
        });
        
        setAdsgram(adsgramInstance);
        setIsReady(true);
        setSdkStatus('loaded');
        setError(null);
        console.log('✅ Adsgram успешно инициализирован');
        
      } catch (error) {
        console.error('❌ Ошибка инициализации Adsgram:', error);
        setError('Ошибка инициализации');
        setSdkStatus('failed');
      }
    };

    const loadSDKManually = () => {
      console.log('🔧 Попытка принудительной загрузки Adsgram SDK...');
      
      // Удаляем старый скрипт если есть
      const existingScript = document.querySelector('script[src*="adsgram"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Создаем новый скрипт
      const script = document.createElement('script');
      script.src = 'https://sad.adsgram.ai/js/adsgram.min.js';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Adsgram SDK загружен принудительно');
        setSdkStatus('loaded');
        // Небольшая задержка для инициализации
        setTimeout(() => {
          if (window.Adsgram) {
            initAdsgram();
          }
        }, 100);
      };
      
      script.onerror = () => {
        console.error('❌ Не удалось загрузить Adsgram SDK принудительно');
        setSdkStatus('failed');
        setError('Не удалось загрузить SDK');
      };
      
      document.head.appendChild(script);
    };

    // Начинаем проверку
    setSdkStatus('loading');
    checkSDK();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
        isReady,
        sdkStatus
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
            alert('⚠️ Отключите блокировщик рекламы для получения награды');
            break;
          case 'TimeLimit':
            setError('Слишком часто');
            setCooldownTime(60);
            alert('⏰ Слишком частые показы. Попробуйте через минуту.');
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

  const getButtonContent = () => {
    if (isLoading) return '🔄 Загрузка...';
    if (cooldownTime > 0) return `⏰ ${formatTime(cooldownTime)}`;
    if (error) return `⚠️ ${error}`;
    if (sdkStatus === 'loading') return '⏳ Загрузка SDK...';
    if (sdkStatus === 'failed') return '❌ SDK недоступен';
    if (!isReady || !adsgram) return '⏳ Подготовка...';
    return `${buttonText} (+${rewardAmount} 💰)`;
  };

  const isButtonDisabled = disabled || isLoading || cooldownTime > 0 || 
                          !isReady || !adsgram || sdkStatus !== 'loaded';

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
        {getButtonContent()}
      </button>
      
      {/* Статус под кнопкой */}
      <div style={{
        fontSize: '11px',
        color: '#999',
        marginTop: '5px'
      }}>
        {sdkStatus === 'loading' && 'Загрузка Adsgram SDK...'}
        {sdkStatus === 'failed' && 'Ошибка загрузки SDK'}
        {sdkStatus === 'loaded' && isReady && 'Готов к показу рекламы'}
        {error && `Ошибка: ${error}`}
      </div>

      {/* Кнопка диагностики (только для debug) */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={() => {
            console.log('🔍 Диагностика Adsgram:', {
              windowAdsgram: !!window.Adsgram,
              adsgramInstance: !!adsgram,
              isReady,
              sdkStatus,
              error,
              blockId
            });
          }}
          style={{
            marginTop: '5px',
            padding: '5px 10px',
            fontSize: '10px',
            background: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          🔍 Диагностика
        </button>
      )}
    </div>
  );
};

export default AdsgramButton;