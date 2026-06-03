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
  dropTarget?: { songId: string; position: 'before' | 'after' } | null;
  onShowAddSongs: () => void;
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

const SongsList: React.FC<SongsListProps> = ({
  songs,
  activeSection,
  draggedSong,
  dropTarget,
  onShowAddSongs,
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
      {songs.map((song, index) => {
        const dropPosition =
          dropTarget && dropTarget.songId === song._id ? dropTarget.position : null;
        return (
          <SongItem
            key={song._id}
            song={song}
            index={index}
            isDragging={draggedSong?._id === song._id}
            dropPosition={dropPosition}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOverItem={onDragOverItem}
            onDragLeaveItem={onDragLeaveItem}
            onDropOnItem={onDropOnItem}
            onViewSong={onViewSong}
            onPlayNow={onPlayNow}
            onAddToPlaylist={onAddToPlaylist}
            onRemoveSong={onRemoveSong}
          />
        );
      })}
    </div>
  );
};

export default SongsList;
