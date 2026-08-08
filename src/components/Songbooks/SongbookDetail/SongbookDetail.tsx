import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { songbooksAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';


// Компоненти
import SongbookHeader from '../SongbookHeader/SongbookHeader';
import SectionsNavigation, { NO_SECTION } from '../SectionsNavigation/SectionsNavigation';
import SongsList from '../SongsList/SongsList';
import LoadingState from '../LoadingState/LoadingState';
import ErrorState from '../ErrorState/ErrorState';
import AddSongsModal from '../AddSongsModal';
import SectionManager from '../SectionManager';
import { FiX, FiMove } from 'react-icons/fi';
import useSongDragDrop, { DraggedSong, SongDropTarget } from './useSongDragDrop';
import SectionDropBar from './SectionDropBar';

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

  // Коротке підтвердження переміщення (пісня зникає з поточного списку —
  // без нього незрозуміло, куди вона поділась)
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const moveNoticeTimer = useRef<number | null>(null);

  // Реєстр DOM-елементів пісень + якір для збереження позиції сторінки при розгортанні
  const songRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingAnchor = useRef<{ id: string; top: number } | null>(null);

  const showMoveNotice = (text: string) => {
    setMoveNotice(text);
    if (moveNoticeTimer.current) window.clearTimeout(moveNoticeTimer.current);
    moveNoticeTimer.current = window.setTimeout(() => setMoveNotice(null), 2600);
  };

  useEffect(() => () => {
    if (moveNoticeTimer.current) window.clearTimeout(moveNoticeTimer.current);
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

  const loadSongbook = async () => {
    if (!id) return;
    
    try {
      const data = await songbooksAPI.getById(id);
      setSongbook(data);
    } catch (error) {
      console.error('Error loading songbook:', error);
    }
  };

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

  const handleRemoveSong = async (songId: string) => {
    if (!window.confirm('Видалити пісню зі співаника?')) return;
    
    try {
      await songbooksAPI.removeSong(songbook._id, songId);
      loadSongbook();
    } catch (error) {
      console.error('Error removing song:', error);
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      const responseMessage = (error as any).response?.data?.message;
      alert('Помилка видалення пісні: ' + (responseMessage || errorMessage));
    }
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
      await loadSongbook();
      if (fromSection !== toSection) {
        showMoveNotice(`«${dragged.title}» → ${sectionNameById(toSection)}`);
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

      await loadSongbook();
      showMoveNotice(`«${song.title}» → ${sectionNameById(normalizedTarget)}`);
    } catch (error) {
      console.error('Error moving song to section:', error);
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      const responseMessage = (error as any).response?.data?.message;
      alert('Помилка переміщення пісні: ' + (responseMessage || errorMessage));
    }
  };

  // Перший таб — пісні без розділу, далі конкретний розділ
  const getFilteredSongs = (): Song[] => {
    if (!songbook?.songs) return [];

    const songs = songbook.songs
      .map((s: any) => s.song ? { ...s.song, sectionId: s.section, _songbookEntry: s } : null)
      .filter(Boolean);

    if (activeSection === NO_SECTION) {
      return songs.filter((song: Song) => !song.sectionId);
    }

    return songs.filter((song: Song) =>
      song.sectionId && song.sectionId.toString() === activeSection
    );
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
    
    // Перевіряємо права в sharedWith (для всіх типів приватності)
    if (songbook.sharedWith) {
      const sharedEntry = songbook.sharedWith.find((share: any) => 
        share.email === user.email?.toLowerCase()
      );
      if (sharedEntry && sharedEntry.permissions === 'edit') {
        console.log('SongbookDetail access: explicit edit permission', sharedEntry);
        return true;
      }
    }
    
    // Для публічних та nearby співаників перевіряємо defaultPermissions
    if (songbook.privacy === 'public' || songbook.privacy === 'nearby') {
      const canEditGlobal = songbook.defaultPermissions === 'edit';
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

  const filteredSongs = getFilteredSongs();
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
        {songbook.sections && songbook.sections.length > 0 && (
          <SectionsNavigation
            sections={songbook.sections}
            activeSection={activeSection}
            songbook={songbook}
            dragOverSection={drag.sectionDropTarget}
            onSectionClick={setActiveSection}
            isDragging={drag.isDragging}
          />
        )}

        <SongsList
          songs={filteredSongs}
          activeSection={activeSection}
          draggedSong={drag.draggedSong as any}
          dropTarget={drag.songDropTarget}
          canEdit={userCanEdit}
          sections={songbook.sections || []}
          expandedSongId={expandedSongId}
          totalSongs={songbook.songs?.length || 0}
          onShowAddSongs={() => setShowAddSongs(true)}
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

      {/* Привид пісні + панель зон скидання — тільки під час перетягування */}
      {drag.isDragging && drag.draggedSong && createPortal(
        <>
          {(songbook.sections || []).length > 0 && (
            <SectionDropBar
              sections={songbook.sections}
              currentSectionId={drag.draggedSong.sectionId ?? null}
              activeDropSection={drag.sectionDropTarget}
              songTitle={drag.draggedSong.title}
            />
          )}
          <div
            className="song-drag-ghost"
            style={{ left: drag.pointer.x, top: drag.pointer.y }}
          >
            <FiMove />
            <span>{drag.draggedSong.title}</span>
          </div>
        </>,
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
