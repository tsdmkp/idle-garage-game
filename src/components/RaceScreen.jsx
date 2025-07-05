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

  console.log('🏁 RaceScreen props:', {
    playerCar: playerCar?.name,
    propsFuelCount,
    propsLastRaceTime,
    propsFuelRefillTime,
    onFuelUpdate: typeof onFuelUpdate === 'function',
    onFuelRefillByAd: typeof onFuelRefillByAd === 'function'
  });

  // Список рандомных имен соперников
  const opponentNames = [
    'Дрифт-Кинг', 'Нитро-Нарк', 'Скорость-Демон', 'Турбо-Тайфун', 'Пламя-Дорог',
    'Асфальт-Ас', 'Резина-Рев', 'Мотор-Маньяк', 'Педаль-Призрак', 'Карбон-Кайф',
    'Вираж-Воин', 'Старт-Сталкер', 'Финиш-Фантом', 'Трасса-Титан', 'Гонка-Гений',
    'Шина-Шторм', 'Поршень-Принц', 'Выхлоп-Вампир', 'Руль-Рейдер', 'Спидометр-Сатана'
  ];

  // Список всех доступных машин для соперника
  const availableOpponentCars = [
    '/placeholder-car.png',
    '/placeholder-car-2.png',
    '/placeholder-car-3.png',
    '/placeholder-car-4.png',
    '/placeholder-car-5.png',
    '/placeholder-car-6.png'
  ];

  // Получение рандомного имени соперника
  const getRandomOpponentName = () => {
    return opponentNames[Math.floor(Math.random() * opponentNames.length)];
  };

  // Функция для получения случайной машины соперника
  const getRandomOpponentCar = () => {
    const randomIndex = Math.floor(Math.random() * availableOpponentCars.length);
    return availableOpponentCars[randomIndex];
  };

  // ВСЕ СОСТОЯНИЯ В ОДНОМ МЕСТЕ
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [raceState, setRaceState] = useState('ready');
  const [countdown, setCountdown] = useState(0);
  const [raceResult, setRaceResult] = useState(null);
  const [winStreak, setWinStreak] = useState(0);
  const [totalRaces, setTotalRaces] = useState(0);
  const [wins, setWins] = useState(0);
  const [opponentName, setOpponentName] = useState(getRandomOpponentName());
  const [opponentCarImage, setOpponentCarImage] = useState(getRandomOpponentCar());
  const [showResultModal, setShowResultModal] = useState(false);
  const [fuelCount, setFuelCount] = useState(propsFuelCount || 5);
  const [lastRaceTime, setLastRaceTime] = useState(propsLastRaceTime);
  const [fuelRefillTime, setFuelRefillTime] = useState(propsFuelRefillTime);
  const [adsgramReady, setAdsgramReady] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  
  const playerCarRef = useRef(null);
  const opponentCarRef = useRef(null);

  // Константы топливной системы
  const MAX_FUEL = 5;
  const FUEL_REFILL_HOUR = 60 * 60 * 1000; // 1 час в миллисекундах

  // Обновление имени соперника и машины при смене сложности
  useEffect(() => {
    setOpponentName(getRandomOpponentName());
    setOpponentCarImage(getRandomOpponentCar());
  }, [selectedDifficulty]);

  // Синхронизация с пропсами от App.jsx
  useEffect(() => {
    console.log('🔄 Синхронизация топлива с App.jsx:', {
      propsFuelCount,
      propsLastRaceTime,
      propsFuelRefillTime
    });
    
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
            if (window.Adsgram && typeof window.Adsgram.init === 'function') {
              console.log('🚀 Инициализируем Adsgram...');
              
              const debugMode = false;
              console.log('🔧 Debug mode:', debugMode);
              
              const adsgramController = window.Adsgram.init({
                blockId: "12355",
                debug: debugMode,
                debugBannerType: "RewardedVideo"
              });
              
              window.adsgramController = adsgramController;
              
              if (adsgramController && typeof adsgramController.addEventListener === 'function') {
                adsgramController.addEventListener('onReward', () => {
                  console.log('🎁 Adsgram onReward event');
                });
                
                adsgramController.addEventListener('onError', (error) => {
                  console.log('❌ Adsgram onError:', error);
                });
              }
              
              setAdsgramReady(true);
              console.log('✅ Adsgram успешно инициализирован');
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

    loadAdsgram();

    return () => {
      const script = document.querySelector('script[src*="sad.min.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  // Проверка восстановления топлива
  const checkFuelRefill = () => {
    const now = Date.now();
    const refillTime = fuelRefillTime || (lastRaceTime ? lastRaceTime + FUEL_REFILL_HOUR : null);
    
    if (refillTime && now >= refillTime && fuelCount < MAX_FUEL) {
      console.log('⛽ Топливо должно быть восстановлено!');
      const newFuelCount = MAX_FUEL;
      const newLastRaceTime = now;
      
      setFuelCount(newFuelCount);
      setLastRaceTime(newLastRaceTime);
      setFuelRefillTime(null);
      
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
  }, [fuelCount, lastRaceTime, fuelRefillTime, onFuelUpdate]);

  // Сохранение данных топлива через App.jsx
  const saveFuelData = (newFuelCount, newLastRaceTime, newRefillTime = null) => {
    console.log('💾 Обновляем данные топлива через App.jsx:', {
      fuel: newFuelCount,
      lastRace: new Date(newLastRaceTime).toLocaleString(),
      refillTime: newRefillTime ? new Date(newRefillTime).toLocaleString() : 'нет'
    });
    
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

  // Упрощенный показ рекламы - ПРЯМО ИЗ КНОПКИ
  const showAdForFuelDirect = async () => {
    console.log('⛽ Прямой показ рекламы для восстановления топлива...');
    
    setIsAdLoading(true);

    try {
      if (!window.adsgramController) {
        console.warn('❌ AdController не найден, используем мок');
        showMockAdDirect();
        return;
      }
      
      console.log('🎬 Показываем настоящую Adsgram рекламу...');
      
      const result = await window.adsgramController.show();
      
      console.log('✅ Adsgram реклама успешно просмотрена!', result);
      
      handleFuelRestore();
      
    } catch (error) {
      console.log('⏭️ Adsgram реклама была пропущена или ошибка:', error);
      
      showMockAdDirect();
    } finally {
      setIsAdLoading(false);
    }
  };

  // Упрощенная моковая реклама
  const showMockAdDirect = () => {
    console.log('🎭 Показываем упрощенную моковую рекламу...');
    
    setTimeout(() => {
      const watchAd = window.confirm('🎥 [ТЕСТ] Реклама загружена!\n\nПросмотреть рекламу за восстановление топлива?');
      
      if (watchAd) {
        setTimeout(() => {
          console.log('✅ Моковая реклама просмотрена');
          handleFuelRestore();
        }, 1500);
      } else {
        console.log('⏭️ Моковая реклама пропущена');
        alert('📺 Для заправки нужно досмотреть рекламу до конца');
      }
      
      setIsAdLoading(false);
    }, 800);
  };

  // Восстановление топлива после рекламы
  const handleFuelRestore = () => {
    const now = Date.now();
    const newFuelCount = MAX_FUEL;
    const newLastRaceTime = now;
    
    setFuelCount(newFuelCount);
    setLastRaceTime(newLastRaceTime);
    setFuelRefillTime(null);
    
    if (onFuelRefillByAd) {
      onFuelRefillByAd();
    }
    
    alert('⛽ Топливный бак заправлен!\nМожете продолжать гонки!');
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.no