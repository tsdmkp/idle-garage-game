import { useState } from 'react';
import './NameInputModal.css';

export default function NameInputModal({ isOpen, onSave, onClose, currentName }) {
  const [name, setName] = useState(currentName || '');

  const handleSave = () => {
    if (name.trim() && name.length <= 20) {
      onSave(name.trim());
      onClose();
    } else {
      alert('Имя должно быть от 1 до 20 символов.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Введите ваше имя</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя"
          maxLength={20}
        />
        <div className="modal-buttons">
          <button onClick={handleSave}>Сохранить</button>
          <button onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}