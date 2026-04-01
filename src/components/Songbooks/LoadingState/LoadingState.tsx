import React from 'react';
import { FiMusic } from 'react-icons/fi';
import './LoadingState.css';

const LoadingState: React.FC = () => {
  return (
    <div className="loading">
      <FiMusic className="loading-icon" />
      <p>Завантаження співаника...</p>
    </div>
  );
};

export default LoadingState;