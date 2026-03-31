import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { songbooksAPI } from '../../services/api';
import { FiPlus, FiBook, FiUsers, FiLock, FiGlobe, FiMapPin, FiEdit, FiTrash2 } from 'react-icons/fi';
import CreateSongbookModal from './CreateSongbookModal';
import './MySongbooks.css';

const MySongbooks = () => {
  const [songbooks, setSongbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadSongbooks();
  }, []);

  const loadSongbooks = async () => {
    try {
      const data = await songbooksAPI.getMy();
      setSongbooks(data);
    } catch (error) {
      console.error('Error loading songbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSongbook = async (songbookData) => {
    try {
      await songbooksAPI.create(songbookData);
      setShowCreateModal(false);
      loadSongbooks();
    } catch (error) {
      console.error('Error creating songbook:', error);
      throw error;
    }
  };

  const handleDeleteSongbook = async (id) => {
    if (window.confirm('Ви впевнені, що хочете видалити цей співаник?')) {
      try {
        await songbooksAPI.delete(id);
        loadSongbooks();
      } catch (error) {
        console.error('Error deleting songbook:', error);
      }
    }
  };

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'private': return <FiLock />;
      case 'public': return <FiGlobe />;
      case 'shared': return <FiUsers />;
      case 'nearby': return <FiMapPin />;
      default: return <FiLock />;
    }
  };

  const getPrivacyText = (privacy) => {
    switch (privacy) {
      case 'private': return 'Приватний';
      case 'public': return 'Публічний';
      case 'shared': return 'Розшарений';
      case 'nearby': return 'Поруч';
      default: return 'Приватний';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <FiBook className="loading-icon" />
        <p>Завантаження співаників...</p>
      </div>
    );
  }

  return (
    <div className="my-songbooks">
      <div className="songbooks-header">
        <h1>Мої співаники</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="create-btn"
        >
          <FiPlus />
          Створити співаник
        </button>
      </div>

      {songbooks.length === 0 ? (
        <div className="empty-state">
          <FiBook className="empty-icon" />
          <h3>У вас ще немає співаників</h3>
          <p>Створіть свій перший співаник, щоб почати збирати улюблені пісні</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="create-btn primary"
          >
            <FiPlus />
            Створити перший співаник
          </button>
        </div>
      ) : (
        <div className="songbooks-grid">
          {songbooks.map(songbook => (
            <div key={songbook._id} className="songbook-card">
              <div className="songbook-header">
                <div className="privacy-badge">
                  {getPrivacyIcon(songbook.privacy)}
                  <span>{getPrivacyText(songbook.privacy)}</span>
                </div>
                <div className="songbook-actions">
                  <Link 
                    to={`/songbooks/${songbook._id}/edit`}
                    className="action-btn edit"
                    title="Редагувати"
                  >
                    <FiEdit />
                  </Link>
                  <button 
                    onClick={() => handleDeleteSongbook(songbook._id)}
                    className="action-btn delete"
                    title="Видалити"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
              
              <Link to={`/songbooks/${songbook._id}`} className="songbook-content">
                <h3>{songbook.title}</h3>
                {songbook.description && (
                  <p className="songbook-description">{songbook.description}</p>
                )}
                
                <div className="songbook-stats">
                  <span>{songbook.songs?.length || 0} пісень</span>
                  <span>{songbook.sections?.length || 0} розділів</span>
                </div>
                
                {songbook.sections && songbook.sections.length > 0 && (
                  <div className="sections-preview">
                    {songbook.sections.slice(0, 3).map(section => (
                      <span key={section._id} className="section-tag">
                        {section.name}
                      </span>
                    ))}
                    {songbook.sections.length > 3 && (
                      <span className="section-tag more">
                        +{songbook.sections.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateSongbookModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSongbook}
        />
      )}
    </div>
  );
};

export default MySongbooks;