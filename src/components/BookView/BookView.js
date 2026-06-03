import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { songbooksAPI } from '../../services/api';
import { FiX, FiMusic, FiPlus, FiCornerDownRight, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi';
import FormattedSong from '../Songs/FormattedSong';
import AddSongsModal from '../Songbooks/AddSongsModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import './BookView.css';

/**
 * Простий вертикальний перегляд співаника.
 * — Усі пісні скролляться згори вниз
 * — У футері: тогл акордів, додати в кінець, додати після поточної
 * "Поточна" пісня = верхня видима у viewport
 */
const BookView = ({ onClose, songbookData }) => {
  const navigate = useNavigate();
  const [songbook, setSongbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [addMode, setAddMode] = useState(null); // null | 'end' | 'after'
  const [currentSongId, setCurrentSongId] = useState(null);

  const scrollRef = useRef(null);
  const songRefs = useRef(new Map());

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
        .map((s) => s.song)
        .filter(Boolean);

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

  // Ініціалізуємо першу пісню як «поточну»
  useEffect(() => {
    if (!currentSongId && flatSongs.length) {
      setCurrentSongId(flatSongs[0]._id);
    }
  }, [flatSongs, currentSongId]);

  // ---- Спостерігаємо за тим, яка пісня видима зверху ----
  useEffect(() => {
    if (!scrollRef.current || flatSongs.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Беремо ту, що найближча до верху viewport-а серед перетинених
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.dataset.songId;
          if (id) setCurrentSongId(id);
        }
      },
      {
        root: scrollRef.current,
        // Зона «активності» — верхня третина
        rootMargin: '0px 0px -65% 0px',
        threshold: 0,
      }
    );

    songRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [flatSongs]);

  // ---- Видалення пісні зі співаника ----
  const handleRemoveSong = async (song, e) => {
    if (e) e.stopPropagation();
    if (!song?._id) return;
    if (!window.confirm(`Видалити пісню "${song.title}" зі співаника?`)) return;

    try {
      await songbooksAPI.removeSong(songbook._id, song._id);
      const fresh = await songbooksAPI.getById(songbook._id);
      setSongbook(fresh);

      // Якщо щойно видалили "поточну" — переключимось на наступну/попередню видиму
      if (currentSongId === song._id) {
        const nextSongs = (fresh.songs || [])
          .map((s) => s.song)
          .filter(Boolean);
        setCurrentSongId(nextSongs[0]?._id || null);
      }
      // Чистимо ref на видалену пісню
      songRefs.current.delete(song._id);
    } catch (err) {
      console.error('Error removing song:', err);
      alert(
        'Помилка видалення пісні: ' +
          (err.response?.data?.message || err.message || 'невідома помилка')
      );
    }
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

  // Викликається з AddSongsModal після успішного додавання
  const handleSongAdded = async (newSong) => {
    try {
      const fresh = await songbooksAPI.getById(songbook._id);

      if (addMode === 'after' && currentSongId && newSong?._id) {
        const currentEntry = fresh.songs.find((s) => {
          const sid = s.song?._id || s.song;
          return sid?.toString() === currentSongId.toString();
        });

        if (currentEntry) {
          const targetSectionId = currentEntry.section || null;
          const targetKey = targetSectionId ? targetSectionId.toString() : null;

          // Ентрі цільової секції без щойно доданої пісні
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
            return sid?.toString() === currentSongId.toString();
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

                {group.songs.map((song) => (
                  <article
                    key={song._id}
                    className={`bv-song ${currentSongId === song._id ? 'is-current' : ''}`}
                    data-song-id={song._id}
                    ref={(node) => {
                      if (node) songRefs.current.set(song._id, node);
                      else songRefs.current.delete(song._id);
                    }}
                  >
                    <header className="bv-song-head">
                      <button
                        className="bv-song-remove"
                        onClick={(e) => handleRemoveSong(song, e)}
                        title="Видалити пісню зі співаника"
                        aria-label="Видалити пісню"
                      >
                        <FiTrash2 />
                      </button>
                      <h3 className="bv-song-title">{song.title}</h3>
                      {song.author && <div className="bv-song-author">{song.author}</div>}
                      {(song.metadata?.words || song.metadata?.music) && (
                        <div className="bv-song-meta">
                          {song.metadata.words && <span>Сл: {song.metadata.words}</span>}
                          {song.metadata.music && <span>Муз: {song.metadata.music}</span>}
                        </div>
                      )}
                    </header>

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
                  </article>
                ))}
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
            disabled={!currentSongId}
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
