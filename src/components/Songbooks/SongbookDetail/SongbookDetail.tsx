import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { songbooksAPI } from '../../../services/api';
import { useSongbook } from '../../../contexts/SongbookContext';
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
  const { addToPlaylist, playNow } = useSongbook();

  useEffect(() => {
    const loadSongbook = async () => {
      if (!id) return;
      
      try {
        const data = await songbooksAPI.getById(id);
        setSongbook(data);
      } catch (error) {
        console.error('Error loading songbook:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSongbook();
  }, [id]);

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
    if (!songbook) return;
    
    const confirmMessage = `Ви впевнені, що хочете видалити співаник "${songbook.title}"?\n\nЦя дія незворотна і видалить:\n- Весь співаник\n- Всі розділи\n- Всі пісні зі співаника\n\nСамі пісні залишаться в загальній базі.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      await songbooksAPI.delete(songbook._id);
      alert(`Співаник "${songbook.title}" успішно видалено`);
      navigate('/my-songbooks');
    } catch (error: any) {
      console.error('Error deleting songbook:', error);
      
      let errorMessage = 'Невідома помилка';
      
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || `Помилка сервера: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Немає відповіді від сервера. Перевірте підключення до інтернету.';
      } else {
        errorMessage = error.message || 'Помилка при відправці запиту';
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
    } catch (error: any) {
      console.error('Error removing song:', error);
      alert('Помилка видалення пісні: ' + (error.response?.data?.message || error.message));
    }
  };

  // Drag & Drop functions
  const handleDragStart = (e: React.DragEvent, song: Song) => {
    setDraggedSong(song);
    e.dataTransfer.effectAllowed = 'move';
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
    
    const currentSectionId = draggedSong.sectionId;
    
    if (currentSectionId === targetSectionId) {
      setDraggedSong(null);
      return;
    }
    
    try {
      await songbooksAPI.removeSong(songbook._id, draggedSong._id);
      
      const sectionIdToSend = targetSectionId === 'no-section' ? undefined : targetSectionId;
      await songbooksAPI.addSong(songbook._id, draggedSong._id, sectionIdToSend);
      
      loadSongbook();
    } catch (error: any) {
      console.error('Error moving song:', error);
      alert('Помилка переміщення пісні: ' + (error.response?.data?.message || error.message));
    }
    
    setDraggedSong(null);
  };

  const handleDragEnd = () => {
    setDraggedSong(null);
    setDragOverSection(null);
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
    playNow(song);
  };

  const handleAddToPlaylist = (song: Song) => {
    addToPlaylist(song);
  };

  const handlePlayAll = () => {
    const songs = getFilteredSongs();
    songs.forEach((song, index) => {
      if (index === 0) {
        playNow(song);
      } else {
        addToPlaylist(song);
      }
    });
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!songbook) {
    return <ErrorState />;
  }

  const filteredSongs = getFilteredSongs();

  return (
    <div className="songbook-detail">
      <SongbookHeader
        songbook={songbook}
        filteredSongsCount={filteredSongs.length}
        onPlayAll={handlePlayAll}
        onShowAddSongs={() => setShowAddSongs(true)}
        onToggleSectionManager={() => setShowSectionManager(!showSectionManager)}
        onDeleteSongbook={handleDeleteSongbook}
      />

      <div className="songbook-content">
        {showSectionManager && (
          <SectionManager
            songbook={songbook}
            onSectionAdded={handleSectionAdded}
            onSectionRemoved={handleSectionRemoved}
            canEdit={true}
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
          onShowAddSongs={() => setShowAddSongs(true)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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