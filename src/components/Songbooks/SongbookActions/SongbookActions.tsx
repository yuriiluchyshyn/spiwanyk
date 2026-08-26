import React from 'react';
import { FiPlus, FiFolder, FiTrash2, FiEye } from 'react-icons/fi';
import './SongbookActions.css';

interface SongbookActionsProps {
  canEdit: boolean;
  isOwner: boolean;
  // Повні права: керування розділами, доступом та видалення співаника.
  // Власник завжди має ці права; інші — лише з дозволом 'full'.
  canManage?: boolean;
  onShowAddSongs: () => void;
  onToggleSectionManager: () => void;
  onDeleteSongbook: () => void;
  onShowSettings?: () => void;
}

const SongbookActions: React.FC<SongbookActionsProps> = ({
  canEdit,
  isOwner,
  canManage,
  onShowAddSongs,
  onToggleSectionManager,
  onDeleteSongbook,
  onShowSettings
}) => {
  // Власник має повні права навіть якщо canManage не передано.
  const manage = canManage || isOwner;

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
      {manage && (
        <button 
          onClick={onToggleSectionManager} 
          className="manage-sections-btn"
          title="Управління розділами"
        >
          <FiFolder />
        </button>
      )}
      {manage && onShowSettings && (
        <button 
          onClick={onShowSettings}
          className="visibility-btn"
          title="Доступ та видимість співаника"
        >
          <FiEye />
        </button>
      )}
      {manage && (
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
