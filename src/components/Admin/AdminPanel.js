import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function AdminPanel() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

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

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleImport = async () => {
    try {
      setLoading(true);
      showStatus('info', 'Імпортую пісні...');
      const res = await axios.post(`${API_BASE_URL}/songs/import-from-json`);
      const r = res.data.results;
      showStatus('success',
        `Імпорт завершено! Додано: ${r.imported}, пропущено: ${r.skipped}, помилок: ${r.errors}. Всього в базі: ${r.totalInDatabase}`
      );
      await fetchSongs();
    } catch (err) {
      showStatus('error', 'Помилка імпорту: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="admin-panel">
      <h1>⚙️ Управління піснями</h1>

      {status && (
        <div className={`admin-status ${status.type}`}>
          {status.text}
        </div>
      )}

      <div className="admin-actions">
        <button className="btn-import" onClick={handleImport} disabled={loading}>
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

        {loading && <div className="admin-loading">Завантаження...</div>}

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
    </div>
  );
}

export default AdminPanel;
