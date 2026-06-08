import React from 'react';
import { FiMusic } from 'react-icons/fi';
import './MusicalNoteLoader.css';

const MusicalNoteLoader = ({ size = 'medium', text = 'Завантаження...' }) => {
  return (
    <div className={`note-loader-container ${size}`}>
      <FiMusic className="pulsing-note" />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default MusicalNoteLoader;