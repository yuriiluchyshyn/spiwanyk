import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Щось пішло не так</h2>
            <p>Виникла помилка при завантаженні додатку.</p>
            <details>
              <summary>Деталі помилки</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
            <button 
              onClick={() => window.location.reload()}
              className="retry-btn"
            >
              Перезавантажити сторінку
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;