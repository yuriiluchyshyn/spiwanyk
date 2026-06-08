import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { songbooksAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';


// Компоненти
import SongbookHeader from '../SongbookHeader/SongbookHeader';
import SectionsNavigation from '../SectionsNavigation/SectionsNavigation';
import SongsList from '../SongsList/SongsList';
import LoadingState from '../LoadingState/LoadingState';
import ErrorState from '../ErrorState/ErrorState';
import AddSongsModal from '../AddSongsModal';
import SectionManager from '../SectionManager';
import SongViewModal from '../SongViewModal';

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
  const [activeSection, setActiveSection] = useState('all');
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showSongView, setShowSongView] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [draggedSong, setDraggedSong] = useState<Song | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ songId: string; position: 'before' | 'after' } | null>(null);

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

  const loadSongbook = async () => {
    if (!id) return;
    
    try {
      const data = await songbooksAPI.getById(id);
      setSongbook(data);
    } catch (error) {
      console.error('Error loading songbook:', error);
    }
  };

  const handleSongAdded = () => {
    loadSongbook();
  };

  const handleSectionAdded = () => {
    loadSongbook();
  };

  const handleSectionRemoved = () => {
    loadSongbook();
  };

  const handleViewSong = (song: Song) => {
    setSelectedSong(song);
    setShowSongView(true);
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

  // Drag & Drop functions
  const handleDragStart = (e: React.DragEvent, song: Song) => {
    setDraggedSong(song);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', song._id);
    } catch {
      // ignore
    }
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(sectionId);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    setDragOverSection(null);

    if (!draggedSong) return;

    const sectionIdToSend =
      targetSectionId === 'no-section' || !targetSectionId ? null : targetSectionId;

    const currentSectionId = draggedSong.sectionId || null;
    const normalizedTarget = sectionIdToSend || null;

    if (currentSectionId === normalizedTarget) {
      setDraggedSong(null);
      return;
    }

    try {
      const sectionSongs = (songbook?.songs || []).filter((s: any) => {
        const sec = s.section ? s.section.toString() : null;
        return sec === normalizedTarget;
      });

      await songbooksAPI.moveSong(
        songbook._id,
        draggedSong._id,
        normalizedTarget,
        sectionSongs.length
      );

      loadSongbook();
    } catch (error) {
      console.error('Error moving song:', error);
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      const responseMessage = (error as any).response?.data?.message;
      alert('Помилка переміщення пісні: ' + (responseMessage || errorMessage));
    }

    setDraggedSong(null);
  };

  const handleDragOverItem = (e: React.DragEvent, song: Song, index: number) => {
    if (!draggedSong || draggedSong._id === song._id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position: 'before' | 'after' = e.clientY < midpoint ? 'before' : 'after';

    setDropTarget(prev => {
      if (prev && prev.songId === song._id && prev.position === position) return prev;
      return { songId: song._id, position };
    });
  };

  const handleDragLeaveItem = () => {
    // Keep the target — onDragOver on next item will overwrite it.
  };

  const handleDropOnItem = async (e: React.DragEvent, targetSong: Song, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSong || draggedSong._id === targetSong._id) {
      setDraggedSong(null);
      setDropTarget(null);
      return;
    }

    const position = dropTarget?.position || 'after';
    const targetSectionId = targetSong.sectionId || null;
    const draggedSectionId = draggedSong.sectionId || null;

    const sectionSongs = getFilteredSongs().filter(s => (s.sectionId || null) === targetSectionId);
    const targetIdxInSection = sectionSongs.findIndex(s => s._id === targetSong._id);
    let insertAt = position === 'before' ? targetIdxInSection : targetIdxInSection + 1;

    if (draggedSectionId === targetSectionId) {
      const draggedIdxInSection = sectionSongs.findIndex(s => s._id === draggedSong._id);
      if (draggedIdxInSection !== -1 && draggedIdxInSection < insertAt) {
        insertAt -= 1;
      }
    }

    if (insertAt < 0) insertAt = 0;

    try {
      await songbooksAPI.moveSong(
        songbook._id,
        draggedSong._id,
        targetSectionId,
        insertAt
      );
      await loadSongbook();
    } catch (error) {
      console.error('Error reordering song:', error);
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      const responseMessage = (error as any).response?.data?.message;
      alert('Помилка зміни порядку: ' + (responseMessage || errorMessage));
    }

    setDraggedSong(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedSong(null);
    setDragOverSection(null);
    setDropTarget(null);
  };

  const getFilteredSongs = (): Song[] => {
    if (!songbook?.songs) return [];
    
    const songs = songbook.songs
      .map((s: any) => s.song ? { ...s.song, sectionId: s.section, _songbookEntry: s } : null)
      .filter(Boolean);
    
    if (activeSection === 'all') {
      return songs;
    }
    
    return songs.filter((song: Song) => 
      song.sectionId && song.sectionId.toString() === activeSection
    );
  };

  const handlePlayNow = (song: Song) => {
    // No-op: playlist removed
  };

  const handleAddToPlaylist = (song: Song) => {
    // No-op: playlist removed
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
        onToggleSectionManager={() => setShowSectionManager(!showSectionManager)}
        onDeleteSongbook={handleDeleteSongbook}
        onUpdateSongbook={handleUpdateSongbook}
      />

      <div className="songbook-content">
        {showSectionManager && (
          <SectionManager
            songbook={songbook}
            onSectionAdded={handleSectionAdded}
            onSectionRemoved={handleSectionRemoved}
            canEdit={userCanEdit}
          />
        )}

        {songbook.sections && songbook.sections.length > 0 && (
          <SectionsNavigation
            sections={songbook.sections}
            activeSection={activeSection}
            songbook={songbook}
            dragOverSection={dragOverSection}
            onSectionClick={setActiveSection}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        )}

        <SongsList
          songs={filteredSongs}
          activeSection={activeSection}
          draggedSong={draggedSong}
          dropTarget={dropTarget}
          canEdit={userCanEdit}
          onShowAddSongs={() => setShowAddSongs(true)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOverItem={handleDragOverItem}
          onDragLeaveItem={handleDragLeaveItem}
          onDropOnItem={handleDropOnItem}
          onViewSong={handleViewSong}
          onPlayNow={handlePlayNow}
          onAddToPlaylist={handleAddToPlaylist}
          onRemoveSong={handleRemoveSong}
        />
      </div>

      {showAddSongs && (
        <AddSongsModal
          songbook={songbook}
          isOpen={showAddSongs}
          onClose={() => setShowAddSongs(false)}
          onSongAdded={handleSongAdded}
        />
      )}

      {showSongView && (
        <SongViewModal
          song={selectedSong}
          isOpen={showSongView}
          onClose={() => {
            setShowSongView(false);
            setSelectedSong(null);
          }}
        />
      )}
    </div>
  );
};

export default SongbookDetail;
