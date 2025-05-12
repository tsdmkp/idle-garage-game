import React from 'react';
import './NavBar.css'; // Стили

// Принимает текущий активный экран и обработчик клика
function NavBar({ activeScreen, onNavClick }) {
  // Список элементов навигации
  const navItems = [
    { id: 'garage', icon: '🚗', label: 'Гараж' },
    { id: 'race', icon: '🏁', label: 'Гонки' },
    { id: 'shop', icon: '🛒', label: 'Автосалон' },
    { id: 'staff', icon: '👥', label: 'Персонал' },
    { id: 'leaderboard', icon: '🏆', label: 'Рекорды' },
    { id: 'p2e', icon: '💎', label: 'P2E' },
  ];

  return (
    <nav className="navbar">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeScreen === item.id ? 'active' : ''}`}
          onClick={() => onNavClick(item.id)} // Вызываем обработчик с ID экрана
          title={item.label} // Подсказка для десктопа
        >
          <div className="nav-icon">{item.icon}</div>
          <div className="nav-label">{item.label}</div>
        </button>
      ))}
    </nav>
  );
}

export default NavBar;