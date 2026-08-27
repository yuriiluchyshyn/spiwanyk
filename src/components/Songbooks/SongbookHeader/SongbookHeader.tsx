import React, { useState } from 'react';
import { FiMusic, FiUsers, FiLock, FiGlobe, FiMapPin } from 'react-icons/fi';
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

  // Явний запис доступу для поточного користувача (розшарено по email)
  const sharedEntryForUser = () => {
    if (!currentUser || !songbook?.sharedWith) return null;
    return (
      songbook.sharedWith.find(
        (share: any) => share.email === currentUser.email?.toLowerCase()
      ) || null
    );
  };

  // Повні права: видалення співаника та керування доступом інших користувачів.
  // Власник завжди має повні права. Логіка дзеркалить canAccess() на бекенді.
  const hasFullAccess = () => {
    if (isOwner()) return true;

    // Іменний доступ по email із рівнем 'full'.
    const entry = sharedEntryForUser();
    if (entry?.permissions === 'full') return true;

    // Публічні / поруч / opted-in nearby співаники: повний доступ отримують усі,
    // якщо власник виставив defaultPermissions === 'full'.
    if (
      songbook &&
      (songbook.privacy === 'public' ||
        songbook.privacy === 'nearby' ||
        songbook.shareNearby) &&
      songbook.defaultPermissions === 'full'
    ) {
      return true;
    }

    return false;
  };

  const canEditSongbook = () => {
    if (!currentUser || !songbook) return false;
    
    // Власник завжди може редагувати
    if (isOwner()) return true;
    
    // Перевіряємо права в sharedWith (для всіх типів приватності): edit або full
    const sharedEntry = sharedEntryForUser();
    if (sharedEntry && (sharedEntry.permissions === 'edit' || sharedEntry.permissions === 'full')) {
      return true;
    }
    
    // Для публічних та nearby співаників перевіряємо defaultPermissions
    if (songbook.privacy === 'public' || songbook.privacy === 'nearby') {
      return (
        songbook.defaultPermissions === 'edit' ||
        songbook.defaultPermissions === 'full'
      );
    }
    
    return false;
  };

  const handleSaveSettings = async (settings: any) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Saving settings:', settings);
      console.log('Songbook ID:', songbook._id);
      
      const requestBody: any = {
        privacy: settings.privacy,
        // Nearby visibility is its own flag so it can combine with email sharing.
        shareNearby: settings.shareNearby ?? settings.privacy === 'nearby'
      };

      // defaultPermissions drives what non-invited viewers get, which applies to
      // public, nearby, and any songbook opted into nearby discovery.
      if (
        settings.privacy === 'public' ||
        settings.privacy === 'nearby' ||
        requestBody.shareNearby
      ) {
        requestBody.defaultPermissions = settings.defaultPermissions || 'view';
      }

      // Individual access ("Додатковий доступ окремим людям") is additive to any
      // privacy mode — private, nearby or public — so it is always persisted
      // as-is. Previously it was wiped for private songbooks, which silently
      // revoked edit/full rights for already-invited people.
      requestBody.sharedWith = settings.sharedWith || [];
      
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
      <div className="songbook-header-top">
        <div className="songbook-info">
          <div className="songbook-title-section">
          <div className="songbook-title-row">
            <h1>
              <FiMusic className="sec-icon" />
              {songbook.title}
            </h1>
          </div>
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
          </div>

          {songbook.sharedWith && songbook.sharedWith.length > 0 && (
            <div className="shared-users-preview">
              <small>Розшарено з: </small>
              {songbook.sharedWith.slice(0, 3).map((share: any, index: number) => (
                <span key={share.email} className="shared-user-preview">
                  {share.email}
                  {share.permissions === 'edit' && ' (редагування)'}
                  {share.permissions === 'full' && ' (повний доступ)'}
                  {index < Math.min(songbook.sharedWith.length, 3) - 1 && ', '}
                </span>
              ))}
              {songbook.sharedWith.length > 3 && (
                <span className="more-users">та ще {songbook.sharedWith.length - 3}</span>
              )}
            </div>
          )}
          </div>
        </div>

        <SongbookActions
          canEdit={canEditSongbook()}
          isOwner={isOwner()}
          canManage={hasFullAccess()}
          onShowAddSongs={onShowAddSongs}
          onToggleSectionManager={onToggleSectionManager}
          onDeleteSongbook={onDeleteSongbook}
          onShowSettings={() => setShowSettingsModal(true)}
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