import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { songsAPI } from '../../services/api';
import { useSongbook } from '../../contexts/SongbookContext';
import { FiArrowLeft, FiPlus, FiYoutube, FiMusic } from 'react-icons/fi';
import FormattedSong from './FormattedSong';
import './SongDetail.css';

const SongDetail = () => {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(false);
  const { addToPlaylist, playNow, nextSong, prevSong } = useSongbook();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const loadSong = async () => {
      try {
        const data = await songsAPI.getById(id);
        setSong(data);
      } catch (error) {
        console.error('Error loading song:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSong();
  }, [id]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 80) {
      if (diff > 0) nextSong();
      else prevSong();
    }
  };

  const handleAdd = () => {
    addToPlaylist(song);
    playNow(song);
  };

  if (loading) {
    return (
      <div className="loading">
        <FiMusic className="loading-icon" />
        <p>Завантаження...</p>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="error">
        <h2>Пісню не знайдено</h2>
        <Link to="/songs" className="back-link"><FiArrowLeft /> Назад</Link>
      </div>
    );
  }

  return (
    <div 
      className="song-detail"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="detail-top">
        <Link to="/songs" className="back-link"><FiArrowLeft /></Link>
        <div className="detail-title">
          <h1>{song.title}</h1>
          {song.author && <span className="detail-author">{song.author}</span>}
          
          {/* Метаінформація */}
          {(song.metadata?.words || song.metadata?.music || song.metadata?.performer) && (
            <div className="song-metadata">
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
              {song.metadata.performer && (
                <div className="metadata-item">
                  <span className="metadata-label">Виконавець:</span>
                  <span className="metadata-value">{song.metadata.performer}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="detail-actions">
          <button onClick={handleAdd} className="detail-btn add" title="Додати">
            <FiPlus />
          </button>
          {song.youtubeUrl && (
            <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="detail-btn yt">
              <FiYoutube />
            </a>
          )}
        </div>
      </div>

      {(song.hasChords || song.chords) && (
        <label className="chords-toggle detail-toggle">
          <input 
            type="checkbox" 
            checked={showChords} 
            onChange={(e) => setShowChords(e.target.checked)} 
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Показати акорди</span>
        </label>
      )}

      <div className="detail-content">
        <FormattedSong song={song} showChords={showChords} />
      </div>

      <p className="swipe-hint">← свайпніть для навігації →</p>
    </div>
  );
};

export default SongDetail;
