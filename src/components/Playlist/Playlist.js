import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSongbook } from '../../contexts/SongbookContext';
import { FiTrash2, FiMusic, FiEye, FiEyeOff, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import FormattedSong from '../Songs/FormattedSong';
import './Playlist.css';

const Playlist = () => {
  const { 
    currentPlaylist, 
    removeFromPlaylist, 
    setCurrentPlaylist 
  } = useSongbook();
  
  const [expandedSongs, setExpandedSongs] = useState(new Set());
  const [showChords, setShowChords] = useState(false);

  const toggleSongExpansion = (songId) => {
    const newExpanded = new Set(expandedSongs);
    if (newExpanded.has(songId)) {
      newExpanded.delete(songId);
    } else {
      newExpanded.add(songId);
    }
    setExpandedSongs(newExpanded);
  };

  const handleRemoveSong = (songId) => {
    removeFromPlaylist(songId);
  };

  const handleClearPlaylist = () => {
    if (window.confirm('Очистити всю збірку для співу?')) {
      setCurrentPlaylist([]);
      setExpandedSongs(new Set());
    }
  };

  const moveUp = (index) => {
    if (index > 0) {
      const newPlaylist = [...currentPlaylist];
      [newPlaylist[index], newPlaylist[index - 1]] = [newPlaylist[index - 1], newPlaylist[index]];
      setCurrentPlaylist(newPlaylist);
    }
  };

  const moveDown = (index) => {
    if (index < currentPlaylist.length - 1) {
      const newPlaylist = [...currentPlaylist];
      [newPlaylist[index], newPlaylist[index + 1]] = [newPlaylist[index + 1], newPlaylist[index]];
      setCurrentPlaylist(newPlaylist);
    }
  };

  return (
    <div className="playlist campfire-mode">
      <div className="playlist-header">
        <div className="playlist-info">
          <h1>🔥 Збірка для співу</h1>
          <p>{currentPlaylist.length} пісень готові для вогнища</p>
        </div>
        
        <div className="playlist-controls">
          {currentPlaylist.length > 0 && (
            <>
              <label className="chords-toggle">
                <input 
                  type="checkbox" 
                  checked={showChords} 
                  onChange={(e) => setShowChords(e.target.checked)} 
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Акорди</span>
              </label>
              
              <button onClick={handleClearPlaylist} className="clear-btn">
                <FiTrash2 />
                Очистити
              </button>
            </>
          )}
        </div>
      </div>

      <div className="playlist-content campfire-content">
        {currentPlaylist.length === 0 ? (
          <div className="empty-playlist">
            <div className="campfire-icon">🔥</div>
            <h3>Збірка для співу порожня</h3>
            <p>Додайте пісні зі співаників, щоб почати співати біля вогнища</p>
            <Link to="/my-songbooks" className="browse-songs-btn">
              📚 Переглянути співаники
            </Link>
          </div>
        ) : (
          <div className="campfire-songs">
            {currentPlaylist.map((song, index) => (
              <div 
                key={`${song._id}-${index}`} 
                className={`campfire-song ${expandedSongs.has(song._id) ? 'expanded' : 'collapsed'}`}
              >
                <div className="song-header" onClick={() => toggleSongExpansion(song._id)}>
                  <div className="song-number">{index + 1}</div>
                  <div className="song-info">
                    <h3 className="song-title">{song.title}</h3>
                    {song.author && (
                      <p className="song-author">{song.author}</p>
                    )}
                  </div>
                  <div className="song-controls">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        moveUp(index);
                      }}
                      disabled={index === 0}
                      className="move-btn"
                      title="Перемістити вгору"
                    >
                      <FiArrowUp />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDown(index);
                      }}
                      disabled={index === currentPlaylist.length - 1}
                      className="move-btn"
                      title="Перемістити вниз"
                    >
                      <FiArrowDown />
                    </button>
                    <button 
                      className="expand-btn"
                      title={expandedSongs.has(song._id) ? "Згорнути" : "Розгорнути"}
                    >
                      {expandedSongs.has(song._id) ? <FiEyeOff /> : <FiEye />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSong(song._id);
                      }}
                      className="remove-btn"
                      title="Видалити зі збірки"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                
                {expandedSongs.has(song._id) && (
                  <div className="song-content">
                    <FormattedSong song={song} showChords={showChords} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlist;