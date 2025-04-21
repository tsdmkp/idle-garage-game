import React from 'react';
import './NavBar.css'; // Стили

// Принимает текущий активный экран и обработчик клика
function NavBar({ activeScreen, onNavClick }) {
  // Список элементов навигации (можно вынести в константы)
  const navItems = [
    { id: 'garage', icon: '🚗', label: 'Гараж' }, // Гараж - это наш главный экран
    { id: 'race', icon: '🏁', label: 'Гонки' },
    { id: 'shop', icon: '🛒', label: 'Магазин' },
    { id: 'staff', icon: '👥', label: 'Персонал' },
    { id: 'p2e', icon: '💎', label: 'P2E' }, // Или Турниры/Кошелек
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