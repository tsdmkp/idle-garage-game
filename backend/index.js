const express = require('express');
const cors = require('cors');
const app = express();

// Разрешаем запросы с фронтенда (локально и с Vercel)
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-app.vercel.app']
}));
app.use(express.json());

// Временное хранилище данных пользователей
const userData = {};

// Эндпоинт для получения состояния игры
app.get('/game_state', (req, res) => {
  const userId = req.query.userId || 'default';
  if (!userData[userId]) {
    userData[userId] = {
      player_level: 1,
      first_name: 'Игрок',
      game_coins: 1000,
      jet_coins: 0,
      current_xp: 10,
      xp_to_next_level: 100,
      last_collected_time: Date.now(),
      buildings: {},
      hired_staff: {},
      player_cars: [
        {
          id: 'car1',
          name: 'Начальная машина',
          imageUrl: '/placeholder-car.png',
          parts: {},
          stats: {
            power: 100,
            speed: 100,
            style: 50,
            reliability: 80
          }
        }
      ],
      selected_car_id: 'car1'
    };
  }
  res.json(userData[userId]);
});

// Эндпоинт для сохранения состояния игры
app.post('/game_state', (req, res) => {
  const userId = req.query.userId || 'default';
  userData[userId] = { ...userData[userId], ...req.body };
  res.json({ success: true });
});

// Эндпоинт для таблицы рекордов
app.get('/leaderboard', (req, res) => {
  const leaderboard = Object.entries(userData)
    .map(([userId, data]) => ({
      userId,
      playerName: data.first_name,
      gameCoins: data.game_coins,
      level: data.player_level
    }))
    .sort((a, b) => b.gameCoins - a.gameCoins)
    .slice(0, 100);
  res.json(leaderboard);
});

// Запуск сервера
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});