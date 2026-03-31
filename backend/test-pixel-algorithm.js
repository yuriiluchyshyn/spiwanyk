// Тестуємо новий алгоритм позиціонування акордів по пікселях

// Симулюємо вимірювання ширини символів (приблизні значення)
function getCharWidth(char) {
  // Приблизні ширини символів в моноширинному шрифті 14px
  const widths = {
    ' ': 8,   // пробіл
    'Я': 12,  // кирилиця
    'й': 8,
    'ш': 12,
    'о': 10,
    'в': 10,
    'п': 10,
    'і': 4,
    'д': 10,
    'н': 10,
    'а': 10,
    'з': 8,
    'р': 8,
    'с': 8,
    'я': 10,
    ',': 4,
    'А': 12,
    'т': 8,
    'м': 14,
    'б': 10,
    'ч': 10,
    'е': 8,
    '.': 4
  };
  
  return widths[char] || 10; // за замовчуванням 10px
}

function calculateCharPositions(text) {
  const positions = [0];
  let totalWidth = 0;
  
  for (let i = 0; i < text.length; i++) {
    totalWidth += getCharWidth(text[i]);
    positions.push(totalWidth);
  }
  
  return positions;
}

function findCharIndexByPixelPosition(text, pixelPosition) {
  let remainingPixels = pixelPosition;
  let charIndex = 0;
  
  for (let i = 0; i < text.length; i++) {
    const charWidth = getCharWidth(text[i]);
    
    if (remainingPixels <= charWidth / 2) {
      // Якщо залишилось менше половини ширини символу, акорд має стояти над цим символом
      charIndex = i;
      break;
    }
    
    remainingPixels -= charWidth;
    charIndex = i + 1;
  }
  
  // Обмежуємо позицію межами тексту
  if (charIndex >= text.length) charIndex = text.length - 1;
  if (charIndex < 0) charIndex = 0;
  
  return { charIndex, remainingPixels };
}

// Тестуємо з реальними даними
console.log('=== TESTING PIXEL-BASED CHORD POSITIONING ===\n');

const chordLine = '       Em           G      Am        B7';
const textLine = 'Я йшов по воді і назад озирався,';

console.log('Chord line:', JSON.stringify(chordLine));
console.log('Text line:', JSON.stringify(textLine));
console.log();

// Рахуємо позиції символів в рядку акордів
const chordPositions = calculateCharPositions(chordLine);
console.log('Chord char positions (px):', chordPositions);

// Знаходимо акорди та їх позиції
const chords = [
  { chord: 'Em', position: 7 },   // Em починається з позиції 7
  { chord: 'G', position: 20 },   // G починається з позиції 20
  { chord: 'Am', position: 27 },  // Am починається з позиції 27
  { chord: 'B7', position: 37 }   // B7 починається з позиції 37
];

console.log('\n=== CHORD SYNCHRONIZATION ===');

const results = [];
for (const chord of chords) {
  const chordPixelPos = chordPositions[chord.position] || 0;
  const result = findCharIndexByPixelPosition(textLine, chordPixelPos);
  
  console.log(`Chord "${chord.chord}" at char ${chord.position} = ${chordPixelPos}px`);
  console.log(`  -> Text char ${result.charIndex} (remaining: ${result.remainingPixels.toFixed(1)}px, char: "${textLine[result.charIndex] || 'END'}")`);
  
  results.push({
    chord: chord.chord,
    charIndex: result.charIndex
  });
}

console.log('\n=== FINAL RESULT ===');
console.log('Text:', textLine);
console.log('Chord positions:', results);

console.log('\n=== VISUAL REPRESENTATION ===');
results.forEach(r => {
  console.log(`Index ${r.charIndex}: "${textLine[r.charIndex]}" -> Chord: ${r.chord}`);
});

// Тестуємо зворотний процес (для сайту)
console.log('\n=== REVERSE PROCESS (FOR WEBSITE) ===');
results.forEach(r => {
  // Рахуємо позицію в пікселях для нашого шрифту
  let pixelPos = 0;
  for (let i = 0; i < r.charIndex; i++) {
    pixelPos += getCharWidth(textLine[i]);
  }
  console.log(`Chord "${r.chord}" at charIndex ${r.charIndex} -> ${pixelPos}px in our font`);
});