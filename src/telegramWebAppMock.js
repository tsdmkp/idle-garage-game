// src/telegramWebAppMock.js

// Этот код будет выполнен ТОЛЬКО в режиме разработки и ТОЛЬКО если Telegram WebApp еще не существует.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !window.Telegram) {
  console.log('🛠️ [MOCK] ПОПЫТКА ИНИЦИАЛИЗАЦИИ МОКА Telegram WebApp...');

  const mockUserId = 1234567; // Убедитесь, что это ЧИСЛО
  const mockFirstName = 'LocalDev';
  const mockLastName = 'User';
  const mockUsername = 'localdev';
  const mockLanguageCode = 'en';
  const mockAuthDate = Math.floor(Date.now() / 1000); // Текущее время в секундах
  const mockHash = 'mock_test_hash_12345'; // Произвольный хэш для мока

  // Внутреннее хранилище для имитации событий
  const eventListeners = {};

  // Функция для имитации вызова событий (для отладки/тестирования)
  const triggerMockEvent = (eventType, data) => {
    if (eventListeners[eventType]) {
      eventListeners[eventType].forEach(cb => {
        if (typeof cb === 'function') {
          cb(data);
        }
      });
      console.log(`✅ [MOCK] Событие ${eventType} имитировано.`);
    }
  };

  // Формируем user-объект, как он приходит от Telegram.WebApp.initDataUnsafe.user
  const userObject = {
    id: mockUserId,
    first_name: mockFirstName,
    last_name: mockLastName,
    username: mockUsername,
    language_code: mockLanguageCode,
    is_premium: true // Можно добавить и другие поля, если нужно
  };

  // Формируем initData строку, как она приходит от Telegram.WebApp.initData
  // JSON.stringify(userObject) превращает объект в строку JSON.
  // encodeURIComponent кодирует эту строку, чтобы она была безопасна для URL.
  const initDataString = `query_id=MOCK_QUERY_ID&user=${encodeURIComponent(JSON.stringify(userObject))}&auth_date=${mockAuthDate}&hash=${mockHash}`;

  // Устанавливаем глобальный объект Telegram
  window.Telegram = {
    WebApp: {
      initData: initDataString,
      initDataUnsafe: {
        query_id: 'MOCK_QUERY_ID',
        user: userObject, // Здесь используем уже готовый userObject
        auth_date: mockAuthDate,
        hash: mockHash
      },
      // Минимально необходимые методы, чтобы избежать ошибок "function not found"
      ready: () => console.log('✅ [MOCK] WebApp.ready() called'),
      expand: () => console.log('✅ [MOCK] WebApp.expand() called'),
      close: () => console.log('✅ [MOCK] WebApp.close() called'),

      // --- ДОБАВЛЕННЫЕ МЕТОДЫ onEvent И offEvent ---
      onEvent: (eventType, callback) => {
        if (!eventListeners[eventType]) {
          eventListeners[eventType] = [];
        }
        eventListeners[eventType].push(callback);
        console.log(`✅ [MOCK] Подписка на событие: ${eventType}`);
      },
      offEvent: (eventType, callback) => {
        if (eventListeners[eventType]) {
          eventListeners[eventType] = eventListeners[eventType].filter(cb => cb !== callback);
          console.log(`✅ [MOCK] Отписка от события: ${eventType}`);
        }
      },
      // ---------------------------------------------

      MainButton: { // Добавляем заглушки для MainButton
        isVisible: false, text: '',
        show: () => { console.log('Mock MainButton show'); }, hide: () => { console.log('Mock MainButton hide'); },
        setText: (txt) => { console.log('Mock MainButton setText:', txt); }, onClick: (cb) => { console.log('Mock MainButton onClick'); }
      },
      BackButton: { // Добавляем заглушки для BackButton
        isVisible: false,
        show: () => { console.log('Mock BackButton show'); }, hide: () => { console.log('Mock BackButton hide'); },
        onClick: (cb) => { console.log('Mock BackButton onClick'); }
      }
      // Добавьте сюда другие используемые свойства или методы Telegram WebApp, если они нужны.
    }
  };
  
  console.log('✅ [MOCK] Telegram.WebApp mock УСТАНОВЛЕН. Проверка значений:');
  console.log('✅ [MOCK] window.Telegram.WebApp.initData:', window.Telegram.WebApp.initData);
  console.log('✅ [MOCK] window.Telegram.WebApp.initDataUnsafe.user:', window.Telegram.WebApp.initDataUnsafe.user);

  // Для отладки можно добавить глобальную функцию для имитации событий из консоли
  window.triggerTelegramMockEvent = triggerMockEvent;

} else {
    // Этот блок покажет, почему мок НЕ загрузился
    if (typeof window !== 'undefined' && window.Telegram) {
        console.log('⚠️ [MOCK] Telegram WebApp уже существует, мок НЕ загружен.');
    } else if (process.env.NODE_ENV !== 'development') {
        console.log('⚠️ [MOCK] Не режим разработки (NODE_ENV !== "development"), мок НЕ загружен.');
    } else {
        console.log('⚠️ [MOCK] Не удалось загрузить мок по неизвестной причине (возможно, window не определен).');
    }
}