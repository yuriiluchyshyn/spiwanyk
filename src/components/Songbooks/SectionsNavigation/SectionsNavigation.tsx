import React from 'react';
import './SectionsNavigation.css';

interface Section {
  _id: string;
  name: string;
}

interface SectionsNavigationProps {
  sections: Section[];
  activeSection: string;
  songbook: any;
  dragOverSection: string | null;
  onSectionClick: (sectionId: string) => void;
  onDragOver: (e: React.DragEvent, sectionId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, sectionId: string) => void;
}

const SectionsNavigation: React.FC<SectionsNavigationProps> = ({
  sections,
  activeSection,
  songbook,
  dragOverSection,
  onSectionClick,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const getSectionSongCount = (sectionId: string) => {
    return songbook.songs?.filter((s: any) => 
      s.section && s.section.toString() === sectionId.toString()
    ).length || 0;
  };

  return (
    <div className="sections-nav">
      <button 
        className={`section-btn ${activeSection === 'all' ? 'active' : ''} ${dragOverSection === 'all' ? 'drag-over' : ''}`}
        onClick={() => onSectionClick('all')}
        onDragOver={(e) => onDragOver(e, 'no-section')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, 'no-section')}
      >
        Всі пісні ({songbook.songs?.length || 0})
      </button>
      {sections
        .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
        .map(section => (
        <button 
          key={section._id}
          className={`section-btn ${activeSection === section._id ? 'active' : ''} ${dragOverSection === section._id ? 'drag-over' : ''}`}
          onClick={() => onSectionClick(section._id)}
          onDragOver={(e) => onDragOver(e, section._id)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, section._id)}
        >
          {section.name} ({getSectionSongCount(section._id)})
        </button>
      ))}
    </div>
  );
};

export default SectionsNavigation;