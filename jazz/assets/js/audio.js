/* Minimal Web Audio synth shared by the quizzes and the ear trainer. */
(function () {
  'use strict';
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function pluck(ac, midi, t0, dur, gain) {
    const osc = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const g = ac.createGain();
    const filt = ac.createBiquadFilter();
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.value = freq(midi);
    osc2.frequency.value = freq(midi) * 2;
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2600, t0);
    filt.frequency.exponentialRampToValueAtTime(700, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(gain * 0.35, t0 + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const g2 = ac.createGain(); g2.gain.value = 0.18;
    osc.connect(filt); osc2.connect(g2); g2.connect(filt); filt.connect(g); g.connect(ac.destination);
    osc.start(t0); osc2.start(t0);
    osc.stop(t0 + dur + 0.05); osc2.stop(t0 + dur + 0.05);
  }

  const JGAudio = {
    ready() { return !!getCtx(); },
    /** Play MIDI notes. mode: 'melodic' (one after another), 'harmonic' (together), 'both'. */
    playNotes(midis, opts) {
      const ac = getCtx(); if (!ac) return 0;
      const o = Object.assign({ mode: 'melodic', dur: 0.7, gap: 0.08, gain: 0.25 }, opts || {});
      const t0 = ac.currentTime + 0.03;
      let t = t0;
      if (o.mode === 'harmonic' || o.mode === 'both') {
        midis.forEach(m => pluck(ac, m, t, o.dur * 1.8, o.gain * 0.8));
        t += o.dur * 1.8 + o.gap;
      }
      if (o.mode === 'melodic' || o.mode === 'both') {
        midis.forEach(m => { pluck(ac, m, t, o.dur, o.gain); t += o.dur + o.gap; });
      }
      return t - t0;
    },
    /** Play a sequence of chords: [[midi...], ...] each for `dur` seconds. */
    playChords(chords, opts) {
      const ac = getCtx(); if (!ac) return 0;
      const o = Object.assign({ dur: 1.1, gain: 0.2 }, opts || {});
      let t = ac.currentTime + 0.03;
      chords.forEach(ch => { ch.forEach(m => pluck(ac, m, t, o.dur, o.gain)); t += o.dur; });
      return chords.length * o.dur;
    },
    click(accent) {
      const ac = getCtx(); if (!ac) return;
      const t = ac.currentTime;
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.frequency.value = accent ? 1600 : 1000;
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(g); g.connect(ac.destination); osc.start(t); osc.stop(t + 0.06);
    },
    context: getCtx,
    freq,
  };
  window.JGAudio = JGAudio;
})();
