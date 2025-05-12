import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient'; // Изменено с './apiClient' на '../apiClient'
import './LeaderboardScreen.css';

function LeaderboardScreen({ tgUserData }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      const userId = tgUserData?.id?.toString() || 'default';
      const data = await apiClient('/leaderboard', 'GET', { params: { userId } });
      setLeaderboard(Array.isArray(data.topPlayers) ? data.topPlayers : []);
      setCurrentPlayer(data.currentPlayer || null);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err.message);
      setError('Не удалось загрузить таблицу рекордов');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const intervalId = setInterval(fetchLeaderboard, 30000); // Обновление каждые 30 секунд
    return () => clearInterval(intervalId);
  }, [tgUserData]);

  if (isLoading) {
    return <div className="loading-screen">Загрузка таблицы рекордов...</div>;
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Ошибка</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-screen">
      <h2>Таблица рекордов</h2>
      {currentPlayer && (
        <div className="current-player">
          Вы: #{currentPlayer.rank} ({currentPlayer.first_name || 'Игрок'}, {currentPlayer.income_rate_per_hour.toLocaleString()} /ч)
        </div>
      )}
      {leaderboard.length === 0 ? (
        <p>Нет данных для отображения</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Место</th>
              <th>Игрок</th>
              <th>Доход/ч</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => (
              <tr key={player.user_id}>
                <td>{index + 1}</td>
                <td>{player.first_name || 'Игрок'}</td>
                <td>{player.income_rate_per_hour.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default LeaderboardScreen;