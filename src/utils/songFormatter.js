// Утиліта для форматування тексту пісень та акордів

export class SongFormatter {
  constructor(lyrics, chords = '') {
    this.lyrics = lyrics || '';
    this.chords = chords || '';
  }

  // Розпізнавання структури пісні
  parseStructure() {
    const lines = this.lyrics.split('\n').filter(line => line.trim());
    const sections = [];
    let currentSection = null;
    let sectionType = 'verse';
    let verseCount = 1;
    let chorusCount = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;

      // Розпізнавання типу секції
      const newSectionType = this.detectSectionType(line, i, lines);
      
      if (newSectionType !== sectionType || !currentSection) {
        // Завершити попередню секцію
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Почати нову секцію
        sectionType = newSectionType;
        const sectionName = this.getSectionName(sectionType, verseCount, chorusCount);
        
        if (sectionType === 'verse') verseCount++;
        if (sectionType === 'chorus') chorusCount++;
        
        currentSection = {
          type: sectionType,
          name: sectionName,
          lines: []
        };
      }
      
      currentSection.lines.push(line);
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  // Розпізнавання типу секції за контентом
  detectSectionType(line, index, allLines) {
    const lowerLine = line.toLowerCase();
    
    // Приспів - повторювані фрази
    const chorusKeywords = ['приспів', 'chorus', 'рефрен'];
    if (chorusKeywords.some(keyword => lowerLine.includes(keyword))) {
      return 'chorus';
    }
    
    // Повторення попередніх рядків (ознака приспіву)
    if (index > 2) {
      const prevLines = allLines.slice(Math.max(0, index - 4), index);
      if (prevLines.some(prevLine => prevLine.trim() === line)) {
        return 'chorus';
      }
    }
    
    // Короткі повторювані фрази
    if (line.length < 50 && allLines.filter(l => l.trim() === line).length > 1) {
      return 'chorus';
    }
    
    // Мостик
    const bridgeKeywords = ['мостик', 'bridge'];
    if (bridgeKeywords.some(keyword => lowerLine.includes(keyword))) {
      return 'bridge';
    }
    
    return 'verse';
  }

  // Назва секції
  getSectionName(type, verseCount, chorusCount) {
    switch (type) {
      case 'verse':
        return `Куплет ${verseCount}`;
      case 'chorus':
        return 'Приспів';
      case 'bridge':
        return 'Мостик';
      default:
        return 'Куплет';
    }
  }

  // Парсинг акордів з тексту
  parseChords() {
    if (!this.chords) return null;
    
    const lines = this.chords.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // Перевірити чи це рядок з акордами (містить акорди без тексту)
      if (this.isChordLine(line) && nextLine && !this.isChordLine(nextLine)) {
        result.push({
          chords: line,
          lyrics: nextLine
        });
        i++; // Пропустити наступний рядок (текст)
      } else if (!this.isChordLine(line)) {
        result.push({
          chords: '',
          lyrics: line
        });
      }
    }
    
    return result;
  }

  // Перевірка чи рядок містить тільки акорди
  isChordLine(line) {
    if (!line || !line.trim()) return false;
    
    // Регулярний вираз для акордів
    const chordPattern = /^[\s]*([A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?[\s]*)+[\s]*$/;
    const words = line.trim().split(/\s+/);
    
    // Якщо більше 70% слів - акорди, то це рядок акордів
    const chordWords = words.filter(word => /^[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?$/.test(word));
    return chordWords.length / words.length > 0.7;
  }

  // Вставка акордів над текстом
  insertChordsIntoLyrics(chordsData) {
    if (!chordsData) return this.lyrics;
    
    return chordsData.map(item => {
      if (!item.chords) return item.lyrics;
      
      const chords = item.chords.trim().split(/\s+/);
      const lyrics = item.lyrics;
      let result = '';
      let chordIndex = 0;
      let position = 0;
      
      // Розподілити акорди по словах
      const words = lyrics.split(/(\s+)/);
      
      for (let i = 0; i < words.length; i += 2) { // Кожне друге - слово
        const word = words[i] || '';
        const space = words[i + 1] || '';
        
        if (chordIndex < chords.length && word) {
          const chord = chords[chordIndex];
          const padding = Math.max(0, word.length - chord.length);
          result += `<span class="chord-above">${chord}</span><span class="chord-padding">${' '.repeat(padding)}</span>\n`;
          chordIndex++;
        }
        
        result += word + space;
      }
      
      return result;
    }).join('\n');
  }

  // Основний метод форматування
  format(showChords = false) {
    const sections = this.parseStructure();
    
    if (showChords) {
      const chordsData = this.parseChords();
      if (chordsData) {
        return {
          type: 'chords',
          content: this.insertChordsIntoLyrics(chordsData),
          sections: sections
        };
      }
    }
    
    return {
      type: 'lyrics',
      content: sections,
      sections: sections
    };
  }
}

// Допоміжні функції
export const formatSong = (lyrics, chords, showChords = false) => {
  const formatter = new SongFormatter(lyrics, chords);
  return formatter.format(showChords);
};

export const detectChords = (text) => {
  const chordPattern = /\b[A-G][#b]?[m]?[0-9]?[sus]?[add]?[dim]?[aug]?\b/g;
  const matches = text.match(chordPattern) || [];
  return matches.length > 3; // Якщо більше 3 акордів, вважаємо що є акорди
};