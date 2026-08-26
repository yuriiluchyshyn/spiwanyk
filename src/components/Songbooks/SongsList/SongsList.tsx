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
  /** Пісні, що зараз програють анімацію зникнення */
  leavingSongIds?: Set<string>;
  totalSongs?: number;
  onShowAddSongs: () => void;
  onDragHandleDown?: (e: React.PointerEvent, song: Song) => void;
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
  leavingSongIds,
  totalSongs,
  onShowAddSongs,
  onDragHandleDown,
  onToggleExpand,
  onRegisterRef,
  onRemoveSong,
  onMoveToSection
}) => {
  if (songs.length === 0) {
    return (
      <EmptyState 
        activeSection={activeSection}
        isSongbookEmpty={(totalSongs ?? songs.length) === 0}
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
            isLeaving={leavingSongIds?.has(song._id) ?? false}
            dropPosition={dropPosition}
            canEdit={canEdit}
            sections={sections}
            isExpanded={expandedSongId === song._id}
            onDragHandleDown={onDragHandleDown}
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
