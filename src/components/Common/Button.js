import React from 'react';
import { FiMusic } from 'react-icons/fi';
import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  const handleClick = (e) => {
    if (disabled || loading) return;
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${loading ? 'loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <>
          <FiMusic className="btn-note-loader" />
          Завантаження...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;