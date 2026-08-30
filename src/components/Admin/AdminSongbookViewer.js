import React, { useState } from 'react';
import { FiX, FiMusic, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { FaGuitar } from 'react-icons/fa';
import FormattedSong from '../Songs/FormattedSong';
import './AdminSongbookViewer.css';

// Чи має пісня акорди (structure з позиційними акордами або поле chords).
const songHasChords = (song) => {
  if (song.chords && song.chords.trim()) return true;
  return (song.structure || []).some((s) =>
    (s.lines || []).some((l) => (l.chordPositions || []).length > 0)
  );
};

// Групуємо пісні співаника за розділами (пісні вже приходять у порядку показу).
const groupBySections = (songbook) => {
  const sections = [...(songbook.sections || [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'uk')
  );
  const bySection = new Map();
  const noSection = [];

  (songbook.songs || []).forEach((entry) => {
    const song = entry.song;
    if (!song) return;
    const secId = entry.section ? String(entry.section) : null;
    if (secId) {
      if (!bySection.has(secId)) bySection.set(secId, []);
      bySection.get(secId).push(song);
    } else {
      noSection.push(song);
    }
  });

  const groups = [];
  if (noSection.length) groups.push({ id: 'none', name: 'Без розділу', songs: noSection });
  sections.forEach((sec) => {
    const songs = bySection.get(String(sec._id)) || [];
    if (songs.length) groups.push({ id: String(sec._id), name: sec.name, songs });
  });
  return groups;
};

function AdminSongbookViewer({ songbook, onClose }) {
  const [expandedId, setExpandedId] = useState(null);
  const [chordsById, setChordsById] = useState({}); // songId -> showChords

  if (!songbook) return null;

  const groups = groupBySections(songbook);
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));
  const toggleChords = (id) =>
    setChordsById((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="admin-sbv-overlay" onClick={onClose}>
      <div className="admin-sbv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-sbv-header">
          <div className="admin-sbv-title">
            <FiMusic />
            <div>
              <div className="admin-sbv-name">{songbook.title}</div>
              <div className="admin-sbv-owner">
                від {songbook.owner?.email || '—'} · пісень: {songbook.songs?.length || 0}
              </div>
            </div>
          </div>
          <button className="admin-sbv-close" onClick={onClose} title="Закрити">
            <FiX />
          </button>
        </div>

        <div className="admin-sbv-body">
          {groups.length === 0 && (
            <div className="admin-sbv-empty">У цьому співанику ще немає пісень.</div>
          )}

          {groups.map((group) => (
            <div key={group.id} className="admin-sbv-section">
              <div className="admin-sbv-section-title">{group.name}</div>
              {group.songs.map((song) => {
                const isExpanded = expandedId === song._id;
                const showChords = !!chordsById[song._id];
                const hasChords = songHasChords(song);
                return (
                  <div key={song._id} className={`admin-sbv-song ${isExpanded ? 'expanded' : ''}`}>
                    <div className="admin-sbv-song-head" onClick={() => toggleExpand(song._id)}>
                      <div className="admin-sbv-song-info">
                        <span className="admin-sbv-song-title">{song.title}</span>
                        {song.author && <span className="admin-sbv-song-author">{song.author}</span>}
                      </div>
                      <div className="admin-sbv-song-actions">
                        {hasChords && (
                          <span className="admin-sbv-chords-badge" title="Є акорди">
                            <FaGuitar />
                          </span>
                        )}
                        <span className="admin-sbv-expand">
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="admin-sbv-song-body">
                        {hasChords && (
                          <label className="admin-sbv-chords-toggle">
                            <input
                              type="checkbox"
                              checked={showChords}
                              onChange={() => toggleChords(song._id)}
                            />
                            <span>Показати акорди</span>
                          </label>
                        )}
                        <div className="admin-sbv-song-text">
                          <FormattedSong song={song} showChords={showChords} isModal />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminSongbookViewer;
