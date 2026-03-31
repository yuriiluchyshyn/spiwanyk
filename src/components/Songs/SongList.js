import React, { useState, useEffect } from 'react';
import { songsAPI } from '../../services/api';
import { useSongbook } from '../../contexts/SongbookContext';
import { FiSearch, FiMusic, FiPlus, FiYoutube, FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi';
import FormattedSong from './FormattedSong';
import './SongList.css';

const categories = [
  { id: 'author', name: 'АВТОРСЬКІ ПІСНІ', icon: '🎵', color: '#8B4513' },
  { id: 'plast', name: 'ПЛАСТОВІ ПІСНІ', icon: '🔱', color: '#D2691E' },
  { id: 'uprising', name: 'ПОВСТАНСЬКІ ПІСНІ', icon: '🎩', color: '#8B7355' },
  { id: 'cossack', name: 'КОЗАЦЬКІ ПІСНІ', icon: '⚔️', color: '#654321' },
  { id: 'lemko', name: 'ЛЕМКІВСЬКІ ПІСНІ', icon: '🏔️', color: '#228B22' },
  { id: 'folk', name: 'НАРОДНІ ПІСНІ', icon: '🌾', color: '#6B8E23' },
  { id: 'christmas', name: 'НОВАЦЬКІ ПІСНІ', icon: '🔥', color: '#2F4F4F' },
  { id: 'carols', name: 'КОЛЯДКИ / ЩЕДРІВКИ', icon: '⭐', color: '#B22222' },
  { id: 'hymns', name: 'ГІМНИ / МОЛИТВИ', icon: '🇺🇦', color: '#4682B4' }
];

const SongCard = ({ song, onAddToPlaylist, isExpanded, onToggleExpand }) => {
  const [showChords, setShowChords] = useState(false);
  const { currentPlaylist } = useSongbook();
  const isInPlaylist = currentPlaylist.some(s => s._id === song._id);

  return (
    <div className={`song-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="song-card-header" onClick={() => onToggleExpand(song._id)}>
        <div className="song-card-info">
          <h3 className="song-title">{song.title}</h3>
          {song.author && <span className="song-author">{song.author}</span>}
          
          {/* Компактна метаінформація */}
          {(song.metadata?.words || song.metadata?.music || song.metadata?.performer) && (
            <div className="song-metadata-compact">
              {song.metadata.words && song.metadata.words !== song.author && (
                <span className="metadata-compact">сл. {song.metadata.words}</span>
              )}
              {song.metadata.music && song.metadata.music !== song.author && (
                <span className="metadata-compact">муз. {song.metadata.music}</span>
              )}
              {song.metadata.performer && song.metadata.performer !== song.author && (
                <span className="metadata-compact">вик. {song.metadata.performer}</span>
              )}
            </div>
          )}
        </div>
        <div className="song-card-actions">
          <button 
            className={`add-btn ${isInPlaylist ? 'added' : ''}`}
            onClick={(e) => { e.stopPropagation(); onAddToPlaylist(song); }}
          >
            {isInPlaylist ? '✓' : <FiPlus />}
          </button>
          {song.youtubeUrl && (
            <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" 
               className="yt-btn" onClick={(e) => e.stopPropagation()}>
              <FiYoutube />
            </a>
          )}
          <span className="expand-icon">
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </span>
        </div>
      </div>

      <div className="song-card-body">
        <div className="song-card-body-inner">
          {isExpanded && (
            <>
              {song.hasChords && (
                <label className="chords-toggle">
                  <input type="checkbox" checked={showChords} 
                         onChange={(e) => setShowChords(e.target.checked)} />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Показати акорди</span>
                </label>
              )}
              <div className="song-text">
                <FormattedSong song={song} showChords={showChords} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SongList = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSongId, setExpandedSongId] = useState(null);
  const { addToPlaylist, playNow } = useSongbook();

  useEffect(() => {
    const loadSongs = async () => {
      try {
        const data = await songsAPI.getAll();
        setSongs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading songs:', error);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };
    loadSongs();
  }, []);

  const getSongsByCategory = (categoryId) => {
    return songs.filter(song => song.category === categoryId);
  };

  const getFilteredSongs = () => {
    let filtered = selectedCategory ? getSongsByCategory(selectedCategory) : songs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(song =>
        song.title.toLowerCase().includes(q) ||
        song.lyrics?.toLowerCase().includes(q) ||
        song.author?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const handleAddToPlaylist = (song) => {
    addToPlaylist(song);
    playNow(song);
  };

  const handleToggleExpand = (songId) => {
    setExpandedSongId(expandedSongId === songId ? null : songId);
  };

  if (loading) {
    return (
      <div className="loading">
        <FiMusic className="loading-icon" />
        <p>Завантаження пісень...</p>
      </div>
    );
  }

  if (selectedCategory) {
    const category = categories.find(c => c.id === selectedCategory);
    const filteredSongs = getFilteredSongs();
    
    return (
      <div className="song-list">
        <div className="category-header">
          <button className="back-btn" onClick={() => setSelectedCategory(null)}>
            <FiArrowLeft />
          </button>
          <FiMusic className="category-header-icon" />
          <div className="category-header-text">
            <h1>{category.name}</h1>
            <span className="song-count">{filteredSongs.length} пісень</span>
          </div>
        </div>

        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Пошук в категорії..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="songs-grid">
          {filteredSongs.map(song => (
            <SongCard
              key={song._id}
              song={song}
              onAddToPlaylist={handleAddToPlaylist}
              isExpanded={expandedSongId === song._id}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </div>

        {filteredSongs.length === 0 && (
          <div className="no-results">
            <FiMusic className="no-results-icon" />
            <h3>Пісні не знайдено</h3>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="song-list">
      <div className="categories-header">
        <h1>Пісні</h1>
        <p>Оберіть категорію</p>
      </div>

      <div className="categories-grid">
        {categories.map(category => {
          const count = getSongsByCategory(category.id).length;
          return (
            <div
              key={category.id}
              className="category-card"
              onClick={() => setSelectedCategory(category.id)}
              style={{ '--category-color': category.color }}
            >
              <span className="category-icon">{category.icon}</span>
              <div className="category-info">
                <h3>{category.name}</h3>
                <span className="category-count">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongList;
