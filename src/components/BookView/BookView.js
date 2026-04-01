import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { songsAPI, songbooksAPI } from '../../services/api';
import { useSongbook } from '../../contexts/SongbookContext';
import { FiX, FiChevronLeft, FiChevronRight, FiArrowLeft, FiHeart, FiPlay, FiPlus } from 'react-icons/fi';
import FormattedSong from '../Songs/FormattedSong';
import './BookView.css';

// Компонент сторінки ОБОВ'ЯЗКОВО має використовувати React.forwardRef для бібліотеки react-pageflip
const Page = React.forwardRef(({ number, children, className, density }, ref) => {
  return (
    <div className={`book-page ${className}`} ref={ref} data-density={density || 'soft'}>
      {children}
      {number && <div className="page-number">{number}</div>}
    </div>
  );
});

const BookView = ({ onClose, songbookData }) => {
  const navigate = useNavigate();
  const { addToPlaylist, playNow } = useSongbook();
  const [songbook, setSongbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const flipBookRef = useRef(null);

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
    return songbook.songs
      .filter(s => (!sectionId ? !s.section : s.section?.toString() === sectionId.toString()))
      .map(s => s.song)
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title, 'uk'));
  }, [songbook]);

  const allSections = useMemo(() => {
    const noSectionSongs = getSectionSongs(null);
    const sectionsWithSongs = songbook?.sections?.filter(sec => getSectionSongs(sec._id).length > 0) || [];
    return [
      ...(noSectionSongs.length > 0 ? [{ _id: null, name: 'Без розділу', icon: '🎵' }] : []),
      ...sectionsWithSongs
    ];
  }, [songbook, getSectionSongs]);

  // ГЕНЕРУЄМО СТРУКТУРУ КНИГИ (Масив усіх сторінок)
  const bookPages = useMemo(() => {
    if (!songbook) return [];
    let pages = [];

    // 0. Обкладинка (Права сторона - hard)
    pages.push({ id: 'cover', type: 'cover', density: 'hard' });
    // 1. Внутрішня частина обкладинки (Ліва сторона - hard)
    pages.push({ id: 'inside-cover', type: 'blank', density: 'hard' });
    // 2. Зміст (Права сторона - soft)
    pages.push({ id: 'toc', type: 'toc' });

    allSections.forEach(section => {
      // Сторінка розділу
      pages.push({ id: `sec-${section._id}`, type: 'section', data: section });
      
      const songs = getSectionSongs(section._id);
      songs.forEach(song => {
        // Кожна пісня займає розворот (дві сторінки)
        pages.push({ id: `song-${song._id}-left`, type: 'song-left', data: song, section });
        pages.push({ id: `song-${song._id}-right`, type: 'song-right', data: song });
      });
    });

    // Додаємо задню обкладиннку (має бути зліва, тобто мати непарний індекс)
    if (pages.length % 2 === 0) {
      pages.push({ id: 'blank-padding', type: 'blank' }); // Порожня права сторінка
    }
    pages.push({ id: 'back-cover', type: 'back-cover', density: 'hard' });

    return pages;
  }, [songbook, allSections, getSectionSongs]);

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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
      else navigate(-1);
    }, 300);
  };

  // Навігація
  const goToPage = (index) => {
    if (flipBookRef.current) flipBookRef.current.pageFlip().flip(index);
  };

  const goToSection = (sectionId) => {
    const idx = bookPages.findIndex(p => p.id === `sec-${sectionId}`);
    if (idx !== -1) goToPage(idx);
  };

  const goToSong = (songId) => {
    const idx = bookPages.findIndex(p => p.id === `song-${songId}-left`);
    if (idx !== -1) goToPage(idx);
  };

  // --- Рендеринг контенту ---
  const renderPageContent = (page) => {
    if (page.type === 'cover') {
      return (
        <div className="page-inner book-title-page" style={{ justifyContent: 'center' }}>
          <div className="title-emblem">📚</div>
          <div className="title-main">{songbook.title?.toUpperCase() || 'СПІВАНИК'}</div>
          {songbook.description && <div className="title-stats" style={{marginBottom: '1rem'}}>{songbook.description}</div>}
          <div className="title-line" />
          <div className="title-stats">{songbook.songs?.length || 0} пісень • {allSections.length} розділів</div>
          <div className="title-hint" style={{ marginTop: '2rem' }}>Потягніть за куточок сторінки ↷</div>
        </div>
      );
    }

    if (page.type === 'toc') {
      return (
        <div className="page-inner">
          <div className="toc-title">Розділи</div>
          <div className="toc-sections">
            {allSections.map((section, idx) => (
              <div key={section._id || 'no-section'} className="toc-section" onClick={() => goToSection(section._id)}>
                <div className="toc-number">{idx + 1}</div>
                <div className="toc-section-info">
                  <div className="toc-section-name">{section.icon || '🎵'} {section.name}</div>
                  <div className="toc-section-count">{getSectionSongs(section._id).length} пісень</div>
                </div>
                <FiChevronRight className="toc-arrow" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (page.type === 'section') {
      const sectionSongs = getSectionSongs(page.data._id);
      return (
        <div className="page-inner">
          <div className="songs-page-title">Розділ: {page.data.name}</div>
          <div className="songs-page-list">
            {sectionSongs.map((song, idx) => (
              <div key={song._id} className="song-entry" onClick={() => goToSong(song._id)}>
                <span className="song-entry-number">{idx + 1}.</span>
                <div className="song-entry-info">
                  <div className="song-entry-title">{song.title}</div>
                  {song.author && <div className="song-entry-meta">{song.author}</div>}
                </div>
                <div className="song-entry-actions">
                  <button className="song-entry-action" onClick={(e) => { e.stopPropagation(); playNow(song); }}><FiPlay /></button>
                  <button className="song-entry-action" onClick={(e) => { e.stopPropagation(); addToPlaylist(song); }}><FiPlus /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (page.type === 'song-left') {
      const song = page.data;
      return (
        <div className="page-inner">
          <button className="back-to-list" onClick={() => goToPage(2)}><FiArrowLeft /> До змісту</button>
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
    }

    if (page.type === 'song-right') {
      const song = page.data;
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

    if (page.type === 'blank' || page.type === 'back-cover') {
      return (
        <div className="page-inner empty-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-page-icon">❧</div>
        </div>
      );
    }

    return null;
  };

  if (loading || !songbook) return null; // Можна додати спінер

  return (
    <div className={`book-view ${onClose ? 'modal-mode' : ''} ${isClosing ? 'closing' : ''}`}>
      {onClose && <div className="modal-backdrop" onClick={handleClose} />}
      
      <div className="book-toolbar">
        <div className="toolbar-center">
          <span className="toolbar-song-title">{songbook?.title || 'Співаник'}</span>
        </div>
        <button className="book-close-btn" onClick={handleClose}><FiX /></button>
      </div>

      <div className="flipbook-wrapper">
        <HTMLFlipBook
          width={420}       // Базова ширина сторінки
          height={600}      // Базова висота
          size="stretch"    // Книга розтягується під екран
          minWidth={300}
          maxWidth={800}
          minHeight={400}
          maxHeight={1000}
          maxShadowOpacity={0.4}
          showCover={true}  // Робить першу і останню сторінки твердими обкладинками
          mobileScrollSupport={true}
          onFlip={playPageTurnSound} // Звук при кожному перегортанні
          ref={flipBookRef}
          className="flip-book-container"
        >
          {bookPages.map((page, index) => {
            // Визначаємо, права це чи ліва сторінка (парні - праві, непарні - ліві)
            const isRightPage = index % 2 === 0;
            const pageClass = isRightPage ? 'book-page-right' : 'book-page-left';
            
            return (
              <Page 
                key={page.id} 
                density={page.density} 
                className={pageClass}
                number={index > 0 && index < bookPages.length - 1 ? index : null}
              >
                {renderPageContent(page)}
              </Page>
            );
          })}
        </HTMLFlipBook>

        {/* Кнопки навігації (якщо користувач не хоче свайпати) */}
        <button className="page-nav prev" onClick={() => flipBookRef.current?.pageFlip().flipPrev()}><FiChevronLeft /></button>
        <button className="page-nav next" onClick={() => flipBookRef.current?.pageFlip().flipNext()}><FiChevronRight /></button>
      </div>
    </div>
  );
};

export default BookView;