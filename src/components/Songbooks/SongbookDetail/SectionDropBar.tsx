import React, { useMemo } from 'react';
import { FiFolder, FiInbox } from 'react-icons/fi';

interface Section {
  _id: string;
  name: string;
}

interface SectionDropBarProps {
  sections: Section[];
  /** Розділ, у якому пісня зараз */
  currentSectionId: string | null;
  /** Зона, над якою тримають пісню: 'none' | id */
  activeDropSection: string | null;
  songTitle: string;
}

/**
 * Плаваюча панель зон скидання, що з'являється лише під час перетягування.
 * Таби розділів можуть бути проскролені за межі екрана, а ця панель завжди
 * під рукою — це єдиний спосіб зручно кинути пісню в розділ на телефоні.
 */
const SectionDropBar: React.FC<SectionDropBarProps> = ({
  sections,
  currentSectionId,
  activeDropSection,
  songTitle
}) => {
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.name.localeCompare(b.name, 'uk')),
    [sections]
  );

  const zoneClass = (id: string) =>
    [
      'section-drop-zone',
      activeDropSection === id ? 'is-over' : '',
      (id === 'none' ? null : id) === currentSectionId ? 'is-current' : ''
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="section-drop-bar">
      <div className="section-drop-bar-hint">
        Кинути «{songTitle}» у розділ
      </div>
      <div className="section-drop-bar-zones">
        <div className={zoneClass('none')} data-drop-section="none">
          <FiInbox />
          <span>Без розділу</span>
        </div>
        {sortedSections.map(section => (
          <div
            key={section._id}
            className={zoneClass(section._id)}
            data-drop-section={section._id}
          >
            <FiFolder />
            <span>{section.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionDropBar;
