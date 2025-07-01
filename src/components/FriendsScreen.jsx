import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import './FriendsScreen.css';

const FriendsScreen = ({ tgUserData }) => {
  const [friendsData, setFriendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteRewards, setInviteRewards] = useState(null);

  // Генерируем реферальную ссылку
  const generateReferralLink = () => {
    if (!tgUserData?.id) return '';
    
    // ИСПРАВЛЕНО: правильный формат для Mini App без названия приложения
    const botUsername = 'GarageGame01Bot'; // Замените на ваш реальный бот
    
    // Правильный формат: https://t.me/BotUsername?startapp=ref_userID
    const link = `https://t.me/${botUsername}?startapp=ref_${tgUserData.id}`;
    console.log('🔗 Generated referral link:', link);
    return link;
  };

  // Загружаем данные о друзьях
  useEffect(() => {
    const fetchFriendsData = async () => {
      try {
        setLoading(true);
        const userId = tgUserData?.id?.toString() || 'default';
        
        console.log('👥 Loading friends data for user:', userId);
        
        const response = await apiClient('/friends', 'GET', { 
          params: { userId } 
        });
        
        console.log('👥 Friends data loaded:', response);
        console.log('📊 Total invites:', response?.total_invites);
        console.log('💰 Total earned:', response?.total_earned);
        console.log('🎁 Pending rewards:', response?.pending_rewards);
        
        setFriendsData(response);
        
        // ИСПРАВЛЕНО: более строгая проверка pending_rewards
        if (response?.pending_rewards && 
            Array.isArray(response.pending_rewards) && 
            response.pending_rewards.length > 0) {
          console.log('🎉 Found pending rewards:', response.pending_rewards);
          setInviteRewards(response.pending_rewards);
        } else {
          console.log('ℹ️ No pending rewards found');
          setInviteRewards(null);
        }
        
      } catch (err) {
        console.error('❌ Error loading friends data:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
        setError(`Не удалось загрузить данные о друзьях: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (tgUserData?.id) {
      fetchFriendsData();
    }
  }, [tgUserData?.id]);

  // Приглашаем друга через Telegram
  const handleInviteFriend = () => {
    const referralLink = generateReferralLink();
    const inviteText = `🏎️ Привет! Я играю в крутую игру "Garage Idle"! 

🎮 Тюнингуй машины, участвуй в гонках, развивай свой автосервис!

🎁 Переходи по ссылке и получи +100 монет в подарок:
${referralLink}

Увидимся на трассе! 🏁`;

    // Используем Telegram WebApp API для отправки
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(inviteText)}`
      );
    } else {
      // Fallback для браузера
      navigator.clipboard.writeText(referralLink).then(() => {
        alert('Ссылка скопирована в буфер обмена!');
      });
    }
  };

  // Копируем реферальную ссылку
  const handleCopyLink = () => {
    const referralLink = generateReferralLink();
    navigator.clipboard.writeText(referralLink).then(() => {
      alert('Ссылка скопирована!');
    }).catch(() => {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Ссылка скопирована!');
    });
  };

  // ИСПРАВЛЕНО: улучшенная функция сбора наград
  const handleClaimRewards = async () => {
    try {
      const userId = tgUserData?.id?.toString() || 'default';
      
      console.log('🎁 Attempting to claim rewards for user:', userId);
      console.log('📋 Current pending rewards:', inviteRewards);
      
      // ИСПРАВЛЕНО: добавляем проверку перед отправкой запроса
      if (!inviteRewards || !Array.isArray(inviteRewards) || inviteRewards.length === 0) {
        console.log('⚠️ No pending rewards to claim');
        alert('ℹ️ Нет наград для получения');
        return;
      }
      
      const response = await apiClient('/friends/claim', 'POST', {
        body: { userId }
      });
      
      console.log('🎁 Server response:', response);
      
      // ИСПРАВЛЕНО: более надежная проверка ответа
      if (response && typeof response === 'object') {
        const coinsEarned = response.total_coins || response.coins || 0;
        const message = response.message || '';
        
        console.log('💰 Coins earned:', coinsEarned);
        console.log('📢 Server message:', message);
        
        if (coinsEarned > 0) {
          setInviteRewards(null);
          
          // Обновляем данные
          const updatedData = await apiClient('/friends', 'GET', { 
            params: { userId } 
          });
          setFriendsData(updatedData);
          
          alert(`🎉 Получено ${coinsEarned} монет за приглашения!`);
        } else {
          alert(`ℹ️ ${message || 'Нет новых наград для получения'}`);
          console.log('⚠️ No rewards to claim or already claimed');
          
          // Все равно обновляем данные
          const updatedData = await apiClient('/friends', 'GET', { 
            params: { userId } 
          });
          setFriendsData(updatedData);
          setInviteRewards(null);
        }
      } else {
        console.error('❌ Invalid response format:', response);
        alert('❌ Ошибка: неверный формат ответа сервера');
      }
      
    } catch (err) {
      console.error('❌ Error claiming rewards:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      
      // ИСПРАВЛЕНО: более детальная обработка ошибок
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Неизвестная ошибка';
      
      alert(`❌ Ошибка при получении наград: ${errorMessage}`);
    }
  };

  // Определяем уровень реферера
  const getReferrerLevel = (friendsCount) => {
    if (friendsCount >= 50) return { name: 'Легенда', icon: '👑', color: '#ffd700' };
    if (friendsCount >= 25) return { name: 'Мастер', icon: '⭐', color: '#ff6b6b' };
    if (friendsCount >= 10) return { name: 'Эксперт', icon: '🔥', color: '#ff9800' };
    if (friendsCount >= 5) return { name: 'Новатор', icon: '🚀', color: '#4caf50' };
    if (friendsCount >= 1) return { name: 'Друг', icon: '👥', color: '#2196f3' };
    return { name: 'Новичок', icon: '👤', color: '#9e9e9e' };
  };

  if (loading) {
    return (
      <div className="friends-screen">
        <div className="friends-loading">
          <div className="loading-icon">👥</div>
          <div>Загрузка друзей...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="friends-screen">
        <div className="friends-error">
          <div>⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  const referrerLevel = getReferrerLevel(friendsData?.total_invites || 0);
  const nextLevelTarget = friendsData?.total_invites >= 50 ? null : 
    friendsData?.total_invites >= 25 ? 50 :
    friendsData?.total_invites >= 10 ? 25 :
    friendsData?.total_invites >= 5 ? 10 :
    friendsData?.total_invites >= 1 ? 5 : 1;

  return (
    <div className="friends-screen">
      <div className="friends-content">
        
        {/* Заголовок */}
        <div className="friends-header">
          <h2>👥 Пригласи друзей</h2>
          <p>Получай награды за каждого приглашенного друга!</p>
        </div>

        {/* Статус реферера */}
        <div className="referrer-status">
          <div className="referrer-badge" style={{ borderColor: referrerLevel.color }}>
            <span className="referrer-icon">{referrerLevel.icon}</span>
            <span className="referrer-name" style={{ color: referrerLevel.color }}>
              {referrerLevel.name}
            </span>
          </div>
          <div className="referrer-stats">
            <div className="stat">
              <span className="stat-number">{friendsData?.total_invites || 0}</span>
              <span className="stat-label">Друзей приглашено</span>
            </div>
            <div className="stat">
              <span className="stat-number">{friendsData?.total_earned || 0}</span>
              <span className="stat-label">Монет заработано</span>
            </div>
          </div>
          {nextLevelTarget && (
            <div className="next-level">
              До следующего уровня: {nextLevelTarget - (friendsData?.total_invites || 0)} друзей
            </div>
          )}
        </div>

        {/* ИСПРАВЛЕНО: более строгая проверка для отображения кнопки наград */}
        {inviteRewards && Array.isArray(inviteRewards) && inviteRewards.length > 0 && (
          <div className="pending-rewards">
            <h3>🎁 Новые награды!</h3>
            <div className="rewards-list">
              {inviteRewards.map((reward, index) => (
                <div key={index} className="reward-item">
                  <span>👤 {reward.friend_name || 'Друг'}</span>
                  <span>💰 +{reward.coins || reward.reward_coins || 200} GC</span>
                </div>
              ))}
            </div>
            <button className="claim-rewards-btn" onClick={handleClaimRewards}>
              Получить {inviteRewards.reduce((sum, r) => sum + (r.coins || r.reward_coins || 200), 0)} монет
            </button>
          </div>
        )}

        {/* Кнопки приглашения */}
        <div className="invite-section">
          <div className="invite-info">
            <div className="invite-benefit">
              <span className="benefit-icon">🎁</span>
              <div className="benefit-text">
                <strong>+200 монет</strong> за каждого друга
              </div>
            </div>
            <div className="invite-benefit">
              <span className="benefit-icon">💰</span>
              <div className="benefit-text">
                <strong>+100 монет</strong> другу в подарок
              </div>
            </div>
          </div>
          
          <div className="invite-buttons">
            <button className="invite-btn primary" onClick={handleInviteFriend}>
              📤 Пригласить друга
            </button>
            <button className="invite-btn secondary" onClick={handleCopyLink}>
              📋 Скопировать ссылку
            </button>
          </div>
        </div>

        {/* Таблица наград */}
        <div className="rewards-table">
          <h3>🏆 Награды за приглашения</h3>
          <div className="rewards-grid">
            {[
              { friends: 1, reward: '200 GC', icon: '👤', unlocked: (friendsData?.total_invites || 0) >= 1 },
              { friends: 5, reward: '1,000 GC + машина', icon: '🚗', unlocked: (friendsData?.total_invites || 0) >= 5 },
              { friends: 10, reward: '3,000 GC + деталь', icon: '🔧', unlocked: (friendsData?.total_invites || 0) >= 10 },
              { friends: 25, reward: '10,000 GC + скин', icon: '🎨', unlocked: (friendsData?.total_invites || 0) >= 25 },
              { friends: 50, reward: 'Легендарная машина', icon: '👑', unlocked: (friendsData?.total_invites || 0) >= 50 },
            ].map((milestone) => (
              <div 
                key={milestone.friends}
                className={`reward-milestone ${milestone.unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="milestone-icon">{milestone.icon}</div>
                <div className="milestone-text">
                  <div className="milestone-target">{milestone.friends} друзей</div>
                  <div className="milestone-reward">{milestone.reward}</div>
                </div>
                {milestone.unlocked && <div className="milestone-check">✅</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Список друзей */}
        {friendsData?.friends && friendsData.friends.length > 0 && (
          <div className="friends-list">
            <h3>👥 Ваши друзья ({friendsData.friends.length})</h3>
            <div className="friends-grid">
              {friendsData.friends.map((friend, index) => (
                <div key={friend.user_id || index} className="friend-card">
                  <div className="friend-avatar">
                    {friend.first_name ? friend.first_name[0].toUpperCase() : '?'}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{friend.first_name || 'Аноним'}</div>
                    <div className="friend-date">
                      {new Date(friend.joined_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div className="friend-reward">+200 GC</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Если друзей еще нет */}
        {(!friendsData?.friends || friendsData.friends.length === 0) && (
          <div className="no-friends">
            <div className="no-friends-icon">😢</div>
            <div className="no-friends-text">
              <h3>Пока никого не пригласили</h3>
              <p>Начните приглашать друзей и получайте награды!</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FriendsScreen;