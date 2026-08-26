import React from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiChevronsDown } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const { settings, updateSetting } = useSettings();

  if (!user) {
    return (
      <div className="settings-page">
        <div className="settings-card settings-guest">
          <h2>Налаштування акаунта</h2>
          <p>Щоб змінювати налаштування, потрібно увійти.</p>
          <Link to="/login" className="settings-link">Увійти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-account">
          <FiUser className="settings-account-icon" />
          <div>
            <div className="settings-account-label">Ви увійшли як</div>
            <div className="settings-account-email">{user.email}</div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2 className="settings-section-title">Спільний спів</h2>

        <label className="settings-row">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <FiChevronsDown className="settings-row-icon" />
              Автопрокрутка до пісні
            </div>
            <div className="settings-row-desc">
              Коли співаник відкритий і хтось інший починає співати пісню,
              сторінка автоматично прокручується до її початку.
            </div>
          </div>

          <span className="settings-toggle">
            <input
              type="checkbox"
              checked={!!settings.autoScroll}
              onChange={(e) => updateSetting('autoScroll', e.target.checked)}
            />
            <span className="settings-toggle-track">
              <span className="settings-toggle-thumb" />
            </span>
          </span>
        </label>
      </div>
    </div>
  );
};

export default Settings;
