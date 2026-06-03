import React from 'react';
import { Link } from 'react-router-dom';
import { FiMove, FiEye, FiTrash2 } from 'react-icons/fi';
import './SongItem.css';

interface Song {
  _id: string;
  title: string;
  author?: string;
  metadata?: {
    performer?: string;
    words?: string;
  };
}

interface SongItemProps {
  song: Song;
  index: number;
  isDragging: boolean;
  dropPosition?: 'before' | 'after' | null;
  onDragStart: (e: React.DragEvent, song: Song) => void;
  onDragEnd: () => void;
  onDragOverItem?: (e: React.DragEvent, song: Song, index: number) => void;
  onDragLeaveItem?: () => void;
  onDropOnItem?: (e: React.DragEvent, song: Song, index: number) => void;
  onViewSong: (song: Song) => void;
  onPlayNow: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onRemoveSong: (songId: string) => void;
}

const SongItem: React.FC<SongItemProps> = ({
  song,
  index,
  isDragging,
  dropPosition,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDragLeaveItem,
  onDropOnItem,
  onViewSong,
  onPlayNow,
  onAddToPlaylist,
  onRemoveSong
}) => {
  const dropClass = dropPosition === 'before'
    ? 'drop-before'
    : dropPosition === 'after'
      ? 'drop-after'
      : '';

  return (
    <div 
      className={`song-item ${isDragging ? 'dragging' : ''} ${dropClass}`}
      draggable
      onDragStart={(e) => onDragStart(e, song)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOverItem && onDragOverItem(e, song, index)}
      onDragLeave={() => onDragLeaveItem && onDragLeaveItem()}
      onDrop={(e) => onDropOnItem && onDropOnItem(e, song, index)}
    >
      <div className="song-number">
        {index + 1}
      </div>
      
      <div className="song-info">
        <Link to={`/songs/${song._id}`} className="song-title">
          {song.title}
        </Link>
        {song.author && (
          <p className="song-author">{song.author}</p>
        )}
        
        {/* Метаінформація */}
        {(song.metadata?.performer || song.metadata?.words) && (
          <div className="song-metadata-inline">
            {song.metadata.performer && (
              <span className="metadata-inline">🎤 {song.metadata.performer}</span>
            )}
            {song.metadata.words && song.metadata.words !== song.metadata.performer && (
              <span className="metadata-inline">✍️ {song.metadata.words}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="song-actions">
        <button 
          className="action-btn drag"
          title="Перетягнути для зміни порядку або розділу"
        >
          <FiMove />
        </button>
        <button 
          onClick={() => onViewSong(song)}
          className="action-btn view"
          title="Переглянути пісню"
        >
          <FiEye />
        </button>
        <button 
          onClick={() => onRemoveSong(song._id)}
          className="action-btn remove"
          title="Видалити зі співаника"
        >
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
};

export default SongItem;
