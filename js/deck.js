/* ==========================================================================
   Curio Pitch Deck — Navigation Engine
   Discrete slide deck (not scroll-based). Handles active-slide swapping via
   the View Transitions API with a graceful fallback, keyboard/click/swipe
   navigation, a progress rail + dot rail, and count-up number reveals.
   ========================================================================== */
(() => {
  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const total = slides.length;
  const supportsVT = typeof document.startViewTransition === 'function';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!supportsVT) document.documentElement.classList.add('no-vt');

  let current = 0;

  // ---- Chrome: counter, progress, dots ----
  const counterEl = document.querySelector('.slide-counter');
  const progressFill = document.querySelector('.progress-fill');
  const dotsEl = document.querySelector('.nav-dots');
  const prevBtn = document.querySelector('[data-nav="prev"]');
  const nextBtn = document.querySelector('[data-nav="next"]');

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'nav-dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });
  const dots = Array.from(dotsEl.children);

  function animateCountUp(slideEl) {
    const targets = slideEl.querySelectorAll('[data-count-to]');
    targets.forEach((el) => {
      const to = parseFloat(el.dataset.countTo);
      const decimals = (el.dataset.countTo.split('.')[1] || '').length;
      const prefix = el.dataset.countPrefix || '';
      const suffix = el.dataset.countSuffix || '';
      if (reduceMotion) {
        el.textContent = `${prefix}${to.toFixed(decimals)}${suffix}`;
        return;
      }
      const duration = 1100;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = to * eased;
        el.textContent = `${prefix}${val.toFixed(decimals)}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function activate(index) {
    slides.forEach((s, i) => {
      const isActive = i === index;
      s.classList.toggle('is-active', isActive);
      s.setAttribute('aria-hidden', String(!isActive));
    });
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    counterEl.innerHTML = `<strong>${String(index + 1).padStart(2, '0')}</strong> / ${String(total).padStart(2, '0')}`;
    progressFill.style.width = `${((index + 1) / total) * 100}%`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;

    // restart entrance animations + number count-ups on the newly active slide
    const active = slides[index];
    active.classList.remove('replay');
    void active.offsetWidth; // reflow to restart CSS animations
    active.classList.add('replay');
    animateCountUp(active);

    history.replaceState(null, '', `#s${index + 1}`);
  }

  function goTo(index) {
    const clamped = Math.max(0, Math.min(total - 1, index));
    if (clamped === current) return;
    current = clamped;
    if (supportsVT && !reduceMotion) {
      document.startViewTransition(() => activate(current));
    } else {
      activate(current);
    }
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  window.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
    if (e.key === 'Home') goTo(0);
    if (e.key === 'End') goTo(total - 1);
  });

  // touch swipe
  let touchX = null;
  deck.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchX = null;
  }, { passive: true });

  // mouse wheel (debounced)
  let wheelLock = false;
  deck.addEventListener('wheel', (e) => {
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 24) return;
    wheelLock = true;
    e.deltaY > 0 ? next() : prev();
    setTimeout(() => { wheelLock = false; }, 650);
  }, { passive: true });

  // init from hash if present
  const hashMatch = location.hash.match(/#s(\d+)/);
  const startIndex = hashMatch ? Math.max(0, Math.min(total - 1, parseInt(hashMatch[1], 10) - 1)) : 0;
  current = startIndex;
  activate(current);
})();
