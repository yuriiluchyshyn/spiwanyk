import React, { useState } from 'react';
import { FiX, FiLock, FiGlobe, FiUsers, FiMapPin } from 'react-icons/fi';
import './CreateSongbookModal.css';

const CreateSongbookModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    privacy: 'private'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const privacyOptions = [
    { value: 'private', label: 'Приватний', icon: FiLock, description: 'Тільки ви маєте доступ' },
    { value: 'public', label: 'Публічний', icon: FiGlobe, description: 'Всі можуть переглядати' },
    { value: 'shared', label: 'Розшарений', icon: FiUsers, description: 'Доступ за запрошенням' },
    { value: 'nearby', label: 'Поруч', icon: FiMapPin, description: 'Доступний в радіусі 500м' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.response?.data?.message || 'Помилка створення співаника');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Створити новий співаник</h2>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title">Назва співаника *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Наприклад: Мої улюблені пластові пісні"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Опис</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Короткий опис вашого співаника..."
              rows="3"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Приватність</label>
            <div className="privacy-options">
              {privacyOptions.map(option => {
                const IconComponent = option.icon;
                return (
                  <label key={option.value} className="privacy-option">
                    <input
                      type="radio"
                      name="privacy"
                      value={option.value}
                      checked={formData.privacy === option.value}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <div className="privacy-card">
                      <div className="privacy-header">
                        <IconComponent />
                        <span>{option.label}</span>
                      </div>
                      <p>{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn" disabled={loading}>
              Скасувати
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Створення...' : 'Створити співаник'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSongbookModal;