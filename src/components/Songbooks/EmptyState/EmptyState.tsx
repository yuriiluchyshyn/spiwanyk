import React from 'react';
import { FiMusic, FiPlus } from 'react-icons/fi';
import './EmptyState.css';

interface EmptyStateProps {
  activeSection: string;
  canEdit: boolean;
  onShowAddSongs: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  activeSection,
  canEdit,
  onShowAddSongs
}) => {
  return (
    <div className="empty-section">
      <FiMusic className="empty-icon" />
      <h3>
        {activeSection === 'all' 
          ? 'У цьому співанику ще немає пісень' 
          : 'У цьому розділі ще немає пісень'
        }
      </h3>
      {activeSection === 'all' && canEdit && (
        <button 
          onClick={onShowAddSongs} 
          className="add-first-song-btn"
        >
          <FiPlus />
          Додати першу пісню
        </button>
      )}
      {!canEdit && (
        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '1rem' }}>
          У вас немає прав для редагування цього співаника
        </p>
      )}
    </div>
  );
};

export default EmptyState;