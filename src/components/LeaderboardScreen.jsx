import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import './LeaderboardScreen.css';

const LeaderboardScreen = ({ tgUserData }) => {
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Определяем userId правильно
                const userId = tgUserData?.id?.toString() || 'default';
                console.log('🏆 Fetching leaderboard for userId:', userId);
                
                const data = await apiClient('/leaderboard', 'GET', { params: { userId } });
                console.log('🏆 LeaderboardScreen: Fetched data:', data);
                
                setLeaderboardData(data.top_players || []);
                setCurrentPlayer(data.current_player || null);
            } catch (err) {
                console.error('❌ Error fetching leaderboard:', err);
                if (err.message.includes('404')) {
                    setError('Эндпоинт таблицы лидеров пока не реализован на сервере');
                } else {
                    setError('Не удалось загрузить таблицу рекордов');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [tgUserData?.id]); // Зависимость только от ID

    if (loading) {
        return (
            <div className="leaderboard-screen">
                <div className="leaderboard-loading">
                    <div>🏆</div>
                    <div>Загрузка таблицы лидеров...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="leaderboard-screen">
                <h2>Таблица рекордов</h2>
                <div className="leaderboard-error">
                    <div>⚠️</div>
                    <div>{error}</div>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{
                            marginTop: '10px',
                            padding: '10px 20px',
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard-screen">
            <h2>🏆 Таблица рекордов</h2>
            
            {leaderboardData && leaderboardData.length > 0 ? (
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Место</th>
                            <th>Игрок</th>
                            <th>Доход/час</th>
                            <th>Уровень</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboardData.map((player, index) => (
                            <tr 
                                key={player.user_id || index}
                                className={player.user_id === tgUserData?.id?.toString() ? 'current-player-row' : ''}
                            >
                                <td>
                                    {index + 1 <= 3 ? (
                                        <span style={{ fontSize: '1.2em' }}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                        </span>
                                    ) : (
                                        `#${index + 1}`
                                    )}
                                </td>
                                <td>{player.first_name || 'Аноним'}</td>
                                <td>{player.income_rate_per_hour || 0} GC/ч</td>
                                <td>{player.player_level || 1}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="leaderboard-empty">
                    <div>📊</div>
                    <div>Пока нет данных для отображения</div>
                    <div style={{ fontSize: '0.9em', opacity: 0.7, marginTop: '10px' }}>
                        Начните играть, чтобы попасть в рейтинг!
                    </div>
                </div>
            )}

            {currentPlayer ? (
                <div className="current-player">
                    <div style={{ fontSize: '1.1em', marginBottom: '5px' }}>
                        <strong>Ваша позиция</strong>
                    </div>
                    <div>
                        {currentPlayer.first_name || 'Вы'} - {currentPlayer.income_rate_per_hour || 0} GC/ч
                    </div>
                    <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                        Ранг #{currentPlayer.rank || '?'}
                    </div>
                </div>
            ) : (
                <div className="current-player">
                    <div>🎯 Вы пока не в таблице рекордов</div>
                    <div style={{ fontSize: '0.9em', opacity: 0.7, marginTop: '5px' }}>
                        Улучшайте свой гараж, чтобы попасть в топ!
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaderboardScreen;