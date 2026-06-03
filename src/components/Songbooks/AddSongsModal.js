import React, { useState, useMemo } from 'react';
import { songbooksAPI } from '../../services/api';
import { FiX, FiMusic } from 'react-icons/fi';
import SongBrowser from '../Songs/SongBrowser';
import './AddSongsModal.css';

const AddSongsModal = ({ songbook, isOpen, onClose, onSongAdded }) => {
  const [addingSongs, setAddingSongs] = useState(new Set());
  const [addedSongs, setAddedSongs] = useState(new Set());
  const [removedSongs, setRemovedSongs] = useState(new Set());
  const [removingSongs, setRemovingSongs] = useState(new Set());
  const [selectedSection, setSelectedSection] = useState('');

  // Songs already in songbook — show as "added" but don't hide them
  const alreadyInSongbook = useMemo(() => {
    const ids = new Set();
    if (songbook?.songs) {
      songbook.songs.forEach(s => {
        const songId = s.song?._id || s.song;
        if (songId) ids.add(songId);
      });
    }
    return ids;
  }, [songbook]);

  // Merge: (already in songbook - removed) + just added during this session
  const allAddedSongs = useMemo(() => {
    const merged = new Set();
    alreadyInSongbook.forEach(id => {
      if (!removedSongs.has(id)) merged.add(id);
    });
    addedSongs.forEach(id => merged.add(id));
    return merged;
  }, [alreadyInSongbook, addedSongs, removedSongs]);

  const handleAddSong = async (song) => {
    if (addingSongs.has(song._id)) return;

    setAddingSongs(prev => new Set([...prev, song._id]));

    try {
      const sectionIdToSend = selectedSection && selectedSection.trim() ? selectedSection : undefined;
      await songbooksAPI.addSong(songbook._id, song._id, sectionIdToSend);

      setAddedSongs(prev => new Set([...prev, song._id]));
      setRemovedSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(song._id);
        return newSet;
      });

      if (onSongAdded) {
        onSongAdded(song, selectedSection);
      }
    } catch (error) {
      console.error('Error adding song:', error);

      let errorMessage = 'Невідома помилка';
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || `Помилка сервера: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Немає відповіді від сервера.';
      } else {
        errorMessage = error.message || 'Помилка при відправці запиту';
      }

      alert(`Помилка додавання пісні "${song.title}": ${errorMessage}`);
    } finally {
      setAddingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(song._id);
        return newSet;
      });
    }
  };

  const handleRemoveSong = async (song) => {
    if (removingSongs.has(song._id)) return;

    setRemovingSongs(prev => new Set([...prev, song._id]));

    try {
      await songbooksAPI.removeSong(songbook._id, song._id);

      setRemovedSongs(prev => new Set([...prev, song._id]));
      setAddedSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(song._id);
        return newSet;
      });

      if (onSongAdded) {
        onSongAdded(null, null); // trigger refresh
      }
    } catch (error) {
      console.error('Error removing song:', error);

      let errorMessage = 'Невідома помилка';
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || `Помилка сервера: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Немає відповіді від сервера.';
      } else {
        errorMessage = error.message || 'Помилка при відправці запиту';
      }

      alert(`Помилка видалення пісні: ${errorMessage}`);
    } finally {
      setRemovingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(song._id);
        return newSet;
      });
    }
  };

  const handleToggleSong = (song) => {
    if (allAddedSongs.has(song._id)) {
      handleRemoveSong(song);
    } else {
      handleAddSong(song);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-songs-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FiMusic className="sec-icon" />
            Додати пісні до співаника
          </h2>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        {songbook.sections && songbook.sections.length > 0 && (
          <div className="section-selector-bar">
            <label>Розділ:</label>
            <select 
              value={selectedSection} 
              onChange={(e) => setSelectedSection(e.target.value)}
              className="section-select"
            >
              <option value="">Без розділу</option>
              {songbook.sections
                .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
                .map(section => (
                <option key={section._id} value={section._id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="modal-browser-content">
          <SongBrowser
            onAddSong={handleToggleSong}
            addingSongs={new Set([...addingSongs, ...removingSongs])}
            addedSongs={allAddedSongs}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default AddSongsModal;
