import React, { useState } from 'react';
import { 
  FiSettings, 
  FiX, 
  FiEye, 
  FiUsers, 
  FiLock, 
  FiGlobe, 
  FiMapPin,
  FiMail,
  FiLoader,
  FiEdit
} from 'react-icons/fi';
import './SongbookSettingsModal.css';

interface SharedUser {
  email: string;
  permissions: 'view' | 'edit';
  sharedAt?: string;
}

interface SongbookSettingsModalProps {
  songbook: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: {
    privacy: string;
    sharedWith: SharedUser[];
    defaultPermissions?: string;
    shareNearby?: boolean;
    radiusMeters?: number;
  }) => Promise<void>;
}

const SongbookSettingsModal: React.FC<SongbookSettingsModalProps> = ({
  songbook,
  isOpen,
  onClose,
  onSave
}) => {
  const [privacy, setPrivacy] = useState(songbook.privacy || 'private');
  const [defaultPermissions, setDefaultPermissions] = useState(songbook.defaultPermissions || 'view');
  // Nearby visibility is independent of the privacy mode, so a songbook can be
  // shared by email and still be discoverable at the campfire.
  const [shareNearby, setShareNearby] = useState(
    songbook.shareNearby ?? songbook.privacy === 'nearby'
  );
  const [radiusMeters, setRadiusMeters] = useState(
    songbook.radiusMeters || 100 // Default 100 meters
  );
  const [sharedWith, setSharedWith] = useState<SharedUser[]>(
    songbook.sharedWith || []
  );
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPermissions, setNewUserPermissions] = useState<'view' | 'edit'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  // Helper function to format radius display text
  const formatRadius = (meters: number): string => {
    return `${meters} м`;
  };

  // Convert slider value (0-100) to radius in meters (10m to 1000m)
  const sliderToRadius = (sliderValue: number): number => {
    // Linear scale: 10m (0) to 1000m (100)
    const minRadius = 10;
    const maxRadius = 1000;
    const rawValue = minRadius + (maxRadius - minRadius) * (sliderValue / 100);
    // Round to nearest 10 for better user experience
    return Math.round(rawValue / 10) * 10;
  };

  // Convert radius in meters to slider value (0-100)
  const radiusToSlider = (meters: number): number => {
    const minRadius = 10;
    const maxRadius = 1000;
    const clampedMeters = Math.max(minRadius, Math.min(maxRadius, meters));
    return Math.round(((clampedMeters - minRadius) / (maxRadius - minRadius)) * 100);
  };

  const handleRadiusChange = (sliderValue: number) => {
    const newRadius = sliderToRadius(sliderValue);
    setRadiusMeters(newRadius);
  };

  const privacyOptions = [
    {
      value: 'private',
      title: 'Приватний',
      description: 'Тільки ви маєте доступ до цього співаника',
      icon: <FiLock />
    },
    {
      value: 'shared',
      title: 'Розшарений',
      description: 'Доступний конкретним людям за email адресами',
      icon: <FiUsers />
    },
    {
      value: 'nearby',
      title: 'Поруч',
      description: 'Видимий людям у вашій географічній близькості',
      icon: <FiMapPin />
    },
    {
      value: 'public',
      title: 'Публічний',
      description: 'Доступний всім користувачам платформи',
      icon: <FiGlobe />
    }
  ];

  const handleAddUser = () => {
    if (!newUserEmail.trim()) {
      setError('Введіть email адресу');
      return;
    }

    if (!newUserEmail.includes('@')) {
      setError('Введіть коректну email адресу');
      return;
    }

    if (sharedWith.some(user => user.email.toLowerCase() === newUserEmail.toLowerCase())) {
      setError('Цей користувач вже має доступ');
      return;
    }

    const newUser: SharedUser = {
      email: newUserEmail.trim().toLowerCase(),
      permissions: newUserPermissions
    };

    setSharedWith([...sharedWith, newUser]);
    setNewUserEmail('');
    setNewUserPermissions('view');
    setError('');
  };

  const handleRemoveUser = (email: string) => {
    setSharedWith(sharedWith.filter(user => user.email !== email));
  };

  const handlePermissionChange = (email: string, permissions: 'view' | 'edit') => {
    setSharedWith(sharedWith.map(user => 
      user.email === email ? { ...user, permissions } : user
    ));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await onSave({
        privacy,
        sharedWith: privacy !== 'private' ? sharedWith : [],
        defaultPermissions,
        shareNearby: privacy === 'private' ? false : shareNearby,
        radiusMeters: (privacy === 'nearby' || shareNearby) ? radiusMeters : undefined
      });
      
      // Показуємо спінер 2 секунди, потім закриваємо модал
      setTimeout(() => {
        setIsLoading(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Помилка збереження налаштувань');
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="settings-modal-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">
            <FiSettings />
            Налаштування співаника
          </h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="settings-modal-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="settings-section">
            <h3 className="section-title">
              <FiEye />
              Видимість співаника
            </h3>
            <div className="privacy-options">
              {privacyOptions.map((option) => (
                <label 
                  key={option.value}
                  className={`privacy-option ${privacy === option.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value={option.value}
                    checked={privacy === option.value}
                    onChange={(e) => {
                      setPrivacy(e.target.value);
                      setNewUserEmail('');
                      setNewUserPermissions('view');
                    }}
                  />
                  <div className="privacy-option-content">
                    <div className="privacy-option-title">
                      {option.icon}
                      {option.title}
                    </div>
                    <div className="privacy-option-description">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {privacy !== 'private' && privacy !== 'nearby' && (
              <label className="nearby-toggle">
                <input
                  type="checkbox"
                  checked={shareNearby}
                  onChange={(e) => setShareNearby(e.target.checked)}
                />
                <span className="nearby-toggle-content">
                  <span className="nearby-toggle-title">
                    <FiMapPin />
                    Показувати також людям поблизу
                  </span>
                  <span className="nearby-toggle-description">
                    Співаник побачать ті, хто зараз біля вас, додатково до вибраного режиму
                  </span>
                </span>
              </label>
            )}

            {(privacy === 'nearby' || shareNearby) && (
              <div className="radius-section">
                <div className="radius-header">
                  <FiMapPin />
                  <span className="radius-title">Радіус видимості: {formatRadius(radiusMeters)}</span>
                </div>
                <div className="radius-slider-container">
                  <input
                    type="range"
                    className="radius-slider"
                    min="0"
                    max="100"
                    step="1"
                    value={radiusToSlider(radiusMeters)}
                    onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                  />
                  <div className="radius-labels">
                    <span className="radius-label-min">10 м</span>
                    <span className="radius-label-max">1000 м</span>
                  </div>
                </div>
                <div className="radius-description">
                  Співаник будуть бачити люди в радіусі {formatRadius(radiusMeters)} від вашого місцезнаходження
                </div>
              </div>
            )}
          </div>

          {(privacy === 'shared' || privacy === 'nearby' || privacy === 'public') && (
            <div className="settings-section">
              <h3 className="section-title">
                <FiUsers />
                Доступ користувачів
              </h3>

              <div className="shared-users-section">
                {sharedWith.length > 0 ? (
                  <div className="shared-users-list">
                    {sharedWith.map((user) => (
                      <div key={user.email} className="shared-user">
                        <div className="shared-user-info">
                          <div className="shared-user-email">
                            <FiMail style={{ marginRight: '6px', fontSize: '14px' }} />
                            {user.email}
                          </div>
                          <div className="shared-user-permissions">
                            {user.permissions === 'view' ? (
                              <>
                                <FiEye style={{ marginRight: '4px' }} />
                                Тільки перегляд
                              </>
                            ) : (
                              <>
                                <FiEdit style={{ marginRight: '4px' }} />
                                Може редагувати
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shared-user-actions">
                          <select
                            className="permission-select"
                            value={user.permissions}
                            onChange={(e) => 
                              handlePermissionChange(user.email, e.target.value as 'view' | 'edit')
                            }
                          >
                            <option value="view">Перегляд</option>
                            <option value="edit">Редагування</option>
                          </select>
                          <button
                            className="remove-share-button"
                            onClick={() => handleRemoveUser(user.email)}
                          >
                            <FiX />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-shared-users">
                    {privacy === 'shared' 
                      ? 'Співаник поки що ні з ким не поділений'
                      : 'Поки що немає користувачів зі спеціальними правами'
                    }
                  </div>
                )}

                <div className="add-share-form">
                  {privacy === 'shared' ? (
                    // Для розшарених співаників - можна додавати нових користувачів
                    <>
                      <div className="add-share-inputs">
                        <input
                          type="email"
                          className="share-email-input"
                          placeholder="Введіть email користувача"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                        />
                        <select
                          className="share-permission-select"
                          value={newUserPermissions}
                          onChange={(e) => setNewUserPermissions(e.target.value as 'view' | 'edit')}
                        >
                          <option value="view">Тільки перегляд</option>
                          <option value="edit">Може редагувати пісні</option>
                        </select>
                      </div>
                      <button
                        className="add-share-button"
                        onClick={handleAddUser}
                        disabled={!newUserEmail.trim()}
                      >
                        Додати
                      </button>
                    </>
                  ) : (
                    // Для публічних та nearby співаників - глобальні права доступу
                    <div className="default-permissions-section">
                      <h4 className="permissions-title">
                        Права доступу для всіх користувачів:
                      </h4>
                      <select
                        className="default-permissions-select"
                        value={defaultPermissions}
                        onChange={(e) => setDefaultPermissions(e.target.value as 'view' | 'edit')}
                      >
                        <option value="view">Тільки перегляд</option>
                        <option value="edit">Можуть редагувати пісні</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-modal-actions">
          <button className="cancel-button" onClick={onClose} disabled={isLoading}>
            Скасувати
          </button>
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <FiLoader className="spinning-loader" />
            ) : (
              'Зберегти'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongbookSettingsModal;