import React from 'react';
import SongItem from '../SongItem/SongItem';
import EmptyState from '../EmptyState/EmptyState';
import './SongsList.css';

interface Song {
  _id: string;
  title: string;
  author?: string;
  sectionId?: string | null;
  metadata?: {
    performer?: string;
    words?: string;
  };
}

interface Section {
  _id: string;
  name: string;
}

interface SongsListProps {
  songs: Song[];
  activeSection: string;
  draggedSong: Song | null;
  dropTarget?: { songId: string; position: 'before' | 'after' } | null;
  canEdit: boolean;
  sections?: Section[];
  expandedSongId?: string | null;
  onShowAddSongs: () => void;
  onDragStart: (e: React.DragEvent, song: Song) => void;
  onDragEnd: () => void;
  onDragOverItem?: (e: React.DragEvent, song: Song, index: number) => void;
  onDragLeaveItem?: () => void;
  onDropOnItem?: (e: React.DragEvent, song: Song, index: number) => void;
  onToggleExpand: (song: Song) => void;
  onRegisterRef?: (songId: string, el: HTMLElement | null) => void;
  onRemoveSong: (songId: string) => void;
  onMoveToSection?: (song: Song, sectionId: string | null) => void;
}

const SongsList: React.FC<SongsListProps> = ({
  songs,
  activeSection,
  draggedSong,
  dropTarget,
  canEdit,
  sections = [],
  expandedSongId,
  onShowAddSongs,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDragLeaveItem,
  onDropOnItem,
  onToggleExpand,
  onRegisterRef,
  onRemoveSong,
  onMoveToSection
}) => {
  if (songs.length === 0) {
    return (
      <EmptyState 
        activeSection={activeSection}
        canEdit={canEdit}
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
            canEdit={canEdit}
            sections={sections}
            isExpanded={expandedSongId === song._id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOverItem={onDragOverItem}
            onDragLeaveItem={onDragLeaveItem}
            onDropOnItem={onDropOnItem}
            onToggleExpand={onToggleExpand}
            onRegisterRef={onRegisterRef}
            onRemoveSong={onRemoveSong}
            onMoveToSection={onMoveToSection}
          />
        );
      })}
    </div>
  );
};

export default SongsList;
