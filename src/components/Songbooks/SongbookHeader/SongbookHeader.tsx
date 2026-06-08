import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMusic, FiUsers, FiLock, FiGlobe, FiMapPin, FiSettings } from 'react-icons/fi';
import SongbookActions from '../SongbookActions/SongbookActions';
import SongbookSettingsModal from '../SongbookSettingsModal/SongbookSettingsModal';
import './SongbookHeader.css';

interface SongbookHeaderProps {
  songbook: any;
  currentUser: any;
  onShowAddSongs: () => void;
  onToggleSectionManager: () => void;
  onDeleteSongbook: () => void;
  onUpdateSongbook: (updatedSongbook: any) => void;
}

const SongbookHeader: React.FC<SongbookHeaderProps> = ({
  songbook,
  currentUser,
  onShowAddSongs,
  onToggleSectionManager,
  onDeleteSongbook,
  onUpdateSongbook
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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

  const isOwner = () => {
    if (!currentUser || !songbook || !songbook.owner) return false;
    
    const ownerId = typeof songbook.owner === 'object' ? songbook.owner._id : songbook.owner;
    const userId = currentUser._id;
    
    console.log('SongbookHeader ownership check:', { 
      ownerId, 
      userId, 
      owner: songbook.owner, 
      currentUser,
      isEqual: ownerId === userId
    });
    
    return ownerId === userId;
  };

  const canEditSongbook = () => {
    if (!currentUser || !songbook) return false;
    
    // Власник завжди може редагувати
    if (isOwner()) return true;
    
    // Перевіряємо права в sharedWith (для всіх типів приватності)
    if (songbook.sharedWith) {
      const sharedEntry = songbook.sharedWith.find((share: any) => 
        share.email === currentUser.email?.toLowerCase()
      );
      if (sharedEntry && sharedEntry.permissions === 'edit') {
        return true;
      }
    }
    
    // Для публічних та nearby співаників перевіряємо defaultPermissions
    if (songbook.privacy === 'public' || songbook.privacy === 'nearby') {
      return songbook.defaultPermissions === 'edit';
    }
    
    return false;
  };

  const handleSaveSettings = async (settings: any) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Saving settings:', settings);
      console.log('Songbook ID:', songbook._id);
      
      const requestBody: any = {
        privacy: settings.privacy
      };

      // Add defaultPermissions for public and nearby songbooks
      if (settings.privacy === 'public' || settings.privacy === 'nearby') {
        requestBody.defaultPermissions = settings.defaultPermissions || 'view';
      }

      // Handle sharedWith based on privacy type
      if (settings.privacy === 'shared') {
        // For shared songbooks, use the sharedWith array
        requestBody.sharedWith = settings.sharedWith || [];
      } else if (settings.privacy === 'public' || settings.privacy === 'nearby') {
        // For public/nearby songbooks, sharedWith contains users with special permissions
        requestBody.sharedWith = settings.sharedWith || [];
      } else {
        // For private songbooks, clear sharedWith
        requestBody.sharedWith = [];
      }
      
      const response = await fetch(`/api/songbooks/${songbook._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('Error response text:', responseText);
        throw new Error(`Помилка оновлення співаника: ${response.status}`);
      }

      const data = await response.json();
      console.log('Success response:', data);
      onUpdateSongbook(data.songbook);

    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  return (
    <div className="songbook-header">
      <Link to="/my-songbooks" className="back-link" title="Назад до співаників">
        <FiArrowLeft />
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
              {songbook.sharedWith && songbook.sharedWith.length > 0 && (
                <span className="shared-count">
                  (+{songbook.sharedWith.length})
                </span>
              )}
            </div>
            <span className="owner">від {songbook.owner?.email || ''}</span>
            {isOwner() && (
              <button 
                className="settings-button"
                onClick={() => setShowSettingsModal(true)}
                title="Налаштування співаника"
              >
                <FiSettings />
              </button>
            )}
          </div>

          {songbook.sharedWith && songbook.sharedWith.length > 0 && (
            <div className="shared-users-preview">
              <small>Розшарено з: </small>
              {songbook.sharedWith.slice(0, 3).map((share: any, index: number) => (
                <span key={share.email} className="shared-user-preview">
                  {share.email}
                  {share.permissions === 'edit' && ' (редагування)'}
                  {index < Math.min(songbook.sharedWith.length, 3) - 1 && ', '}
                </span>
              ))}
              {songbook.sharedWith.length > 3 && (
                <span className="more-users">та ще {songbook.sharedWith.length - 3}</span>
              )}
            </div>
          )}
        </div>
        
        <SongbookActions
          canEdit={canEditSongbook()}
          isOwner={isOwner()}
          onShowAddSongs={onShowAddSongs}
          onToggleSectionManager={onToggleSectionManager}
          onDeleteSongbook={onDeleteSongbook}
        />
      </div>

      {showSettingsModal && (
        <SongbookSettingsModal
          songbook={songbook}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
};

export default SongbookHeader;