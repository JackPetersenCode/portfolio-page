/* Chord dictionary and voice-leading assistant. Data: data/chords.js (generated). */
(function () {
  'use strict';
  const D = window.JG_CHORDS;
  if (!D) return;
  const TUNING = [40, 45, 50, 55, 59, 64];
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /** Mirrors sitegen/diagrams.chord_grid_svg. frets/labels: 6 entries low E -> high E, null = muted. */
  function chordGridSVG(frets, labels, title, subtitle, notes) {
    const fretted = frets.filter(f => f);
    const base = (!fretted.length || Math.max.apply(null, fretted) <= 5) ? 1 : Math.min.apply(null, fretted);
    let nFrets = 5;
    if (fretted.length && Math.max.apply(null, fretted) - base + 1 > nFrets) nFrets = Math.max.apply(null, fretted) - base + 1;
    const sx = 16, sy = 18, x0 = 22, y0 = 52;
    const w = x0 * 2 + sx * 5, h = y0 + sy * nFrets + (notes ? 26 : 14);
    let s = '<svg class="chord-grid" viewBox="0 0 ' + w + ' ' + h + '" width="' + Math.round(w * 1.25) + '" height="' + Math.round(h * 1.25) + '" role="img">';
    s += '<text class="cg-title" x="' + w / 2 + '" y="14" text-anchor="middle">' + esc(title) + '</text>';
    if (subtitle) s += '<text class="cg-sub" x="' + w / 2 + '" y="26" text-anchor="middle">' + esc(subtitle) + '</text>';
    if (base === 1) s += '<rect class="cg-nut" x="' + (x0 - 1) + '" y="' + (y0 - 3) + '" width="' + (sx * 5 + 2) + '" height="4"/>';
    else s += '<text class="cg-pos" x="' + (x0 - 6) + '" y="' + (y0 + sy * 0.65).toFixed(1) + '" text-anchor="end">' + base + 'fr</text>';
    for (let i = 0; i <= nFrets; i++) s += '<line class="cg-fret" x1="' + x0 + '" y1="' + (y0 + i * sy) + '" x2="' + (x0 + sx * 5) + '" y2="' + (y0 + i * sy) + '"/>';
    for (let i = 0; i < 6; i++) s += '<line class="cg-string" x1="' + (x0 + i * sx) + '" y1="' + y0 + '" x2="' + (x0 + i * sx) + '" y2="' + (y0 + sy * nFrets) + '"/>';
    frets.forEach((f, i) => {
      const x = x0 + i * sx, lab = labels[i];
      if (f === null || f === undefined) s += '<text class="cg-mute" x="' + x + '" y="' + (y0 - 7) + '" text-anchor="middle">×</text>';
      else if (f === 0) {
        s += '<circle class="cg-open" cx="' + x + '" cy="' + (y0 - 10) + '" r="4"/>';
        if (lab) s += '<text class="cg-openlabel" x="' + x + '" y="' + (y0 - 16) + '" text-anchor="middle">' + esc(lab) + '</text>';
      } else {
        const y = y0 + (f - base) * sy + sy / 2;
        s += '<circle class="cg-dot' + (lab === 'R' ? ' cg-root' : '') + '" cx="' + x + '" cy="' + y.toFixed(1) + '" r="7"/>';
        if (lab) s += '<text class="cg-label" x="' + x + '" y="' + (y + 2.6).toFixed(1) + '" text-anchor="middle">' + esc(lab) + '</text>';
      }
    });
    if (notes) {
      const yn = y0 + sy * nFrets + 16;
      notes.forEach((n, i) => { if (n) s += '<text class="cg-note" x="' + (x0 + i * sx) + '" y="' + yn + '" text-anchor="middle">' + esc(n) + '</text>'; });
    }
    s += '</svg>';
    return s;
  }
  function sixFrets(v) { const out = [null, null, null, null, null, null]; v.strings.forEach((s, i) => { out[6 - s] = v.frets[i]; }); return out; }
  function sixLabels(v) { const out = [null, null, null, null, null, null]; v.strings.forEach((s, i) => { out[6 - s] = v.degrees[i]; }); return out; }
  function sixNotes(v) { const out = [null, null, null, null, null, null]; v.strings.forEach((s, i) => { out[6 - s] = v.notes[i]; }); return out; }
  function figure(v, extra) {
    return '<figure>' + chordGridSVG(sixFrets(v), sixLabels(v), v.symbol, v.label.split(' · ').slice(1).join(' · '), sixNotes(v)) +
      '<figcaption>' + esc(v.label.split(' · ')[0]) + (extra ? ' · ' + esc(extra) : '') + '</figcaption></figure>';
  }
  window.JGChords = { chordGridSVG, figure };

  /** Resolve a typed chord symbol (any alias / enharmonic root) to the canonical symbol in the library. */
  function canonical(sym) {
    const t = sym.trim().replace(/\s+/g, '');
    if (D.alias[t]) return D.alias[t];
    const lower = t.toLowerCase();
    for (const k in D.alias) if (k.toLowerCase() === lower) return D.alias[k];
    return null;
  }

  // ---------------- dictionary ----------------
  const dict = document.getElementById('chord-dict');
  if (dict) {
    const rootSel = dict.querySelector('[name=root]');
    const typeSel = dict.querySelector('[name=type]');
    const catSel = dict.querySelector('[name=category]');
    const setSel = dict.querySelector('[name=set]');
    const results = dict.querySelector('.results');
    const info = dict.querySelector('.chord-info');
    D.roots.forEach(r => rootSel.add(new Option(r, r)));
    D.types.forEach(t => typeSel.add(new Option(t === 'maj' ? 'major triad' : t, t)));
    function render() {
      const symbol = rootSel.value + (typeSel.value === 'maj' ? '' : D.typeDisplay[typeSel.value]);
      const list = (D.bySymbol[symbol] || []).filter(v => (catSel.value === 'all' || v.category === catSel.value) && (setSel.value === 'all' || v.strings.join('') === setSel.value));
      const spelled = D.spelling[symbol];
      info.innerHTML = spelled ? '<b>' + esc(symbol) + '</b> = ' + spelled.notes.join(' ') + ' &nbsp;(' + spelled.degrees.join(' ') + ')' +
        (spelled.scales.length ? '<br><b>Scales:</b> ' + spelled.scales.join(', ') : '') : '';
      results.innerHTML = list.length ? list.map(v => figure(v)).join('') : '<p>No voicings in this category for this chord (try another string set).</p>';
      results.querySelectorAll('figure').forEach((fig, i) => {
        fig.style.cursor = 'pointer'; fig.title = 'Click to hear';
        fig.addEventListener('click', () => { if (window.JGAudio) window.JGAudio.playNotes(list[i].midi, { mode: 'both', dur: 0.5 }); });
      });
    }
    [rootSel, typeSel, catSel, setSel].forEach(el => el.addEventListener('change', render));
    render();
  }

  // ---------------- voice-leading assistant ----------------
  const vl = document.getElementById('voice-lead');
  if (vl) {
    const input = vl.querySelector('[name=progression]');
    const catSel = vl.querySelector('[name=category]');
    const setSel = vl.querySelector('[name=set]');
    const out = vl.querySelector('.seq');
    const msg = vl.querySelector('.vl-msg');
    function dist(a, b) {
      // total semitone movement between two voicings of equal size (voice by voice, sorted)
      if (a.length !== b.length) return 99;
      let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
      return d;
    }
    function solve() {
      const symbols = input.value.split(/[\s,|]+/).map(s => s.trim()).filter(Boolean);
      const cat = catSel.value, set = setSel.value;
      const chosen = []; const errors = [];
      let prev = null;
      symbols.forEach(sym => {
        const canon = canonical(sym);
        if (!canon) { errors.push(sym); return; }
        let cands = (D.bySymbol[canon] || []).filter(v => v.category === cat && (set === 'all' || v.strings.join('') === set));
        if (!cands.length) cands = (D.bySymbol[canon] || []).filter(v => v.category === cat);
        if (!cands.length) { errors.push(sym + ' (no ' + cat + ' voicings)'); return; }
        let best = cands[0], bestScore = Infinity;
        cands.forEach(v => {
          let score = prev ? dist(prev.midi, v.midi) : Math.abs(v.position - 5);
          if (prev && v.strings.join('') !== prev.strings.join('')) score += 3;   // prefer staying on one string set
          if (v.position > 12) score += 4;
          if (score < bestScore) { bestScore = score; best = v; }
        });
        chosen.push(best); prev = best;
      });
      out.innerHTML = chosen.map((v, i) => figure(v, i > 0 ? 'moves ' + dist(chosen[i - 1].midi, v.midi) + ' semitones' : 'start')).join('');
      msg.textContent = errors.length ? 'Could not read: ' + errors.join(', ') : '';
      const play = vl.querySelector('.btn-play');
      if (play) play.onclick = () => { if (window.JGAudio) window.JGAudio.playChords(chosen.map(v => v.midi), { dur: 1.2 }); };
      const tex = vl.querySelector('.vl-tex');
      if (tex) tex.textContent = chosen.map(v => v.tex + '.1{ch "' + v.symbol + '"}').join(' | ') + ' |';
    }
    vl.querySelector('.btn-solve').addEventListener('click', solve);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') solve(); });
    solve();
  }
})();
