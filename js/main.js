/* =========================================================
   Raphael × Law — thời gian ngưng đọng
   GSAP + ScrollTrigger cho đoạn cuộn; còn lại JS thuần.
   ========================================================= */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const G = typeof gsap !== 'undefined';
  if (G) gsap.registerPlugin(ScrollTrigger);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 0. phiên bản ---------- */
  let VER = 'm';
  try { const s = localStorage.getItem('rxl-ver'); if (s === 'm' || s === 'f') VER = s; } catch (e) {}
  root.dataset.ver = VER;

  /* ---------- 1. tranh ---------- */
  const EXT = ['webp', 'png', 'jpg'];
  const loadOne = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(src); i.onerror = rej; i.src = src; });
  const tryLoad = b => /\.\w{3,4}$/.test(b) ? loadOne(b) : EXT.reduce((p, x) => p.catch(() => loadOne(`${b}.${x}`)), Promise.reject());
  const artP = $$('.art[data-art]').map(el => {
    if (el.dataset.pos) el.style.setProperty('--pos', el.dataset.pos);
    return tryLoad(el.dataset.art).then(src => {
      const img = new Image(); img.src = src; img.alt = el.dataset.title || ''; img.draggable = false; img.decoding = 'async';
      el.appendChild(img); el.classList.add('has-art');
    }).catch(() => el.classList.add('no-art'));
  });

  /* ---------- 2. trạng thái thời gian ---------- */
  // speed: 1 bình thường · 0 đứng yên · âm = tua ngược
  let speed = 1, target = 1, frozen = false, rewinding = false;
  const setFrozen = v => {
    if (frozen === v) return; frozen = v;
    root.classList.toggle('is-frozen', v);
    target = rewinding ? -8 : v ? 0 : 1;
    $('#stopper').setAttribute('aria-pressed', v);
    $('#nowState').textContent = v ? '❚❚' : '▶';
  };

  /* ---------- 3. bánh răng, bụi, ánh nến ---------- */
  const cvs = $('#clockwork'), ctx = cvs.getContext('2d');
  let W, H, DPR, gears = [], dust = [], mx = innerWidth / 2, my = innerHeight * .4, scrollRot = 0, lastScroll = scrollY;
  function gear(x, y, r, teeth, dir, alpha) { return { x, y, r, teeth, dir, a: Math.random() * 6.28, alpha }; }
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = cvs.width = innerWidth * DPR; H = cvs.height = innerHeight * DPR;
    const u = Math.min(W, H);
    gears = [
      gear(W * .9, H * .18, u * .42, 48, 1, .10), gear(W * .62, H * .02, u * .18, 22, -1, .08),
      gear(W * .06, H * .86, u * .36, 40, -1, .09), gear(W * .28, H * 1.02, u * .16, 20, 1, .07),
      gear(W * .97, H * .8, u * .2, 24, -1, .06), gear(W * .1, H * .2, u * .1, 14, 1, .06)
    ];
    dust = Array.from({ length: Math.round(innerWidth * innerHeight / 9000) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.6 + .3) * DPR,
      vx: (Math.random() - .5) * .25 * DPR, vy: (Math.random() * .2 + .04) * DPR, ph: Math.random() * 6.28
    }));
  }
  resize(); addEventListener('resize', resize);
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  addEventListener('scroll', () => { scrollRot += (scrollY - lastScroll) * .0012; lastScroll = scrollY; }, { passive: true });

  function drawGear(g) {
    const { x, y, r, teeth } = g, inner = r * .86, depth = r * .1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(g.a);
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = i / teeth * 6.283, a1 = a0 + 6.283 / teeth * .25, a2 = a0 + 6.283 / teeth * .5, a3 = a0 + 6.283 / teeth * .75;
      ctx.lineTo(Math.cos(a0) * inner, Math.sin(a0) * inner); ctx.lineTo(Math.cos(a1) * (inner + depth), Math.sin(a1) * (inner + depth));
      ctx.lineTo(Math.cos(a2) * (inner + depth), Math.sin(a2) * (inner + depth)); ctx.lineTo(Math.cos(a3) * inner, Math.sin(a3) * inner);
    }
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * .55, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * .12, 0, 6.283); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .12, Math.sin(a) * r * .12); ctx.lineTo(Math.cos(a) * r * .55, Math.sin(a) * r * .55); ctx.stroke(); }
    ctx.restore();
  }
  let t0 = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - t0) / 16.7; t0 = now;
    speed += (target - speed) * .08;
    ctx.clearRect(0, 0, W, H);
    // ánh nến theo chuột
    const flick = 1 + Math.sin(now / 90) * .03 + Math.sin(now / 37) * .02;
    const cg = ctx.createRadialGradient(mx * DPR, my * DPR, 0, mx * DPR, my * DPR, 520 * DPR * flick);
    const warm = frozen ? '207,227,238' : '240,180,94';
    cg.addColorStop(0, `rgba(${warm},${frozen ? .08 : .14})`); cg.addColorStop(1, `rgba(${warm},0)`);
    ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
    // bánh răng
    ctx.lineWidth = 1.4 * DPR;
    for (const g of gears) {
      g.a += (.0025 * speed * dt + scrollRot) * g.dir * (90 / g.teeth) * .2;
      ctx.strokeStyle = frozen ? `rgba(207,227,238,${g.alpha})` : `rgba(180,138,76,${g.alpha * 1.6})`;
      drawGear(g);
    }
    scrollRot *= .85;
    // bụi
    for (const d of dust) {
      d.ph += .02 * speed * dt; d.x += (d.vx + Math.sin(d.ph) * .15 * DPR) * speed * dt; d.y += d.vy * speed * dt;
      if (d.y > H) d.y = 0; if (d.y < 0) d.y = H; if (d.x > W) d.x = 0; if (d.x < 0) d.x = W;
      const near = Math.max(0, 1 - Math.hypot(d.x - mx * DPR, d.y - my * DPR) / (420 * DPR));
      ctx.fillStyle = frozen ? `rgba(207,227,238,${.25 + near * .6})` : `rgba(240,200,140,${.12 + near * .55})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + near), 0, 6.283); ctx.fill();
    }
    REDUCED || requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 4. đồng hồ thật trên thanh trên + đồng hồ bỏ túi ---------- */
  const nowEl = $('#now'), pdSec = $('#pdSec'), pdT = $('#pdTicks');
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * 6.283, big = i % 5 === 0, r1 = big ? 86 : 91;
    pdT.insertAdjacentHTML('beforeend', `<line class="${big ? 'big' : ''}" x1="${100 + Math.sin(a) * r1}" y1="${100 - Math.cos(a) * r1}" x2="${100 + Math.sin(a) * 96}" y2="${100 - Math.cos(a) * 96}"/>`);
  }
  let secs = 0, shown = new Date();
  setInterval(() => {
    if (frozen) return;
    if (rewinding) shown = new Date(shown.getTime() - 7000); else shown = new Date();
    nowEl.textContent = shown.toLocaleTimeString('vi-VN', { hour12: false });
    secs += rewinding ? -7 : 1;
    pdSec.setAttribute('transform', `rotate(${secs * 6} 100 100)`);
    tickTC();
  }, 1000);
  nowEl.textContent = shown.toLocaleTimeString('vi-VN', { hour12: false });
  const lid = $('#lid');
  let lidOpen = false;
  const openLid = v => { lidOpen = v; G && !REDUCED ? gsap.to(lid, { rotateX: v ? -172 : 0, duration: 1.6, ease: v ? 'elastic.out(1,.55)' : 'power3.inOut' }) : (lid.style.display = v ? 'none' : ''); };
  $('#pocket').addEventListener('click', e => { if (!e.target.closest('.art.has-art') || !lidOpen) openLid(!lidOpen); });

  /* ---------- 5. giữ để dừng thời gian ---------- */
  const ring = $('#ring'), stopper = $('#stopper');
  let holdT = null, holding = false, usedPointer = false;
  function pulse(x, y) {
    if (!G || REDUCED) return;
    gsap.fromTo(ring, { left: x, top: y, scale: 0, opacity: .9 }, { scale: Math.max(innerWidth, innerHeight) / 4, opacity: 0, duration: 1.3, ease: 'power2.out' });
  }
  const startHold = (x, y) => { holding = true; document.body.classList.add('is-holding'); setFrozen(true); pulse(x, y); };
  const endHold = () => { clearTimeout(holdT); if (holding) { holding = false; document.body.classList.remove('is-holding'); setFrozen(false); } };
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('a,button,.art,.lightbox,input,.chip')) return;
    const x = e.clientX, y = e.clientY;
    holdT = setTimeout(() => startHold(x, y), e.pointerType === 'mouse' ? 180 : 420);
  });
  document.addEventListener('pointermove', e => { if (!holding && holdT && e.pointerType !== 'mouse') clearTimeout(holdT); });
  addEventListener('pointerup', endHold); addEventListener('pointercancel', endHold); addEventListener('blur', endHold);
  stopper.addEventListener('pointerdown', e => { e.preventDefault(); usedPointer = true; const r = stopper.getBoundingClientRect(); startHold(r.left + 27, r.top + r.height / 2); });
  stopper.addEventListener('contextmenu', e => e.preventDefault());
  stopper.addEventListener('click', () => {
    if (usedPointer) { usedPointer = false; return; }
    // bàn phím: bật / tắt
    const v = !frozen; setFrozen(v); if (v) { const r = stopper.getBoundingClientRect(); pulse(r.left + 27, r.top + r.height / 2); }
  });

  /* ---------- 6. đổi phiên bản ---------- */
  const verBtns = $$('[data-set-ver]');
  const paintVer = () => verBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.setVer === VER));
  paintVer();
  function applyVer(v) {
    VER = v; root.dataset.ver = v; paintVer();
    try { localStorage.setItem('rxl-ver', v); } catch (e) {}
    setupReels(); G && ScrollTrigger.refresh();
  }
  verBtns.forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.setVer; if (v === VER) return;
    if (!G || REDUCED) { applyVer(v); return; }
    $('#swapTxt').textContent = v === 'f' ? 'Tua sang một dòng thời gian khác…' : 'Tua về dòng thời gian cũ…';
    target = -10;
    gsap.timeline()
      .set('#swap', { visibility: 'visible' })
      .to('#swap', { opacity: 1, duration: .5 })
      .add(() => applyVer(v))
      .to({}, { duration: .5 })
      .add(() => { target = frozen ? 0 : 1; })
      .to('#swap', { opacity: 0, duration: .6 })
      .set('#swap', { visibility: 'hidden' });
  }));

  /* ---------- 7. phòng chiếu (cốt truyện) ---------- */
  const tcBase = [ '07:12:04', '05:03:41', '03:22:18', '01:46:55', '00:00:00' ];
  let reels = [], tcSecs = 0;
  function setupReels() {
    reels.forEach(r => r.io.disconnect());
    reels = $$('.reel').filter(r => r.offsetParent !== null).map(reel => {
      const arts = $$('.reel__screen [data-k]', reel), tc = $('.tc', reel);
      const st = { k: -1, tc, reel };
      const show = k => {
        st.k = k; arts.forEach(a => a.classList.toggle('is-on', a.dataset.k === String(k)));
        $$('.scene', reel).forEach(s => s.classList.toggle('is-on', s.dataset.k === String(k)));
        tcSecs = 0; tickTC();
      };
      st.io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && show(+e.target.dataset.k)), { rootMargin: '-45% 0px -45% 0px' });
      $$('.scene', reel).forEach(s => st.io.observe(s));
      show(0);
      return st;
    });
  }
  function tickTC() {
    tcSecs++;
    reels.forEach(r => {
      const base = tcBase[r.k] || '00:00:00';
      if (base === '00:00:00') { r.tc.textContent = '00:00:00'; return; }
      const [h, m, s] = base.split(':').map(Number), tot = h * 3600 + m * 60 + s + tcSecs;
      r.tc.textContent = [tot / 3600 | 0, (tot % 3600) / 60 | 0, tot % 60].map(n => String(n).padStart(2, '0')).join(':');
    });
  }
  setupReels();

  /* ---------- 8. dòng mặt nạ / sự thật: rê chuột hoặc chạm ---------- */
  $$('.duos .duo, .joke .duo').forEach(d => {
    d.tabIndex = 0; d.setAttribute('role', 'button');
    d.setAttribute('aria-label', d.querySelector('.face').textContent + ' (bấm để xem sự thật)');
    const open = v => d.classList.toggle('is-open', v);
    d.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') open(true); });
    d.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') open(false); });
    d.addEventListener('click', e => { if (e.pointerType !== 'mouse') open(!d.classList.contains('is-open')); });
    d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(!d.classList.contains('is-open')); } });
  });

  /* ---------- 9. CAO TRÀO: đồng hồ lớn chạy ngược → vỡ gương → hư vô → tỉnh lại ---------- */
  const cx = $('#climax'), cxShards = $('#cxShards'), cxWorld = $('#cxWorld'), cxClock = $('#cxClock'), cxLabel = $('#cxLabel'),
    cxCracks = $('#cxCracks'), cxFlash = $('#cxFlash'), cxText = $('#cxText'), cxWake = $('#cxWake'), cxClose = $('#cxClose');
  const WORLD = 'assets/img/m-falling.webp';
  const MONTAGE = ['assets/img/m-phora.webp', 'assets/img/m-veil.webp', 'assets/img/raph-sketch.webp', 'assets/img/m-falling.webp'];
  const MEMORIES = ['Polar Tang', 'những lần bị đúm vào mặt', 'Dressrosa', '“Nếu đây là thiên đường…”', 'những năm lang thang', 'Thiên Long Nhân', 'Corazon'];
  // mặt đồng hồ lớn
  const ct = $('#cxTicks');
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * 6.283, big = i % 5 === 0, r1 = big ? 172 : 180;
    ct.insertAdjacentHTML('beforeend', `<line class="${big ? 'big' : ''}" x1="${200 + Math.sin(a) * r1}" y1="${200 - Math.cos(a) * r1}" x2="${200 + Math.sin(a) * 190}" y2="${200 - Math.cos(a) * 190}"/>`);
  }
  ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => {
    const a = i / 12 * 6.283; ct.insertAdjacentHTML('beforeend', `<text x="${200 + Math.sin(a) * 148}" y="${200 - Math.cos(a) * 148}">${n}</text>`);
  });
  $('#cxMontage').innerHTML = MONTAGE.map(s => `<div style="background-image:url('${s}')"></div>`).join('');
  cxWorld.style.backgroundImage = `url('${WORLD}')`;

  let shards = [], cxTl = null, montT = null;
  function buildShards() {
    cxShards.innerHTML = ''; shards = [];
    const cols = innerWidth > innerHeight ? 7 : 4, rows = innerWidth > innerHeight ? 5 : 7;
    const P = [];
    for (let r = 0; r <= rows; r++) {
      P[r] = [];
      for (let c = 0; c <= cols; c++) {
        const edgeX = c === 0 || c === cols, edgeY = r === 0 || r === rows;
        P[r][c] = [c / cols * 100 + (edgeX ? 0 : (Math.random() - .5) * 70 / cols), r / rows * 100 + (edgeY ? 0 : (Math.random() - .5) * 70 / rows)];
      }
    }
    const add = pts => {
      const el = document.createElement('i');
      el.style.backgroundImage = `url('${WORLD}')`;
      el.style.clipPath = `polygon(${pts.map(p => `${p[0]}% ${p[1]}%`).join(',')})`;
      const cxp = pts.reduce((s, p) => s + p[0], 0) / pts.length, cyp = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      cxShards.appendChild(el); shards.push({ el, cx: cxp, cy: cyp });
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const a = P[r][c], b = P[r][c + 1], d = P[r + 1][c], e = P[r + 1][c + 1];
      if (Math.random() < .5) { add([a, b, e]); add([a, e, d]); } else { add([a, b, d]); add([b, e, d]); }
    }
    // vết nứt từ tâm
    const AR = (window.innerWidth || 1) / (window.innerHeight || 1);
    let paths = '';
    for (let k = 0; k < 16; k++) {
      let x = 50, y = 50, ang = k / 16 * 6.283 + Math.random() * .3, d = '';
      d += `M${x} ${y}`;
      for (let s = 0; s < 8; s++) { ang += (Math.random() - .5) * .6; x += Math.cos(ang) * (4 + Math.random() * 6); y += Math.sin(ang) * (4 + Math.random() * 6) * AR; d += ` L${x.toFixed(2)} ${y.toFixed(2)}`; }
      paths += `<path d="${d}" stroke-dasharray="3000" stroke-dashoffset="3000"/>`;
    }
    for (const rr of [9, 18]) {
      let d = ''; for (let s = 0; s <= 24; s++) { const a = s / 24 * 6.283, j = rr + (Math.random() - .5) * 3; d += `${s ? 'L' : 'M'}${(50 + Math.cos(a) * j).toFixed(2)} ${(50 + Math.sin(a) * j * AR).toFixed(2)} `; }
      paths += `<path d="${d}" stroke-dasharray="3000" stroke-dashoffset="3000"/>`;
    }
    cxCracks.innerHTML = paths;
  }
  const say = (html, cls = '') => {
    const p = document.createElement('p'); p.className = cls; p.innerHTML = html;
    cxText.querySelectorAll('p').forEach(o => G ? gsap.to(o, { opacity: 0, filter: 'blur(10px)', duration: .8, onComplete: () => o.remove() }) : o.remove());
    cxText.appendChild(p);
    G && gsap.fromTo(p, { opacity: 0, filter: 'blur(12px)', y: 20 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.4, ease: 'power2.out' });
    return p;
  };
  function montage(on) {
    clearTimeout(montT); const ds = $$('#cxMontage div'); let i = 0, gap = 700;
    if (!on) { ds.forEach(d => d.classList.remove('is-on')); return; }
    (function next() {
      ds.forEach((d, k) => d.classList.toggle('is-on', k === i % ds.length));
      cxLabel.textContent = MEMORIES[i % MEMORIES.length];
      i++; gap = Math.max(70, gap * .8); montT = setTimeout(next, gap);
    })();
  }
  function resetClimax() {
    cxTl && cxTl.kill(); montage(false);
    cxText.innerHTML = ''; cxLabel.textContent = ''; cxWake.hidden = true; cxClose.hidden = true;
    if (G) { gsap.set([cxWorld, cxFlash], { opacity: 0 }); gsap.set(cxClock, { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, filter: 'none' }); gsap.set('#cxMin,#cxHr', { rotation: 0, svgOrigin: '200 200' }); }
    cxShards.innerHTML = ''; cxCracks.innerHTML = ''; cxCracks.style.opacity = 0;
  }
  function closeClimax() {
    resetClimax(); cx.hidden = true; document.body.style.overflow = '';
    root.classList.remove('is-erased'); rewinding = false; target = frozen ? 0 : 1;
    $('#eraseBtn').focus();
  }
  function playClimax() {
    cx.hidden = false; document.body.style.overflow = 'hidden'; resetClimax(); buildShards();
    $('#cxSkip').focus();
    if (!G || REDUCED) {
      root.classList.add('is-erased');
      say('Khi Law tỉnh lại, không ai còn biết Raphael từng tồn tại.'); cxClock.style.opacity = 0; cxWake.hidden = false; return;
    }
    rewinding = true;
    const min = $('#cxMin'), hr = $('#cxHr');
    gsap.set(shards.map(s => s.el), { opacity: 0 });
    cxTl = gsap.timeline();
    cxTl
      // 1 · đồng hồ lớn hiện ra, bắt đầu chạy ngược
      .fromTo(cxClock, { scale: .4, opacity: 0, rotate: -30 }, { scale: 1, opacity: 1, rotate: 0, duration: 1.6, ease: 'expo.out' })
      .add(() => { say('“Đừng khóc, khi anh tỉnh lại, anh sẽ chẳng nhớ gì đâu.”', 'sm top'); target = -6; montage(true); }, .3)
      .to(min, { rotation: -360 * 26, svgOrigin: '200 200', duration: 6.5, ease: 'power3.in' }, .6)
      .to(hr, { rotation: -360 * 2.2, svgOrigin: '200 200', duration: 6.5, ease: 'power3.in' }, .6)
      .to(cxWorld, { opacity: .55, duration: 5, ease: 'power1.in' }, 1.5)
      .to(cxClock, { scale: 1.12, duration: 6, ease: 'power2.in' }, .6)
      // rung dần lên
      .to(cxClock, { keyframes: Array.from({ length: 24 }, (_, i) => ({ x: (Math.random() - .5) * i * 1.4, y: (Math.random() - .5) * i * 1.4, duration: .1 })), ease: 'none' }, 4.6)
      .to(cxClock, { filter: 'drop-shadow(6px 0 0 rgba(255,40,40,.7)) drop-shadow(-6px 0 0 rgba(60,140,255,.7))', duration: 1.4 }, 5.4)
      // 2 · đứng hình. im lặng. nứt.
      .add(() => { montage(false); cxLabel.textContent = ''; target = 0; cxText.innerHTML = ''; }, 7.1)
      .set(cxClock, { x: 0, y: 0 }, 7.1)
      .to(cxWorld, { opacity: 1, filter: 'sepia(0) brightness(.9)', duration: .3 }, 7.1)
      .set(shards.map(s => s.el), { opacity: 1 }, 7.4)
      .set(cxWorld, { opacity: 0 }, 7.4)
      .to(cxClock, { opacity: 0, scale: 1.4, duration: .25 }, 7.4)
      .set('#cxCracks', { opacity: 1 }, 7.6)
      .to('#cxCracks path', { attr: { 'stroke-dashoffset': 0 }, duration: .6, stagger: .02, ease: 'power2.out' }, 7.6)
      .to({}, { duration: .9 })
      // 3 · vỡ
      .to(cxFlash, { opacity: .9, duration: .06 }, 9)
      .to(cxFlash, { opacity: 0, duration: .9 }, 9.06)
      .set('#cxCracks', { opacity: 0 }, 9.05)
      .add(() => {
        shards.forEach(s => {
          const dx = s.cx - 50, dy = s.cy - 50, dist = Math.hypot(dx, dy) + 1;
          gsap.to(s.el, {
            x: dx / dist * gsap.utils.random(300, 900), y: dy / dist * gsap.utils.random(200, 700) + gsap.utils.random(200, 600),
            z: gsap.utils.random(-900, 300), rotationX: gsap.utils.random(-220, 220), rotationY: gsap.utils.random(-220, 220), rotationZ: gsap.utils.random(-90, 90),
            opacity: 0, duration: gsap.utils.random(2.2, 3.6), ease: 'power2.out', delay: (60 - dist) / 60 * .25
          });
        });
        target = -1.5; root.classList.add('is-erased');
      }, 9)
      // 4 · hư vô
      .add(() => say('Tin em đi, nếu có kiếp sau, em vẫn sẽ cầu hôn anh.'), 11.2)
      .add(() => say('Thế giới vỡ thành từng mảnh gương, mang sự tồn tại của Raphael vào hư không.', 'sm'), 14.6)
      .add(() => {
        const p = say('Raphael Dominick'.split('').map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join(''), 'name');
        gsap.to(p.querySelectorAll('span'), { x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-200, 200), rotate: () => gsap.utils.random(-90, 90), opacity: 0, filter: 'blur(8px)', duration: 2.4, delay: 1.8, stagger: { each: .08, from: 'random' }, ease: 'power2.in' });
      }, 18)
      .add(() => say('Khi Law tỉnh lại, không ai còn biết Raphael từng tồn tại.'), 22.6)
      .add(() => say('Trong hư vô, anh nhìn người mình yêu đau khổ, mất đi gia đình, vô số lần, mà không thể làm gì.', 'sm'), 26.2)
      .add(() => { cxWake.hidden = false; gsap.from(cxWake, { opacity: 0, y: 20, duration: 1 }); cxWake.focus(); }, 29.4);
  }
  function wake() {
    cxWake.hidden = true; cxTl && cxTl.kill(); rewinding = false;
    if (!G || REDUCED) { root.classList.remove('is-erased'); cx.style.background = '#f3dfb8'; say('Rồi anh tỉnh lại, ôm chặt lấy Law, và khóc.', 'warm'); cxClose.hidden = false; return; }
    target = 4;
    cxText.querySelectorAll('p').forEach(o => o.remove());
    if (!shards.length || !shards[0].el.isConnected) buildShards();
    gsap.set('#cxCracks', { opacity: 0 });
    cxTl = gsap.timeline();
    cxTl
      .to(cx, { backgroundColor: '#1a120c', duration: 2 })
      .to(shards.map(s => s.el), { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, opacity: 1, duration: 2.6, ease: 'expo.inOut', stagger: { each: .02, from: 'center' } }, 0)
      .add(() => root.classList.remove('is-erased'), 1.4)
      .to(cxFlash, { opacity: .35, duration: .2 }, 2.9)
      .to(cxFlash, { opacity: 0, duration: 1.4 }, 3.1)
      .set(cxWorld, { opacity: 1, filter: 'none' }, 3)
      .set(shards.map(s => s.el), { opacity: 0 }, 3.1)
      .add(() => { target = 1; say('Rồi anh tỉnh lại, ôm chặt lấy Law, và khóc.<span class="script">Everything is falling in love again</span>'); }, 3.6)
      .to(cxWorld, { filter: 'brightness(.55)', duration: 2 }, 3.6)
      .add(() => { cxClose.hidden = false; gsap.from(cxClose, { opacity: 0, y: 20, duration: 1 }); }, 5.4);
  }
  $('#eraseBtn') && $('#eraseBtn').addEventListener('click', playClimax);
  cxWake.addEventListener('click', wake);
  cxClose.addEventListener('click', () => { if (G) gsap.to(cx, { opacity: 0, duration: .8, onComplete: () => { gsap.set(cx, { opacity: 1, backgroundColor: '#000' }); closeClimax(); } }); else closeClimax(); });
  $('#cxSkip').addEventListener('click', () => { if (G) gsap.set(cx, { backgroundColor: '#000' }); closeClimax(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !cx.hidden) { if (G) gsap.set(cx, { backgroundColor: '#000' }); closeClimax(); } });

  /* ---------- 10. tủ kính + lightbox ---------- */
  const fBtns = $$('[data-filter]');
  fBtns.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.filter; fBtns.forEach(x => x.classList.toggle('is-on', x === b));
    $$('.relic').forEach(p => { p.hidden = f !== 'all' && !p.dataset.tag.split(' ').includes(f); });
    G && !REDUCED && gsap.from('.relic:not([hidden])', { y: 40, opacity: 0, stagger: .06, duration: .8, ease: 'power3.out' });
    G && ScrollTrigger.refresh();
  }));
  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.lightbox__cap', lb);
  document.addEventListener('click', e => {
    const a = e.target.closest('.art.has-art'); if (!a || a.closest('.reel__screen') || (a.closest('.pocket') && !lidOpen)) return;
    lbImg.src = a.querySelector('img').src;
    lbCap.textContent = a.closest('figure')?.querySelector('figcaption')?.textContent || a.dataset.title || '';
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
  });
  const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); };
  lb.addEventListener('click', e => { if (e.target !== lbImg) closeLb(); });
  addEventListener('keydown', e => e.key === 'Escape' && closeLb());

  /* ---------- 10. chuyển động theo cuộn ---------- */
  const pt = $('#prologueText');
  pt.innerHTML = pt.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const hcNum = $('#hcNum');
  ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => {
    const a = i / 12 * 6.283; hcNum.insertAdjacentHTML('beforeend', `<text x="${150 + Math.sin(a) * 100}" y="${150 - Math.cos(a) * 100}">${n}</text>`);
  });
  const slides = $$('#heirSlides p'), when = $('#heirWhen');
  let curSlide = -1;
  function setHeir(p) {
    const i = clamp(Math.floor(p * slides.length * .999), 0, slides.length - 1);
    if (G) { gsap.set('#hcMin', { rotation: -p * 360 * 8, svgOrigin: '150 150' }); gsap.set('#hcHr', { rotation: -p * 360 * 8 / 12, svgOrigin: '150 150' }); }
    const bar = $('#heirBar'); if (bar) bar.style.transform = `scaleX(${p})`;
    if (i === curSlide) return; curSlide = i;
    slides.forEach((s, k) => s.classList.toggle('is-on', k === i)); when.textContent = slides[i].dataset.when;
  }
  setHeir(0);

  function setupScroll() {
    if (!G) { $$('.prologue__text .w').forEach(w => { w.style.opacity = 1; w.style.filter = 'none'; }); return; }
    ScrollTrigger.create({
      trigger: '.heir', start: 'top top', end: () => '+=' + innerHeight * 2.4, pin: '.heir__pin', scrub: true,
      onUpdate: s => setHeir(s.progress),
      onToggle: s => { if (!rewinding) target = s.isActive ? -2.5 : (frozen ? 0 : 1); }
    });
    if (REDUCED) return;
    setTimeout(() => openLid(true), 700);
    gsap.from('.title, .lede, .howto', { y: 40, opacity: 0, stagger: .15, duration: 1.4, delay: 1, ease: 'power3.out' });
    gsap.to('.pocket', { rotate: -14, y: 80, scale: .85, ease: 'none', scrollTrigger: { trigger: '.watch', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.prologue__text .w', { opacity: 1, filter: 'blur(0px)', stagger: .04, ease: 'none', scrollTrigger: { trigger: '.prologue', start: 'top 70%', end: 'bottom 60%', scrub: true } });
    $$('.sec-head').forEach(h => gsap.from(h.children, { y: 40, opacity: 0, stagger: .12, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 85%' } }));
    $$('.portrait').forEach((p, i) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 72%' } });
      tl.from($('.frame__oval', p), { scale: .6, rotate: i ? 12 : -12, opacity: 0, duration: 1.6, ease: 'expo.out' })
        .from($('.frame__plate', p), { y: 30, opacity: 0, duration: .8 }, '-=1')
        .from($$('.portrait__text > *', p), { x: i ? -40 : 40, opacity: 0, stagger: .1, duration: 1, ease: 'power3.out' }, '-=1.2');
      gsap.to($('.frame__oval', p), { y: -40, ease: 'none', scrollTrigger: { trigger: p, scrub: true } });
    });
    $$('.joke').forEach(j => gsap.from(j, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: j, start: 'top 85%' } }));
    gsap.from('.last__quote', { opacity: 0, filter: 'blur(12px)', duration: 2, ease: 'power2.out', scrollTrigger: { trigger: '.last', start: 'top 60%' } });
    gsap.set('.relic', { opacity: 0 });
    ScrollTrigger.batch('.relic', { start: 'top 92%', onEnter: b => gsap.fromTo(b, { y: 60, opacity: 0, rotate: () => gsap.utils.random(-4, 4) }, { y: 0, opacity: 1, rotate: 0, stagger: .1, duration: 1.1, ease: 'expo.out', overwrite: true }) });
    gsap.from('.end__quote', { opacity: 0, y: 40, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: '.end', start: 'top 70%' } });
  }
  Promise.allSettled(artP).then(() => { setupScroll(); G && ScrollTrigger.refresh(); });
})();
