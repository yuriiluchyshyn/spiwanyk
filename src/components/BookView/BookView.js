import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { songbooksAPI } from '../../services/api';
import { FiX, FiMusic, FiPlus, FiCornerDownRight, FiEye, FiEyeOff, FiTrash2, FiChevronDown, FiMove } from 'react-icons/fi';
import FormattedSong from '../Songs/FormattedSong';
import AddSongsModal from '../Songbooks/AddSongsModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import './BookView.css';

const BookView = ({ onClose, songbookData }) => {
  const navigate = useNavigate();
  const [songbook, setSongbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [addMode, setAddMode] = useState(null);
  const [expandedSongId, setExpandedSongId] = useState(null);

  // Drag and drop state
  const [draggedSong, setDraggedSong] = useState(null);
  const [dragOverSongId, setDragOverSongId] = useState(null);
  const [dragPosition, setDragPosition] = useState(null); // 'before' | 'after'

  const scrollRef = useRef(null);

  // ---- Завантаження ----
  const loadSongbook = useCallback(async () => {
    if (!songbookData?._id) return;
    try {
      const data = await songbooksAPI.getById(songbookData._id);
      setSongbook(data);
    } catch (e) {
      console.error('Error loading songbook:', e);
    } finally {
      setLoading(false);
    }
  }, [songbookData]);

  useEffect(() => {
    loadSongbook();
  }, [loadSongbook]);

  // ---- Впорядкований список пісень за секціями ----
  const groupedSongs = useMemo(() => {
    if (!songbook?.songs) return [];
    const sections = songbook.sections || [];

    const getEntries = (sectionId) =>
      songbook.songs
        .filter((s) => {
          const sKey = s.section ? s.section.toString() : null;
          return sectionId ? sKey === sectionId.toString() : !sKey;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((s) => {
          const song = s.song || {};
          return { 
            _id: song._id,
            title: song.title,
            author: song.author,
            lyrics: song.lyrics,
            chords: song.chords,
            notes: song.notes,
            youtubeUrl: song.youtubeUrl,
            category: song.category,
            structure: song.structure,
            metadata: song.metadata,
            hasChords: song.hasChords,
            _sectionId: s.section ? s.section.toString() : null
          };
        })
        .filter((s) => s._id);

    const groups = [];
    const noSection = getEntries(null);
    if (noSection.length) {
      groups.push({ id: null, name: 'Без розділу', icon: '🎵', songs: noSection });
    }
    sections
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((sec) => {
        const songs = getEntries(sec._id);
        if (songs.length) {
          groups.push({ id: sec._id, name: sec.name, icon: sec.icon || '🎵', songs });
        }
      });
    return groups;
  }, [songbook]);

  const flatSongs = useMemo(() => groupedSongs.flatMap((g) => g.songs), [groupedSongs]);

  // ---- Toggle expand ----
  const handleToggleExpand = (songId) => {
    setExpandedSongId(expandedSongId === songId ? null : songId);
  };

  // ---- Видалення пісні зі співаника ----
  const handleRemoveSong = async (song, e) => {
    if (e) e.stopPropagation();
    if (!song?._id) return;
    if (!window.confirm(`Видалити пісню "${song.title}" зі співаника?`)) return;

    try {
      await songbooksAPI.removeSong(songbook._id, song._id);
      const fresh = await songbooksAPI.getById(songbook._id);
      setSongbook(fresh);

      if (expandedSongId === song._id) {
        setExpandedSongId(null);
      }
    } catch (err) {
      console.error('Error removing song:', err);
      alert(
        'Помилка видалення пісні: ' +
          (err.response?.data?.message || err.message || 'невідома помилка')
      );
    }
  };

  // ---- Drag & Drop ----
  const handleDragStart = (e, song) => {
    setDraggedSong(song);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', song._id);
    } catch {}
  };

  const handleDragOver = (e, song) => {
    if (!draggedSong || draggedSong._id === song._id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';

    setDragOverSongId(song._id);
    setDragPosition(position);
  };

  const handleDragLeave = () => {
    // Don't clear immediately - next dragover will set it
  };

  const handleDrop = async (e, targetSong) => {
    e.preventDefault();
    if (!draggedSong || draggedSong._id === targetSong._id) {
      resetDrag();
      return;
    }

    const targetSectionId = targetSong._sectionId || null;
    const draggedSectionId = draggedSong._sectionId || null;

    // Find position within the same group
    const group = groupedSongs.find(g => {
      const gId = g.id ? g.id.toString() : null;
      return gId === targetSectionId;
    });

    if (!group) {
      resetDrag();
      return;
    }

    const sectionSongs = group.songs;
    const targetIdx = sectionSongs.findIndex(s => s._id === targetSong._id);
    let insertAt = dragPosition === 'before' ? targetIdx : targetIdx + 1;

    // If same section and dragged is before target, adjust
    if (draggedSectionId === targetSectionId) {
      const draggedIdx = sectionSongs.findIndex(s => s._id === draggedSong._id);
      if (draggedIdx !== -1 && draggedIdx < insertAt) {
        insertAt -= 1;
      }
    }

    if (insertAt < 0) insertAt = 0;

    try {
      await songbooksAPI.moveSong(songbook._id, draggedSong._id, targetSectionId, insertAt);
      const fresh = await songbooksAPI.getById(songbook._id);
      setSongbook(fresh);
    } catch (err) {
      console.error('Error reordering song:', err);
      alert('Помилка зміни порядку: ' + (err.response?.data?.message || err.message));
    }

    resetDrag();
  };

  const handleDragEnd = () => {
    resetDrag();
  };

  const resetDrag = () => {
    setDraggedSong(null);
    setDragOverSongId(null);
    setDragPosition(null);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
      else navigate(-1);
    }, 220);
  };

  // ---- Додавання пісні ----
  const openAddEnd = () => setAddMode('end');
  const openAddAfter = () => setAddMode('after');

  const handleSongAdded = async (newSong) => {
    try {
      const fresh = await songbooksAPI.getById(songbook._id);

      if (addMode === 'after' && expandedSongId && newSong?._id) {
        const currentEntry = fresh.songs.find((s) => {
          const sid = s.song?._id || s.song;
          return sid?.toString() === expandedSongId.toString();
        });

        if (currentEntry) {
          const targetSectionId = currentEntry.section || null;
          const targetKey = targetSectionId ? targetSectionId.toString() : null;

          const entries = fresh.songs
            .filter((s) => {
              const sKey = s.section ? s.section.toString() : null;
              return sKey === targetKey;
            })
            .filter((s) => {
              const sid = s.song?._id || s.song;
              return sid?.toString() !== newSong._id.toString();
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          const idxOfCurrent = entries.findIndex((s) => {
            const sid = s.song?._id || s.song;
            return sid?.toString() === expandedSongId.toString();
          });

          if (idxOfCurrent !== -1) {
            await songbooksAPI.moveSong(
              songbook._id,
              newSong._id,
              targetSectionId,
              idxOfCurrent + 1
            );
            const refreshed = await songbooksAPI.getById(songbook._id);
            setSongbook(refreshed);
            return;
          }
        }
      }

      setSongbook(fresh);
    } catch (e) {
      console.error('Error finalizing add:', e);
    }
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className={`book-view ${isClosing ? 'closing' : ''}`}>
        <LoadingSpinner text="Завантаження..." />
      </div>
    );
  }

  if (!songbook) return null;

  return (
    <div className={`book-view ${isClosing ? 'closing' : ''}`}>
      <div className="bv-backdrop" onClick={handleClose} />

      <div className="bv-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="bv-header">
          <div className="bv-title">
            <FiMusic className="bv-title-icon" />
            <span>{songbook.title}</span>
          </div>
          <button className="bv-close" onClick={handleClose} aria-label="Закрити">
            <FiX />
          </button>
        </header>

        {/* Scrollable content */}
        <div className="bv-scroll" ref={scrollRef}>
          {flatSongs.length === 0 ? (
            <div className="bv-empty">
              <div className="bv-empty-icon">🎶</div>
              <p>У цьому співанику ще немає пісень</p>
              <button className="bv-btn primary" onClick={openAddEnd}>
                <FiPlus /> Додати першу пісню
              </button>
            </div>
          ) : (
            groupedSongs.map((group) => (
              <section key={group.id || 'no-section'} className="bv-section">
                <h2 className="bv-section-title">
                  <span className="bv-section-icon">{group.icon}</span>
                  {group.name}
                </h2>

                {group.songs.map((song) => {
                  const isExpanded = expandedSongId === song._id;
                  const isDragging = draggedSong?._id === song._id;
                  const isDropTarget = dragOverSongId === song._id;
                  const dropClass = isDropTarget
                    ? dragPosition === 'before' ? 'drop-before' : 'drop-after'
                    : '';

                  return (
                    <article
                      key={song._id}
                      className={`bv-song ${isExpanded ? 'is-expanded' : ''} ${isDragging ? 'is-dragging' : ''} ${dropClass}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, song)}
                      onDragOver={(e) => handleDragOver(e, song)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, song)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="bv-song-row" onClick={() => handleToggleExpand(song._id)}>
                        <span className="bv-drag-handle" title="Перетягнути">
                          <FiMove />
                        </span>
                        <div className="bv-song-info">
                          <h3 className="bv-song-title">{song.title}</h3>
                          {song.author && <span className="bv-song-author">{song.author}</span>}
                        </div>
                        <div className="bv-song-actions">
                          <button
                            className="bv-song-remove"
                            onClick={(e) => handleRemoveSong(song, e)}
                            title="Видалити"
                          >
                            <FiTrash2 />
                          </button>
                          <span className={`bv-expand-icon ${isExpanded ? 'rotated' : ''}`}>
                            <FiChevronDown />
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bv-song-expanded">
                          {(song.metadata?.words || song.metadata?.music) && (
                            <div className="bv-song-meta">
                              {song.metadata.words && <span>Сл: {song.metadata.words}</span>}
                              {song.metadata.music && <span>Муз: {song.metadata.music}</span>}
                            </div>
                          )}
                          <div className="bv-song-body">
                            <FormattedSong song={song} showChords={showChords} />
                          </div>
                          {song.youtubeUrl && (
                            <a
                              className="bv-yt-link"
                              href={song.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              ▶ Послухати на YouTube
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="bv-footer">
          <button
            className={`bv-btn ${showChords ? 'active' : ''}`}
            onClick={() => setShowChords((v) => !v)}
            title={showChords ? 'Сховати акорди' : 'Показати акорди'}
          >
            {showChords ? <FiEyeOff /> : <FiEye />}
            <span>{showChords ? 'Сховати акорди' : 'Показати акорди'}</span>
          </button>

          <button
            className="bv-btn"
            onClick={openAddAfter}
            disabled={!expandedSongId}
            title="Додати пісню після поточної"
          >
            <FiCornerDownRight />
            <span>Додати після поточної</span>
          </button>

          <button className="bv-btn primary" onClick={openAddEnd} title="Додати в кінець співаника">
            <FiPlus />
            <span>Додати в кінець</span>
          </button>
        </footer>
      </div>

      {addMode && (
        <AddSongsModal
          songbook={songbook}
          isOpen={true}
          onClose={() => setAddMode(null)}
          onSongAdded={handleSongAdded}
        />
      )}
    </div>
  );
};

export default BookView;
