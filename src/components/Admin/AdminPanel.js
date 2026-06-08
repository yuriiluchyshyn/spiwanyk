import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiMusic } from 'react-icons/fi';
import './AdminPanel.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function AdminPanel() {
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('songs'); // 'songs' | 'categories'

  // Category editing state
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ id: '', name: '', icon: '🎵', color: '#8B4513' });
  const [showAddCategory, setShowAddCategory] = useState(false);

  const showStatus = (type, text) => {
    setStatus({ type, text });
    if (type !== 'error') {
      setTimeout(() => setStatus(null), 5000);
    }
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

  // === CATEGORIES ===
  const handleAddCategory = async () => {
    if (!newCategory.id.trim() || !newCategory.name.trim()) {
      showStatus('error', 'ID та назва обовʼязкові');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/songs/admin/categories`, newCategory);
      showStatus('success', `Категорію "${newCategory.name}" додано`);
      setNewCategory({ id: '', name: '', icon: '🎵', color: '#8B4513' });
      setShowAddCategory(false);
      await fetchCategories();
    } catch (err) {
      showStatus('error', 'Помилка: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editingCategory) return;
    try {
      await axios.put(`${API_BASE_URL}/songs/admin/categories/${categoryId}`, editingCategory);
      showStatus('success', `Категорію оновлено`);
      setEditingCategory(null);
      await fetchCategories();
    } catch (err) {
      showStatus('error', 'Помилка оновлення: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteCategory = async (categoryId, name) => {
    if (!window.confirm(`Видалити категорію "${name}"? Пісні цієї категорії залишаться в базі.`)) return;
    try {
      const res = await axios.delete(`${API_BASE_URL}/songs/admin/categories/${categoryId}`);
      showStatus('success', `Видалено "${name}". Пісень з цією категорією: ${res.data.affectedSongs}`);
      await fetchCategories();
    } catch (err) {
      showStatus('error', 'Помилка видалення: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="admin-panel">
      <h1>⚙️ Адмін-панель</h1>

      {status && (
        <div className={`admin-status ${status.type}`}>
          {status.text}
        </div>
      )}

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
            <button className="btn-import" onClick={handleFileSelect} disabled={loading}>
              📥 Імпорт з JSON
            </button>
            <button className="btn-delete-all" onClick={handleDeleteAll} disabled={loading}>
              🗑️ Видалити всі
            </button>
            <button className="btn-refresh" onClick={fetchSongs} disabled={loading}>
              🔄 Оновити
            </button>
          </div>

          <div className="admin-song-list">
            <div className="admin-song-list-header">
              <span>Пісні в базі</span>
              <span>{songs.length} шт.</span>
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

            {!loading && songs.map(song => (
              <div key={song._id} className="admin-song-item">
                <div className="admin-song-info">
                  <div className="admin-song-title">{song.title}</div>
                  <div className="admin-song-meta">
                    {song.author && <span>{song.author} · </span>}
                    <span className="admin-song-category">{song.category}</span>
                  </div>
                </div>
                <button
                  className="btn-delete-song"
                  onClick={() => handleDeleteOne(song._id, song.title)}
                >
                  Видалити
                </button>
              </div>
            ))}
          </div>
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
              <div className="category-form-grid">
                <input
                  type="text"
                  placeholder="ID (латиницею, напр: scout)"
                  value={newCategory.id}
                  onChange={e => setNewCategory({ ...newCategory, id: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Назва (напр: СКАУТСЬКІ ПІСНІ)"
                  value={newCategory.name}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Іконка (емодзі)"
                  value={newCategory.icon}
                  onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
                  style={{ maxWidth: '80px' }}
                />
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                  style={{ maxWidth: '50px', height: '36px' }}
                />
                <button className="btn-import" onClick={handleAddCategory}>Зберегти</button>
                <button className="btn-refresh" onClick={() => setShowAddCategory(false)}>Скасувати</button>
              </div>
            </div>
          )}

          <div className="admin-song-list">
            <div className="admin-song-list-header">
              <span>Розділи</span>
              <span>{categories.length} шт.</span>
            </div>

            {categories.map(cat => (
              <div key={cat.id || cat._id} className="admin-category-item">
                {editingCategory && editingCategory._editId === (cat.id || cat._id) ? (
                  <div className="category-edit-row">
                    <input
                      type="text"
                      value={editingCategory.icon}
                      onChange={e => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                      style={{ width: '50px' }}
                    />
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="color"
                      value={editingCategory.color}
                      onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })}
                      style={{ width: '40px', height: '32px' }}
                    />
                    <button className="btn-save-cat" onClick={() => handleUpdateCategory(cat.id)}>✓</button>
                    <button className="btn-cancel-cat" onClick={() => setEditingCategory(null)}>✕</button>
                  </div>
                ) : (
                  <>
                    <div className="admin-category-info">
                      <span className="admin-category-icon">{cat.icon}</span>
                      <div>
                        <div className="admin-category-name">{cat.name}</div>
                        <div className="admin-category-id">id: {cat.id}</div>
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
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminPanel;
