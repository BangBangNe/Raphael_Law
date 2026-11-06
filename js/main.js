/* =========================================================
   Raphael × Law — bệnh án
   Không dùng thư viện ngoài.
   ========================================================= */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const wait = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms));

  /* ---------- 0. Phiên bản: "m" = Ver. Nam, "f" = Ver. Nữ ---------- */
  let VER = 'm';
  try { const s = localStorage.getItem('rxl-ver'); if (s === 'm' || s === 'f') VER = s; } catch (e) {}
  root.dataset.ver = VER;
  const verBtns = $$('[data-set-ver]'), stack = $('#stack');
  const paintVer = () => verBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.setVer === VER));
  paintVer();
  verBtns.forEach(b => b.addEventListener('click', async () => {
    const v = b.dataset.setVer; if (v === VER) return;
    VER = v; paintVer();
    try { localStorage.setItem('rxl-ver', v); } catch (e) {}
    if (!REDUCED) { stack.classList.add('is-out'); await wait(320); }
    root.dataset.ver = v; stack.classList.remove('is-out');
    if (!REDUCED) { stack.classList.add('is-in'); setTimeout(() => stack.classList.remove('is-in'), 520); }
  }));

  /* ---------- 1. Tranh: data-art="assets/img/ten-file" (không cần đuôi) ---------- */
  const EXT = ['webp', 'png', 'jpg'];
  const loadOne = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(src); i.onerror = rej; i.src = src; });
  const tryLoad = base => /\.\w{3,4}$/.test(base) ? loadOne(base) : EXT.reduce((p, x) => p.catch(() => loadOne(`${base}.${x}`)), Promise.reject());
  $$('.art[data-art]').forEach(el => {
    if (el.dataset.pos) el.style.setProperty('--pos', el.dataset.pos);
    tryLoad(el.dataset.art).then(src => {
      const img = new Image(); img.src = src; img.alt = el.dataset.title || ''; img.decoding = 'async'; img.draggable = false;
      el.appendChild(img); el.classList.add('has-art');
    }).catch(() => el.classList.add('no-art'));
  });

  /* ---------- 2. Tab đang đọc ---------- */
  const links = $$('.tabs__list a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    const on = links.find(a => a.classList.contains('is-active'));
    on && on.parentElement.scrollWidth > on.parentElement.clientWidth && on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('.sheet').forEach(s => io.observe(s));

  /* ---------- 3. Máy đo nhịp tim ---------- */
  const mon = $('#monitor'), cvs = $('#ecg'), ctx = cvs.getContext('2d'), bpmEl = $('#bpm'), stat = $('#monStatus'), meet = $('#meetLaw');
  let on = false, bpm = 0, target = 0, x = 0, phase = 0, W = 0, H = 0, DPR = 1, lastY = null, visible = false;
  const COL = getComputedStyle(root).getPropertyValue('--mon-line').trim() || '#57f0ae';
  function size() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cvs.width = cvs.clientWidth * DPR; H = cvs.height = cvs.clientHeight * DPR;
    ctx.clearRect(0, 0, W, H); x = 0; lastY = null;
  }
  size(); addEventListener('resize', size);
  // dạng sóng PQRST, t trong [0,1)
  function wave(t) {
    const g = (c, w, a) => a * Math.exp(-((t - c) ** 2) / (2 * w * w));
    return g(.18, .025, .12) - g(.30, .008, .15) + g(.33, .012, 1) - g(.36, .01, .28) + g(.58, .045, .25);
  }
  function step() {
    bpm += (target - bpm) * .02;
    const amp = Math.min(1, bpm / 60);
    const speed = 2.2 * DPR;
    for (let k = 0; k < 2; k++) {
      phase += (bpm / 60) / 60 / 2;
      if (phase >= 1) phase -= 1;
      const noise = (Math.random() - .5) * 2 * DPR;
      const y = H * .62 - wave(phase) * H * .5 * amp + noise;
      ctx.clearRect(x, 0, 14 * DPR, H);
      ctx.strokeStyle = COL; ctx.lineWidth = 2 * DPR; ctx.lineJoin = 'round';
      ctx.shadowColor = COL; ctx.shadowBlur = 6 * DPR;
      if (lastY !== null) { ctx.beginPath(); ctx.moveTo(x - speed / 2, lastY); ctx.lineTo(x, y); ctx.stroke(); }
      lastY = y; x += speed / 2;
      if (x > W) { x = 0; lastY = null; }
    }
    bpmEl.textContent = bpm < 4 ? '--' : Math.round(bpm);
    mon.style.setProperty('--beat', (60 / Math.max(bpm, 30)).toFixed(2) + 's');
  }
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(mon);
  (function loop() { if (visible) step(); requestAnimationFrame(loop); })();
  if (REDUCED) { for (let i = 0; i < 400; i++) step(); }
  function setHeart(v) {
    on = v; target = v ? 96 : 0;
    mon.classList.toggle('is-on', v); meet.setAttribute('aria-pressed', v);
    meet.textContent = v ? 'Law đi mất rồi' : 'Cho gặp Law';
    stat.textContent = v ? 'Nhịp tăng bất thường. Nguyên nhân: Trafalgar Law.' : 'Không ghi nhận cảm xúc';
    if (REDUCED) { bpm = target; for (let i = 0; i < 400; i++) step(); }
  }
  meet.addEventListener('click', () => setHeart(!on));

  /* ---------- 4. Biến chứng: tên bị xoá khỏi hồ sơ ---------- */
  const er = $('#erase'), nameEl = $('#eraseName'), msg = $('#eraseMsg'), erBtn = $('#eraseBtn'), quote = $('.erase__quote', er);
  const NAME = 'Raphael Dominick', emerg = $('#emergency'), emergHTML = emerg ? emerg.innerHTML : '';
  const chars = s => [...s].map(c => `<span class="c">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  let busy = false;
  erBtn && erBtn.addEventListener('click', async () => {
    if (busy) return; busy = true;
    const st = er.dataset.state;
    if (st === '0') {
      nameEl.innerHTML = chars(NAME);
      const cs = $$('.c', nameEl).reverse();
      erBtn.hidden = true;
      for (const c of cs) { c.classList.add('gone'); await wait(110); }
      quote.style.opacity = .35;
      msg.textContent = 'Thế giới vỡ thành từng mảnh gương. Khi Law tỉnh lại, không ai còn biết Raphael từng tồn tại.';
      if (emerg) emerg.innerHTML = '<span class="todo">(để trống)</span>';
      await wait(1800);
      msg.textContent = 'Trong hư vô, anh sống lại từng giây phút của chính mình, và nhìn người mình yêu đau khổ, mất đi gia đình, vô số lần, mà không thể làm gì.';
      erBtn.textContent = 'Tỉnh lại'; erBtn.hidden = false; er.dataset.state = '1';
    } else if (st === '1') {
      erBtn.hidden = true; msg.innerHTML = '&nbsp;';
      nameEl.classList.add('hand'); nameEl.innerHTML = chars('Raphael');
      for (const c of $$('.c', nameEl)) { c.classList.add('on'); await wait(140); }
      msg.textContent = 'Rồi anh tỉnh lại, ôm chặt lấy Law, và khóc.';
      quote.style.opacity = 1;
      if (emerg) emerg.innerHTML = emergHTML;
      await wait(900);
      erBtn.textContent = 'Đọc lại'; erBtn.hidden = false; er.dataset.state = '2';
    } else {
      nameEl.classList.remove('hand'); nameEl.textContent = NAME; msg.innerHTML = '&nbsp;';
      erBtn.textContent = 'Lật sang trang sau'; er.dataset.state = '0';
    }
    busy = false;
  });

  /* ---------- 5. Gallery: lọc + kéo ảnh + xem to ---------- */
  const fBtns = $$('[data-filter]');
  fBtns.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.filter; fBtns.forEach(x => x.classList.toggle('is-on', x === b));
    $$('.pin').forEach(p => { p.hidden = f !== 'all' && !p.dataset.tag.split(' ').includes(f); });
  }));

  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('.lightbox__cap', lb);
  function openLb(a) {
    const img = a.querySelector('img'); if (!img) return;
    lbImg.src = img.src;
    lbCap.textContent = a.closest('figure')?.querySelector('figcaption')?.textContent || a.dataset.title || '';
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
  }
  const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); };
  lb.addEventListener('click', e => { if (e.target !== lbImg) closeLb(); });
  addEventListener('keydown', e => e.key === 'Escape' && closeLb());

  let z = 10;
  $$('.pin').forEach(p => {
    let sx, sy, ox = 0, oy = 0, moved = false, id = null;
    p.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' && e.isPrimary === false) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false;
      ox = parseFloat(p.style.getPropertyValue('--dx')) || 0; oy = parseFloat(p.style.getPropertyValue('--dy')) || 0;
      if (e.pointerType === 'mouse') { p.setPointerCapture(id); }
    });
    p.addEventListener('pointermove', e => {
      if (id !== e.pointerId || e.pointerType !== 'mouse') return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 5) { moved = true; p.classList.add('is-drag'); p.style.zIndex = ++z; }
      if (moved) { p.style.setProperty('--dx', ox + dx + 'px'); p.style.setProperty('--dy', oy + dy + 'px'); }
    });
    const up = () => { id = null; p.classList.remove('is-drag'); };
    p.addEventListener('pointerup', e => { const wasMoved = moved; up(); if (!wasMoved) { const a = e.target.closest('.art.has-art'); a && openLb(a); } });
    p.addEventListener('pointercancel', up);
  });
  // ảnh ngoài gallery: bấm để xem to
  document.addEventListener('click', e => {
    const a = e.target.closest('.art.has-art'); if (!a || a.closest('.pin')) return; openLb(a);
  });
})();
