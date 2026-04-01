import React from 'react';
import { FiPlay, FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi';
import './SongbookActions.css';

interface SongbookActionsProps {
  filteredSongsCount: number;
  onPlayAll: () => void;
  onShowAddSongs: () => void;
  onToggleSectionManager: () => void;
  onDeleteSongbook: () => void;
}

const SongbookActions: React.FC<SongbookActionsProps> = ({
  filteredSongsCount,
  onPlayAll,
  onShowAddSongs,
  onToggleSectionManager,
  onDeleteSongbook
}) => {
  return (
    <div className="songbook-actions">
      {filteredSongsCount > 0 && (
        <button onClick={onPlayAll} className="play-all-btn">
          <FiPlay />
          Грати все ({filteredSongsCount})
        </button>
      )}
      
      <div className="main-actions">
        <button 
          onClick={onShowAddSongs} 
          className="add-songs-btn"
        >
          <FiPlus />
          Додати пісні
        </button>
        <button 
          onClick={onToggleSectionManager} 
          className="manage-sections-btn"
        >
          <FiSettings />
          Розділи
        </button>
      </div>
      
      <div className="danger-actions">
        <button 
          onClick={onDeleteSongbook}
          className="delete-songbook-btn"
          title="Видалити співаник"
        >
          <FiTrash2 />
          Видалити співаник
        </button>
      </div>
    </div>
  );
};

export default SongbookActions;