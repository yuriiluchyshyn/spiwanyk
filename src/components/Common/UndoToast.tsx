import React from 'react';
import { createPortal } from 'react-dom';
import './UndoToast.css';

interface UndoToastProps {
  /** Текст повідомлення, напр. «Пісню видалено» */
  message: string;
  /** Чи показувати тост (керує анімацією появи/зникнення) */
  visible: boolean;
  /** Клік по кнопці «Відмінити» */
  onUndo: () => void;
  /** Підпис кнопки дії */
  actionLabel?: string;
}

/**
 * Універсальний тост з дією «Відмінити». Рендериться в body (portal),
 * закріплений унизу по центру. Візуально узгоджений із тостом у BookView.
 */
const UndoToast: React.FC<UndoToastProps> = ({
  message,
  visible,
  onUndo,
  actionLabel = 'Відмінити',
}) => {
  return createPortal(
    <div className={`undo-toast ${visible ? 'visible' : ''}`} role="status">
      <span className="undo-toast-text">{message}</span>
      <button type="button" className="undo-toast-btn" onClick={onUndo}>
        {actionLabel}
      </button>
    </div>,
    document.body
  );
};

export default UndoToast;
