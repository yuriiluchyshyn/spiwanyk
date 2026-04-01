import React, { useState } from 'react';
import { songbooksAPI } from '../../services/api';
import { FiPlus, FiTrash2, FiEdit3, FiCheck, FiX, FiBook } from 'react-icons/fi';
import './SectionManager.css';

const SectionManager = ({ songbook, onSectionAdded, onSectionRemoved, canEdit }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [editingSection, setEditingSection] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    
    setLoading(true);
    try {
      await songbooksAPI.addSection(
        songbook._id, 
        newSectionName.trim(), 
        newSectionDescription.trim()
      );
      
      setNewSectionName('');
      setNewSectionDescription('');
      setIsAdding(false);
      
      if (onSectionAdded) {
        onSectionAdded();
      }
    } catch (error) {
      console.error('Error adding section:', error);
      alert('Помилка додавання розділу: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSection = async (sectionId) => {
    if (!window.confirm('Видалити цей розділ? Пісні з розділу залишаться у співанику без розділу.')) {
      return;
    }
    
    setLoading(true);
    try {
      await songbooksAPI.removeSection(songbook._id, sectionId);
      
      if (onSectionRemoved) {
        onSectionRemoved(sectionId);
      }
    } catch (error) {
      console.error('Error removing section:', error);
      alert('Помилка видалення розділу: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getSectionSongCount = (sectionId) => {
    return songbook.songs?.filter(s => 
      s.section && s.section.toString() === sectionId.toString()
    ).length || 0;
  };

  const sortedSections = songbook.sections 
    ? [...songbook.sections].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    : [];

  return (
    <div className="section-manager">
      <div className="sections-header">
        <h3>
          <FiBook className="sec-icon" />
          Розділи співаника
        </h3>
        {canEdit && (
          <button 
            onClick={() => setIsAdding(true)}
            className="add-section-btn"
            disabled={isAdding || loading}
          >
            <FiPlus />
            Додати розділ
          </button>
        )}
      </div>

      {isAdding && (
        <div className="add-section-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Назва розділу"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="section-name-input"
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <textarea
              placeholder="Опис розділу (необов'язково)"
              value={newSectionDescription}
              onChange={(e) => setNewSectionDescription(e.target.value)}
              className="section-description-input"
              maxLength={500}
              rows={2}
            />
          </div>
          <div className="form-actions">
            <button 
              onClick={handleAddSection}
              disabled={!newSectionName.trim() || loading}
              className="save-btn"
            >
              <FiCheck />
              Зберегти
            </button>
            <button 
              onClick={() => {
                setIsAdding(false);
                setNewSectionName('');
                setNewSectionDescription('');
              }}
              className="cancel-btn"
              disabled={loading}
            >
              <FiX />
              Скасувати
            </button>
          </div>
        </div>
      )}

      <div className="sections-list">
        {sortedSections.length === 0 ? (
          <div className="no-sections">
            <p>У співанику ще немає розділів</p>
            {canEdit && (
              <p className="hint">Додайте розділи для кращої організації пісень</p>
            )}
          </div>
        ) : (
          sortedSections.map(section => (
            <div key={section._id} className="section-item">
              <div className="section-info">
                <h4 className="section-name">{section.name}</h4>
                {section.description && (
                  <p className="section-description">{section.description}</p>
                )}
                <span className="section-count">
                  {getSectionSongCount(section._id)} пісень
                </span>
              </div>
              
              {canEdit && (
                <div className="section-actions">
                  <button
                    onClick={() => handleRemoveSection(section._id)}
                    className="remove-section-btn"
                    disabled={loading}
                    title="Видалити розділ"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SectionManager;