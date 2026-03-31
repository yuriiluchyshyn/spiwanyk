// Тестуємо алгоритм синхронізації позицій акордів

function convertHtmlEntities(str) {
  return str.replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');
}

function parseChordsLine(chordsStr) {
  if (!chordsStr || !chordsStr.trim()) return [];

  // Очищуємо від HTML тегів, але зберігаємо пробіли
  const cleanLine = convertHtmlEntities(chordsStr.replace(/<[^>]*>/g, ''));

  const positions = [];
  const chordRegex = /[A-G][#b]?(?:m|min|maj|dim|aug|sus|add)?[0-9]?(?:\+[0-9])?(?:\/[A-G][#b]?)?/g;
  
  let match;
  while ((match = chordRegex.exec(cleanLine)) !== null) {
    positions.push({
      chord: match[0],
      position: match.index
    });
  }

  console.log('Parsed chords from line:', JSON.stringify(cleanLine));
  console.log('Found chords:', positions);

  return positions;
}

function synchronizeChordPositions(chordLine, textLine, chordPositions) {
  // Очищуємо рядки від HTML тегів, але зберігаємо пробіли
  const cleanChordLine = convertHtmlEntities(chordLine.replace(/<[^>]*>/g, ''));
  const cleanTextLine = convertHtmlEntities(textLine.replace(/<[^>]*>/g, ''));
  
  console.log('Chord line:', JSON.stringify(cleanChordLine));
  console.log('Text line:', JSON.stringify(cleanTextLine));
  
  // Знаходимо зсув між рядками
  // Припускаємо, що перший акорд має стояти над початком першого слова
  let textWordStart = 0;
  while (textWordStart < cleanTextLine.length && cleanTextLine[textWordStart] === ' ') {
    textWordStart++;
  }
  
  // Знаходимо позицію першого акорду
  let firstChordPos = chordPositions.length > 0 ? chordPositions[0].position : 0;
  
  // Рахуємо зсув - різниця між позицією першого акорду та початком тексту
  const offset = firstChordPos - textWordStart;
  
  console.log(`Text word starts at: ${textWordStart}, first chord at: ${firstChordPos}, offset: ${offset}`);
  
  const result = [];
  
  for (const cp of chordPositions) {
    // Застосовуємо зсув
    let charIndex = cp.position - offset;
    
    // Обмежуємо позицію межами тексту
    if (charIndex < 0) charIndex = 0;
    if (charIndex >= cleanTextLine.length) charIndex = cleanTextLine.length - 1;
    
    console.log(`Chord "${cp.chord}" at position ${cp.position} - offset ${offset} = charIndex ${charIndex} (char: "${cleanTextLine[charIndex] || 'END'}")`);
    
    result.push({
      chord: cp.chord,
      charIndex: charIndex
    });
  }
  
  return result;
}

// Тестуємо з реальними даними з HTML
console.log('=== TESTING CHORD SYNCHRONIZATION ===\n');

const chordLine = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Em&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; G&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Am&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; B7';
const textLine = 'Я йшов по воді і назад озирався,';

console.log('Original chord line:', chordLine);
console.log('Original text line:', textLine);
console.log();

// Парсимо акорди
const chordPositions = parseChordsLine(chordLine);
console.log();

// Ручно встановлюємо правильний зсув
// Тепер просто використовуємо точну позицію без зсуву
console.log('Using exact positions without offset');

const result = [];
const cleanTextLine = convertHtmlEntities(textLine.replace(/<[^>]*>/g, ''));

for (const cp of chordPositions) {
  let charIndex = cp.position;
  
  // Обмежуємо позицію межами тексту
  if (charIndex < 0) charIndex = 0;
  if (charIndex >= cleanTextLine.length) charIndex = cleanTextLine.length - 1;
  
  console.log(`Chord "${cp.chord}" at position ${cp.position} -> charIndex ${charIndex} (char: "${cleanTextLine[charIndex] || 'END'}")`);
  
  result.push({
    chord: cp.chord,
    charIndex: charIndex
  });
}
console.log();

console.log('=== FINAL RESULT ===');
console.log('Text:', textLine);
console.log('Chord positions:', result);

// Показуємо візуально
console.log('\n=== VISUAL REPRESENTATION ===');
const chars = textLine.split('');
chars.forEach((char, index) => {
  const chordsAtIndex = result.filter(r => r.charIndex === index);
  if (chordsAtIndex.length > 0) {
    console.log(`Index ${index}: "${char}" -> Chords: ${chordsAtIndex.map(c => c.chord).join(', ')}`);
  }
});