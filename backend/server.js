const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Проверка переменных окружения
console.log('Environment variables:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[hidden]' : 'undefined');

// Настройка PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false // Требуется для Render
  },
  max: 20, // Максимальное количество соединений
  idleTimeoutMillis: 30000, // Время простоя соединения
  connectionTimeoutMillis: 5000 // Таймаут подключения
});

// Проверка подключения к базе
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
    console.error('Connection details:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });
    return;
  }
  console.log('Successfully connected to database');
  release();
});

app.use(cors());
app.use(express.json());

// Маршрут /game_state (GET)
app.get('/game_state', async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({});
    }
  } catch (err) {
    console.error('Error fetching game state:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Маршрут /game_state (POST)
app.post('/game_state', async (req, res) => {
  const { userId, first_name, game_coins, last_collected_time, buildings, player_cars, hired_staff, selected_car_id, current_xp, jet_coins, player_level, xp_to_next_level, income_rate_per_hour } = req.body;
  try {
    await pool.query(
      `INSERT INTO users (user_id, first_name, game_coins, last_collected_time, buildings, player_cars, hired_staff, selected_car_id, current_xp, jet_coins, player_level, xp_to_next_level, income_rate_per_hour)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (user_id)
       DO UPDATE SET
         first_name = EXCLUDED.first_name,
         game_coins = EXCLUDED.game_coins,
         last_collected_time = EXCLUDED.last_collected_time,
         buildings = EXCLUDED.buildings,
         player_cars = EXCLUDED.player_cars,
         hired_staff = EXCLUDED.hired_staff,
         selected_car_id = EXCLUDED.selected_car_id,
         current_xp = EXCLUDED.current_xp,
         jet_coins = EXCLUDED.jet_coins,
         player_level = EXCLUDED.player_level,
         xp_to_next_level = EXCLUDED.xp_to_next_level,
         income_rate_per_hour = EXCLUDED.income_rate_per_hour`,
      [userId, first_name, game_coins, last_collected_time, buildings, player_cars, hired_staff, selected_car_id, current_xp, jet_coins, player_level, xp_to_next_level, income_rate_per_hour]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving game state:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Маршрут /leaderboard
app.get('/leaderboard', async (req, res) => {
  const { userId } = req.query;
  try {
    // Проверяем наличие столбца income_rate_per_hour
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'income_rate_per_hour'
    `);
    if (columnCheck.rows.length === 0) {
      console.error('Column income_rate_per_hour does not exist in users table');
      return res.status(500).json({ error: 'Database schema error: missing income_rate_per_hour column' });
    }

    // Получаем топ-10 игроков
    const topPlayersResult = await pool.query(
      'SELECT user_id, first_name, income_rate_per_hour FROM users WHERE income_rate_per_hour IS NOT NULL ORDER BY income_rate_per_hour DESC LIMIT 10'
    );

    // Получаем место текущего игрока
    let currentPlayer = null;
    if (userId) {
      const rankResult = await pool.query(
        `SELECT user_id, first_name, income_rate_per_hour, (
           SELECT COUNT(*) + 1
           FROM users u2
           WHERE u2.income_rate_per_hour > u1.income_rate_per_hour
         ) as rank
         FROM users u1
         WHERE u1.user_id = $1 AND u1.income_rate_per_hour IS NOT NULL`,
        [userId]
      );
      if (rankResult.rows.length > 0) {
        currentPlayer = rankResult.rows[0];
      }
    }

    res.json({
      topPlayers: topPlayersResult.rows,
      currentPlayer
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err.stack);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});