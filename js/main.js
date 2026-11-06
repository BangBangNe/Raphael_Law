/* =========================================================
   Raphael × Law — motion & interactions
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const hasGSAP = typeof gsap !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;

  /* ---------------------------------------------------------
     0. VERSION (Ver. Nam = "m", Ver. Nữ = "f")
     --------------------------------------------------------- */
  let VER = 'm';
  try { const s = localStorage.getItem('rxl-ver'); if (s === 'm' || s === 'f') VER = s; } catch (e) {}
  root.dataset.ver = VER;

  document.body.classList.add('is-loading');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  /* ---------------------------------------------------------
     1. ART — data-art="assets/img/ten-file" (không cần đuôi)
     --------------------------------------------------------- */
  const EXT = ['webp', 'png', 'jpg'];
  const loadOne = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(src); i.onerror = rej; i.src = src; });
  const tryLoad = base => /\.\w{3,4}$/.test(base) ? loadOne(base) : EXT.reduce((p, ext) => p.catch(() => loadOne(`${base}.${ext}`)), Promise.reject());
  const artPromises = $$('.art[data-art]').map(el => {
    if (el.dataset.pos) el.style.setProperty('--pos', el.dataset.pos);
    return tryLoad(el.dataset.art).then(src => {
      const img = new Image(); img.src = src; img.alt = el.dataset.title || ''; img.decoding = 'async';
      el.appendChild(img); el.classList.add('has-art');
    }).catch(() => el.classList.add('no-art'));
  });

  /* ---------------------------------------------------------
     2. TEXT SPLITTING
     --------------------------------------------------------- */
  $$('.split-chars').forEach(el => { el.innerHTML = [...el.textContent].map(c => c === ' ' ? ' ' : `<span class="ch">${c}</span>`).join(''); });
  $$('.split-words').forEach(el => { el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' '); });

  /* ---------------------------------------------------------
     3. SKY CANVAS — hạt nắng bay lên + đàn chim nhỏ
     --------------------------------------------------------- */
  const cvs = $('#sky'), ctx = cvs.getContext('2d');
  let W, H, DPR, motes = [], birds = [], MOTE = '255,236,200', INK = '29,39,66';
  function readColors() {
    const cs = getComputedStyle(root);
    MOTE = cs.getPropertyValue('--mote').trim() || MOTE;
    const ink = cs.getPropertyValue('--ink').trim();
    const m = ink.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); INK = `${n >> 16},${(n >> 8) & 255},${n & 255}`; }
  }
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cvs.width = innerWidth * DPR; H = cvs.height = innerHeight * DPR;
    const n = Math.round((innerWidth * innerHeight) / 16000);
    motes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 2.4 + .8) * DPR,
      vy: (Math.random() * .25 + .08) * DPR, ph: Math.random() * 6.28, sp: Math.random() * .01 + .004
    }));
  }
  readColors(); resize(); addEventListener('resize', resize);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', readColors);
  new MutationObserver(readColors).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  let scrollY = 0;
  function spawnFlock() {
    const fromLeft = Math.random() < .5, y = (Math.random() * .35 + .08) * H, n = 3 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) birds.push({
      x: fromLeft ? -40 * DPR - i * 26 * DPR : W + 40 * DPR + i * 26 * DPR, y: y + (i % 2 ? 1 : -1) * i * 9 * DPR,
      v: (fromLeft ? 1 : -1) * (1.1 + Math.random() * .4) * DPR, s: (6 + Math.random() * 4) * DPR, t: Math.random() * 6
    });
  }
  function drawSky() {
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.ph += m.sp; m.y -= m.vy;
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      const x = m.x + Math.sin(m.ph) * 14 * DPR, y = (m.y - scrollY * .08 * DPR % H + H) % H;
      const a = .25 + Math.sin(m.ph * 2) * .2 + .2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 4);
      g.addColorStop(0, `rgba(${MOTE},${a})`); g.addColorStop(1, `rgba(${MOTE},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m.r * 4, 0, 6.283); ctx.fill();
    }
    if (birds.length < 30 && Math.random() < .0025) spawnFlock();
    birds = birds.filter(b => b.x > -200 * DPR && b.x < W + 200 * DPR);
    ctx.strokeStyle = `rgba(${INK},.32)`; ctx.lineWidth = 1.4 * DPR; ctx.lineCap = 'round';
    for (const b of birds) {
      b.x += b.v; b.t += .18; const f = Math.sin(b.t) * b.s * .5;
      ctx.beginPath(); ctx.moveTo(b.x - b.s, b.y - f); ctx.quadraticCurveTo(b.x - b.s * .4, b.y - f * .2, b.x, b.y);
      ctx.quadraticCurveTo(b.x + b.s * .4, b.y - f * .2, b.x + b.s, b.y - f); ctx.stroke();
    }
  }

  /* ---------------------------------------------------------
     4. LENIS
     --------------------------------------------------------- */
  let lenis = null;
  if (!REDUCED && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: .085 });
    lenis.on('scroll', e => { scrollY = e.scroll; if (hasGSAP) ScrollTrigger.update(); });
    lenis.stop();
  } else addEventListener('scroll', () => { scrollY = window.scrollY; });
  if (hasGSAP) { gsap.ticker.add(t => { lenis && lenis.raf(t * 1000); REDUCED || drawSky(); }); gsap.ticker.lagSmoothing(0); }
  else if (!REDUCED) (function loop() { drawSky(); requestAnimationFrame(loop); })();
  if (REDUCED) drawSky();

  $$('[data-scroll]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (!id || !id.startsWith('#')) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(id, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) }) : $(id).scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------------------------------------------------------
     5. CURSOR, MAGNETIC, TILT
     --------------------------------------------------------- */
  if (FINE && hasGSAP) {
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
    const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('a,button,[data-cursor],.dial__face,.art.has-art');
      cur.classList.toggle('is-hover', !!t);
      label.textContent = t ? (t.dataset.cursor || (t.classList.contains('art') ? 'Xem' : t.classList.contains('dial__face') ? 'Kéo' : '')) : '';
    });
    $$('.magnetic').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' }), yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .3); });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
    $$('.tilt').forEach(el => {
      const glow = el.querySelector('.char__glow');
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        gsap.to(el, { rotateY: (px - .5) * 10, rotateX: (.5 - py) * 8, transformPerspective: 900, duration: .6, ease: 'power3' });
        if (glow) { glow.style.setProperty('--gx', px * 100 + '%'); glow.style.setProperty('--gy', py * 100 + '%'); }
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.5)' }));
    });
  }

  /* ---------------------------------------------------------
     6. VERSION SWITCH
     --------------------------------------------------------- */
  const verBtns = $$('[data-set-ver]'), verInk = $('.ver__ink');
  function paintVer() {
    verBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.setVer === VER));
    const on = verBtns.find(b => b.dataset.setVer === VER);
    if (on && verInk) { verInk.style.left = on.offsetLeft + 'px'; verInk.style.width = on.offsetWidth + 'px'; }
  }
  paintVer(); addEventListener('resize', paintVer); document.fonts && document.fonts.ready.then(paintVer);
  function applyVer(v) {
    VER = v; root.dataset.ver = v; paintVer();
    try { localStorage.setItem('rxl-ver', v); } catch (e) {}
    buildStory(); hasGSAP && ScrollTrigger.refresh();
  }
  verBtns.forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.setVer; if (v === VER) return;
    if (!hasGSAP || REDUCED) { applyVer(v); return; }
    $('#swapTxt').textContent = v === 'f' ? 'Tua sang dòng thời gian Ver. Nữ…' : 'Tua về dòng thời gian Ver. Nam…';
    gsap.timeline()
      .set('#swap', { visibility: 'visible' })
      .to('#swap', { opacity: 1, duration: .45, ease: 'power2.out' })
      .fromTo('.swap__clock', { rotate: 0, scale: .8 }, { rotate: -540, scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
      .add(() => applyVer(v), .55)
      .to('#swap', { opacity: 0, duration: .55, ease: 'power2.in' }, 1.05)
      .set('#swap', { visibility: 'hidden' });
  }));

  /* ---------------------------------------------------------
     7. LOADER
     --------------------------------------------------------- */
  const loader = $('#loader');
  const ticks = $('.lc-ticks');
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, r1 = i % 3 ? 46 : 42;
    ticks.insertAdjacentHTML('beforeend', `<line x1="${60 + Math.sin(a) * r1}" y1="${60 - Math.cos(a) * r1}" x2="${60 + Math.sin(a) * 49}" y2="${60 - Math.cos(a) * 49}"/>`);
  }
  function done() { loader.remove(); document.body.classList.remove('is-loading'); lenis && lenis.start(); hasGSAP && ScrollTrigger.refresh(); }
  function runLoader() {
    if (!hasGSAP || REDUCED || /[?&]skip\b/.test(location.search)) { done(); hasGSAP && !REDUCED && heroIntro(); return; }
    const num = $('#loaderTime'), c = { v: 0 };
    const tl = gsap.timeline();
    tl.from('.loader__word', { opacity: 0, y: 20, filter: 'blur(8px)', duration: 1, ease: 'power3.out' })
      .to('#lcMin', { rotation: -360 * 3, svgOrigin: '60 60', duration: 1.8, ease: 'power2.inOut' }, 0)
      .to('#lcHr', { rotation: -90, svgOrigin: '60 60', duration: 1.8, ease: 'power2.inOut' }, 0)
      .to(c, { v: 7, duration: 1.8, ease: 'power2.inOut', onUpdate: () => num.textContent = Math.round(c.v) }, 0);
    const waitAssets = Promise.race([Promise.allSettled([...artPromises, document.fonts ? document.fonts.ready : 0]), new Promise(r => setTimeout(r, 2500))]);
    Promise.all([new Promise(r => tl.eventCallback('onComplete', r)), waitAssets]).then(() => {
      gsap.timeline({ onComplete: done })
        .to('.loader__inner', { opacity: 0, scale: .96, duration: .5, ease: 'power2.in' })
        .to(loader, { opacity: 0, duration: .8, ease: 'power2.inOut' })
        .add(heroIntro, '-=.6');
    });
  }
  function heroIntro() {
    gsap.timeline()
      .from('.hero__name--r .ch', { yPercent: 100, opacity: 0, stagger: .05, duration: 1.2, ease: 'expo.out' })
      .from('.hero__x', { scale: 0, rotate: -90, opacity: 0, duration: 1, ease: 'back.out(2)' }, '-=.9')
      .from('.hero__name--l .ch', { yPercent: 100, opacity: 0, stagger: .06, duration: 1.2, ease: 'expo.out' }, '-=.9')
      .from('.hero .reveal-up', { y: 24, opacity: 0, stagger: .1, duration: 1, ease: 'power3.out' }, '-=.9')
      .from('.hero__window', { y: 40, opacity: 0, duration: 1.4, ease: 'expo.out' }, '-=1.3')
      .from('.nav', { opacity: 0, duration: 1 }, '-=1');
    setTimeout(spawnFlock, 600);
  }

  /* ---------------------------------------------------------
     8. SCROLL
     --------------------------------------------------------- */
  let storyCtx = null;
  function buildStory() {
    if (!hasGSAP || REDUCED) return;
    storyCtx && storyCtx.revert();
    storyCtx = gsap.matchMedia();
    storyCtx.add('(min-width: 861px)', () => {
      const track = $$('.story__track').find(t => t.offsetParent !== null);
      if (!track) return;
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.story', start: 'top top', end: () => '+=' + dist(), pin: '.story__pin', scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('.art img', track).forEach(img => gsap.fromTo(img, { xPercent: -5, scale: 1.12 }, { xPercent: 5, ease: 'none',
        scrollTrigger: { trigger: img.closest('.chapter'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
    });
  }
  function setupScroll() {
    if (!hasGSAP) return;
    const nav = $('#nav'); let last = 0;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => {
      gsap.set('#progress', { scaleX: self.progress });
      const y = self.scroll(); nav.classList.toggle('is-scrolled', y > 40); nav.classList.toggle('is-hidden', y > last && y > 500); last = y;
    } });
    $$('.nav__links a').forEach(a => {
      const sec = $(a.getAttribute('href')); if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', refreshPriority: -1, onToggle: s => a.classList.toggle('is-active', s.isActive) });
    });
    buildStory();
    if (REDUCED) return;

    gsap.to('.hero__content', { yPercent: 18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__window', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    const mq = $('.marquee__track'), skew = gsap.quickTo(mq, 'skewX', { duration: .4 });
    ScrollTrigger.create({ onUpdate: s => skew(gsap.utils.clamp(-10, 10, s.getVelocity() / -300)) });

    gsap.to('.prologue__text .w', { opacity: 1, stagger: .05, ease: 'none',
      scrollTrigger: { trigger: '.prologue', start: 'top top', end: () => '+=' + innerHeight * 1.4, scrub: .6, pin: '.prologue__pin' } });

    $$('.sec-title.split-chars').forEach(t => gsap.from(t.querySelectorAll('.ch'), { yPercent: 60, opacity: 0, stagger: .04, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 88%' } }));

    $$('.char').forEach(c => {
      gsap.timeline({ scrollTrigger: { trigger: c, start: 'top 75%' } })
        .from(c.querySelector('.char__frame'), { clipPath: 'inset(100% 0 0 0 round 18px)', duration: 1.4, ease: 'expo.inOut' })
        .from(c.querySelector('.char__vname'), { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out' }, '-=.9')
        .from(c.querySelectorAll('.char__info > *'), { y: 30, opacity: 0, stagger: .08, duration: .9, ease: 'power3.out' }, '-=1.1');
    });

    gsap.from('.ability__title', { y: 40, opacity: 0, letterSpacing: '.08em', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.ability', start: 'top 70%' } });
    gsap.from('.chat__b', { y: 24, opacity: 0, scale: .9, stagger: .5, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '.chat', start: 'top 80%' } });
    gsap.from('.pov__side--l', { x: -60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.pov', start: 'top 75%' } });
    gsap.from('.pov__side--r', { x: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.pov', start: 'top 65%' } });

    gsap.to('.outro__quote .w', { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.outro', start: 'top 75%', end: 'center 55%', scrub: true } });
    ScrollTrigger.create({ trigger: '.outro', start: 'top 50%', once: true, onEnter: () => { spawnFlock(); setTimeout(spawnFlock, 800); } });
  }

  /* ---------------------------------------------------------
     9. DIAL — kéo kim ngược chiều để tua lại
     --------------------------------------------------------- */
  (() => {
    const face = $('#dialFace'), min = $('#dialMin'), hr = $('#dialHr'), arc = $('#dialArc'), tk = $('#dialTicks');
    const stops = $$('#dialStops li'), dial = $('#dial');
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r1 = big ? 74 : 78;
      tk.insertAdjacentHTML('beforeend', `<line class="${big ? 'big' : ''}" x1="${100 + Math.sin(a) * r1}" y1="${100 - Math.cos(a) * r1}" x2="${100 + Math.sin(a) * 84}" y2="${100 - Math.cos(a) * 84}"/>`);
    }
    // 4 mốc thời gian quanh mặt đồng hồ (ngược chiều kim)
    ['nay', 'Dressrosa', 'gặp Law', 'TLN'].forEach((t, i) => {
      const a = -i / 4 * Math.PI * 2; tk.insertAdjacentHTML('beforeend', `<text x="${100 + Math.sin(a) * 60}" y="${100 - Math.cos(a) * 60}">${t}</text>`);
    });
    const FULL = Math.PI * 2; // 1 vòng ngược = 100%
    let p = 0; // 0..1
    function render(animate) {
      const deg = -p * 360;
      const set = (el, d) => !hasGSAP ? el.setAttribute('transform', `rotate(${d} 100 100)`)
        : animate ? gsap.to(el, { rotation: d, svgOrigin: '100 100', duration: .6, ease: 'power3.out', overwrite: true })
        : gsap.set(el, { rotation: d, svgOrigin: '100 100', overwrite: true });
      set(min, deg); set(hr, deg / 12);
      const a = -p * FULL, large = p > .5 ? 1 : 0, r = 92;
      arc.setAttribute('d', p <= 0 ? '' : p >= .999 ? `M100 8 A${r} ${r} 0 1 0 100 192 A${r} ${r} 0 1 0 100 8` :
        `M100 8 A${r} ${r} 0 ${large} 0 ${100 + Math.sin(a) * r} ${100 - Math.cos(a) * r}`);
      const pc = Math.round(p * 100); face.setAttribute('aria-valuenow', pc);
      let now = 0; stops.forEach((s, i) => { const on = pc >= +s.dataset.at; s.classList.toggle('is-on', on); if (on) now = i; });
      stops.forEach((s, i) => s.classList.toggle('is-now', i === now));
      dial.classList.toggle('is-end', pc >= 100);
    }
    render();
    let dragging = false, lastA = 0;
    const ang = e => { const r = face.getBoundingClientRect(); return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))); };
    face.addEventListener('pointerdown', e => { dragging = true; lastA = ang(e); face.setPointerCapture(e.pointerId); });
    face.addEventListener('pointermove', e => {
      if (!dragging) return;
      const a = ang(e); let d = a - lastA; if (d > Math.PI) d -= FULL; if (d < -Math.PI) d += FULL; lastA = a;
      p = Math.min(1, Math.max(0, p - d / FULL)); render(false);
    });
    const end = () => { dragging = false; };
    face.addEventListener('pointerup', end); face.addEventListener('pointercancel', end);
    const step = s => { p = Math.min(1, Math.max(0, Math.round((p + s) * 4) / 4)); render(true); };
    $('#dialBack').addEventListener('click', () => step(.25));
    $('#dialFwd').addEventListener('click', () => { p = 0; render(true); });
    face.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); step(.25); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); step(-.25); }
    });
  })();

  /* ---------------------------------------------------------
     10. MIRROR — vỡ gương
     --------------------------------------------------------- */
  (() => {
    const mirror = $('#mirror'), host = $('#mirrorShards'); if (!mirror) return;
    function shatter() {
      host.innerHTML = '';
      const cx = 50 + (Math.random() * 16 - 8), cy = 45 + (Math.random() * 16 - 8);
      const pts = []; const N = 18;
      for (let i = 0; i < N; i++) {
        const t = (i + Math.random() * .6) / N * 4, side = Math.floor(t), f = (t - side) * 100;
        pts.push(side === 0 ? [f, 0] : side === 1 ? [100, f] : side === 2 ? [100 - f, 100] : [0, 100 - f]);
      }
      const shards = pts.map((pt, i) => {
        const nx = pts[(i + 1) % N], s = document.createElement('i');
        s.style.clipPath = `polygon(${cx}% ${cy}%, ${pt[0]}% ${pt[1]}%, ${nx[0]}% ${nx[1]}%)`;
        host.appendChild(s); return { s, mx: (pt[0] + nx[0]) / 2 - cx, my: (pt[1] + nx[1]) / 2 - cy };
      });
      mirror.classList.add('is-broken');
      if (!hasGSAP || REDUCED) { host.innerHTML = ''; return; }
      gsap.fromTo('#mirrorBack', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.4, delay: .5, ease: 'power2.out' });
      shards.forEach(({ s, mx, my }) => gsap.to(s, {
        x: mx * gsap.utils.random(6, 11), y: my * gsap.utils.random(6, 11) + 120, rotate: gsap.utils.random(-120, 120),
        opacity: 0, duration: gsap.utils.random(1.2, 1.9), ease: 'power2.out', onComplete: () => s.remove()
      }));
      hasGSAP && ScrollTrigger.refresh();
    }
    $('#mirrorBtn').addEventListener('click', shatter);
    $('#mirrorReset').addEventListener('click', () => {
      mirror.classList.remove('is-broken'); host.innerHTML = '';
      hasGSAP && gsap.from('#mirrorFront', { opacity: 0, scale: .97, duration: .8, ease: 'power2.out' });
    });
  })();

  /* ---------------------------------------------------------
     11. TABS, GALLERY FILTER, LIGHTBOX
     --------------------------------------------------------- */
  $$('[data-tabs]').forEach(t => {
    const btns = $$('.tabs__nav button', t), panels = $$('.tabs__panel', t);
    const ink = document.createElement('span'); ink.className = 'tabs__ink'; $('.tabs__nav', t).appendChild(ink);
    const place = b => { ink.style.left = b.offsetLeft + 'px'; ink.style.width = b.offsetWidth + 'px'; ink.style.top = (b.offsetTop + b.offsetHeight - 1) + 'px'; ink.style.bottom = 'auto'; };
    btns.forEach((b, i) => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-selected', x === b)); place(b);
      panels.forEach(p => p.classList.remove('is-active')); panels[i].classList.add('is-active');
      hasGSAP && !REDUCED && gsap.from(panels[i].children, { y: 14, opacity: 0, stagger: .05, duration: .6, ease: 'power3.out' });
      hasGSAP && ScrollTrigger.refresh();
    }));
    requestAnimationFrame(() => place(btns[0]));
    addEventListener('resize', () => place(btns.find(b => b.getAttribute('aria-selected') === 'true')));
  });

  const fBtns = $$('[data-filter]');
  fBtns.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.filter; fBtns.forEach(x => x.classList.toggle('is-on', x === b));
    $$('.gitem').forEach(g => { g.hidden = f !== 'all' && !g.dataset.tag.split(' ').includes(f); });
    hasGSAP && !REDUCED && gsap.from('.gitem:not([hidden])', { y: 30, opacity: 0, stagger: .06, duration: .7, ease: 'power3.out' });
    hasGSAP && ScrollTrigger.refresh();
  }));

  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.lightbox__cap', lb);
  document.addEventListener('click', e => {
    const a = e.target.closest('.art.has-art'); if (!a) return;
    const img = a.querySelector('img'); lbImg.src = img.src;
    lbCap.textContent = a.closest('figure')?.querySelector('figcaption')?.textContent || a.dataset.title || '';
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); lenis && lenis.stop();
  });
  const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); };
  lb.addEventListener('click', e => { if (e.target !== lbImg) closeLb(); });
  addEventListener('keydown', e => e.key === 'Escape' && closeLb());

  /* GO */
  Promise.allSettled(artPromises).then(() => { setupScroll(); hasGSAP && ScrollTrigger.refresh(); });
  runLoader();
})();
