import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiMusic } from 'react-icons/fi';
import { FaGuitar } from 'react-icons/fa';
import ToastContainer from '../Common/Toast';
import SongEditor from './SongEditor';
import './AdminPanel.css';

let toastCounter = 0;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const EMPTY_CATEGORY = { name: '', icon: '', color: '#8B4513', parentId: '' };

// Розкладає плоский список категорій у порядок з урахуванням вкладеності
// та проставляє глибину (depth) для відступів у UI.
function buildCategoryTree(cats) {
  const result = [];
  const childrenOf = (pid) => cats.filter(c => (c.parentId || null) === (pid || null));

  const walk = (list, depth) => {
    list.forEach(c => {
      result.push({ ...c, depth });
      walk(childrenOf(c.id), depth + 1);
    });
  };
  walk(childrenOf(null), 0);

  // Категорії з неіснуючим parentId показуємо як кореневі, щоб не загубити
  const seen = new Set(result.map(r => r.id || r._id));
  cats.forEach(c => {
    if (!seen.has(c.id || c._id)) result.push({ ...c, depth: 0 });
  });
  return result;
}

// Іконка категорії або кружечок з кольором, якщо емодзі не задано.
function CategoryGlyph({ icon, color }) {
  if (icon && icon.trim()) {
    return <span className="admin-category-icon">{icon}</span>;
  }
  return (
    <span
      className="admin-category-icon-circle"
      style={{ background: color || '#8B4513' }}
      title="Без іконки"
    />
  );
}

function AdminPanel() {
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('songs'); // 'songs' | 'categories'

  // Фільтри та пагінація списку пісень
  const [songSearch, setSongSearch] = useState('');
  const [songCategoryFilter, setSongCategoryFilter] = useState(''); // '' = усі розділи
  const [songChordsFilter, setSongChordsFilter] = useState('all'); // 'all' | 'with' | 'without'
  const [songPage, setSongPage] = useState(1);
  const SONGS_PER_PAGE = 20;

  // Масовий вибір пісень (чекбокси у списку)
  const [selectedSongIds, setSelectedSongIds] = useState(() => new Set());
  const [bulkCategory, setBulkCategory] = useState('');

  // Category editing state
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ ...EMPTY_CATEGORY });
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Song editor state: { open, song } — song=null для нової пісні
  const [songEditor, setSongEditor] = useState({ open: false, song: null });

  // Drag-and-drop розділів
  const [dragCatId, setDragCatId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  // Export state
  const [showExport, setShowExport] = useState(false);
  const [exportCats, setExportCats] = useState([]); // обрані id розділів

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showStatus = (type, text) => {
    toastCounter += 1;
    const id = toastCounter;
    // Помилки не зникають самі — їх закривають вручну; решта через 5с.
    const duration = type === 'error' ? 0 : 5000;
    setToasts((prev) => [...prev, { id, type, text, duration }]);
  };

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/songs/admin/list`);
      setSongs(res.data.songs || []);
    } catch (err) {
      showStatus('error', 'Помилка завантаження списку');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/songs/admin/categories`);
      setCategories(res.data.categories || []);
    } catch (err) {
      showStatus('error', 'Помилка завантаження категорій');
    }
  }, []);

  useEffect(() => {
    fetchSongs();
    fetchCategories();
  }, [fetchSongs, fetchCategories]);

  // === SONGS ===
  const handleImport = async (file) => {
    try {
      setLoading(true);

      let jsonData;
      if (file) {
        // Читаємо файл який вибрав користувач
        const text = await file.text();
        jsonData = JSON.parse(text);
      }

      showStatus('info', 'Імпортую пісні...');
      const res = await axios.post(`${API_BASE_URL}/songs/import-from-json`, jsonData || {});
      const r = res.data.results;
      showStatus('success',
        `Імпорт завершено! Додано: ${r.imported}, пропущено: ${r.skipped}, помилок: ${r.errors}. Всього в базі: ${r.totalInDatabase}`
      );

      // Показуємо, які саме пісні НЕ були завантажені (пропущені + з помилками).
      const skippedTitles = res.data.skippedTitles || [];
      const errorItems = res.data.errors || [];
      if (skippedTitles.length > 0 || errorItems.length > 0) {
        const parts = [];
        if (skippedTitles.length > 0) {
          parts.push(`Пропущено (вже існують): ${skippedTitles.join(', ')}`);
        }
        if (errorItems.length > 0) {
          parts.push(
            `Помилки: ${errorItems.map(e => `${e.title} (${e.error})`).join('; ')}`
          );
        }
        // Тип 'error' → повідомлення не зникає саме, його закривають вручну.
        showStatus('error', `Не завантажено ${skippedTitles.length + errorItems.length} пісень. ${parts.join('. ')}`);
      }

      await fetchSongs();
    } catch (err) {
      if (err instanceof SyntaxError) {
        showStatus('error', 'Невірний формат JSON файлу');
      } else {
        showStatus('error', 'Помилка імпорту: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExportCat = (id) => {
    setExportCats(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Експорт пісень у JSON (готовий для імпорту). Без вибору — усі пісні.
  const handleExport = async () => {
    try {
      setLoading(true);
      const params = exportCats.length > 0
        ? `?categories=${encodeURIComponent(exportCats.join(','))}`
        : '';
      const res = await axios.get(`${API_BASE_URL}/songs/admin/export${params}`, {
        responseType: 'blob'
      });

      // Дістаємо імʼя файлу із заголовка, якщо є
      const disp = res.headers['content-disposition'] || '';
      const match = disp.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'spivanyk-export.json';

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/json' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showStatus('success',
        exportCats.length > 0
          ? `Експортовано розділів: ${exportCats.length}. Файл завантажується.`
          : 'Експортовано всі пісні. Файл завантажується.'
      );
    } catch (err) {
      showStatus('error', 'Помилка експорту: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Видалити всі пісні з вибраних розділів (використовує той самий вибір, що й експорт).
  const handleDeleteSelectedCategories = async () => {
    if (exportCats.length === 0) {
      showStatus('error', 'Спочатку виберіть хоча б один розділ');
      return;
    }
    const names = exportCats
      .map(id => orderedCategories.find(c => c.id === id)?.name || id)
      .join(', ');
    if (!window.confirm(`Видалити ВСІ пісні з розділів: ${names}?\n\nЦю дію неможливо скасувати.`)) return;

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/songs/admin/delete-by-category`, {
        categories: exportCats
      });
      showStatus('success', `Видалено ${res.data.deletedCount} пісень із вибраних розділів`);
      await fetchSongs();
    } catch (err) {
      showStatus('error', 'Помилка видалення: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // === Масовий вибір пісень ===
  const toggleSongSelect = (id) => {
    setSelectedSongIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSongSelection = () => setSelectedSongIds(new Set());

  // Видалити всі вибрані пісні
  const handleBulkDeleteSongs = async () => {
    const ids = [...selectedSongIds];
    if (ids.length === 0) return;
    if (!window.confirm(`Видалити ${ids.length} вибраних пісень? Цю дію неможливо скасувати.`)) return;
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/songs/admin/songs/bulk-delete`, { ids });
      showStatus('success', `Видалено ${res.data.deletedCount} пісень`);
      clearSongSelection();
      await fetchSongs();
    } catch (err) {
      showStatus('error', 'Помилка видалення: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Перенести всі вибрані пісні в інший розділ
  const handleBulkMoveSongs = async () => {
    const ids = [...selectedSongIds];
    if (ids.length === 0) return;
    if (!bulkCategory) {
      showStatus('error', 'Виберіть розділ, у який перенести');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/songs/admin/songs/bulk-category`, {
        ids,
        category: bulkCategory
      });
      showStatus('success', `Перенесено ${res.data.modifiedCount} пісень`);
      clearSongSelection();
      setBulkCategory('');
      await fetchSongs();
    } catch (err) {
      showStatus('error', 'Помилка перенесення: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImport(file);
      }
    };
    input.click();
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ Видалити ВСІ пісні з бази? Цю дію неможливо скасувати!')) return;
    if (!window.confirm('Ви впевнені? Це видалить ВСЕ.')) return;
    try {
      setLoading(true);
      const res = await axios.delete(`${API_BASE_URL}/songs/admin/all`);
      showStatus('success', `Видалено ${res.data.deletedCount} пісень`);
      setSongs([]);
    } catch (err) {
      showStatus('error', 'Помилка видалення: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOne = async (id, title) => {
    if (!window.confirm(`Видалити пісню "${title}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/songs/admin/${id}`);
      setSongs(prev => prev.filter(s => s._id !== id));
      showStatus('success', `Видалено: "${title}"`);
    } catch (err) {
      showStatus('error', 'Помилка видалення: ' + (err.response?.data?.message || err.message));
    }
  };

  // Перемістити пісню в інший розділ
  const handleChangeSongCategory = async (id, category) => {
    const prevCategory = songs.find(s => s._id === id)?.category;
    // Оптимістичне оновлення
    setSongs(prev => prev.map(s => (s._id === id ? { ...s, category } : s)));
    try {
      await axios.put(`${API_BASE_URL}/songs/admin/${id}/category`, { category });
      showStatus('success', 'Пісню переміщено в інший розділ');
    } catch (err) {
      // Відкат при помилці
      setSongs(prev => prev.map(s => (s._id === id ? { ...s, category: prevCategory } : s)));
      showStatus('error', 'Помилка переміщення: ' + (err.response?.data?.message || err.message));
    }
  };

  // Відкрити редактор для нової пісні
  const handleNewSong = () => {
    setSongEditor({ open: true, song: null });
  };

  // Відкрити редактор існуючої пісні (тягнемо повний документ)
  const handleEditSong = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/songs/admin/${id}`);
      setSongEditor({ open: true, song: res.data.song });
    } catch (err) {
      showStatus('error', 'Не вдалося завантажити пісню: ' + (err.response?.data?.message || err.message));
    }
  };

  // Зберегти пісню (створення або оновлення)
  const handleSaveSong = async (payload) => {
    const editing = songEditor.song;
    try {
      if (editing && editing._id) {
        await axios.put(`${API_BASE_URL}/songs/admin/${editing._id}`, payload);
        showStatus('success', `Пісню "${payload.title}" оновлено`);
      } else {
        await axios.post(`${API_BASE_URL}/songs/admin/songs`, payload);
        showStatus('success', `Пісню "${payload.title}" створено`);
      }
      setSongEditor({ open: false, song: null });
      await fetchSongs();
    } catch (err) {
      showStatus('error', 'Помилка збереження: ' + (err.response?.data?.message || err.message));
      throw err; // щоб редактор не закривався і зняв стан "збереження"
    }
  };

  // === CATEGORIES ===
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      showStatus('error', 'Назва розділу обовʼязкова');
      return;
    }
    try {
      // id не надсилаємо — бекенд згенерує унікальний slug з назви
      await axios.post(`${API_BASE_URL}/songs/admin/categories`, {
        name: newCategory.name,
        icon: newCategory.icon,
        color: newCategory.color,
        parentId: newCategory.parentId || null
      });
      showStatus('success', `Категорію "${newCategory.name}" додано`);
      setNewCategory({ ...EMPTY_CATEGORY });
      setShowAddCategory(false);
      await fetchCategories();
    } catch (err) {
      showStatus('error', 'Помилка: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editingCategory) return;
    try {
      await axios.put(`${API_BASE_URL}/songs/admin/categories/${categoryId}`, {
        name: editingCategory.name,
        icon: editingCategory.icon,
        color: editingCategory.color,
        parentId: editingCategory.parentId || null
      });
      showStatus('success', `Категорію оновлено`);
      setEditingCategory(null);
      await fetchCategories();
    } catch (err) {
      showStatus('error', 'Помилка оновлення: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteCategory = async (categoryId, name) => {
    if (!window.confirm(`Видалити категорію "${name}"? Пісні цієї категорії залишаться в базі, а підрозділи піднімуться на рівень вище.`)) return;
    try {
      const res = await axios.delete(`${API_BASE_URL}/songs/admin/categories/${categoryId}`);
      showStatus('success', `Видалено "${name}". Пісень з цією категорією: ${res.data.affectedSongs}`);
      await fetchCategories();
    } catch (err) {
      showStatus('error', 'Помилка видалення: ' + (err.response?.data?.message || err.message));
    }
  };

  // === DRAG & DROP розділів (у межах одного рівня) ===
  const sameLevel = (a, b) => (a?.parentId || null) === (b?.parentId || null);

  const handleCatDragStart = (e, cat) => {
    setDragCatId(cat.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCatDragOver = (e, cat) => {
    const src = categories.find(c => c.id === dragCatId);
    if (!src || src.id === cat.id || !sameLevel(src, cat)) return;
    e.preventDefault(); // дозволяємо drop лише для сусідів того ж рівня
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetId !== cat.id) setDropTargetId(cat.id);
  };

  const handleCatDragEnd = () => {
    setDragCatId(null);
    setDropTargetId(null);
  };

  const handleCatDrop = async (e, targetCat) => {
    e.preventDefault();
    const src = categories.find(c => c.id === dragCatId);
    setDropTargetId(null);
    setDragCatId(null);
    if (!src || src.id === targetCat.id || !sameLevel(src, targetCat)) return;

    const parentId = src.parentId || null;
    // Поточний порядок групи (сусіди того ж рівня) за order
    const group = categories
      .filter(c => (c.parentId || null) === parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const ids = group.map(c => c.id);
    const from = ids.indexOf(src.id);
    const to = ids.indexOf(targetCat.id);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, src.id);

    // Оптимістично оновлюємо локальний порядок
    setCategories(prev =>
      prev.map(c =>
        (c.parentId || null) === parentId ? { ...c, order: ids.indexOf(c.id) } : c
      )
    );

    try {
      await axios.put(`${API_BASE_URL}/songs/admin/categories/reorder`, { parentId, orderedIds: ids });
    } catch (err) {
      showStatus('error', 'Помилка перевпорядкування: ' + (err.response?.data?.message || err.message));
      await fetchCategories(); // відкат до серверного стану
    }
  };

  const orderedCategories = buildCategoryTree(categories);

  // Опції для вибору батьківського розділу (виключаємо саму категорію, що редагується)
  const parentOptions = (excludeId) =>
    orderedCategories.filter(c => c.id !== excludeId);

  const categoryNameById = (id) => {
    const c = categories.find(cat => cat.id === id);
    return c ? c.name : id;
  };

  // === Фільтрація та пагінація пісень ===
  // Вибраний розділ разом з усіма підрозділами (щоб фільтр за батьківським
  // розділом показував і пісні його дочірніх розділів).
  const getCategoryWithDescendants = (categoryId) => {
    const ids = new Set([categoryId]);
    const stack = [categoryId];
    while (stack.length) {
      const current = stack.pop();
      categories.forEach(c => {
        if ((c.parentId || null) === current && !ids.has(c.id)) {
          ids.add(c.id);
          stack.push(c.id);
        }
      });
    }
    return ids;
  };

  const normalizedSearch = songSearch.trim().toLowerCase();
  const categoryFilterIds = songCategoryFilter
    ? getCategoryWithDescendants(songCategoryFilter)
    : null;
  const filteredSongs = songs.filter(song => {
    if (categoryFilterIds && !categoryFilterIds.has(song.category)) return false;
    if (songChordsFilter === 'with' && !song.hasChords) return false;
    if (songChordsFilter === 'without' && song.hasChords) return false;
    if (normalizedSearch) {
      const haystack = `${song.title || ''} ${song.author || ''}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / SONGS_PER_PAGE));
  const currentPage = Math.min(songPage, totalPages);
  const pageStart = (currentPage - 1) * SONGS_PER_PAGE;
  const pagedSongs = filteredSongs.slice(pageStart, pageStart + SONGS_PER_PAGE);

  // Скидаємо на першу сторінку при зміні фільтрів
  useEffect(() => {
    setSongPage(1);
  }, [songSearch, songCategoryFilter, songChordsFilter]);

  const hasSongFilters = normalizedSearch || songCategoryFilter || songChordsFilter !== 'all';

  const resetSongFilters = () => {
    setSongSearch('');
    setSongCategoryFilter('');
    setSongChordsFilter('all');
  };

  const allFilteredSelected =
    filteredSongs.length > 0 && filteredSongs.every(s => selectedSongIds.has(s._id));

  const toggleSelectAllFiltered = () => {
    setSelectedSongIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredSongs.forEach(s => next.delete(s._id));
      else filteredSongs.forEach(s => next.add(s._id));
      return next;
    });
  };

  return (
    <div className="admin-panel">
      <h1>⚙️ Адмін-панель</h1>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => setActiveTab('songs')}
        >
          🎵 Пісні ({songs.length})
        </button>
        <button
          className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          📁 Розділи ({categories.length})
        </button>
      </div>

      {/* === SONGS TAB === */}
      {activeTab === 'songs' && (
        <>
          <div className="admin-actions">
            <button className="btn-import" onClick={handleNewSong} disabled={loading}>
              ➕ Додати пісню
            </button>
            <button className="btn-import" onClick={handleFileSelect} disabled={loading}>
              📥 Імпорт з JSON
            </button>
            <button className="btn-import" onClick={() => setShowExport(!showExport)} disabled={loading}>
              📤 Експорт
            </button>
            <button className="btn-delete-all" onClick={handleDeleteAll} disabled={loading}>
              🗑️ Видалити всі
            </button>
            <button className="btn-refresh" onClick={fetchSongs} disabled={loading}>
              🔄 Оновити
            </button>
          </div>

          {showExport && (
            <div className="admin-category-form">
              <h3>📤 Експорт пісень у JSON</h3>
              <p className="category-form-hint">
                Оберіть розділи для експорту. Якщо не вибрано жодного — експортуються всі пісні.
                Отриманий файл можна завантажити назад через «Імпорт з JSON».
              </p>
              <div className="export-cat-grid">
                {orderedCategories.map(cat => (
                  <label
                    key={cat.id || cat._id}
                    className="export-cat-item"
                    style={{ paddingLeft: `${0.6 + cat.depth * 1.5}rem` }}
                  >
                    <input
                      type="checkbox"
                      checked={exportCats.includes(cat.id)}
                      onChange={() => toggleExportCat(cat.id)}
                    />
                    {cat.depth > 0 && <span className="admin-category-branch">└</span>}
                    <span>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</span>
                  </label>
                ))}
              </div>
              <div className="export-actions">
                <button
                  className="btn-refresh"
                  onClick={() => setExportCats(orderedCategories.map(c => c.id))}
                >
                  Вибрати всі
                </button>
                <button className="btn-refresh" onClick={() => setExportCats([])}>
                  Очистити
                </button>
                <button className="btn-import" onClick={handleExport} disabled={loading}>
                  ⬇️ Завантажити JSON{exportCats.length > 0 ? ` (${exportCats.length})` : ' (всі)'}
                </button>
                <button
                  className="btn-delete-all"
                  onClick={handleDeleteSelectedCategories}
                  disabled={loading || exportCats.length === 0}
                  title={exportCats.length === 0 ? 'Виберіть розділи для видалення' : 'Видалити всі пісні з вибраних розділів'}
                >
                  🗑️ Видалити пісні вибраних розділів{exportCats.length > 0 ? ` (${exportCats.length})` : ''}
                </button>
              </div>
            </div>
          )}

          {!loading && songs.length > 0 && (
            <div className="admin-song-filters">
              <input
                type="text"
                className="admin-song-search"
                placeholder="🔍 Пошук за назвою або автором..."
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
              />
              <select
                className="admin-song-filter-select"
                value={songCategoryFilter}
                onChange={(e) => setSongCategoryFilter(e.target.value)}
                title="Фільтр за розділом"
              >
                <option value="">Усі розділи</option>
                {orderedCategories.map(cat => (
                  <option key={cat.id || cat._id} value={cat.id}>
                    {'\u00A0\u00A0'.repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
              <select
                className="admin-song-filter-select"
                value={songChordsFilter}
                onChange={(e) => setSongChordsFilter(e.target.value)}
                title="Фільтр за акордами"
              >
                <option value="all">Усі пісні</option>
                <option value="with">З акордами</option>
                <option value="without">Без акордів</option>
              </select>
              {hasSongFilters && (
                <button className="btn-reset-filters" onClick={resetSongFilters}>
                  ✕ Скинути
                </button>
              )}
            </div>
          )}

          {selectedSongIds.size > 0 && (
            <div className="admin-bulk-bar">
              <span className="admin-bulk-count">Вибрано: {selectedSongIds.size}</span>
              <select
                className="admin-song-filter-select"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                title="Перенести вибрані пісні в розділ"
              >
                <option value="">— перенести в розділ —</option>
                {orderedCategories.map(cat => (
                  <option key={cat.id || cat._id} value={cat.id}>
                    {'\u00A0\u00A0'.repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
              <button
                className="btn-import"
                onClick={handleBulkMoveSongs}
                disabled={loading || !bulkCategory}
              >
                ↪️ Перенести
              </button>
              <button className="btn-delete-all" onClick={handleBulkDeleteSongs} disabled={loading}>
                🗑️ Видалити вибрані
              </button>
              <button className="btn-reset-filters" onClick={clearSongSelection}>
                ✕ Зняти вибір
              </button>
            </div>
          )}

          <div className="admin-song-list">
            <div className="admin-song-list-header">
              {!loading && filteredSongs.length > 0 ? (
                <label className="admin-select-all">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                  />
                  <span>Пісні в базі</span>
                </label>
              ) : (
                <span>Пісні в базі</span>
              )}
              <span>
                {hasSongFilters
                  ? `${filteredSongs.length} з ${songs.length} шт.`
                  : `${songs.length} шт.`}
              </span>
            </div>

            {loading && (
              <div className="admin-loading">
                <FiMusic className="loading-note" />
                Завантаження...
              </div>
            )}

            {!loading && songs.length === 0 && (
              <div className="admin-empty">База порожня. Натисніть "Імпорт з JSON" щоб завантажити пісні.</div>
            )}

            {!loading && songs.length > 0 && filteredSongs.length === 0 && (
              <div className="admin-empty">Нічого не знайдено. Спробуйте змінити фільтри.</div>
            )}

            {!loading && pagedSongs.map(song => (
              <div
                key={song._id}
                className={`admin-song-item ${selectedSongIds.has(song._id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  className="admin-song-checkbox"
                  checked={selectedSongIds.has(song._id)}
                  onChange={() => toggleSongSelect(song._id)}
                  title="Вибрати пісню"
                />
                <div className="admin-song-info">
                  <div className="admin-song-title">
                    <span className="admin-song-title-text">{song.title}</span>
                    {song.hasChords && (
                      <span className="admin-chords-badge" title="Є акорди">
                        <FaGuitar />
                      </span>
                    )}
                  </div>
                  <div className="admin-song-meta">
                    {song.author && <span>{song.author} · </span>}
                    <span>Розділ:</span>
                  </div>
                </div>
                <select
                  className="admin-song-category-select"
                  value={song.category || ''}
                  onChange={(e) => handleChangeSongCategory(song._id, e.target.value)}
                  title="Перемістити пісню в інший розділ"
                >
                  {/* Показуємо поточне значення, навіть якщо такого розділу вже нема */}
                  {song.category && !categories.some(c => c.id === song.category) && (
                    <option value={song.category}>{song.category} (невідомий)</option>
                  )}
                  {orderedCategories.map(cat => (
                    <option key={cat.id || cat._id} value={cat.id}>
                      {'\u00A0\u00A0'.repeat(cat.depth)}{cat.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-edit-cat"
                  title="Редагувати пісню (текст та акорди)"
                  onClick={() => handleEditSong(song._id)}
                >
                  ✏️
                </button>
                <button
                  className="btn-delete-song"
                  onClick={() => handleDeleteOne(song._id, song.title)}
                >
                  Видалити
                </button>
              </div>
            ))}
          </div>

          {!loading && totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="btn-page"
                onClick={() => setSongPage(1)}
                disabled={currentPage === 1}
                title="Перша сторінка"
              >
                «
              </button>
              <button
                className="btn-page"
                onClick={() => setSongPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹ Назад
              </button>
              <span className="admin-page-info">
                Сторінка {currentPage} з {totalPages}
              </span>
              <button
                className="btn-page"
                onClick={() => setSongPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Далі ›
              </button>
              <button
                className="btn-page"
                onClick={() => setSongPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Остання сторінка"
              >
                »
              </button>
            </div>
          )}
        </>
      )}

      {/* === CATEGORIES TAB === */}
      {activeTab === 'categories' && (
        <>
          <div className="admin-actions">
            <button className="btn-import" onClick={() => setShowAddCategory(!showAddCategory)}>
              ➕ Додати розділ
            </button>
            <button className="btn-refresh" onClick={fetchCategories}>
              🔄 Оновити
            </button>
          </div>

          {showAddCategory && (
            <div className="admin-category-form">
              <h3>Новий розділ</h3>
              <p className="category-form-hint">ID згенерується автоматично з назви.</p>
              <div className="category-form-grid">
                <input
                  type="text"
                  placeholder="Назва (напр: СКАУТСЬКІ ПІСНІ)"
                  value={newCategory.name}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Іконка (необовʼязково)"
                  value={newCategory.icon}
                  onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
                  style={{ maxWidth: '150px' }}
                />
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                  style={{ maxWidth: '50px', height: '36px' }}
                  title="Колір (використовується як кружечок, якщо немає іконки)"
                />
                <select
                  className="category-parent-select"
                  value={newCategory.parentId}
                  onChange={e => setNewCategory({ ...newCategory, parentId: e.target.value })}
                  title="Батьківський розділ"
                >
                  <option value="">— Кореневий розділ —</option>
                  {orderedCategories.map(cat => (
                    <option key={cat.id || cat._id} value={cat.id}>
                      {'\u00A0\u00A0'.repeat(cat.depth)}{cat.name}
                    </option>
                  ))}
                </select>
                <button className="btn-import" onClick={handleAddCategory}>Зберегти</button>
                <button className="btn-refresh" onClick={() => { setShowAddCategory(false); setNewCategory({ ...EMPTY_CATEGORY }); }}>Скасувати</button>
              </div>
            </div>
          )}

          <div className="admin-song-list">
            <div className="admin-song-list-header">
              <span>Розділи <span className="admin-hint-inline">(перетягніть ⠿ щоб змінити порядок)</span></span>
              <span>{categories.length} шт.</span>
            </div>

            {orderedCategories.map(cat => {
              const isEditingThis = editingCategory && editingCategory._editId === (cat.id || cat._id);
              const isDragging = dragCatId === cat.id;
              const isDropTarget = dropTargetId === cat.id;
              return (
              <div
                key={cat.id || cat._id}
                className={`admin-category-item ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                draggable={!isEditingThis}
                onDragStart={(e) => handleCatDragStart(e, cat)}
                onDragOver={(e) => handleCatDragOver(e, cat)}
                onDrop={(e) => handleCatDrop(e, cat)}
                onDragEnd={handleCatDragEnd}
              >
                {isEditingThis ? (
                  <div className="category-edit-row">
                    <input
                      type="text"
                      className="category-id-readonly"
                      value={editingCategory.id}
                      readOnly
                      disabled
                      title="ID розділу (не редагується)"
                    />
                    <input
                      type="text"
                      placeholder="іконка"
                      value={editingCategory.icon || ''}
                      onChange={e => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                      style={{ width: '70px' }}
                    />
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      style={{ flex: 1, minWidth: '120px' }}
                    />
                    <input
                      type="color"
                      value={editingCategory.color}
                      onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })}
                      style={{ width: '40px', height: '32px' }}
                    />
                    <select
                      className="category-parent-select"
                      value={editingCategory.parentId || ''}
                      onChange={e => setEditingCategory({ ...editingCategory, parentId: e.target.value })}
                      title="Батьківський розділ"
                    >
                      <option value="">— Кореневий —</option>
                      {parentOptions(cat.id).map(p => (
                        <option key={p.id || p._id} value={p.id}>
                          {'\u00A0\u00A0'.repeat(p.depth)}{p.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn-save-cat" onClick={() => handleUpdateCategory(cat.id)}>✓</button>
                    <button className="btn-cancel-cat" onClick={() => setEditingCategory(null)}>✕</button>
                  </div>
                ) : (
                  <>
                    <div
                      className="admin-category-info"
                      style={{ paddingLeft: `${cat.depth * 1.5}rem` }}
                    >
                      <span className="cat-drag-handle" title="Перетягніть, щоб змінити порядок">⠿</span>
                      {cat.depth > 0 && <span className="admin-category-branch">└</span>}
                      <CategoryGlyph icon={cat.icon} color={cat.color} />
                      <div>
                        <div className="admin-category-name">{cat.name}</div>
                        <div className="admin-category-id">
                          id: {cat.id}
                          {cat.parentId && <span> · у розділі «{categoryNameById(cat.parentId)}»</span>}
                        </div>
                      </div>
                      <span className="admin-category-color" style={{ background: cat.color }}></span>
                    </div>
                    <div className="admin-category-actions">
                      <button
                        className="btn-edit-cat"
                        onClick={() => setEditingCategory({ ...cat, _editId: cat.id || cat._id })}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete-song"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      >
                        Видалити
                      </button>
                    </div>
                  </>
                )}
              </div>
              );
            })}
          </div>
        </>
      )}

      {songEditor.open && (
        <SongEditor
          song={songEditor.song}
          categories={orderedCategories}
          onClose={() => setSongEditor({ open: false, song: null })}
          onSave={handleSaveSong}
        />
      )}
    </div>
  );
}

export default AdminPanel;
