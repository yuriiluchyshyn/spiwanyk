import React, { useState, useEffect, useCallback } from 'react';
import { songsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FiSearch, FiMusic, FiYoutube, FiChevronDown, FiChevronUp, FiArrowLeft, FiPlus, FiCheck, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { FaGuitar } from 'react-icons/fa';
import FormattedSong from './FormattedSong';
import SongEditor from '../Admin/SongEditor';
import './SongList.css';

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

const SongCard = ({ song, isExpanded, onToggleExpand, onAddSong, isAdding, isAdded, canManage, onEdit, onDelete }) => {
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
          {canManage && (
            <>
              <button
                className="song-manage-btn"
                onClick={(e) => { e.stopPropagation(); onEdit(song); }}
                title="Редагувати пісню"
              >
                <FiEdit2 />
              </button>
              <button
                className="song-manage-btn danger"
                onClick={(e) => { e.stopPropagation(); onDelete(song); }}
                title="Видалити пісню"
              >
                <FiTrash2 />
              </button>
            </>
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
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [currentCategoryId, setCurrentCategoryId] = useState(null); // null = корінь
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSongId, setExpandedSongId] = useState(null);
  const [categoryPage, setCategoryPage] = useState(1); // пагінація списку пісень розділу
  const SONGS_PER_PAGE = 20;

  // Створення власного розділу / пісні (лише для авторизованих)
  const [showAddCat, setShowAddCat] = useState(false);   // форма нового кореневого розділу
  const [addCatClosing, setAddCatClosing] = useState(false); // програвання анімації зникнення
  const [newCatName, setNewCatName] = useState('');
  const [showAddSub, setShowAddSub] = useState(false);   // форма нового підрозділу (в межах розділу)
  const [newSubName, setNewSubName] = useState('');
  const [songEditorOpen, setSongEditorOpen] = useState(false);
  const [songEditorCategory, setSongEditorCategory] = useState(''); // попередньо обраний розділ
  const [songEditorSong, setSongEditorSong] = useState(null); // пісня для редагування (або null)
  const [editingCatId, setEditingCatId] = useState(null); // id розділу, що перейменовуємо
  const [editingCatName, setEditingCatName] = useState('');
  const [busy, setBusy] = useState(false);

  // При зміні розділу повертаємось на першу сторінку
  useEffect(() => {
    setCategoryPage(1);
  }, [currentCategoryId]);

  const loadData = useCallback(async () => {
    try {
      const [songsData, cats] = await Promise.all([
        songsAPI.getAll(),
        songsAPI.getCategories().catch(() => null)
      ]);
      setSongs(Array.isArray(songsData) ? songsData : []);
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Чи належить розділ поточному користувачу (тоді його можна видалити).
  const isMyCategory = (cat) =>
    !!user && !!cat?.owner && String(cat.owner) === String(user._id);

  // Плавне закриття форми додавання кореневого розділу (програємо анімацію
  // зникнення, а вже потім прибираємо форму й очищаємо поле).
  const closeAddCat = () => {
    setAddCatClosing(true);
    setTimeout(() => {
      setShowAddCat(false);
      setAddCatClosing(false);
      setNewCatName('');
    }, 200);
  };

  // Створити власний розділ. parentId — id батьківського розділу (для підрозділу).
  const handleCreateCategory = async (parentId = null) => {
    const name = (parentId ? newSubName : newCatName).trim();
    if (!name) return;
    setBusy(true);
    try {
      await songsAPI.createMyCategory({ name, parentId: parentId || undefined });
      if (parentId) { setNewSubName(''); setShowAddSub(false); }
      else { closeAddCat(); }
      await loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Не вдалося створити розділ: ' + (error.response?.data?.message || error.message));
    } finally {
      setBusy(false);
    }
  };

  // Видалити власний розділ (з підтвердженням).
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(
      `Видалити розділ «${cat.name}»?\n\nПідрозділи піднімуться рівнем вище, а ваші пісні з нього стануть без розділу. Цю дію неможливо скасувати.`
    )) return;
    setBusy(true);
    try {
      await songsAPI.deleteMyCategory(cat.id);
      // Якщо видалили розділ, у якому зараз перебуваємо — піднімаємось вище.
      if (currentCategoryId === cat.id) {
        setCurrentCategoryId(cat.parentId || null);
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Не вдалося видалити розділ: ' + (error.response?.data?.message || error.message));
    } finally {
      setBusy(false);
    }
  };

  // Автозбереження форми нового розділу при втраті фокусу:
  // є назва — створюємо, немає — просто плавно закриваємо.
  const commitAddCat = () => {
    if (busy) return;
    if (newCatName.trim()) handleCreateCategory(null);
    else closeAddCat();
  };

  // --- Перейменування власного розділу (інлайн, автозбереження на blur) ---
  const startRenameCat = (cat) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const commitRenameCat = async () => {
    const id = editingCatId;
    if (!id) return;
    const name = editingCatName.trim();
    const original = categories.find((c) => c.id === id)?.name;
    setEditingCatId(null);
    if (!name || name === original) return; // без змін — нічого не зберігаємо
    try {
      await songsAPI.updateMyCategory(id, { name });
      await loadData();
    } catch (error) {
      alert('Не вдалося перейменувати розділ: ' + (error.response?.data?.message || error.message));
    }
  };

  // Чи належить пісня поточному користувачу (тоді її можна редагувати/видаляти).
  const isMySong = (song) =>
    !!user && !!song?.owner && String(song.owner) === String(user._id);

  // Створити/оновити власну пісню (payload з SongEditor)
  const handleSaveSong = async (payload) => {
    if (songEditorSong && songEditorSong._id) {
      await songsAPI.updateMySong(songEditorSong._id, payload);
    } else {
      await songsAPI.createMySong(payload);
    }
    setSongEditorOpen(false);
    setSongEditorSong(null);
    setSongEditorCategory('');
    await loadData();
  };

  // Відкрити редактор нової пісні з попередньо обраним розділом.
  const openSongEditor = (categoryId = '') => {
    setSongEditorSong(null);
    setSongEditorCategory(categoryId || '');
    setSongEditorOpen(true);
  };

  // Відкрити редактор існуючої пісні для редагування.
  const openEditSong = (song) => {
    setSongEditorSong(song);
    setSongEditorCategory(song.category || '');
    setSongEditorOpen(true);
  };

  // Видалити власну пісню.
  const handleDeleteSong = async (song) => {
    if (!window.confirm(`Видалити пісню «${song.title}»? Цю дію неможливо скасувати.`)) return;
    try {
      await songsAPI.deleteMySong(song._id);
      await loadData();
    } catch (error) {
      alert('Не вдалося видалити пісню: ' + (error.response?.data?.message || error.message));
    }
  };

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
      canManage={!compact && isMySong(song)}
      onEdit={openEditSong}
      onDelete={handleDeleteSong}
    />
  );

  const renderCategoryCard = (category) => {
    const mine = isMyCategory(category);
    const renaming = editingCatId === category.id;
    return (
      <div
        key={category.id}
        className="category-card"
        onClick={() => { if (!renaming) openCategory(category.id); }}
        style={{ '--category-color': category.color }}
      >
        <span className="category-icon">{category.icon}</span>
        <div className="category-info">
          {renaming ? (
            <input
              type="text"
              className="category-rename-input"
              value={editingCatName}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditingCatName(e.target.value)}
              onBlur={commitRenameCat}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitRenameCat(); }
                if (e.key === 'Escape') setEditingCatId(null);
              }}
            />
          ) : (
            <h2>{category.name}</h2>
          )}
          <span className="category-count">{getSongCount(category.id)}</span>
        </div>
        {mine && !renaming && (
          <div className="category-manage">
            <button
              className="category-manage-btn"
              title="Перейменувати розділ"
              onClick={(e) => { e.stopPropagation(); startRenameCat(category); }}
            >
              <FiEdit2 />
            </button>
            <button
              className="category-manage-btn danger"
              title="Видалити розділ"
              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Плитка «додати розділ» в кінці сітки розділів (лише для авторизованих).
  // У неактивному стані — підказка «+ Додати розділ», при кліку перетворюється
  // на форму (поле + Створити/Скасувати) прямо в межах цієї плитки.
  const renderAddCategoryTile = () => {
    if (!showAddCat && !addCatClosing) {
      return (
        <div
          className="category-card add-category-card"
          onClick={() => setShowAddCat(true)}
          title="Додати розділ"
        >
          <span className="category-icon"><FiPlus /></span>
          <div className="category-info">
            <h2>Додати розділ</h2>
          </div>
        </div>
      );
    }

    return (
      <div className={`category-card add-category-card editing ${addCatClosing ? 'leaving' : 'entering'}`}>
        <input
          type="text"
          className="add-category-input"
          placeholder="Назва нового розділу"
          value={newCatName}
          autoFocus
          disabled={busy}
          onChange={(e) => setNewCatName(e.target.value)}
          onBlur={commitAddCat}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitAddCat(); }
            if (e.key === 'Escape') closeAddCat();
          }}
        />
      </div>
    );
  };

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

        {!compact && user && (
          <div className="my-song-actions">
            <button className="my-song-btn" onClick={() => openSongEditor(currentCategoryId)}>
              <FiPlus /> Додати пісню
            </button>
            <button className="my-song-btn secondary" onClick={() => setShowAddSub((v) => !v)}>
              <FiPlus /> Додати підрозділ
            </button>
          </div>
        )}

        {!compact && user && showAddSub && (
          <div className="my-add-cat">
            <input
              type="text"
              placeholder={`Назва підрозділу в «${category ? category.name : ''}»`}
              value={newSubName}
              autoFocus
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory(currentCategoryId);
                if (e.key === 'Escape') { setShowAddSub(false); setNewSubName(''); }
              }}
            />
            <button
              className="my-song-btn"
              onClick={() => handleCreateCategory(currentCategoryId)}
              disabled={busy || !newSubName.trim()}
            >
              Створити
            </button>
            <button
              className="my-song-btn secondary"
              onClick={() => { setShowAddSub(false); setNewSubName(''); }}
            >
              Скасувати
            </button>
          </div>
        )}

        {songEditorOpen && (
          <SongEditor
            song={songEditorSong || (songEditorCategory ? { category: songEditorCategory } : null)}
            categories={categories}
            onClose={() => { setSongEditorOpen(false); setSongEditorSong(null); setSongEditorCategory(''); }}
            onSave={handleSaveSong}
          />
        )}

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

      {songEditorOpen && (
        <SongEditor
          song={songEditorSong || (songEditorCategory ? { category: songEditorCategory } : null)}
          categories={categories}
          onClose={() => { setSongEditorOpen(false); setSongEditorSong(null); setSongEditorCategory(''); }}
          onSave={handleSaveSong}
        />
      )}

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
        <>
          <div className="categories-grid">
            {rootCategories.map(renderCategoryCard)}
            {/* Кнопка «додати розділ» завжди в кінці списку розділів (у межах плитки) */}
            {!compact && user && renderAddCategoryTile()}
          </div>
        </>
      )}
    </div>
  );
};

export default SongBrowser;
