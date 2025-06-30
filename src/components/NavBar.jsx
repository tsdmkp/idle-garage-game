// Обновите NavBar.jsx

import React from 'react';
import './NavBar.css';

function NavBar({ activeScreen, onScreenChange }) {
  const navItems = [
    { id: 'garage', icon: '🏠', label: 'Гараж' },
    { id: 'race', icon: '🏁', label: 'Гонки' },
    { id: 'shop', icon: '🛒', label: 'Магазин' },
    { id: 'staff', icon: '👥', label: 'Персонал' },
    { id: 'friends', icon: '🤝', label: 'Друзья' }, // НОВАЯ КНОПКА
    { id: 'leaderboard', icon: '🏆', label: 'Рейтинг' }
  ];

  return (
    <nav className="navbar">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${activeScreen === item.id ? 'active' : ''}`}
          onClick={() => onScreenChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default NavBar;