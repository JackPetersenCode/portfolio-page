/* Interactive quizzes. Each .quiz element carries its questions in a JSON script tag. */
(function () {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function normalize(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/♭/g, 'b').replace(/♯/g, '#').replace(/\s+/g, ' ')
      .replace(/maj7/g, 'maj7').replace(/Δ/g, 'maj7').replace(/ø/g, 'm7b5').replace(/°/g, 'dim');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function renderQuiz(el) {
    const dataEl = el.querySelector('script.quiz-data');
    if (!dataEl) return;
    let data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { el.innerHTML = '<p>Quiz data is invalid.</p>'; return; }
    const id = data.id;
    const container = document.createElement('div');
    const questions = data.shuffle === false ? data.questions : shuffle(data.questions);
    const limit = data.limit && data.limit < questions.length ? questions.slice(0, data.limit) : questions;

    const parts = [];
    parts.push('<h3>' + esc(data.title || 'Quiz') + '</h3>');
    if (data.intro) parts.push('<p>' + esc(data.intro) + '</p>');
    limit.forEach((q, qi) => {
      const type = q.type || 'mc';
      let html = '<div class="q" data-qi="' + qi + '" data-type="' + type + '"><div class="q-text">' + (qi + 1) + '. ' + esc(q.q) + '</div>';
      if (q.tex) html += '<div class="q-tex">' + q.tex + '</div>';
      if (type === 'ear' && q.play) {
        html += '<div class="ear-play"><button type="button" class="btn-ear" data-qi="' + qi + '">▶ Play</button></div>';
      }
      if (type === 'mc' || type === 'ear' || type === 'multi') {
        const choices = q.choices.map((c, i) => ({ text: c, idx: i }));
        const order = q.keepOrder ? choices : shuffle(choices);
        const inputType = type === 'multi' ? 'checkbox' : 'radio';
        order.forEach(c => {
          html += '<label class="choice"><input type="' + inputType + '" name="' + esc(id) + '-' + qi + '" value="' + c.idx + '"> ' + esc(c.text) + '</label>';
        });
      } else if (type === 'text') {
        html += '<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer">';
      }
      html += '<div class="verdict"></div><div class="explain" hidden></div></div>';
      parts.push(html);
    });
    parts.push('<div class="quiz-actions"><button type="button" class="primary btn-check">Check answers</button>' +
      '<button type="button" class="btn-retry" hidden>Try again</button><span class="quiz-result"></span>' +
      '<span class="quiz-best" data-quiz-best="' + esc(id) + '"></span></div>');
    container.innerHTML = parts.join('');
    el.innerHTML = '';
    el.appendChild(container);
    if (window.JGScore) el.querySelectorAll('.score-block').forEach(b => window.JGScore.initBlock(b));

    el.querySelectorAll('.btn-ear').forEach(btn => btn.addEventListener('click', () => {
      const q = limit[Number(btn.dataset.qi)];
      if (window.JGAudio && q.play) window.JGAudio.playNotes(q.play.notes, { mode: q.play.mode || 'melodic' });
    }));

    const check = el.querySelector('.btn-check');
    const retry = el.querySelector('.btn-retry');
    const result = el.querySelector('.quiz-result');
    check.addEventListener('click', () => {
      let correct = 0;
      el.querySelectorAll('.q').forEach(qEl => {
        const q = limit[Number(qEl.dataset.qi)];
        const type = qEl.dataset.type;
        let ok = false;
        if (type === 'mc' || type === 'ear') {
          const sel = qEl.querySelector('input:checked');
          ok = !!sel && Number(sel.value) === q.answer;
        } else if (type === 'multi') {
          const sel = Array.from(qEl.querySelectorAll('input:checked')).map(i => Number(i.value)).sort();
          const ans = (q.answers || []).slice().sort();
          ok = sel.length === ans.length && sel.every((v, i) => v === ans[i]);
        } else if (type === 'text') {
          const val = normalize(qEl.querySelector('input').value);
          const accepted = [q.answer].concat(q.accept || []).map(normalize);
          ok = val.length > 0 && accepted.includes(val);
        }
        qEl.classList.toggle('correct', ok);
        qEl.classList.toggle('wrong', !ok);
        let answerText = '';
        if (type === 'mc' || type === 'ear') answerText = q.choices[q.answer];
        else if (type === 'multi') answerText = (q.answers || []).map(i => q.choices[i]).join(', ');
        else answerText = q.answer;
        qEl.querySelector('.verdict').textContent = ok ? '✓ Correct' : '✗ Correct answer: ' + answerText;
        const ex = qEl.querySelector('.explain');
        if (q.explain) { ex.textContent = q.explain; ex.hidden = false; }
        qEl.querySelectorAll('input').forEach(i => { i.disabled = true; });
        if (ok) correct++;
      });
      const pct = Math.round(100 * correct / limit.length);
      result.textContent = 'Score: ' + correct + ' / ' + limit.length + ' (' + pct + '%)';
      check.hidden = true; retry.hidden = false;
      if (window.JGProgress) window.JGProgress.recordQuiz(id, pct);
    });
    retry.addEventListener('click', () => renderQuiz(el));
    if (window.JGProgress) {
      const best = window.JGProgress.quizBest(id);
      const b = el.querySelector('.quiz-best');
      if (b && best !== null) b.textContent = 'Best score: ' + best + '%';
    }
  }

  function init() { document.querySelectorAll('.quiz').forEach(renderQuiz); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
