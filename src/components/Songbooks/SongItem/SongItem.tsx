import React from 'react';
import { Link } from 'react-router-dom';
import { FiMove, FiEye, FiPlay, FiPlus, FiTrash2 } from 'react-icons/fi';
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
  onDragStart: (e: React.DragEvent, song: Song) => void;
  onDragEnd: () => void;
  onViewSong: (song: Song) => void;
  onPlayNow: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onRemoveSong: (songId: string) => void;
}

const SongItem: React.FC<SongItemProps> = ({
  song,
  index,
  isDragging,
  onDragStart,
  onDragEnd,
  onViewSong,
  onPlayNow,
  onAddToPlaylist,
  onRemoveSong
}) => {
  return (
    <div 
      className={`song-item ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, song)}
      onDragEnd={onDragEnd}
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
          title="Перетягнути до розділу"
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
          onClick={() => onPlayNow(song)}
          className="action-btn play"
          title="Грати зараз"
        >
          <FiPlay />
        </button>
        <button 
          onClick={() => onAddToPlaylist(song)}
          className="action-btn add"
          title="Додати до плейлиста"
        >
          <FiPlus />
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