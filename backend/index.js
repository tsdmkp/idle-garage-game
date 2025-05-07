require('dotenv').config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-Telegram-Init-Data'],
  credentials: true
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Failed to connect to PostgreSQL:', err));

app.get('/game_state', async (req, res) => {
  const userId = req.query.userId || 'default';
  try {
    console.log('Fetching game state for userId:', userId);
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    console.log('Query result:', result.rows);
    let userData = result.rows[0];

    if (!userData) {
      console.log('No user found, creating default data');
      const defaultData = {
        user_id: userId,
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
      await pool.query(
        'INSERT INTO users (user_id, player_level, first_name, game_coins, jet_coins, current_xp, xp_to_next_level, last_collected_time, buildings, hired_staff, player_cars, selected_car_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12)',
        [
          defaultData.user_id,
          defaultData.player_level,
          defaultData.first_name,
          defaultData.game_coins,
          defaultData.jet_coins,
          defaultData.current_xp,
          defaultData.xp_to_next_level,
          defaultData.last_collected_time,
          JSON.stringify(defaultData.buildings), // Сериализуем в JSON
          JSON.stringify(defaultData.hired_staff),
          JSON.stringify(defaultData.player_cars),
          defaultData.selected_car_id
        ]
      );
      userData = defaultData;
      console.log('Inserted default data:', userData);
    }
    res.json(userData);
  } catch (err) {
    console.error('Error fetching game state:', err);
    res.status(500).