import React, { useMemo } from 'react';
import { useNowSinging } from '../../contexts/NowSingingContext';
import BookView from '../BookView/BookView';

/**
 * The single, app-wide BookView instance. Any "singing now" chip (header or
 * card) opens the songbook through the NowSinging context, which this renders.
 */
const GlobalBookView = () => {
  const { book, closeBook } = useNowSinging();
  const songbookId = book?.songbookId || null;

  // Stable object identity across context re-renders (the NowSinging poll
  // updates the context every few seconds). Without this, BookView would get a
  // new `songbookData` every poll, resetting its own polling/auto-scroll timer.
  const songbookData = useMemo(
    () => (songbookId ? { _id: songbookId } : null),
    [songbookId]
  );

  if (!book || !songbookData) return null;

  return (
    <BookView
      // Re-mount when switching to a different songbook so it reloads cleanly.
      key={songbookId}
      songbookData={songbookData}
      initialSingScrollSongId={book.scrollSongId}
      scrollNonce={book.nonce}
      onClose={closeBook}
    />
  );
};

export default GlobalBookView;
