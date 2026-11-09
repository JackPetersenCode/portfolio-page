/* Ear trainer: intervals, chord qualities, scales. Uses data/theory.js and audio.js. */
(function () {
  'use strict';
  const T = window.JG_THEORY;
  const root = document.getElementById('ear-trainer');
  if (!T || !root || !window.JGAudio) return;
  const A = window.JGAudio;
  const KEY = 'jgc.ear.stats';

  const MODES = {
    interval: {
      label: 'Intervals',
      items: () => T.intervals.filter(i => i.semitones > 0),
      name: i => i.long,
      notes: (i, base) => [base, base + i.semitones],
      playMode: opts => opts.direction,
    },
    triad: {
      label: 'Triads',
      items: () => ['maj', 'm', 'dim', 'aug', 'sus4'].map(k => ({ key: k, name: T.chordTypes[k].name, semis: T.chordTypes[k].semitones })),
      name: i => i.name,
      notes: (i, base) => i.semis.map(s => base + s),
      playMode: () => 'both',
    },
    seventh: {
      label: 'Seventh chords',
      items: () => ['maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7', '6', 'm6', '7#5', 'maj7#5', '7sus4'].map(k => ({ key: k, name: T.chordTypes[k].name, semis: T.chordTypes[k].semitones })),
      name: i => i.name,
      notes: (i, base) => i.semis.map(s => base + s),
      playMode: () => 'both',
    },
    scale: {
      label: 'Scales & modes',
      items: () => ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 'melodic_minor', 'harmonic_minor', 'altered', 'lydian_dominant', 'whole_tone', 'diminished_wh', 'diminished_hw', 'major_pentatonic', 'minor_pentatonic', 'blues']
        .map(k => ({ key: k, name: T.scales[k].display, semis: T.scales[k].semitones })),
      name: i => i.name,
      notes: (i, base) => i.semis.map(s => base + s).concat([base + 12]),
      playMode: () => 'melodic',
    },
    dominant: {
      label: 'Dominant colours (7 / 7b9 / 7#9 / 7#11 / 7alt / 13)',
      items: () => ['7', '9', '13', '7b9', '7#9', '7#11', '7alt', '7#5', '7sus4'].map(k => ({ key: k, name: T.chordTypes[k].name, semis: T.chordTypes[k].semitones })),
      name: i => i.name,
      notes: (i, base) => i.semis.map(s => base + s),
      playMode: () => 'both',
    },
  };

  const modeSel = root.querySelector('[name=mode]');
  const dirSel = root.querySelector('[name=direction]');
  const subsetBox = root.querySelector('.subset');
  const answers = root.querySelector('.big-answer');
  const stats = root.querySelector('.stat-row');
  const playBtn = root.querySelector('.btn-play');
  const nextBtn = root.querySelector('.btn-next');
  const reveal = root.querySelector('.reveal');
  Object.keys(MODES).forEach(k => modeSel.add(new Option(MODES[k].label, k)));

  let state = { correct: 0, total: 0, streak: 0 }, cur = null, answered = false;
  function loadStats() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) state = s; } catch (e) { /* ignore */ } }
  function saveStats() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  loadStats();

  function renderSubset() {
    const m = MODES[modeSel.value];
    subsetBox.innerHTML = m.items().map((it, i) => '<label><input type="checkbox" checked data-i="' + i + '"> ' + m.name(it) + '</label>').join(' ');
    dirSel.parentElement.hidden = modeSel.value !== 'interval';
  }
  function activeItems() {
    const m = MODES[modeSel.value];
    const items = m.items();
    const checked = Array.from(subsetBox.querySelectorAll('input')).filter(c => c.checked).map(c => Number(c.dataset.i));
    return checked.length ? checked.map(i => items[i]) : items;
  }
  function renderStats() {
    const pct = state.total ? Math.round(100 * state.correct / state.total) : 0;
    stats.innerHTML = '<span>Correct: <b>' + state.correct + '</b> / ' + state.total + ' (' + pct + '%)</span><span>Streak: <b>' + state.streak + '</b></span>';
  }
  function playCurrent() {
    if (!cur) return;
    const m = MODES[modeSel.value];
    let mode = m.playMode({ direction: dirSel.value });
    let notes = cur.notes.slice();
    if (modeSel.value === 'interval') {
      if (mode === 'descending') { notes = notes.slice().reverse(); mode = 'melodic'; }
      else if (mode === 'harmonic') mode = 'harmonic';
      else if (mode === 'random') { if (Math.random() < 0.5) notes = notes.slice().reverse(); mode = 'melodic'; }
      else mode = 'melodic';
    }
    A.playNotes(notes, { mode, dur: modeSel.value === 'scale' ? 0.38 : 0.7 });
  }
  function ask() {
    const m = MODES[modeSel.value];
    const items = activeItems();
    const item = items[Math.floor(Math.random() * items.length)];
    const base = 48 + Math.floor(Math.random() * 17);   // C3..E4
    cur = { item, notes: m.notes(item, base), base };
    answered = false;
    reveal.textContent = '';
    answers.innerHTML = m.items().map(it => '<button type="button" data-key="' + (it.key || it.name) + '">' + m.name(it) + '</button>').join('');
    answers.querySelectorAll('button').forEach(b => { if (!items.some(it => (it.key || it.name) === b.dataset.key)) b.disabled = true; });
    playCurrent();
  }
  answers.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b || !cur || answered) return;
    answered = true;
    const m = MODES[modeSel.value];
    const key = cur.item.key || cur.item.name;
    state.total++;
    if (b.dataset.key === key) { state.correct++; state.streak++; b.classList.add('correct'); }
    else { state.streak = 0; b.classList.add('wrong'); answers.querySelector('[data-key="' + key + '"]').classList.add('correct'); }
    reveal.textContent = 'Answer: ' + m.name(cur.item);
    saveStats(); renderStats();
  });
  playBtn.addEventListener('click', () => { if (cur) playCurrent(); else ask(); });
  nextBtn.addEventListener('click', ask);
  modeSel.addEventListener('change', () => { renderSubset(); cur = null; answers.innerHTML = ''; reveal.textContent = ''; });
  root.querySelector('.btn-reset').addEventListener('click', () => { state = { correct: 0, total: 0, streak: 0 }; saveStats(); renderStats(); });
  document.addEventListener('keydown', e => { if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); playCurrent(); } });
  renderSubset(); renderStats();
})();
