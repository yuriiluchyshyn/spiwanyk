import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { songbooksAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';


// Компоненти
import SongbookHeader from '../SongbookHeader/SongbookHeader';
import SectionsNavigation, { NO_SECTION } from '../SectionsNavigation/SectionsNavigation';
import SongsList, { SongGroup } from '../SongsList/SongsList';
import LoadingState from '../LoadingState/LoadingState';
import ErrorState from '../ErrorState/ErrorState';
import AddSongsModal from '../AddSongsModal';
import SectionManager from '../SectionManager';
import UndoToast from '../../Common/UndoToast';
import { FiX, FiMove } from 'react-icons/fi';
import useSongDragDrop, { DraggedSong, SongDropTarget } from './useSongDragDrop';

import './SongbookDetail.css';

interface Song {
  _id: string;
  title: string;
  author?: string;
  sectionId?: string;
  _songbookEntry?: any;
  metadata?: {
    performer?: string;
    words?: string;
  };
}

const SongbookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [songbook, setSongbook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>(NO_SECTION);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  // Сортувати пісні за алфавітом у межах кожного розділу.
  // Початкове значення береться зі співаника й зберігається в БД при перемиканні.
  const [sortAlpha, setSortAlpha] = useState(false);

  // Пісні, що зараз програють анімацію зникнення (після переміщення в інший розділ).
  // Тримаємо їх у списку ще ~400мс, щоб CSS встиг згорнути елемент, а вже потім
  // перезавантажуємо співаник із сервера.
  const [leavingSongIds, setLeavingSongIds] = useState<Set<string>>(new Set());
  const LEAVE_ANIM_MS = 400;

  // Undo-видалення пісні: показуємо тост, а фактичне видалення на сервері
  // відкладаємо, щоб дію можна було скасувати.
  const [songUndo, setSongUndo] = useState<{ message: string } | null>(null);
  const [songUndoVisible, setSongUndoVisible] = useState(false);
  const songUndoCommitTimer = useRef<number | null>(null);
  const songUndoHideTimer = useRef<number | null>(null);
  // Відкладене видалення: пам'ятаємо, що саме прибрати і як відновити
  const pendingSongDeleteRef = useRef<{ songId: string; songbookId: string; backupSongs: any[] } | null>(null);
  const SONG_UNDO_MS = 5000;

  // Висота липкої навігації — щоб заголовки розділів прилипали одразу під нею
  const [navHeight, setNavHeight] = useState(0);
  // Висота головного хедера сайту (він теж sticky зверху) — навігація розділів
  // має прилипати саме під ним, а не ховатись за ним
  const [headerHeight, setHeaderHeight] = useState(0);

  // Коротке підтвердження переміщення (пісня зникає з поточного списку —
  // без нього незрозуміло, куди вона поділась)
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const moveNoticeTimer = useRef<number | null>(null);

  // Реєстр DOM-елементів пісень + якір для збереження позиції сторінки при розгортанні
  const songRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingAnchor = useRef<{ id: string; top: number } | null>(null);

  // Реєстр заголовків груп (розділів) для скролу та scroll-spy
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement | null>(null);
  // Поки триває програмний плавний скрол до розділу — не даємо scroll-spy миготіти
  const programmaticScrollUntil = useRef<number>(0);

  const registerGroupRef = (groupId: string, el: HTMLElement | null) => {
    groupRefs.current[groupId] = el;
  };

  // Відстань від верху вікна до місця, де має опинятись заголовок розділу:
  // під головним хедером сайту і під навігацією розділів
  const getNavOffset = (): number => headerHeight + navHeight;

  // Стежимо за висотою навігації (вона змінюється, коли таби переносяться на
  // кілька рядків), щоб заголовки розділів прилипали точно під нею
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      setNavHeight(0);
      return;
    }
    const measure = () => setNavHeight(nav.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [songbook]);

  // Стежимо за висотою головного хедера сайту (position: sticky зверху).
  // NowSingingBar усередині нього може з'являтись/зникати — тому ResizeObserver.
  useLayoutEffect(() => {
    const header = document.querySelector('.header') as HTMLElement | null;
    if (!header) {
      setHeaderHeight(0);
      return;
    }
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Клік по табу розділу: підсвічуємо і плавно скролимо до його пісень
  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);

    const el = groupRefs.current[sectionId];
    if (!el) return;

    const navOffset = getNavOffset();
    const y = el.getBoundingClientRect().top + window.scrollY - navOffset - 8;

    programmaticScrollUntil.current = Date.now() + 800;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const showMoveNotice = (text: string) => {
    setMoveNotice(text);
    if (moveNoticeTimer.current) window.clearTimeout(moveNoticeTimer.current);
    moveNoticeTimer.current = window.setTimeout(() => setMoveNotice(null), 2600);
  };

  useEffect(() => () => {
    if (moveNoticeTimer.current) window.clearTimeout(moveNoticeTimer.current);
    if (songUndoCommitTimer.current) window.clearTimeout(songUndoCommitTimer.current);
    if (songUndoHideTimer.current) window.clearTimeout(songUndoHideTimer.current);
    // Якщо лишилось невідкладене видалення — фіксуємо його на сервері,
    // щоб не втратити дію при закритті сторінки.
    const pending = pendingSongDeleteRef.current;
    if (pending) {
      pendingSongDeleteRef.current = null;
      songbooksAPI.removeSong(pending.songbookId, pending.songId).catch(() => {});
    }
  }, []);

  const sectionNameById = (sectionId: string | null): string => {
    if (!sectionId) return 'Без розділу';
    const found = (songbook?.sections || []).find(
      (s: any) => s._id?.toString() === sectionId
    );
    return found?.name || 'розділ';
  };

  useEffect(() => {
    const loadSongbook = async () => {
      if (!id) return;
      
      try {
        const data = await songbooksAPI.getById(id);
        console.log('Loaded songbook:', data);
        console.log('Current user:', user);
        setSongbook(data);
        setSortAlpha(data?.songSort === 'alpha');
      } catch (error) {
        console.error('Error loading songbook:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSongbook();
  }, [id, user]);

  // Якщо активний розділ зник (видалили) — повертаємось на «Без розділу»
  useEffect(() => {
    if (!songbook || activeSection === NO_SECTION) return;
    const exists = (songbook.sections || []).some(
      (s: any) => s._id?.toString() === activeSection
    );
    if (!exists) setActiveSection(NO_SECTION);
  }, [songbook, activeSection]);

  // Scroll-spy: під час прокрутки підсвічуємо розділ, чиї пісні зараз угорі.
  useEffect(() => {
    if (!songbook?.sections || songbook.sections.length === 0) return;

    const orderedIds: string[] = [
      NO_SECTION,
      ...[...songbook.sections]
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'uk'))
        .map((s: any) => s._id?.toString())
        .filter(Boolean)
    ];

    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      if (Date.now() < programmaticScrollUntil.current) return;

      const navBottom = navRef.current
        ? navRef.current.getBoundingClientRect().bottom
        : 0;
      const line = navBottom + 12;

      let current = orderedIds[0];
      for (const gid of orderedIds) {
        const el = groupRefs.current[gid];
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) {
          current = gid;
        } else {
          break;
        }
      }

      setActiveSection((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (rafId === null) rafId = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Первинна синхронізація
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [songbook]);

  const loadSongbook = async () => {
    if (!id) return;
    
    try {
      const data = await songbooksAPI.getById(id);
      setSongbook(data);
    } catch (error) {
      console.error('Error loading songbook:', error);
    }
  };

  // Позначає пісню як «зникаючу» (CSS програє згортання), чекає завершення
  // анімації, після чого перезавантажує співаник — тоді пісня зникає остаточно.
  const removeWithLeaveAnimation = (songId: string) =>
    new Promise<void>((resolve) => {
      setLeavingSongIds((prev) => {
        const next = new Set(prev);
        next.add(songId);
        return next;
      });

      window.setTimeout(async () => {
        await loadSongbook();
        setLeavingSongIds((prev) => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
        resolve();
      }, LEAVE_ANIM_MS);
    });

  // Після оновлення DOM повертаємо клікнутий рядок на його попередню позицію.
  // Текст пісні розкривається вниз (CSS-анімація), а рядок лишається нерухомим.
  useLayoutEffect(() => {
    const anchor = pendingAnchor.current;
    if (!anchor) return;
    pendingAnchor.current = null;

    const el = songRefs.current[anchor.id];
    if (!el) return;

    const newTop = el.getBoundingClientRect().top;
    const diff = newTop - anchor.top;
    if (Math.abs(diff) > 0.5) {
      window.scrollBy({ top: diff, behavior: 'auto' });
    }
  }, [expandedSongId]);

  const handleSongAdded = () => {
    loadSongbook();
  };

  const handleSectionAdded = () => {
    loadSongbook();
  };

  const handleSectionRemoved = () => {
    loadSongbook();
  };

  // Розгортання/згортання пісні прямо в списку (акордеон — одна активна за раз).
  // Перед зміною стану запам'ятовуємо позицію клікнутого рядка, щоб після
  // перебудови розкладки повернути його на те саме місце — сторінка не "стрибає".
  const handleToggleSong = (song: Song) => {
    const el = songRefs.current[song._id];
    if (el) {
      pendingAnchor.current = { id: song._id, top: el.getBoundingClientRect().top };
    }
    setExpandedSongId(prev => (prev === song._id ? null : song._id));
  };

  const registerSongRef = (songId: string, el: HTMLElement | null) => {
    songRefs.current[songId] = el;
  };

  // Перемикання сортування за алфавітом + збереження в БД (оптимістично)
  const handleToggleSort = async () => {
    if (!songbook) return;
    const next = !sortAlpha;
    setSortAlpha(next);
    try {
      await songbooksAPI.setSongSort(songbook._id, next ? 'alpha' : 'manual');
      setSongbook((prev: any) =>
        prev ? { ...prev, songSort: next ? 'alpha' : 'manual' } : prev
      );
    } catch (error) {
      // Не вдалося зберегти — повертаємо попередній стан
      setSortAlpha(!next);
      console.error('Error saving song sort:', error);
      const responseMessage = (error as any).response?.data?.message;
      alert('Не вдалося зберегти сортування: ' + (responseMessage || 'спробуйте ще раз'));
    }
  };

  const handleDeleteSongbook = async () => {
    console.log('handleDeleteSongbook called');
    if (!songbook) return;
    
    const confirmMessage = `Ви впевнені, що хочете видалити співаник "${songbook.title}"?\n\nЦя дія незворотна і видалить:\n- Весь співаник\n- Всі розділи\n- Всі пісні зі співаника\n\nСамі пісні залишаться в загальній базі.`;
    
    console.log('Showing confirmation dialog');
    if (!window.confirm(confirmMessage)) {
      console.log('User cancelled deletion');
      return;
    }
    
    console.log('User confirmed deletion, proceeding...');
    try {
      console.log('Calling songbooksAPI.delete with ID:', songbook._id);
      await songbooksAPI.delete(songbook._id);
      console.log('Delete successful, showing success message');
      alert(`Співаник "${songbook.title}" успішно видалено`);
      navigate('/my-songbooks');
    } catch (error) {
      console.error('Error deleting songbook:', error);
      
      let errorMessage = 'Невідома помилка';
      
      if (error instanceof Error) {
        const axiosError = error as any;
        if (axiosError.response) {
          errorMessage = axiosError.response.data?.message || axiosError.response.data?.error || `Помилка сервера: ${axiosError.response.status}`;
        } else if (axiosError.request) {
          errorMessage = 'Немає відповіді від сервера. Перевірте підключення до інтернету.';
        } else {
          errorMessage = error.message || 'Помилка при відправці запиту';
        }
      }
      
      const finalMessage = errorMessage.includes('Помилка видалення співаника') 
        ? errorMessage 
        : `Помилка видалення співаника: ${errorMessage}`;
      
      alert(finalMessage);
    }
  };

  // Ховаємо тост undo (з анімацією зникнення)
  const hideSongUndo = () => {
    if (songUndoHideTimer.current) window.clearTimeout(songUndoHideTimer.current);
    setSongUndoVisible(false);
    songUndoHideTimer.current = window.setTimeout(() => setSongUndo(null), 300);
  };

  // Остаточно видаляємо пісню на сервері (виконується, якщо undo не натиснули)
  const commitSongDelete = async () => {
    const pending = pendingSongDeleteRef.current;
    pendingSongDeleteRef.current = null;
    if (!pending) return;
    try {
      await songbooksAPI.removeSong(pending.songbookId, pending.songId);
    } catch (error) {
      console.error('Error removing song:', error);
      const responseMessage = (error as any).response?.data?.message;
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      alert('Помилка видалення пісні: ' + (responseMessage || errorMessage));
      // Не вдалося — повертаємо пісню назад зі списку
      await loadSongbook();
    }
  };

  const handleRemoveSong = (songId: string) => {
    if (!songbook) return;

    // Якщо вже є невідкладене видалення — спершу фіксуємо його на сервері
    if (pendingSongDeleteRef.current) {
      if (songUndoCommitTimer.current) window.clearTimeout(songUndoCommitTimer.current);
      commitSongDelete();
    }

    const entry = (songbook.songs || []).find((s: any) => {
      const sid = (s.song?._id || s.song)?.toString();
      return sid === songId.toString();
    });
    const title = entry?.song?.title || 'Пісню';

    // Запам'ятовуємо повний список для можливого відновлення
    const backupSongs = songbook.songs ? [...songbook.songs] : [];
    pendingSongDeleteRef.current = { songId, songbookId: songbook._id, backupSongs };

    // 1) Анімація зникнення рядка (виїзд вліво + згортання)
    setLeavingSongIds((prev) => new Set(prev).add(songId));

    // 2) Після анімації прибираємо пісню з локального списку (сервер поки не чіпаємо)
    window.setTimeout(() => {
      setSongbook((prev: any) =>
        prev
          ? {
              ...prev,
              songs: prev.songs.filter((s: any) => {
                const sid = (s.song?._id || s.song)?.toString();
                return sid !== songId.toString();
              }),
            }
          : prev
      );
      setLeavingSongIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
      if (expandedSongId === songId) setExpandedSongId(null);
    }, LEAVE_ANIM_MS);

    // 3) Тост undo
    if (songUndoHideTimer.current) window.clearTimeout(songUndoHideTimer.current);
    setSongUndo({ message: `«${title}» видалено` });
    window.setTimeout(() => setSongUndoVisible(true), 30);

    // 4) За SONG_UNDO_MS фіксуємо видалення на сервері
    if (songUndoCommitTimer.current) window.clearTimeout(songUndoCommitTimer.current);
    songUndoCommitTimer.current = window.setTimeout(() => {
      commitSongDelete();
      hideSongUndo();
    }, SONG_UNDO_MS);
  };

  const handleUndoRemoveSong = () => {
    if (songUndoCommitTimer.current) window.clearTimeout(songUndoCommitTimer.current);
    const pending = pendingSongDeleteRef.current;
    pendingSongDeleteRef.current = null;

    // Відновлюємо список пісень (сервер не чіпали — тож просто повертаємо стан)
    if (pending) {
      setLeavingSongIds((prev) => {
        const next = new Set(prev);
        next.delete(pending.songId);
        return next;
      });
      setSongbook((prev: any) => (prev ? { ...prev, songs: pending.backupSongs } : prev));
    }
    hideSongUndo();
  };

  // Записи songbook.songs, що належать заданому розділу, у порядку відображення
  const getSectionEntryIds = (sectionId: string | null): string[] =>
    (songbook?.songs || [])
      .filter((s: any) => {
        const sec = s.section ? s.section.toString() : null;
        return sec === sectionId;
      })
      .map((s: any) => (s.song?._id || s.song)?.toString())
      .filter(Boolean);

  // Єдина точка обробки drop: і переміщення в розділ, і зміна порядку
  const handleSongDrop = async (dragged: DraggedSong, target: SongDropTarget) => {
    if (!songbook) return;

    const fromSection = dragged.sectionId ? dragged.sectionId.toString() : null;
    let toSection: string | null;
    let insertAt: number;

    if (target.kind === 'section') {
      toSection = target.sectionId;
      if (fromSection === toSection) return;
      insertAt = getSectionEntryIds(toSection).length;
    } else {
      toSection = target.sectionId;
      const ids = getSectionEntryIds(toSection);
      const targetIdx = ids.indexOf(target.songId);
      if (targetIdx === -1) return;

      insertAt = target.position === 'before' ? targetIdx : targetIdx + 1;

      if (fromSection === toSection) {
        const draggedIdx = ids.indexOf(dragged._id);
        if (draggedIdx !== -1 && draggedIdx < insertAt) insertAt -= 1;
        if (draggedIdx === insertAt) return;
      }
    }

    if (insertAt < 0) insertAt = 0;

    try {
      await songbooksAPI.moveSong(songbook._id, dragged._id, toSection, insertAt);
      if (fromSection !== toSection) {
        // Пісня залишає поточний список — програємо анімацію зникнення
        await removeWithLeaveAnimation(dragged._id);
        showMoveNotice(`«${dragged.title}» → ${sectionNameById(toSection)}`);
      } else {
        // Зміна порядку в межах розділу — пісня лишається, просто оновлюємо
        await loadSongbook();
      }
    } catch (error) {
      console.error('Error moving song:', error);
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      const responseMessage = (error as any).response?.data?.message;
      alert('Помилка переміщення пісні: ' + (responseMessage || errorMessage));
    }
  };

  // Переміщення пісні в розділ через меню (працює на мобільних та десктопі)
  const handleMoveSongToSection = async (song: Song, targetSectionId: string | null) => {
    const normalizedTarget = targetSectionId || null;
    const currentSectionId = song.sectionId ? song.sectionId.toString() : null;

    if (currentSectionId === normalizedTarget) return;

    try {
      const sectionSongs = (songbook?.songs || []).filter((s: any) => {
        const sec = s.section ? s.section.toString() : null;
        return sec === normalizedTarget;
      });

      await songbooksAPI.moveSong(
        songbook._id,
        song._id,
        normalizedTarget,
        sectionSongs.length
      );

      // Пісня переїжджає в інший розділ — анімуємо її зникнення зі списку
      await removeWithLeaveAnimation(song._id);
      showMoveNotice(`«${song.title}» → ${sectionNameById(normalizedTarget)}`);
    } catch (error) {
      console.error('Error moving song to section:', error);
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      const responseMessage = (error as any).response?.data?.message;
      alert('Помилка переміщення пісні: ' + (responseMessage || errorMessage));
    }
  };

  // Усі пісні, згруповані по розділах: спершу «Без розділу», далі розділи
  // за алфавітом (той самий порядок, що й у навігації). Показуємо завжди все.
  const buildGroups = (): SongGroup[] => {
    if (!songbook?.songs) return [];

    const all: Song[] = songbook.songs
      .map((s: any) => s.song ? { ...s.song, sectionId: s.section, _songbookEntry: s } : null)
      .filter(Boolean);

    // За потреби сортуємо пісні за назвою (в межах кожного розділу).
    // Копіюємо масив, щоб не міняти вихідний порядок для drag&drop.
    const orderSongs = (list: Song[]): Song[] =>
      sortAlpha
        ? [...list].sort((a, b) =>
            (a.title || '').localeCompare(b.title || '', 'uk', { sensitivity: 'base' })
          )
        : list;

    const groups: SongGroup[] = [];

    groups.push({
      id: NO_SECTION,
      sectionId: null,
      name: 'Без розділу',
      icon: 'inbox',
      songs: orderSongs(all.filter((song) => !song.sectionId))
    });

    const sortedSections = [...(songbook.sections || [])].sort(
      (a: any, b: any) => a.name.localeCompare(b.name, 'uk')
    );

    for (const section of sortedSections) {
      const secId = section._id?.toString();
      if (!secId) continue;
      groups.push({
        id: secId,
        sectionId: secId,
        name: section.name,
        icon: 'folder',
        songs: orderSongs(
          all.filter(
            (song) => song.sectionId && song.sectionId.toString() === secId
          )
        )
      });
    }

    return groups;
  };

  const isOwner = () => {
    if (!user || !songbook || !songbook.owner) return false;
    
    // Перевіряємо різні формати owner
    const ownerId = typeof songbook.owner === 'object' ? songbook.owner._id : songbook.owner;
    const userId = user._id;
    
    console.log('Ownership check:', { 
      ownerId, 
      userId, 
      owner: songbook.owner, 
      user: user // тепер user буде правильний
    });
    
    return ownerId === userId;
  };

  const canEdit = () => {
    if (!user || !songbook) return false;
    
    console.log('SongbookDetail canEdit check:', {
      user: user.email,
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
      console.log('SongbookDetail access: owner can edit');
      return true;
    }
    
    // Перевіряємо права в sharedWith (для всіх типів приватності): edit або full
    if (songbook.sharedWith) {
      const sharedEntry = songbook.sharedWith.find((share: any) => 
        share.email === user.email?.toLowerCase()
      );
      if (sharedEntry && (sharedEntry.permissions === 'edit' || sharedEntry.permissions === 'full')) {
        console.log('SongbookDetail access: explicit edit/full permission', sharedEntry);
        return true;
      }
    }
    
    // Для публічних та nearby співаників перевіряємо defaultPermissions
    if (songbook.privacy === 'public' || songbook.privacy === 'nearby') {
      const canEditGlobal =
        songbook.defaultPermissions === 'edit' ||
        songbook.defaultPermissions === 'full';
      console.log('SongbookDetail access: checking defaultPermissions', {
        privacy: songbook.privacy,
        defaultPermissions: songbook.defaultPermissions,
        canEditGlobal
      });
      return canEditGlobal;
    }
    
    console.log('SongbookDetail access: denied');
    return false;
  };

  const canView = () => {
    if (!songbook) return false;
    
    // Власник завжди може переглядати
    if (user && isOwner()) return true;
    
    // Публічні співаники
    if (songbook.privacy === 'public') return true;
    
    // Для приватних співаників потрібна авторизація
    if (!user) return false;
    
    // Розшарені співаники
    if (songbook.privacy === 'shared' && songbook.sharedWith) {
      const sharedEntry = songbook.sharedWith.find((share: any) => 
        share.email === user.email?.toLowerCase()
      );
      return !!sharedEntry;
    }
    
    // Співаники поруч (тимчасово дозволяємо всім авторизованим)
    if (songbook.privacy === 'nearby') return true;
    
    return false;
  };

  // Перетягування: працює і мишкою, і пальцем (Pointer Events)
  const drag = useSongDragDrop({
    enabled: canEdit(),
    onDrop: handleSongDrop
  });

  const handleUpdateSongbook = async (updatedSongbook: any) => {
    console.log('handleUpdateSongbook called with:', updatedSongbook);
    
    // Оновлюємо основну інформацію одразу
    setSongbook((prev: any) => ({
      ...prev,
      ...updatedSongbook,
      // Зберігаємо пісні з попереднього стану, якщо вони не включені в оновлення
      songs: updatedSongbook.songs || prev?.songs || []
    }));
    
    // Перезавантажуємо повну інформацію про співаник з сервера
    try {
      console.log('Reloading songbook after settings update...');
      await loadSongbook();
    } catch (error) {
      console.error('Error reloading songbook after update:', error);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!songbook) {
    return <ErrorState />;
  }

  if (!canView()) {
    return (
      <div className="songbook-detail">
        <div style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '12px', 
          textAlign: 'center',
          margin: '2rem'
        }}>
          <h2>Доступ заборонено</h2>
          <p>У вас немає прав для перегляду цього співаника.</p>
          <Link to="/my-songbooks" style={{ color: 'var(--fire-orange)' }}>
            ← Назад до співаників
          </Link>
        </div>
      </div>
    );
  }

  const groups = buildGroups();
  const hasSections = !!(songbook.sections && songbook.sections.length > 0);
  const userCanEdit = canEdit();

  return (
    <div className="songbook-detail">
      <SongbookHeader
        songbook={songbook}
        currentUser={user}
        onShowAddSongs={() => setShowAddSongs(true)}
        onToggleSectionManager={() => setShowSectionManager(true)}
        onDeleteSongbook={handleDeleteSongbook}
        onUpdateSongbook={handleUpdateSongbook}
      />

      <div className="songbook-content">
        {hasSections && (
          <div
            className="sections-nav-sticky"
            ref={navRef}
            style={{ top: headerHeight }}
          >
            <SectionsNavigation
              sections={songbook.sections}
              activeSection={activeSection}
              songbook={songbook}
              dragOverSection={drag.sectionDropTarget}
              onSectionClick={handleSectionClick}
              isDragging={drag.isDragging}
              sortAlpha={sortAlpha}
              onToggleSort={userCanEdit ? handleToggleSort : undefined}
            />
          </div>
        )}

        <SongsList
          groups={groups}
          showGroupHeaders={hasSections}
          stickyTop={headerHeight + navHeight}
          dragOverSection={drag.sectionDropTarget}
          draggedSong={drag.draggedSong as any}
          dropTarget={drag.songDropTarget}
          canEdit={userCanEdit}
          sections={songbook.sections || []}
          expandedSongId={expandedSongId}
          leavingSongIds={leavingSongIds}
          totalSongs={songbook.songs?.length || 0}
          onShowAddSongs={() => setShowAddSongs(true)}
          onRegisterGroupRef={registerGroupRef}
          onDragHandleDown={(e, song) =>
            drag.beginDrag(
              { _id: song._id, title: song.title, sectionId: song.sectionId ?? null },
              e
            )
          }
          onToggleExpand={handleToggleSong}
          onRegisterRef={registerSongRef}
          onRemoveSong={handleRemoveSong}
          onMoveToSection={handleMoveSongToSection}
        />
      </div>

      {moveNotice && createPortal(
        <div className="song-move-toast" role="status">{moveNotice}</div>,
        document.body
      )}

      {songUndo && (
        <UndoToast
          message={songUndo.message}
          visible={songUndoVisible}
          onUndo={handleUndoRemoveSong}
        />
      )}

      {/* Привид пісні за курсором/пальцем — тільки під час перетягування.
          Зони скидання — це самі таби розділів (SectionsNavigation). */}
      {drag.isDragging && drag.draggedSong && createPortal(
        <div
          className="song-drag-ghost"
          style={{ left: drag.pointer.x, top: drag.pointer.y }}
        >
          <FiMove />
          <span>{drag.draggedSong.title}</span>
        </div>,
        document.body
      )}

      {showAddSongs && (
        <AddSongsModal
          songbook={songbook}
          isOpen={showAddSongs}
          onClose={() => setShowAddSongs(false)}
          onSongAdded={handleSongAdded}
        />
      )}

      {showSectionManager && (
        <div
          className="section-manager-overlay"
          onClick={() => setShowSectionManager(false)}
        >
          <div
            className="section-manager-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="section-manager-close"
              onClick={() => setShowSectionManager(false)}
              title="Закрити"
            >
              <FiX />
            </button>
            <SectionManager
              songbook={songbook}
              onSectionAdded={handleSectionAdded}
              onSectionRemoved={handleSectionRemoved}
              canEdit={userCanEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SongbookDetail;
