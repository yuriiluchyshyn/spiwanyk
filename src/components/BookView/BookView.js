import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { songbooksAPI } from '../../services/api';
import { FiX, FiMusic, FiPlus, FiCornerDownRight, FiTrash2, FiChevronDown, FiMove, FiUsers } from 'react-icons/fi';
import { FaGuitar } from 'react-icons/fa';
import FormattedSong from '../Songs/FormattedSong';
import AddSongsModal from '../Songbooks/AddSongsModal';
import MusicalNoteLoader from '../Common/MusicalNoteLoader';
import NowSingingBar from '../NowSinging/NowSingingBar';
import { useNowSinging } from '../../contexts/NowSingingContext';
import { useSettings } from '../../contexts/SettingsContext';
import './BookView.css';

// Перша літера назви пісні для алфавітного індексу (у верхньому регістрі).
// Нелітерні початки (цифри, лапки тощо) групуються під символом «#».
const getFirstLetter = (title) => {
  if (!title) return '#';
  const ch = title.trim().charAt(0);
  if (!ch) return '#';
  const upper = ch.toLocaleUpperCase('uk');
  return /[A-ZА-ЯІЇЄҐ]/i.test(upper) ? upper : '#';
};

// Локальна (в межах поточної сесії) зміна порядку пісень.
// Працює тільки з масивом songbook.songs і НЕ звертається до бази.
// Прибирає перетягнуту пісню, за потреби змінює її розділ і вставляє
// на потрібну позицію, після чого перенумеровує order у цільовому розділі.
const reorderSongsLocally = (songs, draggedId, targetSectionId, insertAt) => {
  const getId = (s) => (s.song?._id || s.song)?.toString();
  const dragKey = draggedId?.toString();
  const dragged = songs.find((s) => getId(s) === dragKey);
  if (!dragged) return songs;

  const targetKey = targetSectionId ? targetSectionId.toString() : null;

  const targetEntries = songs
    .filter((s) => {
      const sKey = s.section ? s.section.toString() : null;
      return sKey === targetKey && getId(s) !== dragKey;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const movedEntry = { ...dragged, section: targetSectionId || null };
  const idx = Math.max(0, Math.min(insertAt, targetEntries.length));
  targetEntries.splice(idx, 0, movedEntry);
  targetEntries.forEach((s, i) => { s.order = i; });

  const others = songs.filter((s) => {
    const sKey = s.section ? s.section.toString() : null;
    return getId(s) !== dragKey && sKey !== targetKey;
  });

  return [...others, ...targetEntries];
};

// Компонент для пісні з свайп-функціональністю
const SongItem = forwardRef(({
  song,
  isExpanded,
  isDragging,
  dropClass,
  canEdit,
  showChords,
  currentSingSong,
  singingIsMine,
  onToggleExpand,
  onRemoveSong,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onSetSingSong,
  onStopSinging
}, ref) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  // Анімація зникнення рядка під час видалення свайпом
  const [isLeaving, setIsLeaving] = useState(false);
  const [collapseH, setCollapseH] = useState(null); // висота для плавного схлопування

  const touchStartRef = useRef(null); // { x, y }
  const swipeDirRef = useRef(null);    // 'h' | 'v' — фіксуємо напрям жесту
  const suppressClickRef = useRef(false); // не розгортати пісню після свайпу
  const articleRef = useRef(null);

  const minSwipeDistance = 80; // Мінімальна відстань для видалення
  const maxSwipeDistance = 160;

  // Прокидаємо DOM-вузол і у forwardRef батька, і у власний ref
  const setRefs = (el) => {
    articleRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  // Запускаємо анімацію видалення: рядок від'їжджає вліво, згасає й
  // схлопується по висоті — і лише після цього прибираємо його з даних.
  const animateRemove = () => {
    const el = articleRef.current;
    const h = el ? el.offsetHeight : 0;
    setIsSwipeActive(false);
    setSwipeOffset(0);
    setCollapseH(h); // фіксуємо поточну висоту
    // Два кадри, щоб браузер зафіксував стартову висоту перед переходом у 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsLeaving(true);
        setCollapseH(0);
      });
    });
    setTimeout(() => onRemoveSong(song), 340);
  };

  const onTouchStart = (e) => {
    if (!canEdit || isLeaving) return;
    const t = e.targetTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipeDirRef.current = null;
  };

  const onTouchMove = (e) => {
    if (!canEdit || isLeaving || !touchStartRef.current) return;
    const t = e.targetTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    // Визначаємо напрям один раз: вертикальний рух — це скрол, не свайп
    if (!swipeDirRef.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      swipeDirRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (swipeDirRef.current === 'h') setIsSwipeActive(true);
    }
    if (swipeDirRef.current !== 'h') return;

    // Дозволяємо тільки свайп вліво (для видалення)
    let offset = Math.min(0, dx);
    if (offset < -maxSwipeDistance) offset = -maxSwipeDistance;
    setSwipeOffset(offset);
  };

  const onTouchEnd = () => {
    if (!canEdit || isLeaving) return;
    const wasHorizontal = swipeDirRef.current === 'h';
    const shouldRemove = wasHorizontal && swipeOffset < -minSwipeDistance;
    touchStartRef.current = null;
    swipeDirRef.current = null;

    // Після горизонтального жесту гасимо наступний клік, щоб пісня не
    // розгорталась одразу після свайпу
    if (wasHorizontal) {
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 350);
    }

    if (shouldRemove) {
      animateRemove();
    } else {
      setSwipeOffset(0);
      setIsSwipeActive(false);
    }
  };

  const handleRowClick = () => {
    if (suppressClickRef.current) return;
    onToggleExpand(song._id);
  };

  let itemStyle;
  if (collapseH !== null) {
    // Фаза видалення: одночасно від'їзд вліво, згасання і схлопування висоти
    itemStyle = {
      maxHeight: isLeaving ? 0 : collapseH,
      opacity: isLeaving ? 0 : 1,
      marginBottom: isLeaving ? 0 : undefined,
      transform: isLeaving ? 'translateX(-100%)' : 'translateX(0)',
      transition:
        'max-height 0.34s ease, opacity 0.28s ease, transform 0.34s ease, margin 0.34s ease',
    };
  } else {
    itemStyle = {
      transform: isSwipeActive ? `translateX(${swipeOffset}px)` : 'translateX(0)',
      transition: isSwipeActive ? 'none' : 'transform 0.2s ease-out',
    };
  }

  // Показуємо індикатор видалення при свайпі вліво
  const getSwipeIndicator = () => {
    if (!isSwipeActive || swipeOffset >= -30) return null;

    return (
      <div
        className="bv-swipe-indicator bv-swipe-remove"
        style={{ opacity: Math.min(Math.abs(swipeOffset) / 100, 1) }}
      >
        <FiTrash2 /> Видалити
      </div>
    );
  };

  return (
    <article
      ref={setRefs}
      className={`bv-song ${isExpanded ? 'is-expanded' : ''} ${isDragging ? 'is-dragging' : ''} ${dropClass} ${isSwipeActive ? 'swiping' : ''} ${isLeaving ? 'is-leaving' : ''}`}
      draggable={canEdit}
      onDragStart={canEdit ? (e) => onDragStart(e, song) : undefined}
      onDragOver={canEdit ? (e) => onDragOver(e, song) : undefined}
      onDragLeave={canEdit ? onDragLeave : undefined}
      onDrop={canEdit ? (e) => onDrop(e, song) : undefined}
      onDragEnd={canEdit ? onDragEnd : undefined}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={itemStyle}
    >
      {getSwipeIndicator()}
      
      <div className="bv-song-row" onClick={handleRowClick}>
        {canEdit && (
          <span className="bv-drag-handle" title="Перетягнути">
            <FiMove />
          </span>
        )}
        <div className="bv-song-info">
          <h3 className="bv-song-title">{song.title}</h3>
          {song.author && <span className="bv-song-author">{song.author}</span>}
        </div>
        <div className="bv-song-actions">
          {currentSingSong === song._id ? (
            <button
              className={`bv-song-sing active ${singingIsMine ? 'mine' : 'by-other'}`}
              onClick={(e) => { e.stopPropagation(); onStopSinging(); }}
              title={singingIsMine ? 'Зупинити співання' : 'Цю пісню співає інша людина'}
            >
              <FiUsers />
            </button>
          ) : (
            <button
              className="bv-song-sing"
              onClick={(e) => { e.stopPropagation(); onSetSingSong(song); }}
              title="Співати разом"
            >
              <FiUsers />
            </button>
          )}
          <span className={`bv-expand-icon ${isExpanded ? 'rotated' : ''}`}>
            <FiChevronDown />
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="bv-song-expanded">
          <div className="bv-song-expanded-inner">
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
        </div>
      )}
    </article>
  );
});

const BookView = ({ onClose, songbookData, initialSingScrollSongId = null, scrollNonce = null }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { sings, refresh: refreshNowSinging } = useNowSinging();
  const { settings } = useSettings();
  const autoScrollEnabled = settings.autoScroll !== false;
  const [songbook, setSongbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [addMode, setAddMode] = useState(null);
  const [expandedSongId, setExpandedSongId] = useState(null);
  const [undoState, setUndoState] = useState(null); // { songId, title, timeoutId }
  const [undoVisible, setUndoVisible] = useState(false); // для анімації появи/зникнення
  const [currentSingSong, setCurrentSingSong] = useState(null); // поточна пісня для співу
  const [singingByEmail, setSingingByEmail] = useState(null); // хто саме зараз веде спів

  // Drag and drop state
  const [draggedSong, setDraggedSong] = useState(null);
  const [dragOverSongId, setDragOverSongId] = useState(null);
  const [dragPosition, setDragPosition] = useState(null); // 'before' | 'after'

  // Навігація по розділах (ліва колонка)
  const [activeGroup, setActiveGroup] = useState(null);

  // Алфавітний індекс (лише мобільна версія)
  const [indexLetter, setIndexLetter] = useState(null); // активна літера під пальцем
  const [indexActive, setIndexActive] = useState(false); // чи торкається користувач індексу

  const scrollRef = useRef(null);
  const songRefs = useRef({});
  const sectionRefs = useRef({});
  const alphaRef = useRef(null);
  // Зберігає позицію клікнутого рядка, щоб компенсувати зсув при згортанні/розгортанні
  const pendingAnchor = useRef(null);

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

  // Плавний скрол до ПОЧАТКУ пісні всередині вікна перегляду.
  // Вирівнюємо верх рядка пісні до верху області прокрутки (з невеликим
  // відступом), а не центруємо — інакше довга розгорнута пісня опиняється
  // на кілька рядків нижче свого початку.
  // Мапа songId -> ключ розділу, щоб при автопрокрутці підсвітити правильний
  // розділ (працює і між різними розділами).
  const songSectionKeyRef = useRef({});

  const scrollToSong = useCallback((songId) => {
    const scroller = scrollRef.current;
    if (!scroller || !songId) return;

    // Одразу переходимо на розділ пісні — критично, коли спів перемикається
    // між розділами (інакше активним лишається старий розділ).
    const key = songSectionKeyRef.current[songId];
    if (key) setActiveGroup(key);

    const computeTop = (el) =>
      Math.max(
        el.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop -
          8,
        0
      );

    // Пісня може бути в іншому розділі й ще не встигнути відрендеритись/
    // розгорнутись — пробуємо кілька разів, потім коригуємо позицію після
    // завершення анімації розгортання (0.3s), щоб точно стати на початок пісні.
    let attempts = 0;
    const tryScroll = (behavior) => {
      const el = songRefs.current[songId];
      if (!el) {
        if (attempts++ < 15) setTimeout(() => tryScroll(behavior), 60);
        return;
      }
      scroller.scrollTo({ top: computeTop(el), behavior });
    };

    tryScroll('smooth');
    // Коригуючий скрол після можливих змін розкладки (розгортання пісні,
    // згортання попередньої в іншому розділі).
    setTimeout(() => {
      const el = songRefs.current[songId];
      if (el) scroller.scrollTo({ top: computeTop(el), behavior: 'smooth' });
    }, 420);
  }, []);

  // Остання пісня, до якої ми вже проскролили. Захищає від повторних скролів
  // на кожному опитуванні — скролимо лише коли "співають зараз" змінюється.
  const lastScrolledSingRef = useRef(null);

  // Один раз після першого завантаження підхоплюємо поточну "співають зараз"
  // пісню з сервера (для кольору/активного стану). Скрол при відкритті НЕ
  // робимо: перехід до пісні виконує лише клік по значку співу (значок "2",
  // обробляється ефектом за scrollNonce нижче). Клік по тілу картки (значок
  // "1") відкриває співаник без стрибка до пісні.
  const singInitializedRef = useRef(false);
  useEffect(() => {
    if (!songbook || singInitializedRef.current) return;
    singInitializedRef.current = true;

    const singingId = songbook.nowSinging?.songId || null;
    if (singingId) {
      setCurrentSingSong(singingId);
      setSingingByEmail(songbook.nowSinging?.startedByEmail || null);
    }

    // Позначаємо поточну пісню як уже опрацьовану, щоб пасивний автоскрол
    // (ефект контексту нижче) не стрибав до неї при відкритті, а спрацьовував
    // лише коли пісню ЗМІНЯТЬ на іншу вже після відкриття.
    lastScrolledSingRef.current = singingId;
  }, [songbook]);

  // Прокрутка до пісні за явним запитом (клік по індикатору/чипу/картці).
  // Реагує на scrollNonce, тож повторні кліки — навіть по тому самому
  // співанику, що вже відкритий — щоразу прокручують до пісні.
  const lastScrollNonceRef = useRef(null);
  useEffect(() => {
    if (!songbook) return;
    if (!scrollNonce || !initialSingScrollSongId) return;
    if (lastScrollNonceRef.current === scrollNonce) return;
    lastScrollNonceRef.current = scrollNonce;

    lastScrolledSingRef.current = initialSingScrollSongId;
    setExpandedSongId(initialSingScrollSongId);
    setTimeout(() => scrollToSong(initialSingScrollSongId), 250);
  }, [songbook, scrollNonce, initialSingScrollSongId, scrollToSong]);

  // Єдине джерело правди про "хто зараз співає" — агрегований стан із
  // NowSingingContext (той самий, що живить чипи в хедері). Завдяки цьому колір
  // кнопки біля пісні та колір чипа в хедері завжди однакові й оновлюються
  // разом на кожному опитуванні, зокрема коли статус змінює інша людина.
  const contextSinging = useMemo(() => {
    const id = songbookData?._id?.toString();
    if (!id) return null;
    return sings.find((s) => s.songbookId?.toString() === id) || null;
  }, [sings, songbookData]);

  // Синхронізуємо локальний стан співу з контекстом. Коли хтось інший починає/
  // зупиняє спів або змінює пісню, контекст оновлюється — і тут одразу
  // перемальовується активна пісня, колір (мій/чужий) та (за потреби) автоскрол.
  useEffect(() => {
    const singingId = contextSinging?.songId ? contextSinging.songId.toString() : null;
    setCurrentSingSong(singingId);
    setSingingByEmail(contextSinging?.startedByEmail || null);

    // Автоскрол лише ПІСЛЯ первинної ініціалізації (щоб при відкритті не
    // стрибати до поточної пісні — це робота значка "2") і лише коли пісню
    // дійсно змінили на іншу.
    if (!singInitializedRef.current) return;

    if (singingId && singingId !== lastScrolledSingRef.current) {
      lastScrolledSingRef.current = singingId;
      // Пасивна автопрокрутка (хтось інший почав співати іншу пісню) — лише
      // якщо увімкнено в налаштуваннях акаунта.
      if (autoScrollEnabled) {
        setExpandedSongId(singingId);
        setTimeout(() => scrollToSong(singingId), 150);
      }
    } else if (!singingId) {
      lastScrolledSingRef.current = null;
    }
  }, [contextSinging, autoScrollEnabled, scrollToSong]);

  // Очищуємо таймер при закритті
  useEffect(() => {
    return () => {
      if (undoState?.timeoutId) {
        clearTimeout(undoState.timeoutId);
      }
    };
  }, [undoState]);

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
      // Розділи завжди за алфавітом
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
      .forEach((sec) => {
        const songs = getEntries(sec._id);
        if (songs.length) {
          groups.push({ id: sec._id, name: sec.name, icon: sec.icon || '🎵', songs });
        }
      });
    return groups;
  }, [songbook]);

  const flatSongs = useMemo(() => groupedSongs.flatMap((g) => g.songs), [groupedSongs]);

  // ---- Алфавітний індекс: лише ті літери, на які є пісні ----
  const alphaLetters = useMemo(() => {
    const set = new Set();
    flatSongs.forEach((s) => set.add(getFirstLetter(s.title)));
    return [...set].sort((a, b) => a.localeCompare(b, 'uk'));
  }, [flatSongs]);

  // Перша пісня (у поточному порядку списку) для кожної літери — до неї скролимо.
  const letterToSongId = useMemo(() => {
    const map = {};
    flatSongs.forEach((s) => {
      const l = getFirstLetter(s.title);
      if (!(l in map)) map[l] = s._id;
    });
    return map;
  }, [flatSongs]);

  // Тримаємо мапу songId -> ключ розділу актуальною для автопрокрутки.
  useEffect(() => {
    const map = {};
    groupedSongs.forEach((g) => {
      const key = g.id ? g.id.toString() : 'no-section';
      g.songs.forEach((s) => { map[s._id] = key; });
    });
    songSectionKeyRef.current = map;
  }, [groupedSongs]);

  // ---- Навігація по розділах ----
  const groupKey = (id) => (id ? id.toString() : 'no-section');

  const scrollToGroup = (groupId) => {
    const scroller = scrollRef.current;
    const el = sectionRefs.current[groupKey(groupId)];
    if (!scroller || !el) return;

    const offset =
      el.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;

    scroller.scrollTo({ top: Math.max(offset - 8, 0), behavior: 'smooth' });
    setActiveGroup(groupKey(groupId));
  };

  // Підсвічуємо розділ, заголовок якого зараз найвище у видимій області
  const updateActiveGroup = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || groupedSongs.length === 0) return;

    const base = scroller.getBoundingClientRect().top;
    let current = groupKey(groupedSongs[0].id);

    groupedSongs.forEach((group) => {
      const el = sectionRefs.current[groupKey(group.id)];
      if (!el) return;
      if (el.getBoundingClientRect().top - base <= 24) {
        current = groupKey(group.id);
      }
    });

    setActiveGroup((prev) => (prev === current ? prev : current));
  }, [groupedSongs]);

  useEffect(() => {
    updateActiveGroup();
  }, [updateActiveGroup]);

  // ---- Права доступу ----
  const isOwner = () => {
    if (!currentUser || !songbook || !songbook.owner) return false;
    
    const ownerId = typeof songbook.owner === 'object' ? songbook.owner._id : songbook.owner;
    const userId = currentUser._id;
    
    return ownerId === userId;
  };

  const canEditSongbook = () => {
    if (!currentUser || !songbook) return false;
    
    console.log('BookView canEditSongbook check:', {
      currentUser: currentUser.email,
      songbook: {
        title: songbook.title,
        privacy: songbook.privacy,
        defaultPermissions: songbook.defaultPermissions,
        owner: songbook.owner?.email,
        sharedWith: songbook.sharedWith
      }
    });
    
    // Власник завжди може редагувати
    if (isOwner()) {
      console.log('BookView access: owner can edit');
      return true;
    }
    
    // Перевіряємо права в sharedWith (для всіх типів приватності)
    if (songbook.sharedWith) {
      const sharedEntry = songbook.sharedWith.find((share) => 
        share.email === currentUser.email?.toLowerCase()
      );
      if (
        sharedEntry &&
        (sharedEntry.permissions === 'edit' || sharedEntry.permissions === 'full')
      ) {
        console.log('BookView access: explicit edit permission', sharedEntry);
        return true;
      }
    }
    
    // Для публічних та nearby співаників перевіряємо defaultPermissions
    if (songbook.privacy === 'public' || songbook.privacy === 'nearby') {
      const canEditGlobal =
        songbook.defaultPermissions === 'edit' ||
        songbook.defaultPermissions === 'full';
      console.log('BookView access: checking defaultPermissions', {
        privacy: songbook.privacy,
        defaultPermissions: songbook.defaultPermissions,
        canEditGlobal
      });
      return canEditGlobal;
    }
    
    console.log('BookView access: denied');
    return false;
  };

  // ---- Toggle expand ----
  const handleToggleExpand = (songId) => {
    const scroller = scrollRef.current;
    const el = songRefs.current[songId];

    // Запам'ятовуємо поточну позицію клікнутого рядка відносно вікна прокрутки,
    // щоб після зміни розкладки (згортання попередньої пісні тощо) повернути
    // його рівно на те саме місце — сторінка не "стрибає".
    if (scroller && el) {
      pendingAnchor.current = {
        id: songId,
        top: el.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
      };
    }

    setExpandedSongId((prev) => (prev === songId ? null : songId));
  };

  // Після оновлення DOM повертаємо клікнутий рядок на його попередню позицію.
  // Текст пісні при цьому розкривається вниз (анімація grid у CSS), а сам
  // рядок залишається візуально нерухомим.
  useLayoutEffect(() => {
    const anchor = pendingAnchor.current;
    if (!anchor) return;
    pendingAnchor.current = null;

    const scroller = scrollRef.current;
    const el = songRefs.current[anchor.id];
    if (!scroller || !el) return;

    const newTop = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    const diff = newTop - anchor.top;
    if (Math.abs(diff) > 0.5) {
      const prevBehavior = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = 'auto'; // миттєво, без плавного зсуву
      scroller.scrollTop += diff;
      scroller.style.scrollBehavior = prevBehavior;
    }
  }, [expandedSongId]);

  // ---- Видалення пісні зі співаника з undo функціональністю ----
  const handleRemoveSong = async (song, e) => {
    if (e) e.stopPropagation();
    if (!song?._id) return;

    // Якщо вже є активний undo, скасовуємо його
    if (undoState) {
      clearTimeout(undoState.timeoutId);
      setUndoVisible(false);
      setTimeout(() => setUndoState(null), 300); // чекаємо завершення анімації зникнення
    }

    // Відразу приховуємо пісню з UI
    const updatedSongs = songbook.songs.filter(s => {
      const songId = s.song?._id || s.song;
      return songId?.toString() !== song._id.toString();
    });
    
    setSongbook(prev => ({ ...prev, songs: updatedSongs }));

    // Згортаємо пісню, якщо вона була розкрита
    if (expandedSongId === song._id) {
      setExpandedSongId(null);
    }

    // Видалення діє ЛИШЕ в межах поточної сесії — у базу не зберігаємо.
    // Через 10 секунд просто ховаємо toast (пісня лишається прихованою на сесію).
    const timeoutId = setTimeout(() => {
      setUndoVisible(false);
      setTimeout(() => setUndoState(null), 300);
    }, 10000);

    // Зберігаємо стан для можливості відміни
    const newUndoState = {
      songId: song._id,
      title: song.title,
      timeoutId,
      originalSongs: songbook.songs // зберігаємо оригінальний список
    };
    
    setUndoState(newUndoState);
    
    // Показуємо toast з невеликою затримкою для плавної анімації
    setTimeout(() => setUndoVisible(true), 50);
  };

  // Функція для відміни видалення
  const handleUndoRemove = () => {
    if (!undoState) return;

    // Скасовуємо таймер
    clearTimeout(undoState.timeoutId);
    
    // Повертаємо оригінальний список пісень
    setSongbook(prev => ({ ...prev, songs: undoState.originalSongs }));
    
    // Анімовано приховуємо toast
    setUndoVisible(false);
    setTimeout(() => setUndoState(null), 300);
  };

  // ---- Встановлення пісні для співу (синхронізується з усіма) ----
  const handleSetSingSong = async (song) => {
    // Оптимістично оновлюємо локально — інші побачать через опитування
    setCurrentSingSong(song._id);
    setSingingByEmail(currentUser?.email || null);
    lastScrolledSingRef.current = song._id;
    setExpandedSongId(song._id);
    setTimeout(() => scrollToSong(song._id), 100);

    try {
      await songbooksAPI.setNowSinging(songbook._id, song._id);
      // Оновлюємо агрегований індикатор у хедері одразу
      refreshNowSinging();
    } catch (error) {
      console.error('Error setting sing song:', error);
    }
  };

  // ---- Скасування співу (синхронізується з усіма) ----
  const handleStopSinging = async () => {
    setCurrentSingSong(null);
    setSingingByEmail(null);
    lastScrolledSingRef.current = null;
    try {
      await songbooksAPI.stopNowSinging(songbook._id);
      refreshNowSinging();
    } catch (error) {
      console.error('Error stopping singing:', error);
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

  const handleDrop = (e, targetSong) => {
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

    // Зміна порядку діє ЛИШЕ в межах поточної сесії — у базу не зберігаємо.
    setSongbook((prev) => ({
      ...prev,
      songs: reorderSongsLocally(prev.songs, draggedSong._id, targetSectionId, insertAt),
    }));

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

  // ---- Алфавітний індекс (мобільний) ----
  // Визначаємо літеру за вертикальним положенням пальця над смугою.
  const letterFromTouchY = (clientY) => {
    const strip = alphaRef.current;
    if (!strip || alphaLetters.length === 0) return null;
    const rect = strip.getBoundingClientRect();
    const perLetter = rect.height / alphaLetters.length;
    let idx = Math.floor((clientY - rect.top) / perLetter);
    idx = Math.max(0, Math.min(alphaLetters.length - 1, idx));
    return alphaLetters[idx];
  };

  const scrollToLetter = (letter) => {
    const id = letterToSongId[letter];
    if (id) scrollToSong(id);
  };

  const handleAlphaStart = (e) => {
    setIndexActive(true);
    const l = letterFromTouchY(e.touches[0].clientY);
    if (l) setIndexLetter(l);
  };

  const handleAlphaMove = (e) => {
    const l = letterFromTouchY(e.touches[0].clientY);
    // Літера змінюється відповідно до напрямку руху пальця
    if (l) setIndexLetter((prev) => (prev === l ? prev : l));
  };

  const handleAlphaEnd = () => {
    // Як тільки палець відпущено — скролимо до відповідної пісні
    if (indexLetter) scrollToLetter(indexLetter);
    setIndexActive(false);
    // Ховаємо збільшену літеру трохи згодом (плавне зникнення)
    setTimeout(() => setIndexLetter(null), 250);
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

  // Додавання пісні діє ЛИШЕ в межах поточної сесії — у базу не зберігаємо.
  // AddSongsModal передає повний об'єкт пісні, тож будуємо запис локально.
  const handleSongAdded = (newSong, sectionId) => {
    if (!newSong?._id) return; // видалення обробляється окремо (onSongRemoved)

    setSongbook((prev) => {
      const already = prev.songs.some((s) => {
        const sid = s.song?._id || s.song;
        return sid?.toString() === newSong._id.toString();
      });
      if (already) return prev;

      const targetSectionId = sectionId && sectionId.trim() ? sectionId : null;
      const targetKey = targetSectionId ? targetSectionId.toString() : null;

      const maxOrder = prev.songs
        .filter((s) => {
          const sKey = s.section ? s.section.toString() : null;
          return sKey === targetKey;
        })
        .reduce((m, s) => Math.max(m, s.order || 0), -1);

      const entry = { song: newSong, section: targetSectionId, order: maxOrder + 1 };
      let songs = [...prev.songs, entry];

      // "Додати після поточної" — ставимо одразу за розгорнутою піснею
      // у її розділі (теж лише локально).
      if (addMode === 'after' && expandedSongId) {
        const currentEntry = prev.songs.find((s) => {
          const sid = s.song?._id || s.song;
          return sid?.toString() === expandedSongId.toString();
        });

        if (currentEntry) {
          const secId = currentEntry.section || null;
          const secKey = secId ? secId.toString() : null;
          const secEntries = prev.songs
            .filter((s) => {
              const sKey = s.section ? s.section.toString() : null;
              return sKey === secKey;
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          const idxOfCurrent = secEntries.findIndex((s) => {
            const sid = s.song?._id || s.song;
            return sid?.toString() === expandedSongId.toString();
          });
          if (idxOfCurrent !== -1) {
            songs = reorderSongsLocally(songs, newSong._id, secId, idxOfCurrent + 1);
          }
        }
      }

      return { ...prev, songs };
    });
  };

  // Видалення пісні з панелі додавання — лише в межах поточної сесії.
  const handleSongRemovedFromPanel = (song) => {
    if (!song?._id) return;
    setSongbook((prev) => ({
      ...prev,
      songs: prev.songs.filter((s) => {
        const sid = s.song?._id || s.song;
        return sid?.toString() !== song._id.toString();
      }),
    }));
    if (expandedSongId === song._id) setExpandedSongId(null);
  };

  // Чи веду спів саме я (для кольору кнопки: зелений — мій, жовтий — чужий)
  const singingIsMine = !!currentUser?.email && singingByEmail === currentUser.email;

  // ---- Render ----
  if (loading) {
    return (
      <div className={`book-view ${isClosing ? 'closing' : ''}`}>
        <MusicalNoteLoader text="Завантаження..." />
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
          <div className="bv-header-top">
            <div className="bv-title">
              <FiMusic className="bv-title-icon" />
              <span className="bv-title-text">{songbook.title}</span>
            </div>
            <NowSingingBar className="bv-singing" />
            <button className="bv-close" onClick={handleClose} aria-label="Закрити">
              <FiX />
            </button>
          </div>
        </header>

        {/* Body: ліва навігація по розділах + прокручуваний вміст */}
        <div className="bv-body">
          {groupedSongs.length > 1 && (
            <nav className="bv-sections" aria-label="Розділи співаника">
              {groupedSongs.map((group) => {
                const key = groupKey(group.id);
                return (
                  <button
                    type="button"
                    key={key}
                    className={`bv-section-link ${activeGroup === key ? 'active' : ''}`}
                    onClick={() => scrollToGroup(group.id)}
                    title={group.name}
                  >
                    <span className="bv-section-link-name">{group.name}</span>
                    <span className="bv-section-link-count">{group.songs.length}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <div className="bv-scroll" ref={scrollRef} onScroll={updateActiveGroup}>
          {flatSongs.length === 0 ? (
            <div className="bv-empty">
              <div className="bv-empty-icon">🎶</div>
              <p>У цьому співанику ще немає пісень</p>
              {canEditSongbook() && (
                <button className="bv-btn primary" onClick={openAddEnd}>
                  <FiPlus /> Додати першу пісню
                </button>
              )}
            </div>
          ) : (
            groupedSongs.map((group) => (
              <section
                key={groupKey(group.id)}
                className="bv-section"
                ref={(el) => { sectionRefs.current[groupKey(group.id)] = el; }}
              >
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
                    <SongItem
                      key={song._id}
                      song={song}
                      isExpanded={isExpanded}
                      isDragging={isDragging}
                      dropClass={dropClass}
                      canEdit={canEditSongbook()}
                      showChords={showChords}
                      currentSingSong={currentSingSong}
                      singingIsMine={singingIsMine}
                      onToggleExpand={handleToggleExpand}
                      onRemoveSong={handleRemoveSong}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      onSetSingSong={handleSetSingSong}
                      onStopSinging={handleStopSinging}
                      ref={(el) => { songRefs.current[song._id] = el; }}
                    />
                  );
                })}
              </section>
            ))
          )}
          </div>

          {/* Алфавітний індекс (лише мобільна версія) */}
          {alphaLetters.length > 1 && (
            <div
              className="bv-alpha-index"
              ref={alphaRef}
              onTouchStart={handleAlphaStart}
              onTouchMove={handleAlphaMove}
              onTouchEnd={handleAlphaEnd}
              onTouchCancel={handleAlphaEnd}
            >
              {alphaLetters.map((letter) => (
                <span
                  key={letter}
                  className={`bv-alpha-letter ${indexLetter === letter ? 'active' : ''}`}
                >
                  {letter}
                </span>
              ))}
            </div>
          )}

          {/* Збільшена літера під час дотику */}
          {indexActive && indexLetter && (
            <div className="bv-alpha-bubble">{indexLetter}</div>
          )}
        </div>

        {/* Footer */}
        <footer className="bv-footer">
          <button
            className={`bv-btn ${showChords ? 'active' : ''}`}
            onClick={() => setShowChords((v) => !v)}
            title={showChords ? 'Сховати акорди' : 'Показати акорди'}
          >
            <FaGuitar />
            <span>{showChords ? 'Сховати акорди' : 'Показати акорди'}</span>
          </button>

          {canEditSongbook() && (
            <>
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
            </>
          )}
        </footer>

        {addMode && canEditSongbook() && (
          <div className="bv-add-panel">
            <AddSongsModal
              embedded
              sessionOnly
              songbook={songbook}
              isOpen={true}
              onClose={() => setAddMode(null)}
              onSongAdded={handleSongAdded}
              onSongRemoved={handleSongRemovedFromPanel}
            />
          </div>
        )}

        {/* Undo повідомлення */}
        {undoState && (
          <div className={`bv-undo-toast ${undoVisible ? 'visible' : ''}`}>
            <span className="bv-undo-text">
              Пісню "{undoState.title}" видалено
            </span>
            <button 
              className="bv-undo-btn" 
              onClick={handleUndoRemove}
            >
              Відмінити
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookView;
