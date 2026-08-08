import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Перетягування пісень на Pointer Events.
 *
 * Нативний HTML5 drag&drop не працює на тач-пристроях, тому drag реалізовано
 * вручну: захоплюємо pointer на "ручці" пісні, ведемо привид за курсором/пальцем,
 * а ціль визначаємо через elementFromPoint по data-атрибутах:
 *   - [data-drop-section="<id>|none"] — таб розділу (кинути = перемістити в розділ)
 *   - [data-song-row][data-song-id][data-section-id] — рядок пісні (кинути = змінити порядок)
 */

export interface DraggedSong {
  _id: string;
  title: string;
  sectionId?: string | null;
}

export type SongDropTarget =
  | { kind: 'section'; sectionId: string | null }
  | {
      kind: 'song';
      songId: string;
      sectionId: string | null;
      position: 'before' | 'after';
    };

interface UseSongDragDropOptions {
  enabled: boolean;
  onDrop: (song: DraggedSong, target: SongDropTarget) => void;
}

// Скільки треба зсунути палець/курсор, щоб це вважалось перетягуванням, а не тапом
const ACTIVATION_DISTANCE = 6;
// Зона біля краю вікна, у якій сторінка починає автоскролитись
const AUTOSCROLL_EDGE = 88;
const AUTOSCROLL_SPEED = 16;

const normalizeSectionValue = (value?: string | null): string | null =>
  !value || value === 'none' || value === 'null' ? null : value;

interface DragSession {
  song: DraggedSong;
  pointerId: number;
  startX: number;
  startY: number;
  activated: boolean;
  target: SongDropTarget | null;
}

export const useSongDragDrop = ({ enabled, onDrop }: UseSongDragDropOptions) => {
  const [draggedSong, setDraggedSong] = useState<DraggedSong | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState<SongDropTarget | null>(null);

  const sessionRef = useRef<DragSession | null>(null);
  const onDropRef = useRef(onDrop);
  const moveHandlerRef = useRef<((e: PointerEvent) => void) | null>(null);
  const upHandlerRef = useRef<((e: PointerEvent) => void) | null>(null);
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  const rafRef = useRef<number | null>(null);
  const scrollDirRef = useRef(0);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  const stopAutoScroll = useCallback(() => {
    scrollDirRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    const step = () => {
      if (scrollDirRef.current !== 0) {
        window.scrollBy(0, scrollDirRef.current * AUTOSCROLL_SPEED);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const detachListeners = useCallback(() => {
    if (moveHandlerRef.current) {
      window.removeEventListener('pointermove', moveHandlerRef.current);
      moveHandlerRef.current = null;
    }
    if (upHandlerRef.current) {
      window.removeEventListener('pointerup', upHandlerRef.current);
      window.removeEventListener('pointercancel', upHandlerRef.current);
      upHandlerRef.current = null;
    }
    if (keyHandlerRef.current) {
      window.removeEventListener('keydown', keyHandlerRef.current);
      keyHandlerRef.current = null;
    }
  }, []);

  const resetSession = useCallback(() => {
    sessionRef.current = null;
    detachListeners();
    stopAutoScroll();
    document.body.classList.remove('song-drag-active');
    setDraggedSong(null);
    setIsDragging(false);
    setDropTarget(null);
  }, [detachListeners, stopAutoScroll]);

  // Прибираємо все, якщо компонент зник посеред перетягування
  useEffect(() => resetSession, [resetSession]);

  const resolveTarget = useCallback(
    (x: number, y: number): SongDropTarget | null => {
      const session = sessionRef.current;
      if (!session) return null;

      const element = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!element) return null;

      const sectionZone = element.closest<HTMLElement>('[data-drop-section]');
      if (sectionZone) {
        return {
          kind: 'section',
          sectionId: normalizeSectionValue(sectionZone.dataset.dropSection)
        };
      }

      const row = element.closest<HTMLElement>('[data-song-row]');
      if (row) {
        const songId = row.dataset.songId;
        if (!songId || songId === session.song._id) return null;

        const rect = row.getBoundingClientRect();
        return {
          kind: 'song',
          songId,
          sectionId: normalizeSectionValue(row.dataset.sectionId),
          position: y < rect.top + rect.height / 2 ? 'before' : 'after'
        };
      }

      return null;
    },
    []
  );

  const beginDrag = useCallback(
    (song: DraggedSong, event: React.PointerEvent) => {
      if (!enabled) return;
      // Тільки основна кнопка мишки / палець / стилус
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      if (sessionRef.current) return;

      event.stopPropagation();

      sessionRef.current = {
        song,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        activated: false,
        target: null
      };

      setPointer({ x: event.clientX, y: event.clientY });

      const handleMove = (e: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || session.pointerId !== e.pointerId) return;

        if (!session.activated) {
          const dx = e.clientX - session.startX;
          const dy = e.clientY - session.startY;
          if (Math.sqrt(dx * dx + dy * dy) < ACTIVATION_DISTANCE) return;

          session.activated = true;
          document.body.classList.add('song-drag-active');
          setDraggedSong(session.song);
          setIsDragging(true);
          startAutoScroll();
        }

        // Не даємо сторінці скролитись/виділятись під час перетягування
        if (e.cancelable) e.preventDefault();

        setPointer({ x: e.clientX, y: e.clientY });

        const height = window.innerHeight;
        scrollDirRef.current =
          e.clientY < AUTOSCROLL_EDGE
            ? -1
            : e.clientY > height - AUTOSCROLL_EDGE
              ? 1
              : 0;

        const next = resolveTarget(e.clientX, e.clientY);
        session.target = next;
        setDropTarget(prev => {
          if (prev === next) return prev;
          if (prev && next && prev.kind === next.kind) {
            if (prev.kind === 'section' && next.kind === 'section' && prev.sectionId === next.sectionId) {
              return prev;
            }
            if (
              prev.kind === 'song' &&
              next.kind === 'song' &&
              prev.songId === next.songId &&
              prev.position === next.position
            ) {
              return prev;
            }
          }
          return next;
        });
      };

      const handleUp = (e: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || session.pointerId !== e.pointerId) return;

        const { song: dragged, target, activated } = session;
        resetSession();

        if (activated && target) {
          onDropRef.current(dragged, target);
        }
      };

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') resetSession();
      };

      moveHandlerRef.current = handleMove;
      upHandlerRef.current = handleUp;
      keyHandlerRef.current = handleKey;

      window.addEventListener('pointermove', handleMove, { passive: false });
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
      window.addEventListener('keydown', handleKey);
    },
    [enabled, resetSession, resolveTarget, startAutoScroll]
  );

  const songDropTarget =
    dropTarget && dropTarget.kind === 'song'
      ? { songId: dropTarget.songId, position: dropTarget.position }
      : null;

  const sectionDropTarget =
    dropTarget && dropTarget.kind === 'section'
      ? dropTarget.sectionId ?? 'none'
      : null;

  return {
    draggedSong,
    isDragging,
    pointer,
    songDropTarget,
    sectionDropTarget,
    beginDrag,
    cancelDrag: resetSession
  };
};

export default useSongDragDrop;
