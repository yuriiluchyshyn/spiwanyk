import React from 'react';
import SongItem from '../SongItem/SongItem';
import EmptyState from '../EmptyState/EmptyState';
import './SongsList.css';

interface Song {
  _id: string;
  title: string;
  author?: string;
  metadata?: {
    performer?: string;
    words?: string;
  };
}

interface SongsListProps {
  songs: Song[];
  activeSection: string;
  draggedSong: Song | null;
  onShowAddSongs: () => void;
  onDragStart: (e: React.DragEvent, song: Song) => void;
  onDragEnd: () => void;
  onViewSong: (song: Song) => void;
  onPlayNow: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onRemoveSong: (songId: string) => void;
}

const SongsList: React.FC<SongsListProps> = ({
  songs,
  activeSection,
  draggedSong,
  onShowAddSongs,
  onDragStart,
  onDragEnd,
  onViewSong,
  onPlayNow,
  onAddToPlaylist,
  onRemoveSong
}) => {
  if (songs.length === 0) {
    return (
      <EmptyState 
        activeSection={activeSection}
        onShowAddSongs={onShowAddSongs}
      />
    );
  }

  return (
    <div className="songs-list">
      {songs.map((song, index) => (
        <SongItem
          key={song._id}
          song={song}
          index={index}
          isDragging={draggedSong?._id === song._id}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onViewSong={onViewSong}
          onPlayNow={onPlayNow}
          onAddToPlaylist={onAddToPlaylist}
          onRemoveSong={onRemoveSong}
        />
      ))}
    </div>
  );
};

export default SongsList;