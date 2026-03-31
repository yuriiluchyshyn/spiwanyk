import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiMusic, FiUser, FiLogOut, FiHome, FiBook, FiList } from 'react-icons/fi';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <FiMusic />
          <span>Пластовий Співаник</span>
        </Link>
        
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
              <Link to="/my-songbooks" className="nav-link">
                <FiBook />
                <span>Мої співаники</span>
              </Link>
              <Link to="/playlist" className="nav-link">
                <FiList />
                <span>Збірка</span>
              </Link>
              <div className="user-menu">
                <span className="user-email">
                  <FiUser />
                  {user.email}
                </span>
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
    </header>
  );
};

export default Header;