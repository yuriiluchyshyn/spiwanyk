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
  FiEdit,
  FiShield
} from 'react-icons/fi';
import './SongbookSettingsModal.css';
import PermissionSelect, { Permission, PermissionOption } from './PermissionSelect';

// Три рівні доступу — однаковий набір усюди, де обирають права.
const PERMISSION_OPTIONS: PermissionOption[] = [
  { value: 'view', label: 'Перегляд', icon: <FiEye /> },
  { value: 'edit', label: 'Редагування', icon: <FiEdit /> },
  { value: 'full', label: 'Повний доступ', icon: <FiShield /> }
];

interface SharedUser {
  email: string;
  permissions: Permission;
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
  // "shared" is no longer a base privacy mode — it became the independent
  // "individual access" section. Legacy 'shared' songbooks map to 'private'
  // (their access was always driven by sharedWith, which still applies).
  const [privacy, setPrivacy] = useState(
    songbook.privacy === 'shared' ? 'private' : (songbook.privacy || 'private')
  );
  const [defaultPermissions, setDefaultPermissions] = useState(songbook.defaultPermissions || 'view');
  // Nearby visibility is tied to the "Поруч" (nearby) privacy mode only.
  const [radiusMeters, setRadiusMeters] = useState(
    songbook.radiusMeters || 100 // Default 100 meters
  );
  const [sharedWith, setSharedWith] = useState<SharedUser[]>(
    songbook.sharedWith || []
  );
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPermissions, setNewUserPermissions] = useState<Permission>('view');
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

  const handlePermissionChange = (email: string, permissions: Permission) => {
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
        // Individual access is additive to any privacy mode and always saved.
        sharedWith,
        defaultPermissions,
        shareNearby: privacy === 'nearby',
        radiusMeters: privacy === 'nearby' ? radiusMeters : undefined
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
            Видимість співаника
          </h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="settings-modal-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="settings-section">
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

            {privacy === 'nearby' && (
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

            {(privacy === 'nearby' || privacy === 'public') && (
              <div className="default-permissions-section" key={privacy}>
                <h4 className="permissions-title">
                  {privacy === 'nearby'
                    ? 'Права доступу для всіх, хто поруч:'
                    : 'Права доступу для всіх користувачів платформи:'}
                </h4>
                <PermissionSelect
                  value={defaultPermissions as Permission}
                  options={PERMISSION_OPTIONS}
                  onChange={(v) => setDefaultPermissions(v)}
                  ariaLabel="Права доступу за замовчуванням"
                />
              </div>
            )}
          </div>

          <div className="settings-section settings-section--standalone">
              <h3 className="section-title">
                <FiUsers />
                Додатковий доступ окремим людям
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
                        </div>
                        <div className="shared-user-actions">
                          <PermissionSelect
                            className="perm-select--inline"
                            value={user.permissions}
                            options={PERMISSION_OPTIONS}
                            onChange={(v) => handlePermissionChange(user.email, v)}
                            ariaLabel={`Права доступу для ${user.email}`}
                          />
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
                    Співаник поки що ні з ким не поділений
                  </div>
                )}

                <div className="add-share-form">
                  <div className="add-share-inputs">
                    <input
                      type="email"
                      className="share-email-input"
                      placeholder="Введіть email користувача"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                    />
                    <PermissionSelect
                      value={newUserPermissions}
                      options={PERMISSION_OPTIONS}
                      onChange={(v) => setNewUserPermissions(v)}
                      ariaLabel="Права доступу для нового користувача"
                    />
                  </div>
                  <button
                    className="add-share-button"
                    onClick={handleAddUser}
                    disabled={!newUserEmail.trim()}
                  >
                    Додати
                  </button>
                </div>
              </div>
            </div>
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