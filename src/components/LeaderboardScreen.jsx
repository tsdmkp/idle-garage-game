import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';

const LeaderboardScreen = ({ tgUserData }) => {
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const userId = tgUserData?.id?.toString() || 'default';
        const fetchLeaderboard = async () => {
            try {
                console.log('Fetching leaderboard for userId:', userId);
                const data = await apiClient('/leaderboard', 'GET', { params: { userId } });
                console.log('LeaderboardScreen: Fetched data:', data);
                setLeaderboardData(data.top_players || []);
                setCurrentPlayer(data.current_player || null);
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
                setError('Не удалось загрузить таблицу рекордов.');
            }
        };
        fetchLeaderboard();
    }, [tgUserData]);

    if (error) {
        return <div className="leaderboard-error">{error}</div>;
    }

    if (!leaderboardData) {
        return <div className="leaderboard-loading">Загрузка...</div>;
    }

    return (
        <div className="leaderboard-screen">
            <h2>Таблица рекордов</h2>
            {leaderboardData.length === 0 ? (
                <div>Нет данных для отображения</div>
            ) : (
                <div className="leaderboard-list">
                    {leaderboardData.map((player, index) => (
                        <div key={player.user_id} className="leaderboard-item">
                            #{index + 1} {player.first_name}: {player.income_rate_per_hour || 0}/ч
                        </div>
                    ))}
                </div>
            )}
            {currentPlayer ? (
                <div className="current-player">
                    Вы: {currentPlayer.first_name} - {currentPlayer.income_rate_per_hour || 0}/ч (Ранг #{currentPlayer.rank})
                </div>
            ) : (
                <div className="current-player">Вы не в таблице рекордов</div>
            )}
        </div>
    );
};

export default LeaderboardScreen;