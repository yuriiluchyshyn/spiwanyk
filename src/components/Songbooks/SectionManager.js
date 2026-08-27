import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { songbooksAPI } from '../../services/api';
import { FiPlus, FiCheck, FiX, FiBook } from 'react-icons/fi';
import UndoToast from '../Common/UndoToast';
import './SectionManager.css';

const SECTION_LEAVE_MS = 400;   // тривалість анімації зникнення рядка
const SECTION_UNDO_MS = 5000;   // скільки показуємо тост undo
const SWIPE_THRESHOLD = 70;     // свайп далі за цей поріг — видаляємо
const SWIPE_MAX = 160;          // максимальний зсув рядка

// Один рядок розділу: поява з анімацією + свайп справа наліво для видалення
// (з подальшою плавною анімацією зникнення, як у списку пісень).
const SectionRow = ({ section, songCount, canEdit, index, isLeaving, onRequestRemove }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [leaveMaxH, setLeaveMaxH] = useState(null);
  const [leaveCollapsed, setLeaveCollapsed] = useState(false);

  const rootRef = useRef(null);
  const startRef = useRef(null);
  const dirRef = useRef(null);
  const swipeXRef = useRef(0);

  const setSwipe = (v) => {
    swipeXRef.current = v;
    setSwipeX(v);
  };

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Анімація зникнення: заміряти висоту -> згорнути до 0 + виїзд вліво + згасання
  useLayoutEffect(() => {
    if (!isLeaving) {
      setLeaveMaxH(null);
      setLeaveCollapsed(false);
      return;
    }
    const el = rootRef.current;
    const h = el ? el.scrollHeight : 0;
    setLeaveMaxH(h);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLeaveMaxH(0);
        setLeaveCollapsed(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isLeaving]);

  const onTouchStart = (e) => {
    if (!canEdit || isLeaving) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    dirRef.current = null;
  };

  const onTouchMove = (e) => {
    if (!canEdit || isLeaving || !startRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;

    if (!dirRef.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      dirRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (dirRef.current === 'h') setIsSwiping(true);
    }
    if (dirRef.current !== 'h') return;

    let off = Math.min(0, dx);
    if (off < -SWIPE_MAX) off = -SWIPE_MAX;
    setSwipe(off);
  };

  const onTouchEnd = () => {
    if (!canEdit || isLeaving) return;
    const wasHorizontal = dirRef.current === 'h';
    const shouldRemove = wasHorizontal && swipeXRef.current < -SWIPE_THRESHOLD;
    startRef.current = null;
    dirRef.current = null;
    setIsSwiping(false);
    setSwipe(0);
    if (shouldRemove) onRequestRemove(section);
  };

  let style;
  if (leaveMaxH !== null) {
    style = {
      maxHeight: leaveMaxH,
      opacity: leaveCollapsed ? 0 : 1,
      transform:
        leaveCollapsed && !prefersReduced ? 'translateX(-100%)' : 'translateX(0)',
      marginBottom: leaveCollapsed ? 0 : undefined,
      overflow: 'hidden',
      pointerEvents: 'none',
      transition:
        'max-height 0.4s ease, opacity 0.34s ease, transform 0.4s ease, margin 0.4s ease',
    };
  } else {
    style = {
      transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
      transition: isSwiping ? 'none' : 'transform 0.25s ease, background 0.25s ease',
      animationDelay: `${Math.min(index, 12) * 45}ms`,
    };
  }

  return (
    <div
      ref={rootRef}
      className={`section-item ${isLeaving ? 'is-leaving' : ''} ${swipeX < 0 ? 'is-swiping' : ''}`}
      style={style}
      onTouchStart={canEdit ? onTouchStart : undefined}
      onTouchMove={canEdit ? onTouchMove : undefined}
      onTouchEnd={canEdit ? onTouchEnd : undefined}
    >
      <div className="section-info">
        <h4 className="section-name">{section.name}</h4>
        {section.description && (
          <p className="section-description">{section.description}</p>
        )}
        <span className="section-count">{songCount} пісень</span>
      </div>
    </div>
  );
};

const SectionManager = ({ songbook, onSectionAdded, onSectionRemoved, canEdit }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Видалення з undo: рядок ховаємо одразу (з анімацією), а запит на сервер
  // відкладаємо на SECTION_UNDO_MS, щоб дію можна було скасувати.
  const [leavingIds, setLeavingIds] = useState(new Set());
  const [removedIds, setRemovedIds] = useState(new Set());
  const [undo, setUndo] = useState(null); // { message }
  const [undoVisible, setUndoVisible] = useState(false);

  const commitTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const pendingRef = useRef(null); // { sectionId }

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;

    setLoading(true);
    try {
      await songbooksAPI.addSection(
        songbook._id,
        newSectionName.trim(),
        newSectionDescription.trim()
      );

      setNewSectionName('');
      setNewSectionDescription('');
      setIsAdding(false);

      if (onSectionAdded) onSectionAdded();
    } catch (error) {
      console.error('Error adding section:', error);
      alert('Помилка додавання розділу: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const hideUndo = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    setUndoVisible(false);
    hideTimerRef.current = window.setTimeout(() => setUndo(null), 300);
  };

  // Остаточне видалення розділу на сервері (якщо undo не натиснули)
  const commitRemoveSection = async () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    try {
      await songbooksAPI.removeSection(songbook._id, pending.sectionId);
      if (onSectionRemoved) onSectionRemoved(pending.sectionId);
    } catch (error) {
      console.error('Error removing section:', error);
      alert('Помилка видалення розділу: ' + (error.response?.data?.message || error.message));
      // Повертаємо розділ у список
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(pending.sectionId);
        return next;
      });
    }
  };

  const requestRemoveSection = (section) => {
    const sectionId = section._id;

    // Якщо вже є невідкладене видалення — спершу фіксуємо його
    if (pendingRef.current) {
      if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
      commitRemoveSection();
    }

    pendingRef.current = { sectionId };

    // 1) Анімація зникнення
    setLeavingIds((prev) => new Set(prev).add(sectionId));

    // 2) Після анімації — ховаємо рядок зі списку (сервер поки не чіпаємо)
    window.setTimeout(() => {
      setRemovedIds((prev) => new Set(prev).add(sectionId));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }, SECTION_LEAVE_MS);

    // 3) Тост undo
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    setUndo({ message: `«${section.name}» видалено` });
    window.setTimeout(() => setUndoVisible(true), 30);

    // 4) Відкладена фіксація на сервері
    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      commitRemoveSection();
      hideUndo();
    }, SECTION_UNDO_MS);
  };

  const handleUndo = () => {
    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(pending.sectionId);
        return next;
      });
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(pending.sectionId);
        return next;
      });
    }
    hideUndo();
  };

  // Чистка таймерів + фіксація незавершеного видалення при закритті
  useEffect(() => () => {
    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      songbooksAPI.removeSection(songbook._id, pending.sectionId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSectionSongCount = (sectionId) => {
    return songbook.songs?.filter(s =>
      s.section && s.section.toString() === sectionId.toString()
    ).length || 0;
  };

  const sortedSections = songbook.sections
    ? [...songbook.sections]
        .filter((s) => !removedIds.has(s._id))
        .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    : [];

  return (
    <div className="section-manager">
      <div className="sections-header">
        <h3>
          <FiBook className="sec-icon" />
          Розділи співаника
        </h3>
        {canEdit && (
          <button
            onClick={() => setIsAdding(true)}
            className="add-section-btn"
            disabled={isAdding || loading}
          >
            <FiPlus />
            Додати розділ
          </button>
        )}
      </div>

      {isAdding && (
        <div className="add-section-form">
          <input
            type="text"
            placeholder="Назва розділу"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            className="section-name-input"
            maxLength={100}
          />
          <textarea
            placeholder="Опис розділу (необов'язково)"
            value={newSectionDescription}
            onChange={(e) => setNewSectionDescription(e.target.value)}
            className="section-description-input"
            maxLength={500}
            rows={2}
          />
          <div className="form-actions">
            <button
              onClick={handleAddSection}
              disabled={!newSectionName.trim() || loading}
              className="save-btn"
            >
              <FiCheck />
              Зберегти
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSectionName('');
                setNewSectionDescription('');
              }}
              className="cancel-btn"
              disabled={loading}
            >
              <FiX />
              Скасувати
            </button>
          </div>
        </div>
      )}

      <div className="sections-list">
        {sortedSections.length === 0 ? (
          <div className="no-sections">
            <p>У співанику ще немає розділів</p>
            {canEdit && (
              <p className="hint">Додайте розділи для кращої організації пісень</p>
            )}
          </div>
        ) : (
          sortedSections.map((section, index) => (
            <SectionRow
              key={section._id}
              section={section}
              songCount={getSectionSongCount(section._id)}
              canEdit={canEdit}
              index={index}
              isLeaving={leavingIds.has(section._id)}
              onRequestRemove={requestRemoveSection}
            />
          ))
        )}
      </div>

      {canEdit && sortedSections.length > 0 && (
        <p className="sections-swipe-hint">Свайпніть розділ вліво, щоб видалити</p>
      )}

      {undo && (
        <UndoToast message={undo.message} visible={undoVisible} onUndo={handleUndo} />
      )}
    </div>
  );
};

export default SectionManager;
