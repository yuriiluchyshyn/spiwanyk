import React, { useState, useEffect } from 'react';
import { songbooksAPI } from '../../services/api';
import { FiX, FiSearch, FiPlus, FiMusic, FiCheck } from 'react-icons/fi';
import './AddSongsModal.css';

const AddSongsModal = ({ songbook, isOpen, onClose, onSongAdded }) => {
  const [availableSongs, setAvailableSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [addingSongs, setAddingSongs] = useState(new Set());

  useEffect(() => {
    if (isOpen && songbook) {
      loadAvailableSongs();
    }
  }, [isOpen, songbook, searchQuery]);

  const loadAvailableSongs = async () => {
    if (!songbook) return;
    
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const data = await songbooksAPI.getAvailableSongs(songbook._id, params);
      setAvailableSongs(data.songs || []);
    } catch (error) {
      console.error('Error loading available songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async (song) => {
    if (addingSongs.has(song._id)) return;
    
    setAddingSongs(prev => new Set([...prev, song._id]));
    
    try {
      // Don't send sectionId if it's empty
      const sectionIdToSend = selectedSection && selectedSection.trim() ? selectedSection : undefined;
      
      await songbooksAPI.addSong(songbook._id, song._id, sectionIdToSend);
      
      // Remove song from available list
      setAvailableSongs(prev => prev.filter(s => s._id !== song._id));
      
      // Notify parent component
      if (onSongAdded) {
        onSongAdded(song, selectedSection);
      }
    } catch (error) {
      console.error('Error adding song:', error);
      alert('Помилка додавання пісні: ' + (error.response?.data?.message || error.message));
    } finally {
      setAddingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(song._id);
        return newSet;
      });
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-songs-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Додати пісні до співаника</h2>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        <div className="modal-content">
          <div className="search-section">
            <div className="search-input-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Пошук пісень..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
            
            {songbook.sections && songbook.sections.length > 0 && (
              <div className="section-selector">
                <label>Розділ:</label>
                <select 
                  value={selectedSection} 
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="section-select"
                >
                  <option value="">Без розділу</option>
                  {songbook.sections
                    .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
                    .map(section => (
                    <option key={section._id} value={section._id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="songs-list">
            {loading ? (
              <div className="loading-state">
                <FiMusic className="loading-icon" />
                <p>Завантаження пісень...</p>
              </div>
            ) : availableSongs.length === 0 ? (
              <div className="empty-state">
                <FiMusic className="empty-icon" />
                <h3>
                  {searchQuery 
                    ? 'Пісні не знайдено' 
                    : 'Всі пісні вже додані до співаника'
                  }
                </h3>
                {searchQuery && (
                  <p>Спробуйте змінити пошуковий запит</p>
                )}
              </div>
            ) : (
              availableSongs.map(song => (
                <div key={song._id} className="song-item">
                  <div className="song-info">
                    <h4 className="song-title">{song.title}</h4>
                    {song.author && (
                      <p className="song-author">{song.author}</p>
                    )}
                    {song.category && (
                      <span className="song-category">{song.category}</span>
                    )}
                    
                    {/* Метаінформація */}
                    {(song.metadata?.words || song.metadata?.music || song.metadata?.performer) && (
                      <div className="song-metadata-compact">
                        {song.metadata.performer && (
                          <span className="metadata-compact">🎤 {song.metadata.performer}</span>
                        )}
                        {song.metadata.words && song.metadata.words !== song.metadata.performer && (
                          <span className="metadata-compact">✍️ {song.metadata.words}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleAddSong(song)}
                    disabled={addingSongs.has(song._id)}
                    className="add-song-btn"
                    title="Додати пісню"
                  >
                    {addingSongs.has(song._id) ? (
                      <FiCheck className="adding-icon" />
                    ) : (
                      <FiPlus />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSongsModal;