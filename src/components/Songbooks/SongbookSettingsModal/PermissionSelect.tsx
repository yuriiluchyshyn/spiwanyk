import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown } from 'react-icons/fi';
import './PermissionSelect.css';

export type Permission = 'view' | 'edit' | 'full';

export interface PermissionOption {
  value: Permission;
  label: string;
  icon?: React.ReactNode;
}

interface PermissionSelectProps {
  value: Permission;
  options: PermissionOption[];
  onChange: (value: Permission) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Кастомний випадаючий список прав доступу.
 *
 * Нативний <select> у деяких браузерах відкриває меню в непередбачуваному
 * місці (особливо всередині модалки, що прокручується). Тут меню рендериться
 * у портал з фіксованим позиціюванням прямо під тригером — воно не обрізається
 * контейнером і завжди зʼявляється там, де очікувано. Якщо знизу бракує місця,
 * список відкривається вгору.
 */
const PermissionSelect: React.FC<PermissionSelectProps> = ({
  value,
  options,
  onChange,
  className,
  ariaLabel
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) || options[0];

  const reposition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estHeight = Math.min(options.length * 40 + 8, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estHeight && rect.top > spaceBelow;
    setCoords({
      top: openUp ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      openUp
    });
  };

  useLayoutEffect(() => {
    if (open) reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => reposition();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    // capture=true ловить прокрутку будь-якого предка (напр. тіла модалки)
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleDocClick);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleDocClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className={`perm-select ${className || ''}`}>
      <button
        type="button"
        ref={triggerRef}
        className="perm-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="perm-select-value">
          {selected?.icon}
          <span>{selected?.label}</span>
        </span>
        <FiChevronDown className={`perm-select-chevron ${open ? 'open' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="perm-select-menu"
            role="listbox"
            style={{
              position: 'fixed',
              left: coords.left,
              width: coords.width,
              ...(coords.openUp
                ? { bottom: window.innerHeight - coords.top + 4 }
                : { top: coords.top + 4 })
            }}
          >
            {options.map((opt) => (
              <button
                type="button"
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`perm-select-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default PermissionSelect;
