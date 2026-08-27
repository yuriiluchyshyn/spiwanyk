import React, { useState, useRef, useLayoutEffect } from 'react';
import { FiMove, FiChevronDown, FiYoutube } from 'react-icons/fi';
import { FaGuitar } from 'react-icons/fa';
// FormattedSong is plain JS
// @ts-ignore
import FormattedSong from '../../Songs/FormattedSong';
import './SongItem.css';

interface SongLine {
  chordPositions?: Array<{ chord: string; charIndex: number }>;
}

interface SongSection {
  lines?: SongLine[];
}

interface Song {
  _id: string;
  title: string;
  author?: string;
  sectionId?: string | null;
  lyrics?: string;
  youtubeUrl?: string;
  hasChords?: boolean;
  structure?: SongSection[];
  metadata?: {
    performer?: string;
    words?: string;
    music?: string;
  };
}

interface Section {
  _id: string;
  name: string;
}

interface SongItemProps {
  song: Song;
  index: number;
  isDragging: boolean;
  isLeaving?: boolean;
  dropPosition?: 'before' | 'after' | null;
  canEdit: boolean;
  sections?: Section[];
  isExpanded: boolean;
  onDragHandleDown?: (e: React.PointerEvent, song: Song) => void;
  onToggleExpand: (song: Song) => void;
  onRegisterRef?: (songId: string, el: HTMLElement | null) => void;
  onRemoveSong: (songId: string) => void;
  onMoveToSection?: (song: Song, sectionId: string | null) => void;
}

// Чи має пісня акорди (структурований формат з позиціями акордів)
const songHasChords = (song: Song): boolean => {
  if (!song) return false;
  if (song.hasChords) return true;
  if (Array.isArray(song.structure) && song.structure.length > 0) {
    return song.structure.some(section =>
      Array.isArray(section.lines) &&
      section.lines.some(
        line => Array.isArray(line.chordPositions) && line.chordPositions.length > 0
      )
    );
  }
  return false;
};

// Свайп справа наліво (мобільні): поріг видалення та максимальний зсув.
// Видалення відбувається одразу (з можливістю undo), без окремої кнопки.
const SWIPE_DELETE_THRESHOLD = 80;
const SWIPE_MAX = 160;

const SongItem: React.FC<SongItemProps> = ({
  song,
  index,
  isDragging,
  isLeaving = false,
  dropPosition,
  canEdit,
  isExpanded,
  onDragHandleDown,
  onToggleExpand,
  onRegisterRef,
  onRemoveSong
}) => {
  const [showChords, setShowChords] = useState(false);

  // ---- Свайп-видалення ----
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeXRef = useRef(0);
  const swipeBaseRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeActiveRef = useRef(false);
  const suppressClickRef = useRef(false);

  // ---- Анімація зникнення рядка (як у BookView) ----
  // Заміряємо реальну висоту, потім плавно від'їжджаємо вліво, згасаємо і
  // згортаємо висоту до нуля — список плавно змикається.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [leaveMaxH, setLeaveMaxH] = useState<number | null>(null);
  const [leaveCollapsed, setLeaveCollapsed] = useState(false);

  const setRootRef = (el: HTMLDivElement | null) => {
    rootRef.current = el;
    onRegisterRef?.(song._id, el);
  };

  useLayoutEffect(() => {
    if (!isLeaving) {
      setLeaveMaxH(null);
      setLeaveCollapsed(false);
      return;
    }
    const el = rootRef.current;
    const h = el ? el.scrollHeight : 0;
    setLeaveMaxH(h); // фіксуємо стартову висоту
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLeaveMaxH(0);
        setLeaveCollapsed(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isLeaving]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const leaveStyle: React.CSSProperties | undefined = isLeaving
    ? {
        maxHeight: leaveMaxH == null ? undefined : leaveMaxH,
        opacity: leaveCollapsed ? 0 : 1,
        transform:
          leaveCollapsed && !prefersReducedMotion
            ? 'translateX(-100%)'
            : 'translateX(0)',
        overflow: 'hidden',
        pointerEvents: 'none',
        transition:
          'max-height 0.4s ease, opacity 0.34s ease, transform 0.4s ease',
      }
    : undefined;

  const setSwipe = (v: number) => {
    swipeXRef.current = v;
    setSwipeX(v);
  };

  const currentSectionId = song.sectionId ? song.sectionId.toString() : null;
  const hasChords = songHasChords(song);

  const dropClass = dropPosition === 'before'
    ? 'drop-before'
    : dropPosition === 'after'
      ? 'drop-after'
      : '';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canEdit) return;
    // Дотик по кнопках дій (у т.ч. по ручці перетягування) не починає свайп
    if ((e.target as HTMLElement).closest('.song-actions')) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipeBaseRef.current = swipeXRef.current;
    swipeActiveRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canEdit || !touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!swipeActiveRef.current) {
      // Вертикальний рух — це скрол сторінки, свайп не активуємо
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        touchStartRef.current = null;
        return;
      }
      if (Math.abs(dx) > 8) {
        swipeActiveRef.current = true;
        setIsSwiping(true);
      } else {
        return;
      }
    }

    let next = swipeBaseRef.current + dx;
    if (next > 0) next = 0;
    if (next < -SWIPE_MAX) next = -SWIPE_MAX;
    setSwipe(next);
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    if (!swipeActiveRef.current) return;

    swipeActiveRef.current = false;
    setIsSwiping(false);
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 60);

    const x = swipeXRef.current;
    // Свайп далі за поріг — видаляємо (parent програє анімацію + показує undo)
    if (x < -SWIPE_DELETE_THRESHOLD) {
      setSwipe(0);
      onRemoveSong(song._id);
    } else {
      // Інакше — повертаємо рядок на місце
      setSwipe(0);
    }
  };

  const handleRowClick = () => {
    if (suppressClickRef.current) return;
    onToggleExpand(song);
  };

  return (
    <div
      ref={setRootRef}
      className={`song-item ${isExpanded ? 'is-expanded' : ''} ${isDragging ? 'dragging' : ''} ${isLeaving ? 'is-leaving' : ''} ${swipeX < 0 ? 'is-swiped' : ''} ${dropClass}`}
      data-song-row=""
      data-song-id={song._id}
      data-section-id={currentSectionId || 'none'}
      style={leaveStyle}
    >
      <div className="song-item-swipe">
        <div
          className="song-item-row"
          style={{
            // Важливо: transform лишаємо відсутнім у стані спокою, інакше рядок
            // стає containing block для position:fixed (меню розділів "западає").
            transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
            transition: isSwiping ? 'none' : 'transform 0.25s ease',
          }}
          onClick={handleRowClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="song-number">
            {index + 1}
          </div>

          <div className="song-info">
            <h3 className="song-title">{song.title}</h3>
            {song.author && (
              <p className="song-author">{song.author}</p>
            )}

            {/* Метаінформація */}
            {(song.metadata?.performer || song.metadata?.words) && (
              <div className="song-metadata-inline">
                {song.metadata.performer && (
                  <span className="metadata-inline">🎤 {song.metadata.performer}</span>
                )}
                {song.metadata.words && song.metadata.words !== song.metadata.performer && (
                  <span className="metadata-inline">✍️ {song.metadata.words}</span>
                )}
              </div>
            )}
          </div>

          <div className="song-actions" onClick={(e) => e.stopPropagation()}>
            {canEdit && onDragHandleDown && (
              <button
                type="button"
                className="action-btn drag"
                title="Перетягнути в інший розділ або змінити порядок"
                aria-label="Перетягнути пісню"
                onPointerDown={(e) => onDragHandleDown(e, song)}
                onClick={(e) => e.preventDefault()}
              >
                <FiMove />
              </button>
            )}
            <button
              className={`action-btn expand ${isExpanded ? 'rotated' : ''}`}
              title={isExpanded ? 'Згорнути' : 'Розгорнути текст'}
              onClick={() => onToggleExpand(song)}
            >
              <FiChevronDown />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="song-expanded">
          <div className="song-expanded-inner">
            {hasChords && (
              <label className="song-chords-toggle" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={showChords}
                  onChange={(e) => setShowChords(e.target.checked)}
                />
                <FaGuitar className="song-chords-icon" />
                <span>Показати акорди</span>
              </label>
            )}
            <div className="song-expanded-body">
              <FormattedSong song={song} showChords={showChords && hasChords} />
            </div>
            {song.youtubeUrl && (
              <a
                className="song-yt-link"
                href={song.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <FiYoutube />
                <span>Послухати на YouTube</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SongItem;
