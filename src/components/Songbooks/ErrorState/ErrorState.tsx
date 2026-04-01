import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './ErrorState.css';

const ErrorState: React.FC = () => {
  return (
    <div className="error">
      <h2>Співаник не знайдено</h2>
      <Link to="/my-songbooks" className="back-link">
        <FiArrowLeft />
        Повернутися до співаників
      </Link>
    </div>
  );
};

export default ErrorState;