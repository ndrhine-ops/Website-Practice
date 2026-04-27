/* ═══════════════════════════════════════════════
   Rhinehart Cabinetry — main.js
   ═══════════════════════════════════════════════ */

/* ── Nav sticky ─────────────────────────────────── */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const tick = () => nav.classList.toggle('stuck', window.scrollY > 60);
  window.addEventListener('scroll', tick, { passive: true });
  tick();
}());

/* ── Active nav link ─────────────────────────────── */
(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a, .mobile-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}());

/* ── Mobile nav ──────────────────────────────────── */
(function () {
  const burger   = document.getElementById('navBurger');
  const closeBtn = document.getElementById('mobileClose');
  const nav      = document.getElementById('mobileNav');
  if (!burger || !nav) return;

  const open  = () => { nav.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { nav.classList.remove('open'); document.body.style.overflow = ''; };

  burger.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  nav.addEventListener('click', e => { if (e.target === nav) close(); });
}());

/* ── Scroll reveal ───────────────────────────────── */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}());

/* ── Stat counters ───────────────────────────────── */
(function () {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const dur    = 1400;
      let t0 = null;
      const step = ts => {
        if (!t0) t0 = ts;
        const p    = Math.min((ts - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(ease * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}());

/* ── Testimonials ────────────────────────────────── */
(function () {
  const quotes = document.querySelectorAll('[data-testimonials]');
  if (!quotes.length) return;

  const data = JSON.parse(quotes[0].dataset.testimonials);
  const quoteEl  = document.getElementById('tQuote');
  const authorEl = document.getElementById('tAuthor');
  const dots     = document.querySelectorAll('.t-dot');
  if (!quoteEl) return;

  let cur = 0;
  quoteEl.style.transition  = 'opacity 0.3s';
  authorEl.style.transition = 'opacity 0.3s';

  const set = i => {
    quoteEl.style.opacity  = '0';
    authorEl.style.opacity = '0';
    setTimeout(() => {
      quoteEl.textContent  = data[i].quote;
      authorEl.textContent = data[i].author;
      quoteEl.style.opacity  = '1';
      authorEl.style.opacity = '1';
    }, 280);
    dots.forEach(d => d.classList.toggle('on', +d.dataset.i === i));
    cur = i;
  };

  dots.forEach(d => d.addEventListener('click', () => set(+d.dataset.i)));
  setInterval(() => set((cur + 1) % data.length), 6000);
}());

/* ── Contact form ────────────────────────────────── */
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn  = form.querySelector('[type="submit"]');
    const orig = btn.innerHTML;
    btn.innerHTML       = 'Message Sent ✓';
    btn.style.background = '#3a6b4a';
    btn.disabled        = true;
    setTimeout(() => {
      btn.innerHTML       = orig;
      btn.style.background = '';
      btn.disabled        = false;
      form.reset();
    }, 3500);
  });
}());

/* ── Gallery filter + lightbox ───────────────────── */
(function () {
  const tabs  = document.querySelectorAll('.filter-tab');
  const items = document.querySelectorAll('.gallery-item');
  if (!tabs.length) return;

  /* Filter */
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.cat;
      items.forEach(item => {
        item.style.display = (cat === 'all' || item.dataset.cat === cat) ? '' : 'none';
      });
    });
  });

  /* Lightbox */
  const lb      = document.getElementById('lightbox');
  if (!lb) return;
  const lbImg   = lb.querySelector('.lb-img');
  const lbPh    = lb.querySelector('.lb-placeholder');
  const lbCap   = lb.querySelector('.lb-caption');

  let cur = 0;
  const visible = () => [...items].filter(i => i.style.display !== 'none');

  const show = item => {
    const src = item.dataset.full || item.querySelector('img')?.src || '';
    if (src) {
      if (lbImg) { lbImg.src = src; lbImg.style.display = ''; }
      if (lbPh)  lbPh.style.display = 'none';
    } else {
      if (lbImg) lbImg.style.display = 'none';
      if (lbPh)  lbPh.style.display = 'flex';
    }
    if (lbCap) lbCap.textContent = item.dataset.label || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    cur = visible().indexOf(item);
  };

  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };

  const nav = dir => {
    const v = visible();
    cur = (cur + dir + v.length) % v.length;
    show(v[cur]);
  };

  items.forEach(item => item.addEventListener('click', () => show(item)));
  lb.querySelector('.lb-close')?.addEventListener('click', close);
  lb.querySelector('.lb-prev')?.addEventListener('click',  () => nav(-1));
  lb.querySelector('.lb-next')?.addEventListener('click',  () => nav(1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowLeft')   nav(-1);
    if (e.key === 'ArrowRight')  nav(1);
  });
}());
