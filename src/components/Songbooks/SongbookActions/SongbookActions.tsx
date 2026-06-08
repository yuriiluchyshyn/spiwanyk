import React from 'react';
import { FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi';
import './SongbookActions.css';

interface SongbookActionsProps {
  canEdit: boolean;
  isOwner: boolean;
  onShowAddSongs: () => void;
  onToggleSectionManager: () => void;
  onDeleteSongbook: () => void;
}

const SongbookActions: React.FC<SongbookActionsProps> = ({
  canEdit,
  isOwner,
  onShowAddSongs,
  onToggleSectionManager,
  onDeleteSongbook
}) => {
  return (
    <div className="songbook-actions">
      {canEdit && (
        <button 
          onClick={onShowAddSongs} 
          className="add-songs-btn"
        >
          <FiPlus />
          Додати пісні
        </button>
      )}
      {isOwner && (
        <button 
          onClick={onToggleSectionManager} 
          className="manage-sections-btn"
        >
          <FiSettings />
          Розділи
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