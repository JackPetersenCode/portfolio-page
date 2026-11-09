/* Site-wide behaviour: theme, progress tracking, sidebar, lesson completion. */
(function () {
  'use strict';
  const KEY = 'jgc.progress.v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { lessons: {}, quizzes: {} }; }
    catch (e) { return { lessons: {}, quizzes: {} }; }
  }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ } }

  const Progress = {
    get: load,
    isLessonDone(id) { return !!(load().lessons[id] && load().lessons[id].done); },
    setLessonDone(id, done) {
      const p = load();
      p.lessons[id] = { done: !!done, ts: Date.now() };
      save(p);
      document.dispatchEvent(new CustomEvent('jgc:progress', { detail: p }));
    },
    recordQuiz(id, pct) {
      const p = load();
      const prev = p.quizzes[id] ? p.quizzes[id].best : 0;
      p.quizzes[id] = { best: Math.max(prev, pct), last: pct, ts: Date.now() };
      save(p);
      document.dispatchEvent(new CustomEvent('jgc:progress', { detail: p }));
    },
    quizBest(id) { const q = load().quizzes[id]; return q ? q.best : null; },
    reset() { save({ lessons: {}, quizzes: {} }); document.dispatchEvent(new CustomEvent('jgc:progress')); },
    export() { return JSON.stringify(load(), null, 2); },
    import(json) { const p = JSON.parse(json); if (p && p.lessons) { save(p); document.dispatchEvent(new CustomEvent('jgc:progress')); } },
  };
  window.JGProgress = Progress;

  // ---- theme -------------------------------------------------------------
  function applyTheme() {
    let t = null;
    try { t = localStorage.getItem('jgc.theme'); } catch (e) { /* ignore */ }
    if (t) document.documentElement.setAttribute('data-theme', t);
  }
  applyTheme();

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        const cur = document.documentElement.getAttribute('data-theme');
        const dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        const next = dark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('jgc.theme', next); } catch (e) { /* ignore */ }
      });
    }
    const menu = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menu && sidebar) menu.addEventListener('click', () => sidebar.classList.toggle('open'));

    // ---- sidebar progress marks
    function refreshMarks() {
      const p = load();
      document.querySelectorAll('[data-lesson-id]').forEach(el => {
        const id = el.getAttribute('data-lesson-id');
        el.classList.toggle('done', !!(p.lessons[id] && p.lessons[id].done));
      });
      document.querySelectorAll('[data-module-lessons]').forEach(el => {
        const ids = el.getAttribute('data-module-lessons').split(',').filter(Boolean);
        const done = ids.filter(id => p.lessons[id] && p.lessons[id].done).length;
        el.classList.toggle('done', ids.length > 0 && done === ids.length);
        const bar = el.querySelector('.bar i');
        if (bar) bar.style.width = (ids.length ? Math.round(100 * done / ids.length) : 0) + '%';
        const meta = el.querySelector('[data-progress-text]');
        if (meta) meta.textContent = done + ' / ' + ids.length + ' lessons complete';
      });
      document.querySelectorAll('[data-quiz-best]').forEach(el => {
        const best = Progress.quizBest(el.getAttribute('data-quiz-best'));
        el.textContent = best === null ? '' : 'Best score: ' + best + '%';
      });
    }
    refreshMarks();
    document.addEventListener('jgc:progress', refreshMarks);

    // ---- lesson completion button
    const btn = document.getElementById('mark-complete');
    if (btn) {
      const id = btn.getAttribute('data-lesson');
      const status = document.getElementById('complete-status');
      function render() {
        const done = Progress.isLessonDone(id);
        btn.textContent = done ? 'Mark as not complete' : 'Mark lesson complete';
        btn.classList.toggle('primary', !done);
        if (status) status.textContent = done ? '✓ Completed' : '';
      }
      btn.addEventListener('click', () => { Progress.setLessonDone(id, !Progress.isLessonDone(id)); render(); });
      render();
    }

    // ---- progress export / import / reset (settings page)
    const exp = document.getElementById('progress-export');
    if (exp) exp.addEventListener('click', () => {
      const blob = new Blob([Progress.export()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'jazz-guitar-progress.json'; a.click();
    });
    const imp = document.getElementById('progress-import');
    if (imp) imp.addEventListener('change', (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      f.text().then(t => { Progress.import(t); alert('Progress imported.'); });
    });
    const rst = document.getElementById('progress-reset');
    if (rst) rst.addEventListener('click', () => { if (confirm('Reset all lesson and quiz progress?')) Progress.reset(); });

    // ---- overall stats on the home page
    const stat = document.getElementById('overall-progress');
    if (stat) {
      const ids = (stat.getAttribute('data-all-lessons') || '').split(',').filter(Boolean);
      function renderStat() {
        const p = load();
        const done = ids.filter(id => p.lessons[id] && p.lessons[id].done).length;
        stat.textContent = done + ' of ' + ids.length + ' lessons complete';
      }
      renderStat();
      document.addEventListener('jgc:progress', renderStat);
    }
  });
})();
