import React from 'react';
import './FormattedSong.css';

const FormattedSong = ({ song, showChords, isModal = false }) => {
  if (!song) return <div className="no-lyrics">Пісня не знайдена</div>;

  if (song.structure && song.structure.length > 0) {
    return renderStructuredSong(song.structure, showChords, isModal);
  }

  if (!song.lyrics) return <div className="no-lyrics">Текст пісні відсутній</div>;

  return renderLegacySong(song, isModal);
};

// Рендер рядка з точним позиціонуванням акордів по пікселях
const renderLine = (line, showChords) => {
  const text = line.text || '';
  const chordPositions = line.chordPositions || [];
  
  if (!text) return null;

  const hasChords = chordPositions.length > 0;
  
  if (!hasChords) {
    return <div className="text-line">{text}</div>;
  }

  // Розбиваємо текст на окремі символи
  const chars = text.split('');
  
  // Створюємо мапу: charIndex → акорди
  const chordMap = {};
  for (const cp of chordPositions) {
    const idx = Math.min(cp.charIndex, chars.length - 1); // захист від виходу за межі
    if (!chordMap[idx]) chordMap[idx] = [];
    chordMap[idx].push(cp.chord);
  }

  return (
    <div className={`line-with-pixel-chords ${showChords ? 'show-chords' : ''}`}>
      {showChords && (
        <div className="chords-container">
          {chordPositions.map((cp, cpIdx) => (
            <span 
              key={cpIdx}
              className="chord-at-pixel-position"
              style={{ 
                left: `${calculateCharPosition(chars, cp.charIndex)}px`,
                top: '0'
              }}
            >
              {cp.chord}
            </span>
          ))}
        </div>
      )}
      <div className="text-container">
        {chars.map((char, idx) => (
          <span key={idx} className="char-span" data-char-index={idx}>
            {char}
          </span>
        ))}
      </div>
    </div>
  );
};

// Функція для розрахунку позиції символу
const calculateCharPosition = (chars, charIndex) => {
  // Використовуємо більш точні ширини символів для Georgia шрифту (1rem = 16px)
  let position = 0;
  
  for (let i = 0; i < Math.min(charIndex, chars.length); i++) {
    const char = chars[i];
    
    // Приблизні ширини символів в Georgia шрифті (1rem розмір)
    if (char === ' ') {
      position += 4.5; // пробіл
    } else if (/[iIlj1\.,;:!]/.test(char)) {
      position += 4; // вузькі символи та пунктуація
    } else if (/[mMwW]/.test(char)) {
      position += 13; // широкі символи
    } else if (/[A-ZА-Я]/.test(char)) {
      position += 10; // великі літери (латинські та кириличні)
    } else if (/[а-я]/.test(char)) {
      position += 8.5; // кириличні малі літери
    } else if (/[a-z]/.test(char)) {
      position += 8; // латинські малі літери
    } else if (/[\d]/.test(char)) {
      position += 8; // цифри
    } else {
      position += 8; // інші символи
    }
  }
  
  return position;
};

// Структурована пісня
const renderStructuredSong = (structure, showChords, isModal = false) => {
  return (
    <div className={`formatted-song structured ${isModal ? 'modal-view' : ''}`}>
      {structure.map((section, si) => {
        const isChorus = section.type === 'chorus' ||
          section.lines.some(l => l.isChorus);

        return (
          <div key={si} className={`song-section ${isChorus ? 'chorus' : 'verse'}`}>
            {section.lines.map((line, li) => (
              <div key={li} className="song-line">
                {renderLine(line, showChords)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// Legacy пісня
const renderLegacySong = (song, isModal = false) => {
  const lines = (song.lyrics || '').split('\n');

  return (
    <div className={`formatted-song legacy ${isModal ? 'modal-view' : ''}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="song-line empty-line" />;
        return (
          <div key={i} className="song-line">
            <div className="text-line">{trimmed}</div>
          </div>
        );
      })}
    </div>
  );
};

export default FormattedSong;