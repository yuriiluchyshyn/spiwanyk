import React, { useState, useMemo } from 'react';
import FormattedSong from '../Songs/FormattedSong';
import './SongEditor.css';

const SECTION_TYPES = [
  { value: 'verse', label: 'Куплет' },
  { value: 'chorus', label: 'Приспів' },
  { value: 'bridge', label: 'Бридж' },
  { value: 'intro', label: 'Вступ' },
  { value: 'outro', label: 'Кінцівка' }
];

// Корені акордів у хроматичному порядку (A → G), з дієзами та бемолями.
const CHORD_ROOTS = [
  'A', 'A#', 'Bb', 'B', 'C', 'C#', 'Db', 'D', 'D#', 'Eb',
  'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab'
];

// Різновиди акордів (від простих до складніших).
const CHORD_QUALITIES = [
  '', 'm', '5', '6', '7', 'm6', 'm7', 'maj7',
  'sus2', 'sus4', 'add9', '9', 'm9', 'dim', 'aug', '7sus4'
];

// Повний перелік акордів у порядку: корінь (алфавітно A→G) → різновид.
const ALL_CHORDS = CHORD_ROOTS.flatMap((root) =>
  CHORD_QUALITIES.map((quality) => root + quality)
);

// Найпоширеніші акорди: натуральні ноти + C#/F# (найуживаніші альтеровані
// у гітарних тональностях) та лише базові різновиди. Усе решта — бемольні
// корені (Bb, Eb, Ab…), maj7, sus2, sus4, add9, dim, aug тощо — доступне
// лише у повному списку (коли галочку «Тільки поширені» знято).
const COMMON_ROOTS = ['A', 'B', 'C', 'C#', 'D', 'E', 'F', 'F#', 'G'];
const COMMON_QUALITIES = ['', 'm', '6', '7', 'm7'];
const COMMON_CHORD_SET = new Set(
  COMMON_ROOTS.flatMap((root) => COMMON_QUALITIES.map((quality) => root + quality))
);

const emptyLine = () => ({ text: '', chordPositions: [], isChorus: false });
const emptySection = (number = 1) => ({
  type: 'verse',
  number,
  repeat: 1,
  lines: [emptyLine()]
});

// Нормалізуємо структуру пісні у форму, зручну для редагування.
function normalizeStructure(song) {
  if (song && Array.isArray(song.structure) && song.structure.length > 0) {
    return song.structure.map((s) => ({
      type: s.type || 'verse',
      number: s.number || 1,
      repeat: s.repeat || 1,
      lines: (s.lines || []).map((l) => ({
        text: l.text || '',
        isChorus: !!l.isChorus,
        chordPositions: (l.chordPositions || [])
          .map((c) => ({ chord: c.chord, charIndex: c.charIndex }))
          .sort((a, b) => a.charIndex - b.charIndex)
      }))
    }));
  }
  // Нова пісня або пісня лише з плоским текстом → один порожній куплет.
  if (song && song.lyrics) {
    const lines = song.lyrics.split('\n').filter((l) => l.trim().length > 0);
    return [{
      type: 'verse',
      number: 1,
      repeat: 1,
      lines: lines.length ? lines.map((t) => ({ text: t, chordPositions: [], isChorus: false })) : [emptyLine()]
    }];
  }
  return [emptySection()];
}

// Чи має структура хоч один розставлений акорд.
function structureHasChords(structure) {
  return (structure || []).some((s) =>
    (s.lines || []).some((l) => (l.chordPositions || []).length > 0)
  );
}

// Перетворює структуру назад у простий текст (секції — через порожній рядок).
function structureToText(structure) {
  return (structure || [])
    .map((s) => (s.lines || []).map((l) => l.text).join('\n'))
    .join('\n\n');
}

// Розбирає вставлений текст у структуру: порожні рядки розділяють секції.
function textToStructure(text) {
  const blocks = (text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/);

  const sections = [];
  let number = 1;

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
      .filter((l) => l.trim().length > 0);

    if (!lines.length) continue;

    sections.push({
      type: 'verse',
      number: number++,
      repeat: 1,
      lines: lines.map((t) => ({ text: t, chordPositions: [], isChorus: false }))
    });
  }

  return sections.length ? sections : [emptySection()];
}

/**
 * Таблиця вибору акорду: пошук + сітка всіх можливих акордів за алфавітом.
 * Можна також ввести власний акорд і натиснути Enter.
 */
function ChordPicker({ charLabel, current, onPick, onRemove, onClose }) {
  const [query, setQuery] = useState('');
  const [commonOnly, setCommonOnly] = useState(true);

  const filtered = useMemo(() => {
    const base = commonOnly
      ? ALL_CHORDS.filter((c) => COMMON_CHORD_SET.has(c))
      : ALL_CHORDS;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => c.toLowerCase().includes(q));
  }, [query, commonOnly]);

  return (
    <div className="chord-popover">
      <div className="chord-popover-head">
        <span className="chord-popover-label">Акорд над «{charLabel}»:</span>
        {current && (
          <button type="button" className="chord-remove-btn" onClick={onRemove}>
            Прибрати {current}
          </button>
        )}
        <label className="chord-common-toggle" title="Показувати лише найпоширеніші акорди">
          <input
            type="checkbox"
            checked={commonOnly}
            onChange={(e) => setCommonOnly(e.target.checked)}
          />
          Тільки поширені
        </label>
        <button type="button" className="chord-popover-close" onClick={onClose}>✕</button>
      </div>

      <input
        className="chord-popover-input"
        type="text"
        autoFocus
        value={query}
        placeholder="Пошук або власний акорд (Enter)…"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim()) onPick(query.trim());
          if (e.key === 'Escape') onClose();
        }}
      />

      <div className="chord-grid" role="listbox" aria-label="Список акордів">
        {filtered.map((ch) => (
          <button
            type="button"
            key={ch}
            className={`chord-option ${current === ch ? 'selected' : ''}`}
            onClick={() => onPick(ch)}
          >
            {ch}
          </button>
        ))}
        {filtered.length === 0 && (
          <span className="chord-grid-empty">Нічого не знайдено — натисніть Enter, щоб додати «{query.trim()}»</span>
        )}
      </div>
    </div>
  );
}

/**
 * Редактор одного рядка: текст + точкове розміщення акордів на символах.
 * Акорди зберігаються як { chord, charIndex } — charIndex прив'язаний до
 * конкретного символу, тож позиції не зміщуються після збереження.
 */
function LineEditor({ line, onChange, onRemove }) {
  const [editPos, setEditPos] = useState(null);

  const text = line.text || '';
  const chords = line.chordPositions || [];
  const chordAt = (idx) => chords.find((c) => c.charIndex === idx);

  const handleTextChange = (value) => {
    // Прибираємо акорди, що вийшли за межі нового тексту.
    const nextChords = chords.filter((c) => c.charIndex < value.length);
    onChange({ ...line, text: value, chordPositions: nextChords });
  };

  const setChordAt = (idx, value) => {
    const v = (value || '').trim();
    let next = chords.filter((c) => c.charIndex !== idx);
    if (v) next.push({ chord: v, charIndex: idx });
    next = next.sort((a, b) => a.charIndex - b.charIndex);
    onChange({ ...line, chordPositions: next });
    setEditPos(null);
  };

  const removeChordAt = (idx) => {
    onChange({ ...line, chordPositions: chords.filter((c) => c.charIndex !== idx) });
    setEditPos(null);
  };

  return (
    <div className="line-editor">
      <div className="line-editor-row">
        <input
          className="line-text-input"
          type="text"
          value={text}
          placeholder="Текст рядка"
          onChange={(e) => handleTextChange(e.target.value)}
        />
        <button
          type="button"
          className="line-remove-btn"
          title="Видалити рядок"
          onClick={onRemove}
        >
          ✕
        </button>
      </div>

      {text.length > 0 && (
        <div className="chord-strip" role="group" aria-label="Розміщення акордів">
          {text.split('').map((ch, idx) => {
            const c = chordAt(idx);
            return (
              <button
                type="button"
                key={idx}
                className={`chord-cell ${c ? 'has-chord' : ''} ${editPos === idx ? 'active' : ''}`}
                title={c ? `Акорд ${c.chord} (натисніть, щоб змінити)` : 'Додати акорд тут'}
                onClick={() => setEditPos(editPos === idx ? null : idx)}
              >
                <span className="chord-cell-chord">{c ? c.chord : ''}</span>
                <span className="chord-cell-char">{ch === ' ' ? '·' : ch}</span>
              </button>
            );
          })}
        </div>
      )}

      {editPos != null && (
        <ChordPicker
          charLabel={text[editPos] === ' ' ? '␣' : text[editPos]}
          current={chordAt(editPos)?.chord || ''}
          onPick={(value) => setChordAt(editPos, value)}
          onRemove={() => removeChordAt(editPos)}
          onClose={() => setEditPos(null)}
        />
      )}
    </div>
  );
}

export default function SongEditor({ song, categories = [], onClose, onSave }) {
  const isNew = !song || !song._id;

  const [title, setTitle] = useState(song?.title || '');
  const [author, setAuthor] = useState(song?.author || '');
  const [category, setCategory] = useState(song?.category || (categories[0]?.id || ''));
  const [youtubeUrl, setYoutubeUrl] = useState(song?.youtubeUrl || '');
  const [structure, setStructure] = useState(() => normalizeStructure(song));
  const [saving, setSaving] = useState(false);

  // Дві фази редагування:
  //  - false → простий текстовий режим (вставити/редагувати текст пісні);
  //  - true  → режим розстановки акордів (смужки над кожним рядком).
  // Якщо пісня вже має акорди — одразу відкриваємо режим акордів.
  const initialHasChords = structureHasChords(normalizeStructure(song));
  const [chordsEnabled, setChordsEnabled] = useState(initialHasChords);
  const [lyricsText, setLyricsText] = useState(() =>
    structureToText(normalizeStructure(song))
  );

  // Структура, що відображає поточний стан незалежно від режиму.
  const liveStructure = chordsEnabled ? structure : textToStructure(lyricsText);

  // --- section / line operations ---
  const updateSection = (si, patch) =>
    setStructure((prev) => prev.map((s, i) => (i === si ? { ...s, ...patch } : s)));

  const updateLine = (si, li, nextLine) =>
    setStructure((prev) =>
      prev.map((s, i) =>
        i === si ? { ...s, lines: s.lines.map((l, j) => (j === li ? nextLine : l)) } : s
      )
    );

  const addLine = (si) =>
    setStructure((prev) =>
      prev.map((s, i) => (i === si ? { ...s, lines: [...s.lines, emptyLine()] } : s))
    );

  const removeLine = (si, li) =>
    setStructure((prev) =>
      prev.map((s, i) =>
        i === si ? { ...s, lines: s.lines.filter((_, j) => j !== li) } : s
      )
    );

  const addSection = () =>
    setStructure((prev) => [...prev, emptySection(prev.length + 1)]);

  const removeSection = (si) =>
    setStructure((prev) => prev.filter((_, i) => i !== si));

  // Перехід «текст → акорди»: розбираємо вставлений текст у структуру.
  const enableChords = () => {
    setStructure(textToStructure(lyricsText));
    setChordsEnabled(true);
  };

  // Повернення до тексту: серіалізуємо структуру назад (акорди буде втрачено).
  const backToText = () => {
    if (structureHasChords(structure) &&
        !window.confirm('Повернення до текстового режиму прибере розставлені акорди. Продовжити?')) {
      return;
    }
    setLyricsText(structureToText(structure));
    setChordsEnabled(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    // Чистимо порожні рядки та секції, зберігаючи structure дослівно.
    const cleanedStructure = liveStructure
      .map((s) => ({
        type: s.type,
        number: Number(s.number) || 1,
        repeat: Number(s.repeat) || 1,
        // isChorus виставляємо за типом секції (для стилю приспіву)
        lines: s.lines
          .filter((l) => (l.text || '').length > 0)
          .map((l) => ({
            text: l.text,
            isChorus: s.type === 'chorus',
            chordPositions: (l.chordPositions || [])
              .filter((c) => c.chord && c.chord.trim() && c.charIndex < l.text.length)
              .map((c) => ({ chord: c.chord.trim(), charIndex: c.charIndex }))
          }))
      }))
      .filter((s) => s.lines.length > 0);

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        author: author.trim(),
        category: category || undefined,
        youtubeUrl: youtubeUrl.trim(),
        structure: cleanedStructure
      });
    } finally {
      setSaving(false);
    }
  };

  // Прев'ю використовує той самий рендерер, що й сайт — точно як буде видно.
  const previewSong = { structure: liveStructure };

  return (
    <div className="song-editor-overlay" onClick={onClose}>
      <div className="song-editor" onClick={(e) => e.stopPropagation()}>
        <div className="song-editor-header">
          <h2>{isNew ? '➕ Нова пісня' : '✏️ Редагування пісні'}</h2>
          <button type="button" className="song-editor-close" onClick={onClose}>✕</button>
        </div>

        <div className="song-editor-body">
          <div className="song-editor-fields">
            <label>
              Назва*
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Назва пісні" />
            </label>
            <label>
              Автор
              <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Автор" />
            </label>
            <label>
              Розділ
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">— без розділу —</option>
                {categories.map((c) => (
                  <option key={c.id || c._id} value={c.id}>
                    {'\u00A0\u00A0'.repeat(c.depth || 0)}{c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              YouTube URL
              <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
            </label>
          </div>

          {/* === ФАЗА 1: ТЕКСТ === */}
          {!chordsEnabled && (
            <>
              <p className="song-editor-hint">
                Вставте або наберіть текст пісні. Порожній рядок розділяє куплети.
                Коли текст готовий, натисніть «Додати акорди», щоб над кожним рядком
                зʼявилася смужка для розстановки акордів.
              </p>

              <textarea
                className="song-editor-textarea"
                value={lyricsText}
                onChange={(e) => setLyricsText(e.target.value)}
                placeholder={'Вставте текст пісні тут…\n\nКуплет 1 рядок 1\nКуплет 1 рядок 2\n\nКуплет 2 рядок 1'}
                rows={12}
              />

              <div className="lyrics-mode-actions">
                <button
                  type="button"
                  className="btn-enable-chords"
                  onClick={enableChords}
                  disabled={!lyricsText.trim()}
                  title={lyricsText.trim() ? 'Перейти до розстановки акордів' : 'Спочатку введіть текст пісні'}
                >
                  🎸 Додати акорди
                </button>
              </div>
            </>
          )}

          {/* === ФАЗА 2: АКОРДИ === */}
          {chordsEnabled && (
            <>
              <p className="song-editor-hint">
                Клацніть на будь-який символ у смужці під рядком — зʼявиться таблиця
                всіх акордів за алфавітом. Виберіть акорд, і він стане над цим символом.
                Позиція акорду прив'язана до символу і не зміщується після збереження.
              </p>

              <div className="lyrics-mode-actions">
                <button type="button" className="btn-back-to-text" onClick={backToText}>
                  ← Редагувати текст
                </button>
              </div>

              <div className="song-editor-sections">
                {structure.map((section, si) => (
                  <div key={si} className="song-editor-section">
                    <div className="section-controls">
                      <select
                        value={section.type}
                        onChange={(e) => updateSection(si, { type: e.target.value })}
                      >
                        {SECTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <label className="section-num">
                        №
                        <input
                          type="number"
                          min="1"
                          value={section.number}
                          onChange={(e) => updateSection(si, { number: e.target.value })}
                        />
                      </label>
                      <label className="section-num">
                        повтор
                        <input
                          type="number"
                          min="1"
                          value={section.repeat}
                          onChange={(e) => updateSection(si, { repeat: e.target.value })}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-delete-song"
                        onClick={() => removeSection(si)}
                      >
                        Видалити секцію
                      </button>
                    </div>

                    {section.lines.map((line, li) => (
                      <LineEditor
                        key={li}
                        line={line}
                        onChange={(next) => updateLine(si, li, next)}
                        onRemove={() => removeLine(si, li)}
                      />
                    ))}

                    <button type="button" className="btn-add-line" onClick={() => addLine(si)}>
                      + рядок
                    </button>
                  </div>
                ))}

                <button type="button" className="btn-add-section" onClick={addSection}>
                  + секція
                </button>
              </div>
            </>
          )}

          <div className="song-editor-preview">
            <div className="song-editor-preview-title">Попередній перегляд</div>
            <FormattedSong song={previewSong} showChords={true} />
          </div>
        </div>

        <div className="song-editor-footer">
          <button type="button" className="btn-refresh" onClick={onClose} disabled={saving}>
            Скасувати
          </button>
          <button type="button" className="btn-import" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  );
}
