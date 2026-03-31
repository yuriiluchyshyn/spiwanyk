import React, { createContext, useContext, useState, useCallback } from 'react';

const SongbookContext = createContext();

export const useSongbook = () => {
  const context = useContext(SongbookContext);
  if (!context) {
    throw new Error('useSongbook must be used within a SongbookProvider');
  }
  return context;
};

export const SongbookProvider = ({ children }) => {
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const addToPlaylist = useCallback((song, position = 'end') => {
    setCurrentPlaylist(prev => {
      // Don't add duplicates
      if (prev.some(s => s._id === song._id)) return prev;
      if (position === 'next') {
        const currentIndex = prev.findIndex(s => s._id === currentSong?._id);
        const insertIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
        return [...prev.slice(0, insertIndex), song, ...prev.slice(insertIndex)];
      }
      return [...prev, song];
    });
  }, [currentSong]);

  const removeFromPlaylist = useCallback((songId) => {
    setCurrentPlaylist(prev => prev.filter(song => song._id !== songId));
  }, []);

  const playNow = useCallback((song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    // Add to playlist if not there
    setCurrentPlaylist(prev => {
      if (prev.some(s => s._id === song._id)) return prev;
      return [...prev, song];
    });
  }, []);

  const nextSong = useCallback(() => {
    if (currentPlaylist.length === 0) return null;
    const currentIndex = currentPlaylist.findIndex(s => s._id === currentSong?._id);
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    const next = currentPlaylist[nextIndex];
    setCurrentSong(next);
    setIsPlaying(true);
    return next;
  }, [currentPlaylist, currentSong]);

  const prevSong = useCallback(() => {
    if (currentPlaylist.length === 0) return null;
    const currentIndex = currentPlaylist.findIndex(s => s._id === currentSong?._id);
    const prevIndex = currentIndex <= 0 ? currentPlaylist.length - 1 : currentIndex - 1;
    const prev = currentPlaylist[prevIndex];
    setCurrentSong(prev);
    setIsPlaying(true);
    return prev;
  }, [currentPlaylist, currentSong]);

  const value = {
    currentPlaylist,
    currentSong,
    isPlaying,
    setIsPlaying,
    addToPlaylist,
    removeFromPlaylist,
    playNow,
    setCurrentPlaylist,
    nextSong,
    prevSong
  };

  return (
    <SongbookContext.Provider value={value}>
      {children}
    </SongbookContext.Provider>
  );
};
