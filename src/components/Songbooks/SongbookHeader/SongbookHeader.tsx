import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMusic, FiUsers, FiLock, FiGlobe, FiMapPin } from 'react-icons/fi';
import SongbookActions from '../SongbookActions/SongbookActions';
import './SongbookHeader.css';

interface SongbookHeaderProps {
  songbook: any;
  filteredSongsCount: number;
  onPlayAll: () => void;
  onShowAddSongs: () => void;
  onToggleSectionManager: () => void;
  onDeleteSongbook: () => void;
}

const SongbookHeader: React.FC<SongbookHeaderProps> = ({
  songbook,
  filteredSongsCount,
  onPlayAll,
  onShowAddSongs,
  onToggleSectionManager,
  onDeleteSongbook
}) => {
  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private': return <FiLock />;
      case 'public': return <FiGlobe />;
      case 'shared': return <FiUsers />;
      case 'nearby': return <FiMapPin />;
      default: return <FiLock />;
    }
  };

  const getPrivacyText = (privacy: string) => {
    switch (privacy) {
      case 'private': return 'Приватний';
      case 'public': return 'Публічний';
      case 'shared': return 'Розшарений';
      case 'nearby': return 'Поруч';
      default: return 'Приватний';
    }
  };

  return (
    <div className="songbook-header">
      <Link to="/my-songbooks" className="back-link">
        <FiArrowLeft />
        Назад до співаників
      </Link>
      
      <div className="songbook-info">
        <div className="songbook-title-section">
          <h1>
            <FiMusic className="sec-icon" />
            {songbook.title}
          </h1>
          {songbook.description && (
            <p className="songbook-description">{songbook.description}</p>
          )}
          <div className="songbook-meta">
            <div className="privacy-badge">
              {getPrivacyIcon(songbook.privacy)}
              <span>{getPrivacyText(songbook.privacy)}</span>
            </div>
            <span className="owner">від {songbook.owner?.email || ''}</span>
          </div>
        </div>
        
        <SongbookActions
          filteredSongsCount={filteredSongsCount}
          onPlayAll={onPlayAll}
          onShowAddSongs={onShowAddSongs}
          onToggleSectionManager={onToggleSectionManager}
          onDeleteSongbook={onDeleteSongbook}
        />
      </div>
    </div>
  );
};

export default SongbookHeader;