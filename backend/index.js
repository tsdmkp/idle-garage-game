const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Временно для тестов

const userData = {};

app.get('/game_state', (req, res) => {
  const userId = req.query.userId || 'default';
  if (!userData[userId]) {
    userData[userId] = {
      player_level: 1,
      first_name: 'Игрок',
      game_coins: 100000, // Синхронизировано с STARTING_COINS
      jet_coins: 0,
      current_xp: 10,
      xp_to_next_level: 100,
      last_collected_time: Date.now(),
      buildings: [
        { id: 'wash', name: 'Автомойка', level: 1, icon: '🧼', isLocked: false },
        { id: 'service', name: 'Сервис', level: 0, icon: '🔧', isLocked: false },
        { id: 'tires', name: 'Шиномонтаж', level: 0, icon: '🔘', isLocked: true },
        { id: 'drift', name: 'Шк. Дрифта', level: 0, icon: '🏫', isLocked: true }
      ],
      hired_staff: { mechanic: 0, manager: 0 },
      player_cars: [
        {
          id: 'car_001',
          name: 'Ржавая "Копейка"',
          imageUrl: '/placeholder-car.png',
          parts: {
            engine: { level: 1, name: 'Двигатель' },
            tires: { level: 0, name: 'Шины' },
            style_body: { level: 0, name: 'Кузов (Стиль)' },
            reliability_base: { level: 1, name: 'Надежность (База)' }
          },
          stats: {
            power: 45, // 40 + 1*5
            speed: 70,
            style: 5,
            reliability: 30 // 25 + 1*5
          }
        }
      ],
      selected_car_id: 'car_001'
    };
  }
  res.json(userData[userId]);
});

app.listen(3000, () => console.log('Server running on port 3000'));