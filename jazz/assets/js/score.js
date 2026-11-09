/* Renders every .score-block with alphaTab (notation + tab) and adds a player. */
(function () {
  'use strict';
  const root = document.documentElement.getAttribute('data-root') || './';

  function initBlock(block) {
    if (block.dataset.inited) return;
    block.dataset.inited = '1';
    const texEl = block.querySelector('script.score-tex');
    const body = block.querySelector('.score-body');
    if (!texEl || !body || !window.alphaTab) { if (body) body.classList.remove('loading'); return; }
    const tex = texEl.textContent;
    const layout = block.dataset.layout || 'page';
    const settings = {
      core: {
        tex: true,
        fontDirectory: root + 'vendor/alphatab/font/',
        engine: 'svg',
        logLevel: 2,
        useWorkers: false,        // render on the main thread: works from any static host, no worker setup
        enableLazyLoading: false, // insert the whole SVG at once (examples are short)
      },
      display: {
        layoutMode: layout === 'horizontal' ? 'horizontal' : 'page',
        scale: Number(block.dataset.scale || 0.9),
        staveProfile: block.dataset.profile || 'default',
      },
      notation: {
        elements: { scoreTitle: false, scoreSubTitle: false, scoreArtist: false, scoreAlbum: false,
                    scoreWords: false, scoreMusic: false, scoreWordsAndMusic: false, scoreCopyright: false,
                    guitarTuning: false, trackNames: false },
      },
      player: {
        enablePlayer: true,
        enableCursor: true,
        enableUserInteraction: true,
        soundFont: root + 'vendor/alphatab/soundfont/sonivox.sf2',
        scrollElement: body,
        scrollMode: 'off',
      },
    };
    let api;
    try {
      api = new alphaTab.AlphaTabApi(body, settings);
    } catch (e) {
      body.classList.remove('loading');
      body.innerHTML = '<p class="error">Notation could not be rendered: ' + String(e.message || e) + '</p>';
      return;
    }
    api.renderStarted.on(() => body.classList.add('loading'));
    api.renderFinished.on(() => body.classList.remove('loading'));
    api.error.on(e => { body.classList.remove('loading'); console.error('alphaTab error', block.id, e); });
    api.tex(tex);

    // ---- controls
    const head = block.querySelector('.score-head');
    const play = head.querySelector('.btn-play');
    const stop = head.querySelector('.btn-stop');
    const loop = head.querySelector('.chk-loop');
    const metro = head.querySelector('.chk-metro');
    const countIn = head.querySelector('.chk-countin');
    const speed = head.querySelector('.rng-speed');
    const speedLabel = head.querySelector('.speed-label');
    if (play) {
      play.disabled = true;
      play.addEventListener('click', () => api.playPause());
      api.playerReady.on(() => { play.disabled = false; });
      api.playerStateChanged.on(e => { play.textContent = e.state === 1 ? '❚❚ Pause' : '▶ Play'; });
    }
    if (stop) stop.addEventListener('click', () => api.stop());
    if (loop) loop.addEventListener('change', () => { api.isLooping = loop.checked; });
    if (metro) metro.addEventListener('change', () => { api.metronomeVolume = metro.checked ? 1 : 0; });
    if (countIn) countIn.addEventListener('change', () => { api.countInVolume = countIn.checked ? 1 : 0; });
    if (speed) {
      const upd = () => { api.playbackSpeed = Number(speed.value) / 100; if (speedLabel) speedLabel.textContent = speed.value + '%'; };
      speed.addEventListener('input', upd); upd();
    }
    block._api = api;
  }

  function initAll() {
    const blocks = document.querySelectorAll('.score-block');
    if (!blocks.length) return;
    if (!window.alphaTab) {
      blocks.forEach(b => {
        const body = b.querySelector('.score-body');
        if (body) { body.classList.remove('loading'); body.innerHTML = '<p class="error">alphaTab failed to load. Serve the site over HTTP (see README) to render notation.</p>'; }
      });
      return;
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { initBlock(en.target); io.unobserve(en.target); } });
      }, { rootMargin: '600px 0px' });
      blocks.forEach(b => io.observe(b));
    } else {
      blocks.forEach(initBlock);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
  window.JGScore = { initBlock };
})();
