import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
import { useAuth } from './AuthContext';
import { songbooksAPI } from '../services/api';

/**
 * Tracks every "singing now" song across all songbooks the current user can
 * see, so the header can show one chip per active songbook simultaneously.
 * Also owns the single, app-wide BookView modal so a chip click anywhere opens
 * the right songbook scrolled to the sung song.
 */
const NowSingingContext = createContext();

export const useNowSinging = () => {
  const ctx = useContext(NowSingingContext);
  if (!ctx) {
    throw new Error('useNowSinging must be used within a NowSingingProvider');
  }
  return ctx;
};

// How often we re-pull the aggregated singing state.
const POLL_INTERVAL_MS = 4000;

export const NowSingingProvider = ({ children }) => {
  const { user } = useAuth();
  const [sings, setSings] = useState([]);
  const [book, setBook] = useState(null); // { songbookId, scrollSongId }

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await songbooksAPI.getAllNowSinging();
      if (mountedRef.current) setSings(Array.isArray(data) ? data : []);
    } catch (e) {
      // Silent — the next poll retries.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSings([]);
      return undefined;
    }
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [user, refresh]);

  const openBook = useCallback((songbookId, scrollSongId = null) => {
    if (!songbookId) return;
    // `nonce` changes on every call so that clicking a chip for the songbook
    // that is already open still re-triggers a scroll to the song.
    setBook({
      songbookId: songbookId.toString(),
      scrollSongId: scrollSongId || null,
      nonce: Date.now()
    });
  }, []);

  const closeBook = useCallback(() => setBook(null), []);

  const value = {
    sings,
    myEmail: user?.email || null,
    refresh,
    book,
    openBook,
    closeBook
  };

  return (
    <NowSingingContext.Provider value={value}>
      {children}
    </NowSingingContext.Provider>
  );
};
