import React, { useState, useEffect } from 'react';
import { songsAPI } from '../../services/api';
import { FiSearch, FiMusic, FiYoutube, FiChevronDown, FiChevronUp, FiArrowLeft, FiPlus, FiCheck } from 'react-icons/fi';
import { FaGuitar } from 'react-icons/fa';
import FormattedSong from './FormattedSong';
import axios from 'axios';
import './SongList.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const defaultCategories = [
  { id: 'author', name: 'АВТОРСЬКІ ПІСНІ', icon: '🎵', color: '#8B4513' },
  { id: 'plast', name: 'ТАБІРНІ ПІСНІ', icon: '🔱', color: '#D2691E' },
  { id: 'uprising', name: 'ПОВСТАНСЬКІ ПІСНІ', icon: '🎩', color: '#8B7355' },
  { id: 'cossack', name: 'КОЗАЦЬКІ ПІСНІ', icon: '⚔️', color: '#654321' },
  { id: 'lemko', name: 'ЛЕМКІВСЬКІ ПІСНІ', icon: '🏔️', color: '#228B22' },
  { id: 'folk', name: 'НАРОДНІ ПІСНІ', icon: '🌾', color: '#6B8E23' },
  { id: 'christmas', name: 'НОВАЦЬКІ ПІСНІ', icon: '🔥', color: '#2F4F4F' },
  { id: 'carols', name: 'КОЛЯДКИ / ЩЕДРІВКИ', icon: '⭐', color: '#B22222' },
  { id: 'hymns', name: 'ГІМНИ / МОЛИТВИ', icon: '🇺🇦', color: '#4682B4' }
];

const SongCard = ({ song, isExpanded, onToggleExpand, onAddSong, isAdding, isAdded }) => {
  const [showChords, setShowChords] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  // Minimum distance for a swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwipeActive(true);
  };

  const onTouchMove = (e) => {
    if (!touchStart || !isSwipeActive) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const distance = currentTouch - touchStart;
    
    // Only allow horizontal swipes within reasonable bounds
    if (Math.abs(distance) <= 150) {
      setSwipeOffset(distance);
    }
  };

  const onTouchEnd = (e) => {
    if (!touchStart || !isSwipeActive) return;
    
    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    
    const distance = touchEndX - touchStart;
    
    // Reset swipe animation
    setSwipeOffset(0);
    setIsSwipeActive(false);
    
    // Check if swipe distance is sufficient and onAddSong is provided
    if (Math.abs(distance) >= minSwipeDistance && onAddSong && !isAdding) {
      if (distance > 0) {
        // Swipe right (left to right) - add song
        if (!isAdded) {
          onAddSong(song);
        }
      } else {
        // Swipe left (right to left) - remove song
        if (isAdded) {
          onAddSong(song);
        }
      }
    }
  };

  const cardStyle = {
    transform: isSwipeActive ? `translateX(${swipeOffset}px)` : 'translateX(0)',
    transition: isSwipeActive ? 'none' : 'transform 0.2s ease-out'
  };

  // Show visual indicator during swipe
  const getSwipeIndicator = () => {
    if (!isSwipeActive || Math.abs(swipeOffset) < 30) return null;
    
    if (swipeOffset > 0) {
      // Right swipe - show add indicator if not already added
      if (!isAdded) {
        return (
          <div className="swipe-indicator swipe-add" style={{ opacity: Math.min(Math.abs(swipeOffset) / 100, 1) }}>
            <FiPlus /> Додати
          </div>
        );
      }
    } else {
      // Left swipe - show remove indicator if already added
      if (isAdded) {
        return (
          <div className="swipe-indicator swipe-remove" style={{ opacity: Math.min(Math.abs(swipeOffset) / 100, 1) }}>
            <FiCheck /> Видалити
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div 
      className={`song-card ${isExpanded ? 'expanded' : ''} ${isSwipeActive ? 'swiping' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={cardStyle}
    >
      {getSwipeIndicator()}
      
      <div className="song-card-header" onClick={() => onToggleExpand(song._id)}>
        <div className="song-card-info">
          <h2 className="song-title">{song.title}</h2>
          {song.author && <span className="song-author">{song.author}</span>}
          
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
          {song.hasChords && (
            <span className="chords-badge" title="Є акорди">
              <FaGuitar />
            </span>
          )}
          {onAddSong && (
            <button
              className={`add-btn ${isAdded ? 'added' : ''}`}
              onClick={(e) => { e.stopPropagation(); if (!isAdding) onAddSong(song); }}
              disabled={isAdding}
              title={isAdded ? 'Видалити зі співаника' : 'Додати до співаника'}
            >
              {isAdding ? '...' : isAdded ? <FiCheck /> : <FiPlus />}
            </button>
          )}
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

/**
 * SongBrowser — shared component used both on /songs page and in AddSongsModal.
 * 
 * Props:
 * - onAddSong: (song) => void — if provided, shows "+" button on each song card
 * - addingSongs: Set — set of song IDs currently being added (loading state)
 * - addedSongs: Set — set of song IDs already added (green check state)
 * - excludeSongIds: Set — songs to exclude from display (already in songbook)
 * - compact: boolean — if true, reduces padding for modal usage
 */
const SongBrowser = ({ onAddSong, addingSongs, addedSongs, excludeSongIds, compact }) => {
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [currentCategoryId, setCurrentCategoryId] = useState(null); // null = корінь
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSongId, setExpandedSongId] = useState(null);
  const [categoryPage, setCategoryPage] = useState(1); // пагінація списку пісень розділу
  const SONGS_PER_PAGE = 20;

  // При зміні розділу повертаємось на першу сторінку
  useEffect(() => {
    setCategoryPage(1);
  }, [currentCategoryId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [songsData, catRes] = await Promise.all([
          songsAPI.getAll(),
          axios.get(`${API_BASE_URL}/songs/categories`).catch(() => null)
        ]);
        setSongs(Array.isArray(songsData) ? songsData : []);
        if (catRes?.data?.categories) {
          setCategories(catRes.data.categories);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getVisibleSongs = () => {
    if (!excludeSongIds || excludeSongIds.size === 0) return songs;
    return songs.filter(s => !excludeSongIds.has(s._id));
  };

  // Прямі підрозділи заданого рівня (parentId === parent). Порядок з бекенду
  // (order) вже застосований під час завантаження.
  const getChildCategories = (parentId) =>
    categories.filter(c => (c.parentId || null) === (parentId || null));

  // id категорії разом з усіма її нащадками (для підрахунку пісень у гілці).
  const getDescendantIds = (categoryId) => {
    const ids = [categoryId];
    const stack = [categoryId];
    while (stack.length) {
      const current = stack.pop();
      categories.forEach(c => {
        if ((c.parentId || null) === current) {
          ids.push(c.id);
          stack.push(c.id);
        }
      });
    }
    return ids;
  };

  // Кількість пісень у розділі та всіх його підрозділах.
  const getSongCount = (categoryId) => {
    const ids = new Set(getDescendantIds(categoryId));
    return getVisibleSongs().filter(song => ids.has(song.category)).length;
  };

  // Пісні, що належать безпосередньо цьому розділу (без підрозділів).
  // Завжди відсортовані за абеткою (українська локаль).
  const getDirectSongs = (categoryId) =>
    getVisibleSongs()
      .filter(song => song.category === categoryId)
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'uk'));

  const getSearchResults = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return getVisibleSongs()
      .filter(song =>
        song.title.toLowerCase().includes(q) ||
        song.lyrics?.toLowerCase().includes(q) ||
        song.author?.toLowerCase().includes(q)
      )
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'uk'));
  };

  const handleToggleExpand = (songId) => {
    setExpandedSongId(expandedSongId === songId ? null : songId);
  };

  // Заходимо на рівень нижче (у підрозділи або до пісень розділу).
  // У повноекранному режимі додаємо запис в історію, щоб кнопка "Назад" у
  // хедері піднімала рівнем вище (окремої кнопки "назад" тут не показуємо).
  const openCategory = (categoryId) => {
    setCurrentCategoryId(categoryId);
    if (!compact) {
      window.history.pushState({ songBrowserCategory: categoryId }, '');
    }
  };

  // Піднятись на рівень вище (до батьківського розділу або в корінь).
  const goUp = () => {
    setCurrentCategoryId(prev => {
      if (prev == null) return null;
      const cat = categories.find(c => c.id === prev);
      return cat?.parentId || null;
    });
  };

  // У режимі сторінки кнопка "Назад" браузера/хедера піднімає на рівень вище.
  useEffect(() => {
    if (compact) return;
    const handlePopState = () => {
      setCurrentCategoryId(prev => {
        if (prev == null) return null;
        const cat = categories.find(c => c.id === prev);
        return cat?.parentId || null;
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [compact, categories]);

  if (loading) {
    return (
      <div className="loading">
        <FiMusic className="loading-icon" />
        <p>Завантаження пісень...</p>
      </div>
    );
  }

  const renderSongCard = (song) => (
    <SongCard
      key={song._id}
      song={song}
      isExpanded={expandedSongId === song._id}
      onToggleExpand={handleToggleExpand}
      onAddSong={onAddSong}
      isAdding={addingSongs?.has(song._id)}
      isAdded={addedSongs?.has(song._id)}
    />
  );

  const renderCategoryCard = (category) => (
    <div
      key={category.id}
      className="category-card"
      onClick={() => openCategory(category.id)}
      style={{ '--category-color': category.color }}
    >
      <span className="category-icon">{category.icon}</span>
      <div className="category-info">
        <h2>{category.name}</h2>
        <span className="category-count">{getSongCount(category.id)}</span>
      </div>
    </div>
  );

  const isRoot = currentCategoryId == null;

  // --- Вид розділу (заглиблений рівень): підрозділи цього рівня + пісні розділу ---
  if (!isRoot) {
    const category = categories.find(c => c.id === currentCategoryId);
    const childCategories = getChildCategories(currentCategoryId);
    const directSongs = getDirectSongs(currentCategoryId);

    const totalPages = Math.max(1, Math.ceil(directSongs.length / SONGS_PER_PAGE));
    const page = Math.min(categoryPage, totalPages);
    const pageStart = (page - 1) * SONGS_PER_PAGE;
    const pagedSongs = directSongs.slice(pageStart, pageStart + SONGS_PER_PAGE);

    return (
      <div className={`song-list ${compact ? 'compact' : ''}`}>
        <div className="category-header">
          {compact && (
            <button className="back-btn" onClick={goUp}>
              <FiArrowLeft />
            </button>
          )}
          <FiMusic className="category-header-icon" />
          <div className="category-header-text">
            <h1>{category ? category.name : 'Розділ'}</h1>
            <span className="song-count">
              {getSongCount(currentCategoryId)} пісень
            </span>
          </div>
        </div>

        {childCategories.length > 0 && (
          <div className="categories-grid">
            {childCategories.map(renderCategoryCard)}
          </div>
        )}

        {directSongs.length > 0 && (
          <>
            <div className="songs-grid">
              {pagedSongs.map(renderSongCard)}
            </div>

            {totalPages > 1 && (
              <div className="songs-pagination">
                <button
                  className="page-btn"
                  onClick={() => setCategoryPage(1)}
                  disabled={page === 1}
                  title="Перша сторінка"
                >
                  «
                </button>
                <button
                  className="page-btn"
                  onClick={() => setCategoryPage(page - 1)}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span className="page-info">{page} / {totalPages}</span>
                <button
                  className="page-btn"
                  onClick={() => setCategoryPage(page + 1)}
                  disabled={page === totalPages}
                >
                  ›
                </button>
                <button
                  className="page-btn"
                  onClick={() => setCategoryPage(totalPages)}
                  disabled={page === totalPages}
                  title="Остання сторінка"
                >
                  »
                </button>
              </div>
            )}
          </>
        )}

        {childCategories.length === 0 && directSongs.length === 0 && (
          <div className="no-results">
            <FiMusic className="no-results-icon" />
            <h2>Пісень поки немає</h2>
          </div>
        )}
      </div>
    );
  }

  // --- Кореневий вид: пошук + розділи верхнього рівня ---
  const searchResults = searchQuery.trim() ? getSearchResults() : null;
  const rootCategories = getChildCategories(null);

  return (
    <div className={`song-list ${compact ? 'compact' : ''}`}>
      <h1 className="song-list-heading">Пісні</h1>
      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Пошук пісень..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {searchResults ? (
        <>
          <div className="songs-grid">
            {searchResults.map(renderSongCard)}
          </div>

          {searchResults.length === 0 && (
            <div className="no-results">
              <FiMusic className="no-results-icon" />
              <h3>Пісні не знайдено</h3>
            </div>
          )}
        </>
      ) : (
        <div className="categories-grid">
          {rootCategories.map(renderCategoryCard)}
        </div>
      )}
    </div>
  );
};

export default SongBrowser;
