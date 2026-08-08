import React, { useMemo } from 'react';
import { FiFolder, FiInbox } from 'react-icons/fi';
import './SectionsNavigation.css';

interface Section {
  _id: string;
  name: string;
}

interface SectionsNavigationProps {
  sections: Section[];
  /** 'none' — пісні без розділу, інакше id розділу */
  activeSection: string;
  songbook: any;
  /** Розділ, над яким зараз тримають пісню: 'none' | id */
  dragOverSection: string | null;
  isDragging?: boolean;
  onSectionClick: (sectionId: string) => void;
}

export const NO_SECTION = 'none';

const SectionsNavigation: React.FC<SectionsNavigationProps> = ({
  sections,
  activeSection,
  songbook,
  dragOverSection,
  isDragging = false,
  onSectionClick
}) => {
  const getSectionSongCount = (sectionId: string) =>
    songbook.songs?.filter(
      (s: any) => s.section && s.section.toString() === sectionId.toString()
    ).length || 0;

  const noSectionCount =
    songbook.songs?.filter((s: any) => !s.section).length || 0;

  // Розділи завжди за алфавітом (копія — щоб не мутувати props)
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.name.localeCompare(b.name, 'uk')),
    [sections]
  );

  return (
    <div className={`sections-nav ${isDragging ? 'is-drop-mode' : ''}`}>
      <button
        type="button"
        className={`section-btn ${activeSection === NO_SECTION ? 'active' : ''} ${
          dragOverSection === NO_SECTION ? 'drag-over' : ''
        }`}
        onClick={() => onSectionClick(NO_SECTION)}
        data-drop-section={NO_SECTION}
        title="Пісні, які не належать жодному розділу"
      >
        <FiInbox className="section-btn-icon" />
        Без розділу ({noSectionCount})
      </button>

      {sortedSections.map(section => (
        <button
          type="button"
          key={section._id}
          className={`section-btn ${activeSection === section._id ? 'active' : ''} ${
            dragOverSection === section._id ? 'drag-over' : ''
          }`}
          onClick={() => onSectionClick(section._id)}
          data-drop-section={section._id}
          title={section.name}
        >
          <FiFolder className="section-btn-icon" />
          {section.name} ({getSectionSongCount(section._id)})
        </button>
      ))}
    </div>
  );
};

export default SectionsNavigation;
