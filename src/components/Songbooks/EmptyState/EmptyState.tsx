import React from 'react';
import { FiMusic, FiPlus } from 'react-icons/fi';
import './EmptyState.css';

interface EmptyStateProps {
  activeSection: string;
  onShowAddSongs: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  activeSection,
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
      {activeSection === 'all' && (
        <button 
          onClick={onShowAddSongs} 
          className="add-first-song-btn"
        >
          <FiPlus />
          Додати першу пісню
        </button>
      )}
    </div>
  );
};

export default EmptyState;