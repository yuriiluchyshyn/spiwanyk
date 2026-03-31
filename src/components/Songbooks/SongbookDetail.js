import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { songbooksAPI } from '../../services/api';
import { useSongbook } from '../../contexts/SongbookContext';
import { useAuth } from '../../contexts/AuthContext';
import { FiArrowLeft, FiPlay, FiPlus, FiUsers, FiLock, FiGlobe, FiMapPin, FiMusic, FiSettings, FiTrash2, FiMove } from 'react-icons/fi';
import AddSongsModal from './AddSongsModal';
import SectionManager from './SectionManager';
import './SongbookDetail.css';

const SongbookDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [songbook, setSongbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [draggedSong, setDraggedSong] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const { addToPlaylist, playNow } = useSongbook();

  console.log('SongbookDetail - Current user:', user);

  useEffect(() => {
    const loadSongbook = async () => {
      try {
        const data = await songbooksAPI.getById(id);
        console.log('Loaded songbook:', data);
        setSongbook(data);
      } catch (error) {
        console.error('Error loading songbook:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSongbook();
  }, [id]);

  const loadSongbook = async () => {
    try {
      const data = await songbooksAPI.getById(id);
      setSongbook(data);
    } catch (error) {
      console.error('Error loading songbook:', error);
    }
  };

  const canEdit = () => {
    if (!songbook || !user) {
      console.log('canEdit: false - missing songbook or user', { songbook: !!songbook, user: !!user });
      return false;
    }
    
    const ownerId = songbook.owner?._id || songbook.owner;
    const userId = user._id;
    const isOwner = ownerId === userId || ownerId?.toString() === userId?.toString();
    
    console.log('canEdit check:', { 
      ownerId, 
      userId, 
      isOwner,
      songbookOwner: songbook.owner,
      currentUser: user
    });
    
    return isOwner;
  };

  const handleSongAdded = () => {
    // Reload songbook to get updated data
    loadSongbook();
  };

  const handleSectionAdded = () => {
    // Reload songbook to get updated sections
    loadSongbook();
  };

  const handleSectionRemoved = () => {
    // Reload songbook to get updated sections
    loadSongbook();
  };

  const handleRemoveSong = async (songId) => {
    if (!window.confirm('Видалити пісню зі співаника?')) return;
    
    try {
      await songbooksAPI.removeSong(songbook._id, songId);
      loadSongbook(); // Reload to get updated data
    } catch (error) {
      console.error('Error removing song:', error);
      alert('Помилка видалення пісні: ' + (error.response?.data?.message || error.message));
    }
  };

  // Drag & Drop functions
  const handleDragStart = (e, song) => {
    setDraggedSong(song);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(sectionId);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = async (e, targetSectionId) => {
    e.preventDefault();
    setDragOverSection(null);
    
    if (!draggedSong) return;
    
    const currentSectionId = draggedSong.sectionId;
    
    // Don't do anything if dropped on the same section
    if (currentSectionId === targetSectionId) {
      setDraggedSong(null);
      return;
    }
    
    try {
      // Remove song from current position
      await songbooksAPI.removeSong(songbook._id, draggedSong._id);
      
      // Add song to new section
      const sectionIdToSend = targetSectionId === 'no-section' ? undefined : targetSectionId;
      await songbooksAPI.addSong(songbook._id, draggedSong._id, sectionIdToSend);
      
      // Reload songbook
      loadSongbook();
      
    } catch (error) {
      console.error('Error moving song:', error);
      alert('Помилка переміщення пісні: ' + (error.response?.data?.message || error.message));
    }
    
    setDraggedSong(null);
  };

  const handleDragEnd = () => {
    setDraggedSong(null);
    setDragOverSection(null);
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

  const getFilteredSongs = () => {
    if (!songbook?.songs) return [];
    
    // Songs are populated as {song: {...}, section: ..., order: ...}
    // Extract the actual song objects
    const songs = songbook.songs
      .map(s => s.song ? { ...s.song, sectionId: s.section, _songbookEntry: s } : null)
      .filter(Boolean);
    
    if (activeSection === 'all') {
      return songs;
    }
    
    return songs.filter(song => 
      song.sectionId && song.sectionId.toString() === activeSection
    );
  };

  const handlePlayNow = (song) => {
    playNow(song);
  };

  const handleAddToPlaylist = (song) => {
    addToPlaylist(song);
  };

  const handlePlayAll = () => {
    const songs = getFilteredSongs();
    songs.forEach((song, index) => {
      if (index === 0) {
        playNow(song);
      } else {
        addToPlaylist(song);
      }
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <FiMusic className="loading-icon" />
        <p>Завантаження співаника...</p>
      </div>
    );
  }

  if (!songbook) {
    return (
      <div className="error">
        <h2>Співаник не знайдено</h2>
        <Link to="/my-songbooks" className="back-link">
          <FiArrowLeft />
          Повернутися до співаників
        </Link>
      </div>
    );
  }

  const filteredSongs = getFilteredSongs();

  return (
    <div className="songbook-detail">
      <div className="songbook-header">
        <Link to="/my-songbooks" className="back-link">
          <FiArrowLeft />
          Назад до співаників
        </Link>
        
        <div className="songbook-info">
          <div className="songbook-title-section">
            <h1>{songbook.title}</h1>
            {songbook.description && (
              <p className="songbook-description">{songbook.description}</p>
            )}
            <div className="songbook-meta">
              <div className="privacy-badge">
                {getPrivacyIcon(songbook.privacy)}
                <span>{getPrivacyText(songbook.privacy)}</span>
              </div>
              <span className="owner">від {songbook.owner?.email || ''}</span>
            </div>
          </div>
          
          <div className="songbook-actions">
            {filteredSongs.length > 0 && (
              <button onClick={handlePlayAll} className="play-all-btn">
                <FiPlay />
                Грати все ({filteredSongs.length})
              </button>
            )}
            
            {/* Завжди показувати кнопки для тестування */}
            <button 
              onClick={() => setShowAddSongs(true)} 
              className="add-songs-btn"
            >
              <FiPlus />
              Додати пісні
            </button>
            <button 
              onClick={() => setShowSectionManager(!showSectionManager)} 
              className="manage-sections-btn"
            >
              <FiSettings />
              Розділи
            </button>
          </div>
        </div>
      </div>

      <div className="songbook-content">
        {showSectionManager && (
          <SectionManager
            songbook={songbook}
            onSectionAdded={handleSectionAdded}
            onSectionRemoved={handleSectionRemoved}
            canEdit={true}
          />
        )}

        {songbook.sections && songbook.sections.length > 0 && (
          <div className="sections-nav">
            <button 
              className={`section-btn ${activeSection === 'all' ? 'active' : ''} ${dragOverSection === 'all' ? 'drag-over' : ''}`}
              onClick={() => setActiveSection('all')}
              onDragOver={(e) => handleDragOver(e, 'no-section')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'no-section')}
            >
              Всі пісні ({songbook.songs?.length || 0})
            </button>
            {songbook.sections
              .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
              .map(section => (
              <button 
                key={section._id}
                className={`section-btn ${activeSection === section._id ? 'active' : ''} ${dragOverSection === section._id ? 'drag-over' : ''}`}
                onClick={() => setActiveSection(section._id)}
                onDragOver={(e) => handleDragOver(e, section._id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, section._id)}
              >
                {section.name} ({songbook.songs?.filter(s => s.section && s.section.toString() === section._id.toString()).length || 0})
              </button>
            ))}
          </div>
        )}

        <div className="songs-list">
          {filteredSongs.length === 0 ? (
            <div className="empty-section">
              <FiMusic className="empty-icon" />
              <h3>
                {activeSection === 'all' 
                  ? 'У цьому співанику ще немає пісень' 
                  : 'У цьому розділі ще немає пісень'
                }
              </h3>
              {activeSection === 'all' && (
                <button 
                  onClick={() => setShowAddSongs(true)} 
                  className="add-first-song-btn"
                >
                  <FiPlus />
                  Додати першу пісню
                </button>
              )}
            </div>
          ) : (
            filteredSongs.map((song, index) => (
              <div 
                key={song._id} 
                className={`song-item ${draggedSong?._id === song._id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, song)}
                onDragEnd={handleDragEnd}
              >
                <div className="song-number">
                  {index + 1}
                </div>
                
                <div className="song-info">
                  <Link to={`/songs/${song._id}`} className="song-title">
                    {song.title}
                  </Link>
                  {song.author && (
                    <p className="song-author">{song.author}</p>
                  )}
                  
                  {/* Метаінформація */}
                  {(song.metadata?.performer || song.metadata?.words) && (
                    <div className="song-metadata-inline">
                      {song.metadata.performer && (
                        <span className="metadata-inline">🎤 {song.metadata.performer}</span>
                      )}
                      {song.metadata.words && song.metadata.words !== song.metadata.performer && (
                        <span className="metadata-inline">✍️ {song.metadata.words}</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="song-actions">
                  <button 
                    className="action-btn drag"
                    title="Перетягнути до розділу"
                  >
                    <FiMove />
                  </button>
                  <button 
                    onClick={() => handlePlayNow(song)}
                    className="action-btn play"
                    title="Грати зараз"
                  >
                    <FiPlay />
                  </button>
                  <button 
                    onClick={() => handleAddToPlaylist(song)}
                    className="action-btn add"
                    title="Додати до плейлиста"
                  >
                    <FiPlus />
                  </button>
                  <button 
                    onClick={() => handleRemoveSong(song._id)}
                    className="action-btn remove"
                    title="Видалити зі співаника"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddSongs && (
        <AddSongsModal
          songbook={songbook}
          isOpen={showAddSongs}
          onClose={() => setShowAddSongs(false)}
          onSongAdded={handleSongAdded}
        />
      )}
    </div>
  );
};

export default SongbookDetail;