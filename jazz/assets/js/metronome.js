/* Practice metronome with jazz-specific options (click on 2 & 4, swing subdivision, random bar drops). */
(function () {
  'use strict';
  const el = document.getElementById('metronome');
  if (!el || !window.JGAudio) return;
  const A = window.JGAudio;
  const bpmInput = el.querySelector('[name=bpm]');
  const bpmDisplay = el.querySelector('.bpm-display');
  const beatsSel = el.querySelector('[name=beats]');
  const patternSel = el.querySelector('[name=pattern]');
  const subSel = el.querySelector('[name=subdivision]');
  const dropSel = el.querySelector('[name=drop]');
  const startBtn = el.querySelector('.btn-start');
  const tapBtn = el.querySelector('.btn-tap');
  const lights = el.querySelector('.beat-lights');
  const barCount = el.querySelector('.bar-count');
  let running = false, nextTime = 0, beat = 0, bar = 0, timer = null, muteBar = false, taps = [];
  const LOOKAHEAD = 0.12, INTERVAL = 25;

  function bpm() { return Math.min(300, Math.max(30, Number(bpmInput.value) || 120)); }
  function renderLights() {
    const n = Number(beatsSel.value);
    lights.innerHTML = Array.from({ length: n }, (_, i) => '<span data-i="' + i + '" class="' + (isAccent(i) ? 'accent' : '') + '"></span>').join('');
  }
  function isAccent(i) {
    const p = patternSel.value, n = Number(beatsSel.value);
    if (p === 'one') return i === 0;
    if (p === 'twofour') return n === 4 ? (i === 1 || i === 3) : i === 1;
    if (p === 'all') return true;
    return i === 0;
  }
  function shouldClick(i) {
    const p = patternSel.value, n = Number(beatsSel.value);
    if (p === 'twofour') return n === 4 ? (i === 1 || i === 3) : (i % 2 === 1);
    if (p === 'one') return i === 0;
    return true;
  }
  function schedule() {
    const ac = A.context(); if (!ac) return;
    const secPerBeat = 60 / bpm();
    while (nextTime < ac.currentTime + LOOKAHEAD) {
      const i = beat % Number(beatsSel.value);
      if (i === 0) {
        if (beat > 0) bar++;
        const d = dropSel.value;
        muteBar = d === 'none' ? false : (d === 'alt' ? bar % 2 === 1 : Math.random() < Number(d));
        if (barCount) barCount.textContent = 'Bar ' + (bar + 1);
      }
      const t = nextTime;
      if (!muteBar && shouldClick(i)) scheduleClick(t, isAccent(i));
      if (!muteBar && subSel.value === 'eighths') scheduleClick(t + secPerBeat / 2, false, true);
      if (!muteBar && subSel.value === 'swing') scheduleClick(t + secPerBeat * 2 / 3, false, true);
      if (!muteBar && subSel.value === 'triplets') { scheduleClick(t + secPerBeat / 3, false, true); scheduleClick(t + secPerBeat * 2 / 3, false, true); }
      const li = i; const delay = Math.max(0, (t - ac.currentTime) * 1000);
      setTimeout(() => { lights.querySelectorAll('span').forEach((s, k) => s.classList.toggle('on', k === li)); }, delay);
      nextTime += secPerBeat; beat++;
    }
  }
  function scheduleClick(t, accent, soft) {
    const ac = A.context();
    const osc = ac.createOscillator(); const g = ac.createGain();
    osc.frequency.value = accent ? 1500 : (soft ? 700 : 1000);
    const vol = soft ? 0.15 : (accent ? 0.6 : 0.4);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(g); g.connect(ac.destination); osc.start(t); osc.stop(t + 0.05);
  }
  function start() {
    const ac = A.context(); if (!ac) { alert('Web Audio is not available in this browser.'); return; }
    running = true; beat = 0; bar = 0; nextTime = ac.currentTime + 0.05;
    timer = setInterval(schedule, INTERVAL);
    startBtn.textContent = '■ Stop'; startBtn.classList.add('primary');
  }
  function stop() {
    running = false; clearInterval(timer);
    startBtn.textContent = '▶ Start'; startBtn.classList.remove('primary');
    lights.querySelectorAll('span').forEach(s => s.classList.remove('on'));
  }
  startBtn.addEventListener('click', () => running ? stop() : start());
  bpmInput.addEventListener('input', () => { bpmDisplay.textContent = bpm(); });
  el.querySelectorAll('[data-bpm-delta]').forEach(b => b.addEventListener('click', () => { bpmInput.value = bpm() + Number(b.dataset.bpmDelta); bpmDisplay.textContent = bpm(); }));
  beatsSel.addEventListener('change', renderLights); patternSel.addEventListener('change', renderLights);
  tapBtn.addEventListener('click', () => {
    const now = performance.now(); taps = taps.filter(t => now - t < 3000); taps.push(now);
    if (taps.length >= 2) { const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); bpmInput.value = Math.round(60000 / iv); bpmDisplay.textContent = bpm(); }
  });
  document.addEventListener('keydown', e => { if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); running ? stop() : start(); } });
  bpmDisplay.textContent = bpm(); renderLights();
})();
