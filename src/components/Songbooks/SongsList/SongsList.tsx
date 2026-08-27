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

export interface SongGroup {
  /** NO_SECTION ('none') або section._id */
  id: string;
  sectionId: string | null;
  name: string;
  icon: 'inbox' | 'folder';
  songs: Song[];
}

interface SongsListProps {
  groups: SongGroup[];
  /** Показувати заголовки розділів (коли розділів більше за один) */
  showGroupHeaders: boolean;
  /** Відступ зверху для липких заголовків (висота навігації) */
  stickyTop?: number;
  /** Розділ, над яким зараз тримають пісню (для підсвітки заголовка як цілі) */
  dragOverSection?: string | null;
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
  onRegisterGroupRef?: (groupId: string, el: HTMLElement | null) => void;
  onRemoveSong: (songId: string) => void;
  onMoveToSection?: (song: Song, sectionId: string | null) => void;
}

const SongsList: React.FC<SongsListProps> = ({
  groups,
  showGroupHeaders,
  stickyTop = 0,
  dragOverSection,
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
  onRegisterGroupRef,
  onRemoveSong,
  onMoveToSection
}) => {
  const total = totalSongs ?? groups.reduce((n, g) => n + g.songs.length, 0);

  if (total === 0) {
    return (
      <EmptyState
        activeSection="none"
        isSongbookEmpty
        canEdit={canEdit}
        onShowAddSongs={onShowAddSongs}
      />
    );
  }

  const renderSong = (song: Song, index: number) => {
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
  };

  // Без розділів (один блок) — показуємо просто список без заголовків
  if (!showGroupHeaders) {
    const only = groups[0];
    return (
      <div className="songs-list">
        {only?.songs.map((song, index) => renderSong(song, index))}
      </div>
    );
  }

  return (
    <div className="songs-list">
      {groups.map(group => {
        const dropKey = group.sectionId ?? 'none';
        const isDropOver = dragOverSection === dropKey;
        return (
          <section className="songs-group" key={group.id}>
            <div
              className={`songs-group-header ${isDropOver ? 'drag-over' : ''}`}
              ref={(el) => onRegisterGroupRef?.(group.id, el)}
              style={{ top: stickyTop }}
              data-drop-section={dropKey}
              data-group-anchor={group.id}
              aria-label={group.name}
            />

            {group.songs.length === 0 ? (
              <div
                className="songs-group-empty"
                data-drop-section={dropKey}
              >
                {group.icon === 'inbox'
                  ? 'Усі пісні розкладені по розділах'
                  : 'У цьому розділі ще немає пісень'}
              </div>
            ) : (
              group.songs.map((song, index) => renderSong(song, index))
            )}
          </section>
        );
      })}
    </div>
  );
};

export default SongsList;
