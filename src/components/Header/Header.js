import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiMusic, FiUser, FiLogOut, FiHome, FiSettings, FiArrowLeft } from 'react-icons/fi';
import NowSingingBar from '../NowSinging/NowSingingBar';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Кнопка "Назад" не потрібна на головній та сторінці входу.
  const canGoBack = location.pathname !== '/' && location.pathname !== '/login';

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link to="/" className="logo">
            <FiMusic />
            <span className="logo-text">
              <span className="logo-name">Кантичка</span>
              <span className="logo-tagline">Давай співати</span>
            </span>
          </Link>
          {canGoBack && (
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate(-1)}
              title="Назад"
              aria-label="Повернутися на попередню сторінку"
            >
              <FiArrowLeft />
            </button>
          )}
        </div>
        
        <nav className="nav">
          {user ? (
            <>
              <Link to="/" className="nav-link">
                <FiHome />
                <span>Головна</span>
              </Link>
              <Link to="/songs" className="nav-link">
                <FiMusic />
                <span>Пісні</span>
              </Link>
              <div className="user-menu">
                <Link to="/settings" className="user-email" title="Налаштування акаунта">
                  <FiUser />
                  {user.email}
                </Link>
                <Link to="/settings" className="nav-link settings-link" title="Налаштування">
                  <FiSettings />
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  <FiLogOut />
                  <span>Вийти</span>
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="nav-link">
              <FiUser />
              <span>Увійти</span>
            </Link>
          )}
        </nav>
      </div>

      {user && <NowSingingBar className="header-singing" />}
    </header>
  );
};

export default Header;
