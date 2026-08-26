import React from 'react';
import { FiUsers } from 'react-icons/fi';
import { useNowSinging } from '../../contexts/NowSingingContext';
import './NowSingingBar.css';

/**
 * Row of chips, one per songbook that is being sung right now. The chip for the
 * song the current user is leading is highlighted in a distinct colour; all the
 * others are green. Clicking a chip opens that songbook scrolled to the song.
 */
const NowSingingBar = ({ className = '' }) => {
  const { sings, myEmail, openBook } = useNowSinging();

  if (!sings || sings.length === 0) return null;

  return (
    <div className={`now-singing-bar ${className}`}>
      {sings.map((s) => {
        const mine = !!myEmail && s.startedByEmail === myEmail;
        return (
          <button
            key={s.songbookId}
            type="button"
            className={`ns-chip ${mine ? 'mine' : ''}`}
            title={`${mine ? 'Ви співаєте' : 'Співають'} · ${s.songbookTitle}: ${s.songTitle}`}
            onClick={() => openBook(s.songbookId, s.songId)}
          >
            <FiUsers className="ns-chip-icon" />
            <span className="ns-chip-title">{s.songTitle}</span>
          </button>
        );
      })}
    </div>
  );
};

export default NowSingingBar;
