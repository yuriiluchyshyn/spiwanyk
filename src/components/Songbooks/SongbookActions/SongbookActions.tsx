import React from 'react';
import { FiPlus, FiSettings, FiTrash2, FiEye } from 'react-icons/fi';
import './SongbookActions.css';

interface SongbookActionsProps {
  canEdit: boolean;
  isOwner: boolean;
  onShowAddSongs: () => void;
  onToggleSectionManager: () => void;
  onDeleteSongbook: () => void;
  onShowSettings?: () => void;
}

const SongbookActions: React.FC<SongbookActionsProps> = ({
  canEdit,
  isOwner,
  onShowAddSongs,
  onToggleSectionManager,
  onDeleteSongbook,
  onShowSettings
}) => {
  return (
    <div className="songbook-actions">
      {canEdit && (
        <button 
          onClick={onShowAddSongs} 
          className="add-songs-btn"
          title="Додати пісні"
        >
          <FiPlus />
        </button>
      )}
      {isOwner && (
        <button 
          onClick={onToggleSectionManager} 
          className="manage-sections-btn"
          title="Розділи"
        >
          <FiSettings />
        </button>
      )}
      {isOwner && onShowSettings && (
        <button 
          onClick={onShowSettings}
          className="visibility-btn"
          title="Видимість співаника"
        >
          <FiEye />
        </button>
      )}
      {isOwner && (
        <button 
          onClick={onDeleteSongbook}
          className="delete-songbook-btn"
          title="Видалити співаник"
        >
          <FiTrash2 />
        </button>
      )}
    </div>
  );
};

export default SongbookActions;
