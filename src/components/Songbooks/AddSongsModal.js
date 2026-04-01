import React, { useState, useEffect } from 'react';
import { songbooksAPI, songsAPI } from '../../services/api';
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
      console.log('Modal opened for songbook:', songbook);
      loadAvailableSongs();
    }
  }, [isOpen, songbook, searchQuery]);

  const loadAvailableSongs = async () => {
    if (!songbook) return;
    
    setLoading(true);
    try {
      console.log('Loading available songs for songbook:', songbook._id);
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const data = await songbooksAPI.getAvailableSongs(songbook._id, params);
      console.log('Available songs response:', data);
      setAvailableSongs(data.songs || []);
    } catch (error) {
      console.error('Error loading available songs:', error);
      // Fallback: load all songs and filter out already added ones
      try {
        console.log('Fallback: loading all songs');
        const allSongs = await songsAPI.getAll();
        console.log('All songs:', allSongs);
        
        // Filter out songs that are already in the songbook
        const songbookSongIds = new Set(songbook.songs?.map(s => {
          const songId = s.song?._id || s.song;
          console.log('Songbook song ID:', songId);
          return songId;
        }) || []);
        console.log('Songbook song IDs:', Array.from(songbookSongIds));
        
        const availableSongs = allSongs.filter(song => {
          const isAlreadyAdded = songbookSongIds.has(song._id);
          console.log(`Song ${song.title} (${song._id}): already added = ${isAlreadyAdded}`);
          return !isAlreadyAdded;
        });
        
        // Apply search filter if needed
        let filteredSongs = availableSongs;
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredSongs = availableSongs.filter(song => 
            song.title?.toLowerCase().includes(query) ||
            song.author?.toLowerCase().includes(query)
          );
        }
        
        console.log('Filtered available songs:', filteredSongs);
        setAvailableSongs(filteredSongs);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setAvailableSongs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async (song) => {
    if (addingSongs.has(song._id)) return;
    
    // Check if song is already in songbook (client-side check)
    const isAlreadyAdded = songbook.songs?.some(s => {
      const songId = s.song?._id || s.song;
      return songId === song._id;
    });
    
    if (isAlreadyAdded) {
      alert(`Пісня "${song.title}" вже додана до співаника`);
      return;
    }
    
    setAddingSongs(prev => new Set([...prev, song._id]));
    
    try {
      console.log('Adding song to songbook:', { 
        songbookId: songbook._id, 
        songId: song._id, 
        sectionId: selectedSection,
        songTitle: song.title 
      });
      
      // Don't send sectionId if it's empty
      const sectionIdToSend = selectedSection && selectedSection.trim() ? selectedSection : undefined;
      
      const result = await songbooksAPI.addSong(songbook._id, song._id, sectionIdToSend);
      console.log('Add song result:', result);
      
      // Remove song from available list
      setAvailableSongs(prev => prev.filter(s => s._id !== song._id));
      
      // Notify parent component
      if (onSongAdded) {
        onSongAdded(song, selectedSection);
      }
      
      // Show success message
      console.log(`Пісню "${song.title}" успішно додано до співаника`);
      
    } catch (error) {
      console.error('Error adding song:', error);
      console.error('Error details:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
        request: error.request ? 'Request made but no response' : 'No request'
      });
      
      // More detailed error handling
      let errorMessage = 'Невідома помилка';
      
      if (error.response) {
        // Server responded with error status
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
        errorMessage = error.response.data?.message || error.response.data?.error || `Помилка сервера: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        console.log('Error request:', error.request);
        errorMessage = 'Немає відповіді від сервера. Перевірте підключення до інтернету.';
      } else {
        // Something else happened
        console.log('Error message:', error.message);
        errorMessage = error.message || 'Помилка при відправці запиту';
      }
      
      // Avoid duplicate error message prefixes
      const finalMessage = errorMessage.includes('Помилка додавання пісні') 
        ? errorMessage 
        : `Помилка додавання пісні "${song.title}": ${errorMessage}`;
      
      alert(finalMessage);
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
          <h2>
            <FiMusic className="sec-icon" />
            Додати пісні до співаника
          </h2>
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
                    ? `Пісні не знайдено за запитом "${searchQuery}"` 
                    : 'Всі пісні вже додані до співаника'
                  }
                </h3>
                {searchQuery && (
                  <p>Спробуйте змінити пошуковий запит</p>
                )}
                {!searchQuery && (
                  <p>Створіть нові пісні або видаліть деякі з поточного співаника</p>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  Знайдено {availableSongs.length} пісень
                </div>
                {availableSongs.map(song => (
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
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSongsModal;