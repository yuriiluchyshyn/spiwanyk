import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { songsAPI, songbooksAPI } from '../../services/api';
import { useSongbook } from '../../contexts/SongbookContext';
import { FiX, FiChevronLeft, FiChevronRight, FiArrowLeft, FiHeart, FiPlay, FiPlus } from 'react-icons/fi';
import FormattedSong from '../Songs/FormattedSong';
import './BookView.css';

const BookView = ({ onClose, songbookData }) => {
  const navigate = useNavigate();
  const { addToPlaylist, playNow } = useSongbook();
  const [songbook, setSongbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [activeSong, setActiveSong] = useState(null);
  const [showChords, setShowChords] = useState(false);
  const [mobileView, setMobileView] = useState('left');
  
  const [isClosing, setIsClosing] = useState(false);
  
  // Animation states
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const [nextPageContent, setNextPageContent] = useState(null);

  // Swipe handling
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  useEffect(() => {
    const loadSongbook = async () => {
      try {
        if (songbookData) {
          const data = await songbooksAPI.getById(songbookData._id);
          setSongbook(data);
        }
      } catch (e) {
        console.error('Error loading songbook:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSongbook();
  }, [songbookData]);

  const getSectionSongs = useCallback((sectionId) => {
    if (!songbook?.songs) return [];
    
    const sectionSongs = songbook.songs
      .filter(s => {
        if (!sectionId) return !s.section;
        return s.section && s.section.toString() === sectionId.toString();
      })
      .map(s => s.song)
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    
    return sectionSongs;
  }, [songbook]);

  const sectionsWithSongs = songbook?.sections?.filter(
    sec => getSectionSongs(sec._id).length > 0
  ) || [];

  const noSectionSongs = getSectionSongs(null);
  const allSections = [
    ...(noSectionSongs.length > 0 ? [{ _id: null, name: 'Без розділу', icon: '🎵' }] : []),
    ...sectionsWithSongs
  ];

  const playPageTurnSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {}
  };

  const goToSection = (section) => {
    if (isFlipping) return;
    
    playPageTurnSound();
    setIsFlipping(true);
    setFlipDirection('forward');
    setNextPageContent({ type: 'section', data: section });
    
    setTimeout(() => {
      setActiveSection(section);
      setActiveSong(null);
      if (isMobile) setMobileView('right');
      
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection('');
        setNextPageContent(null);
      }, 50);
    }, 700);
  };

  const goToSong = (song) => {
    if (isFlipping) return;
    
    playPageTurnSound();
    setIsFlipping(true);
    setFlipDirection('forward');
    setNextPageContent({ type: 'song', data: song });
    
    setTimeout(() => {
      setActiveSong(song);
      if (isMobile) setMobileView('right');
      
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection('');
        setNextPageContent(null);
      }, 50);
    }, 700);
  };

  const goBack = () => {
    if (isFlipping) return;
    
    playPageTurnSound();
    setIsFlipping(true);
    setFlipDirection('backward');
    
    if (activeSong) {
      setNextPageContent({ type: 'section', data: activeSection });
      setTimeout(() => {
        setActiveSong(null);
        if (isMobile) setMobileView('left');
        
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection('');
          setNextPageContent(null);
        }, 50);
      }, 700);
    } else if (activeSection) {
      setNextPageContent({ type: 'toc', data: null });
      setTimeout(() => {
        setActiveSection(null);
        if (isMobile) setMobileView('left');
        
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection('');
          setNextPageContent(null);
        }, 50);
      }, 700);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        navigate(-1);
      }
    }, 300);
  };

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e) => {
    touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    const dx = touchStart.current.x - touchEnd.current.x;
    const dy = Math.abs(touchStart.current.y - touchEnd.current.y);

    if (Math.abs(dx) > 60 && Math.abs(dx) > dy) {
      if (dx > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
  };

  const handleNextPage = () => {
    if (isFlipping) return;
    
    if (isMobile && mobileView === 'left') {
      setMobileView('right');
      return;
    }

    if (!activeSection && allSections.length > 0) {
      goToSection(allSections[0]);
      return;
    }

    if (activeSection && !activeSong) {
      const sectionSongs = getSectionSongs(activeSection._id);
      if (sectionSongs.length > 0) {
        goToSong(sectionSongs[0]);
      }
      return;
    }

    if (activeSong && activeSection) {
      const sectionSongs = getSectionSongs(activeSection._id);
      const idx = sectionSongs.findIndex(s => s._id === activeSong._id);
      if (idx < sectionSongs.length - 1) {
        goToSong(sectionSongs[idx + 1]);
      } else {
        const secIdx = allSections.findIndex(s => s._id === activeSection._id);
        if (secIdx < allSections.length - 1) {
          goToSection(allSections[secIdx + 1]);
        }
      }
    }
  };

  const handlePrevPage = () => {
    if (isFlipping) return;
    
    if (isMobile && mobileView === 'right') {
      setMobileView('left');
      return;
    }
    goBack();
  };

  const getPageNumber = () => {
    if (!activeSection) return 1;
    const secIdx = allSections.findIndex(s => s._id === activeSection._id);
    if (!activeSong) return 2 + secIdx * 2;
    const sectionSongs = getSectionSongs(activeSection._id);
    const songIdx = sectionSongs.findIndex(s => s._id === activeSong._id);
    return 3 + secIdx * 2 + songIdx;
  };

  const renderFlipContent = (content, side) => {
    if (!content) return null;

    if (content.type === 'toc') {
      return renderTocContent();
    } else if (content.type === 'section') {
      return renderSectionContent(content.data);
    } else if (content.type === 'song') {
      return renderSongContent(content.data, side);
    }
    return null;
  };

  const renderTocContent = () => (
    <div className="page-inner">
      <div className="toc-title">Розділи</div>
      <div className="toc-sections">
        {allSections.map((section, idx) => (
          <div
            key={section._id || 'no-section'}
            className={`toc-section ${activeSection?._id === section._id ? 'active' : ''}`}
            onClick={() => goToSection(section)}
          >
            <div className="toc-number">{idx + 1}</div>
            <div className="toc-section-info">
              <div className="toc-section-name">
                {section.icon || '🎵'} {section.name}
              </div>
              <div className="toc-section-count">
                {getSectionSongs(section._id).length} пісень
              </div>
            </div>
            <FiChevronRight className="toc-arrow" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderSectionContent = (section) => {
    const sectionSongs = getSectionSongs(section._id);
    return (
      <div className="page-inner">
        <div className="songs-page-title">
          Пісні: {section.name}
        </div>
        <div className="songs-page-list">
          {sectionSongs.map((song, idx) => (
            <div key={song._id} className="song-entry" onClick={() => goToSong(song)}>
              <span className="song-entry-number">{idx + 1}.</span>
              <div className="song-entry-info">
                <div className="song-entry-title">{song.title}</div>
                {song.author && <div className="song-entry-meta">{song.author}</div>}
              </div>
              <div className="song-entry-actions">
                <button className="song-entry-action" onClick={(e) => { e.stopPropagation(); playNow(song); }} title="Грати зараз">
                  <FiPlay />
                </button>
                <button className="song-entry-action" onClick={(e) => { e.stopPropagation(); addToPlaylist(song); }} title="Додати до збірки">
                  <FiPlus />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSongContent = (song, side) => {
    if (side === 'left') {
      return (
        <div className="page-inner">
          <button className="back-to-list" onClick={goBack}>
            <FiArrowLeft /> Назад до списку
          </button>
          <div className="song-page-header">
            <div className="song-page-title">{song.title}</div>
            {song.author && <div className="song-page-author">{song.author}</div>}
            {(song.metadata?.words || song.metadata?.music) && (
              <div className="song-page-meta">
                {song.metadata.words && <span>Сл: {song.metadata.words}</span>}
                {song.metadata.music && <span>Муз: {song.metadata.music}</span>}
              </div>
            )}
            <div className="song-page-divider" />
          </div>
          <div className="song-page-lyrics">
            <FormattedSong song={song} showChords={showChords} />
          </div>
        </div>
      );
    } else {
      return (
        <div className="page-inner">
          <div className="songs-page-title">
            {song.youtubeUrl && (
              <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#8B4513', textDecoration: 'none', fontSize: '0.8rem' }}>
                ▶ Послухати на YouTube
              </a>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#8B4513', fontSize: '0.8rem', marginBottom: '1rem', justifyContent: 'center' }}>
            <input type="checkbox" checked={showChords} onChange={(e) => setShowChords(e.target.checked)} />
            Показати акорди
          </label>
          {song.metadata?.performer && (
            <div style={{ textAlign: 'center', color: '#8B7355', fontSize: '0.75rem', fontStyle: 'italic', marginBottom: '1rem' }}>
              Виконавець: {song.metadata.performer}
            </div>
          )}
          <div style={{ textAlign: 'center', color: '#8B7355', fontSize: '0.7rem', fontStyle: 'italic', marginTop: 'auto' }}>
            ❧ {songbook?.title || 'Співаник'} ❧
          </div>
        </div>
      );
    }
  };

  const renderLeftPage = () => {
    if (activeSong) return renderSongContent(activeSong, 'left');
    return renderTocContent();
  };

  const renderRightPage = () => {
    if (activeSong) return renderSongContent(activeSong, 'right');
    if (activeSection) return renderSectionContent(activeSection);

    return (
      <div className="page-inner book-title-page">
        <div className="title-emblem">📚</div>
        <div className="title-main">{songbook?.title?.toUpperCase() || 'СПІВАНИК'}</div>
        {songbook?.description && <div className="title-stats" style={{marginBottom: '1rem'}}>{songbook.description}</div>}
        <div className="title-line" />
        <div className="title-stats">{songbook?.songs?.length || 0} пісень • {allSections.length} розділів</div>
        <div className="title-hint">← Оберіть розділ зліва</div>
      </div>
    );
  };

  return (
    <div
      className={`book-view ${onClose ? 'modal-mode' : ''} ${isClosing ? 'closing' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {onClose && <div className="modal-backdrop" onClick={handleClose} />}
      
      <div className="book-toolbar">
        <div className="toolbar-center">
          <span className="toolbar-song-title">{songbook?.title || 'Співаник'}</span>
        </div>
        <button className="book-close-btn" onClick={handleClose}>
          <FiX />
        </button>
      </div>

      <div className="book-container">
        <div className="book-shadow" />
        <div className="book-spine" />

        <div className={`book-pages ${isFlipping ? 'flipping' : ''}`}>
          <div className={`book-page book-page-left ${isMobile ? (mobileView === 'left' ? 'visible-mobile' : 'hidden-mobile') : ''}`}>
            {renderLeftPage()}
            <div className="page-number">{getPageNumber()}</div>
          </div>

          <div className={`book-page book-page-right ${isMobile ? (mobileView === 'right' ? 'visible-mobile' : 'hidden-mobile') : ''}`}>
            {renderRightPage()}
            <div className="page-number">{getPageNumber() + 1}</div>
          </div>

          {isFlipping && !isMobile && (
            <div className={`flip-page ${flipDirection === 'forward' ? 'flipping-forward' : 'flipping-backward'}`}>
              <div className="flip-front">
                {flipDirection === 'forward' ? renderRightPage() : renderLeftPage()}
              </div>
              <div className="flip-back">
                {nextPageContent && renderFlipContent(nextPageContent, flipDirection === 'forward' ? 'left' : 'right')}
              </div>
            </div>
          )}
        </div>

        <button className="page-nav prev" onClick={handlePrevPage} disabled={isFlipping}>
          <FiChevronLeft />
        </button>
        <button className="page-nav next" onClick={handleNextPage} disabled={isFlipping}>
          <FiChevronRight />
        </button>
      </div>

      <div className="swipe-hint">← свайпніть для перегортання →</div>
    </div>
  );
};

export default BookView;