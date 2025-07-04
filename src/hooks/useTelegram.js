import { useState, useEffect, useCallback } from 'react';

export const useTelegram = () => {
  const [tgUserData, setTgUserData] = useState(null);
  const [isTgApp, setIsTgApp] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Функция получения userId
  const getUserId = useCallback(() => {
    if (isTgApp && tgUserData?.id) {
      const userId = tgUserData.id.toString();
      console.log('🆔 getUserId (Telegram):', userId);
      return userId;
    } else if (isInitialized && !isTgApp) {
      console.log('🆔 getUserId (Standalone): default');
      return 'default';
    }
    
    console.log('🆔 getUserId: null (не готов)');
    return null;
  }, [isTgApp, tgUserData?.id, isInitialized]);

  // Функция получения имени пользователя
  const getUserName = useCallback(() => {
    if (tgUserData && typeof tgUserData === 'object') {
      const name = tgUserData.first_name || 
             tgUserData.firstName || 
             tgUserData.username || 
             'Игрок';
      console.log('👤 getUserName:', name, 'из данных:', tgUserData);
      return name;
    }
    console.log('👤 getUserName: Игрок (нет данных)');
    return 'Игрок';
  }, [tgUserData]);

  // Функция для проверки доступности Telegram WebApp
  const isTelegramAvailable = useCallback(() => {
    return Boolean(window.Telegram?.WebApp);
  }, []);

  // Функция инициализации Telegram WebApp
  const initializeTelegram = useCallback(async () => {
    console.log('🚀 Инициализация Telegram WebApp...');
    
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      console.log('✅ Telegram WebApp найден');
      
      try {
        // Устанавливаем флаг, что это Telegram приложение
        setIsTgApp(true);
        
        // Получаем данные пользователя
        const userData = tg.initDataUnsafe?.user || null;
        setTgUserData(userData);
        
        // Логируем полученные данные
        if (userData) {
          console.log('👤 Данные пользователя Telegram:', {
            id: userData.id,
            first_name: userData.first_name,
            username: userData.username,
            language_code: userData.language_code
          });
          console.log('✅ tgUserData установлен:', userData);
        } else {
          console.warn('⚠️ Данные пользователя Telegram не найдены');
          console.log('🔍 tg.initDataUnsafe:', tg.initDataUnsafe);
        }
        
        // Настраиваем Telegram WebApp
        tg.ready();
        tg.expand();
        tg.BackButton.hide();
        tg.MainButton.hide();
        
        // Устанавливаем цветовую схему
        if (tg.colorScheme) {
          console.log('🎨 Цветовая схема Telegram:', tg.colorScheme);
        }
        
        // Устанавливаем заголовок
        if (tg.headerColor) {
          console.log('🎨 Цвет заголовка:', tg.headerColor);
        }
        
        // Небольшая задержка для стабилизации
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsInitialized(true);
        
        return {
          success: true,
          userData,
          userId: userData?.id?.toString() || null
        };
        
      } catch (err) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', err);
        setError(`Ошибка Telegram: ${err.message}`);
        return {
          success: false,
          error: err.message
        };
      }
    } else {
      console.log('⚠️ Telegram WebApp не найден, режим standalone');
      setIsTgApp(false);
      setIsInitialized(true);
      
      return {
        success: true,
        userData: null,
        userId: 'default',
        isStandalone: true
      };
    }
  }, []);

  // Функция для отправки хаптик фидбека
  const sendHapticFeedback = useCallback((type = 'medium') => {
    if (isTgApp && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        switch (type) {
          case 'light':
          case 'medium':
          case 'heavy':
            window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
            break;
          case 'success':
          case 'warning':
          case 'error':
            window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
            break;
          case 'selection':
            window.Telegram.WebApp.HapticFeedback.selectionChanged();
            break;
          default:
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        console.log(`📳 Haptic feedback: ${type}`);
      } catch (err) {
        console.warn('⚠️ Ошибка haptic feedback:', err);
      }
    }
  }, [isTgApp]);

  // Функция для показа главной кнопки
  const showMainButton = useCallback((text, onClick) => {
    if (isTgApp && window.Telegram?.WebApp?.MainButton) {
      const mainButton = window.Telegram.WebApp.MainButton;
      
      mainButton.text = text;
      mainButton.show();
      
      if (onClick) {
        mainButton.onClick(onClick);
      }
      
      console.log(`🔵 Main button показана: "${text}"`);
    }
  }, [isTgApp]);

  // Функция для скрытия главной кнопки
  const hideMainButton = useCallback(() => {
    if (isTgApp && window.Telegram?.WebApp?.MainButton) {
      window.Telegram.WebApp.MainButton.hide();
      console.log('🔵 Main button скрыта');
    }
  }, [isTgApp]);

  // Функция для показа кнопки "Назад"
  const showBackButton = useCallback((onClick) => {
    if (isTgApp && window.Telegram?.WebApp?.BackButton) {
      const backButton = window.Telegram.WebApp.BackButton;
      
      backButton.show();
      
      if (onClick) {
        backButton.onClick(onClick);
      }
      
      console.log('⬅️ Back button показана');
    }
  }, [isTgApp]);

  // Функция для скрытия кнопки "Назад"
  const hideBackButton = useCallback(() => {
    if (isTgApp && window.Telegram?.WebApp?.BackButton) {
      window.Telegram.WebApp.BackButton.hide();
      console.log('⬅️ Back button скрыта');
    }
  }, [isTgApp]);

  // Функция для показа всплывающего окна
  const showAlert = useCallback((message) => {
    if (isTgApp && window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  }, [isTgApp]);

  // Функция для показа подтверждения
  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      if (isTgApp && window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(message, resolve);
      } else {
        resolve(confirm(message));
      }
    });
  }, [isTgApp]);

  // Функция для закрытия приложения
  const closeApp = useCallback(() => {
    if (isTgApp && window.Telegram?.WebApp?.close) {
      window.Telegram.WebApp.close();
      console.log('🚪 Приложение закрыто');
    }
  }, [isTgApp]);

  // Функция для отправки данных в Telegram
  const sendData = useCallback((data) => {
    if (isTgApp && window.Telegram?.WebApp?.sendData) {
      try {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        window.Telegram.WebApp.sendData(dataString);
        console.log('📤 Данные отправлены в Telegram:', dataString);
      } catch (err) {
        console.error('❌ Ошибка отправки данных:', err);
      }
    }
  }, [isTgApp]);

  // Функция для открытия ссылки
  const openLink = useCallback((url, options = {}) => {
    if (isTgApp && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url, options);
    } else {
      window.open(url, '_blank');
    }
  }, [isTgApp]);

  // Функция для открытия Telegram ссылки
  const openTelegramLink = useCallback((url) => {
    if (isTgApp && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [isTgApp]);

  // Функция для получения версии Telegram WebApp
  const getWebAppVersion = useCallback(() => {
    if (isTgApp && window.Telegram?.WebApp?.version) {
      return window.Telegram.WebApp.version;
    }
    return null;
  }, [isTgApp]);

  // Функция для получения платформы
  const getPlatform = useCallback(() => {
    if (isTgApp && window.Telegram?.WebApp?.platform) {
      return window.Telegram.WebApp.platform;
    }
    return 'unknown';
  }, [isTgApp]);

  // Функция для проверки поддержки функции
  const isFeatureSupported = useCallback((feature) => {
    if (!isTgApp || !window.Telegram?.WebApp) return false;
    
    const webApp = window.Telegram.WebApp;
    
    switch (feature) {
      case 'haptic':
        return Boolean(webApp.HapticFeedback);
      case 'mainButton':
        return Boolean(webApp.MainButton);
      case 'backButton':
        return Boolean(webApp.BackButton);
      case 'popup':
        return Boolean(webApp.showPopup);
      case 'alert':
        return Boolean(webApp.showAlert);
      case 'confirm':
        return Boolean(webApp.showConfirm);
      default:
        return Boolean(webApp[feature]);
    }
  }, [isTgApp]);

  // Функция для логирования информации о Telegram WebApp
  const logTelegramInfo = useCallback(() => {
    if (isTgApp && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      console.log('📱 Информация о Telegram WebApp:', {
        version: tg.version,
        platform: tg.platform,
        colorScheme: tg.colorScheme,
        themeParams: tg.themeParams,
        isExpanded: tg.isExpanded,
        viewportHeight: tg.viewportHeight,
        viewportStableHeight: tg.viewportStableHeight,
        headerColor: tg.headerColor,
        backgroundColor: tg.backgroundColor,
        isClosingConfirmationEnabled: tg.isClosingConfirmationEnabled,
        isVersionAtLeast: (v) => tg.isVersionAtLeast(v)
      });
    }
  }, [isTgApp]);

  // Автоматическая инициализация при монтировании
  useEffect(() => {
    const autoInit = async () => {
      await initializeTelegram();
    };
    
    autoInit();
  }, [initializeTelegram]);

  // Логирование информации после инициализации
  useEffect(() => {
    if (isInitialized && isTgApp) {
      logTelegramInfo();
    }
  }, [isInitialized, isTgApp, logTelegramInfo]);

  return {
    // Состояния
    tgUserData,
    isTgApp,
    isInitialized,
    error,
    
    // Основные функции
    getUserId,
    getUserName,
    initializeTelegram,
    isTelegramAvailable,
    
    // UI функции
    sendHapticFeedback,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    showAlert,
    showConfirm,
    closeApp,
    
    // Функции взаимодействия
    sendData,
    openLink,
    openTelegramLink,
    
    // Информационные функции
    getWebAppVersion,
    getPlatform,
    isFeatureSupported,
    logTelegramInfo,
  };
};