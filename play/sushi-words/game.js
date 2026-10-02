/* Pure question logic stays separate from the page so the collection can grow. */
(function (root) {
  'use strict';
  function shuffle(items, rng = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  const formats = {
    je: ['en-choice', 'en-spell'],
    ej: ['ja-choice', 'ja-spell'],
    romaji: ['romaji-spell', 'romaji-choice'],
    mixed: ['en-choice', 'ja-spell', 'romaji-choice', 'en-spell', 'ja-choice', 'romaji-spell']
  };
  function spelling(word, language, collection, rng = Math.random) {
    const chars = Array.from(language === 'ja' ? word : word.toUpperCase());
    const eligible = chars.map((char, i) => /[A-Z\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u.test(char) ? i : -1).filter(i => i >= 0);
    const holes = shuffle(eligible, rng).slice(0, Math.min(3, Math.max(1, Math.ceil(eligible.length / 3)))).sort((a, b) => a - b);
    // Each hole contributes its own card, including repeated characters.
    const required = holes.map(i => chars[i]);
    const alphabet = language === 'ja' ? [...new Set(collection.flatMap(s => Array.from(s.ja)))] : Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const cards = [...required];
    while (cards.length < Math.max(10, required.length)) cards.push(alphabet[Math.floor(rng() * alphabet.length)]);
    return {chars, holes, cards: shuffle(cards, rng)};
  }
  function question(sushi, format, collection, rng = Math.random) {
    const [language, kind] = format.split('-');
    const answer = sushi[language];
    const q = {sushi, language, kind, answer};
    if (kind === 'spell') Object.assign(q, spelling(answer, language, collection, rng));
    else {
      const alternatives = [...new Set(collection.map(s => s[language]))].filter(name => name !== answer);
      q.cards = shuffle([answer, ...shuffle(alternatives, rng).slice(0, 3)], rng);
    }
    return q;
  }
  root.SushiWordsEngine = {shuffle, spelling, question, formats};
  if (!root.document) return;
  const $ = id => document.getElementById(id);
  function bilingual(id, ja, en, primaryLanguage = null) {
    const japanese = document.createElement('span'); japanese.textContent = ja; japanese.lang = 'ja';
    const english = document.createElement('span'); english.textContent = en; english.lang = 'en'; english.className = 'enline';
    if (primaryLanguage) {
      japanese.className = primaryLanguage === 'ja' ? 'question-primary' : 'question-secondary';
      english.classList.add(primaryLanguage === 'en' ? 'question-primary' : 'question-secondary');
    }
    $(id).replaceChildren(japanese, english);
  }
  const collection = root.SUSHI_WORDS;
  const labels = {je: 'Japanese → English', ej: 'English → Japanese', romaji: 'Romaji', mixed: 'Mixed'};
  const state = {mode: null, deck: [], index: 0, score: 0, solved: false, q: null, filled: 0, used: new Set()};
  function show(screen) { for (const id of ['menu', 'game', 'result']) $(id).hidden = id !== screen; }
  function start(mode) {
    state.mode = mode; state.deck = shuffle(collection).slice(0, 10); state.index = 0; state.score = 0;
    $('plates').replaceChildren(); $('plate-count').textContent = '0'; show('game'); render();
  }
  function drawWord() {
    const q = state.q; $('word').replaceChildren();
    if (q.kind !== 'spell') { $('word').hidden = true; return; }
    $('word').hidden = false;
    let group = document.createElement('span'); group.className = 'word-group'; $('word').append(group);
    q.chars.forEach((char, i) => {
      if (char === ' ') { group = document.createElement('span'); group.className = 'word-group'; $('word').append(group); return; }
      const span = document.createElement('span'); span.className = 'letter';
      const hole = q.holes.indexOf(i); const isBlank = hole >= state.filled && hole !== -1;
      span.textContent = isBlank ? '_' : char;
      if (hole !== -1) span.classList.add(isBlank ? 'blank' : 'filled');
      group.append(span);
    });
    const spoken = q.chars.map((char, i) => q.holes.indexOf(i) >= state.filled && q.holes.includes(i) ? '空欄 / blank' : char).join(' ');
    $('word').setAttribute('aria-label', spoken);
  }
  function render() {
    const format = formats[state.mode][state.index % formats[state.mode].length];
    state.q = question(state.deck[state.index], format, collection); state.solved = false; state.filled = 0; state.used = new Set();
    const q = state.q;
    $('mode-label').textContent = labels[state.mode];
    $('progress').textContent = `${state.index + 1} / ${state.deck.length} 問 · Questions`;
    $('image-error').hidden = true; $('sushi-photo').hidden = false; $('sushi-photo').src = q.sushi.image;
    $('source-name').textContent = state.mode === 'ej' || (state.mode === 'mixed' && q.language === 'ja') ? q.sushi.en : q.sushi.ja;
    const languageLabel = {en: ['英語名', 'English name'], ja: ['日本語名', 'Japanese name'], romaji: ['ローマ字', 'Romaji']}[q.language];
    bilingual('instruction', q.kind === 'spell' ? `${languageLabel[0]}の空欄を左から埋めよう` : `${languageLabel[0]}はどれ？`, q.kind === 'spell' ? `${languageLabel[1]}: fill the blanks from left to right.` : ({en: 'Choose the English name.', ja: 'Choose the Japanese name.', romaji: 'Choose the romaji spelling.'}[q.language]), state.mode === 'ej' || (state.mode === 'mixed' && q.language === 'ja') ? 'en' : 'ja');
    bilingual('feedback', q.kind === 'spell' ? '下の文字カードをタップ' : '4枚から選んでね', q.kind === 'spell' ? 'Tap a letter below.' : 'Choose one of four.');
    $('feedback').className = 'feedback'; $('translation').textContent = ''; $('next').hidden = true;
    drawWord(); $('choices').className = `choices${q.kind === 'spell' ? ' letters' : ''}`;
    $('choices').replaceChildren();
    q.cards.forEach((card, index) => {
      const button = document.createElement('button'); button.className = 'card'; button.textContent = card;
      if (q.kind === 'spell') button.setAttribute('aria-label', `${card} · カード ${index + 1}`);
      button.addEventListener('click', () => pick(card, index, button)); $('choices').append(button);
    });
    $('instruction').focus({preventScroll: true});
  }
  function pick(card, index, button) {
    if (state.solved || state.used.has(index)) return;
    const q = state.q; const expected = q.kind === 'spell' ? q.chars[q.holes[state.filled]] : q.answer;
    if (card !== expected) {
      bilingual('feedback', 'もう一度、見てみよう', 'Try another card.'); $('feedback').className = 'feedback error';
      button.classList.add('wrong'); return;
    }
    state.used.add(index); button.disabled = true; button.classList.remove('wrong'); button.classList.add(q.kind === 'spell' ? 'used' : 'correct');
    $('feedback').className = 'feedback';
    if (q.kind === 'spell') {
      state.filled++; drawWord();
      if (state.filled < q.holes.length) { bilingual('feedback', '次の空欄へ', 'Fill the next blank.'); return; }
    }
    // Solved guard prevents double taps from awarding a second plate.
    state.solved = true; state.score++;
    $('plate-count').textContent = String(state.score);
    const plate = document.createElement('span'); plate.className = 'plate'; $('plates').append(plate);
    bilingual('feedback', '正解。ひと皿できました。', 'Correct. One more plate.');
    bilingual('translation', `${q.sushi.ja}（${q.sushi.kana}）`, `${q.sushi.romaji} · ${q.sushi.en}`);
    for (const option of $('choices').children) option.disabled = true;
    $('next').textContent = state.index + 1 === state.deck.length ? 'できあがりを見る / Finish →' : '次のひと皿 / Next →';
    $('next').hidden = false; $('next').focus({preventScroll: true});
  }
  $('sushi-photo').addEventListener('error', () => { $('image-error').hidden = false; $('sushi-photo').hidden = true; });
  $('retry-image').addEventListener('click', () => { $('image-error').hidden = true; $('sushi-photo').hidden = false; $('sushi-photo').src = state.q.sushi.image; });
  for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => start(button.dataset.mode));
  $('next').addEventListener('click', () => {
    if (!state.solved) return;
    state.index++;
    if (state.index < state.deck.length) render();
    else {
      show('result'); $('result-title').textContent = `${state.score}皿、できあがり。`;
      $('result-copy').textContent = `${labels[state.mode]} · ${state.score} / ${state.deck.length} plates`;
      $('result-title').focus({preventScroll: true});
    }
  });
  function menu() { show('menu'); document.querySelector(`[data-mode="${state.mode}"]`).focus({preventScroll: true}); }
  $('change-mode').addEventListener('click', menu); $('result-modes').addEventListener('click', menu);
  $('again').addEventListener('click', () => start(state.mode));
})(typeof window !== 'undefined' ? window : globalThis);
