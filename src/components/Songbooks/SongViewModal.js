import React, { useState } from 'react';
import { FiX, FiMusic, FiEye, FiEyeOff } from 'react-icons/fi';
import FormattedSong from '../Songs/FormattedSong';
import './SongViewModal.css';

const SongViewModal = ({ song, isOpen, onClose }) => {
  const [showChords, setShowChords] = useState(false);

  if (!isOpen || !song) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="song-view-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="song-header-info">
            <h2>
              <FiMusic className="sec-icon" />
              {song.title}
            </h2>
            {song.author && (
              <p className="song-author">{song.author}</p>
            )}
          </div>
          
          <div className="modal-controls">
            <button 
              onClick={() => setShowChords(!showChords)}
              className={`chords-toggle-btn ${showChords ? 'active' : ''}`}
              title={showChords ? 'Сховати акорди' : 'Показати акорди'}
            >
              {showChords ? <FiEyeOff /> : <FiEye />}
              {showChords ? 'Сховати акорди' : 'Показати акорди'}
            </button>
            
            <button onClick={onClose} className="close-btn">
              <FiX />
            </button>
          </div>
        </div>

        <div className="modal-content">
          {/* Метаінформація */}
          {(song.metadata?.performer || song.metadata?.words || song.metadata?.music) && (
            <div className="song-metadata">
              {song.metadata.performer && (
                <div className="metadata-item">
                  <span className="metadata-label">Виконавець:</span>
                  <span className="metadata-value">{song.metadata.performer}</span>
                </div>
              )}
              {song.metadata.words && (
                <div className="metadata-item">
                  <span className="metadata-label">Слова:</span>
                  <span className="metadata-value">{song.metadata.words}</span>
                </div>
              )}
              {song.metadata.music && (
                <div className="metadata-item">
                  <span className="metadata-label">Музика:</span>
                  <span className="metadata-value">{song.metadata.music}</span>
                </div>
              )}
            </div>
          )}

          {/* YouTube посилання */}
          {song.youtubeUrl && (
            <div className="youtube-section">
              <a 
                href={song.youtubeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="youtube-link"
              >
                🎵 Переглянути на YouTube
              </a>
            </div>
          )}

          {/* Текст пісні */}
          <div className="song-content">
            <FormattedSong 
              song={song} 
              showChords={showChords}
              isModal={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongViewModal;