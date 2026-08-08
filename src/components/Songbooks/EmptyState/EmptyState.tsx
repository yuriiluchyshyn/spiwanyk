import React from 'react';
import { FiMusic, FiPlus } from 'react-icons/fi';
import './EmptyState.css';

interface EmptyStateProps {
  activeSection: string;
  /** У співанику взагалі немає пісень (а не лише в активному розділі) */
  isSongbookEmpty?: boolean;
  canEdit: boolean;
  onShowAddSongs: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  activeSection,
  isSongbookEmpty = false,
  canEdit,
  onShowAddSongs
}) => {
  const title = isSongbookEmpty
    ? 'У цьому співанику ще немає пісень'
    : activeSection === 'none'
      ? 'Усі пісні розкладені по розділах'
      : 'У цьому розділі ще немає пісень';

  return (
    <div className="empty-section">
      <FiMusic className="empty-icon" />
      <h3>{title}</h3>
      {isSongbookEmpty && canEdit && (
        <button 
          onClick={onShowAddSongs} 
          className="add-first-song-btn"
        >
          <FiPlus />
          Додати першу пісню
        </button>
      )}
      {!isSongbookEmpty && canEdit && (
        <p className="empty-hint">
          Перетягніть пісню за ручку на потрібний розділ, щоб її перемістити
        </p>
      )}
      {!canEdit && (
        <p className="empty-hint">
          У вас немає прав для редагування цього співаника
        </p>
      )}
    </div>
  );
};

export default EmptyState;
