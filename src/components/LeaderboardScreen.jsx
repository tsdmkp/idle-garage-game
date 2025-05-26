import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import './LeaderboardScreen.css';

function LeaderboardScreen({ tgUserData }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLeaderboard = async () => {
        try {
            const userId = tgUserData?.id?.toString() || 'default';
            const data = await apiClient(`/leaderboard?userId=${userId}`, 'GET');
            // Адаптация к текущему формату ответа (просто массив)
            const leaderboardData = Array.isArray(data) ? data : [];
            // Сортировка по income_rate_per_hour (по убыванию)
            const sortedLeaderboard = leaderboardData.sort((a, b) => (b.income_rate_per_hour || 0) - (a.income_rate_per_hour || 0));
            setLeaderboard(sortedLeaderboard);
            // Находим текущего игрока в массиве
            const current = sortedLeaderboard.find(player => player.user_id === userId) || null;
            setCurrentPlayer(current);
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
                    Вы: #{leaderboard.findIndex(p => p.user_id === currentPlayer.user_id) + 1} ({currentPlayer.first_name || 'Игрок'}, {currentPlayer.income_rate_per_hour.toLocaleString()}/ч)
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
                            <th>Доход в час</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((player, index) => (
                            <tr key={player.user_id}>
                                <td>{index + 1}</td>
                                <td>{player.first_name || 'Игрок'}</td>
                                <td>{player.income_rate_per_hour.toLocaleString()}/ч</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default LeaderboardScreen;