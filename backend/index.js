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
      game_coins: 1000,
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
            power: 45,
            speed: 70,
            style: 5,
            reliability: 30
          }
        }
      ],
      selected_car_id: 'car_001'
    };
  }
  res.json(userData[userId]);
});

app.post('/game_state', (req, res) => {
  const userId = req.query.userId || 'default';
  const updates = req.body;
  if (!userData[userId]) {
    return res.status(404).json({ message: 'User not found' });
  }
  userData[userId] = {
    ...userData[userId],
    ...updates,
    buildings: updates.buildings || userData[userId].buildings,
    player_cars: updates.player_cars || userData[userId].player_cars,
    hired_staff: updates.hired_staff || userData[userId].hired_staff,
    selected_car_id: updates.selected_car_id || userData[userId].selected_car_id,
    last_collected_time: updates.last_collected_time || userData[userId].last_collected_time
  };
  console.log(`Updated user state for ${userId}:`, userData[userId]);
  res.json(userData[userId]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));