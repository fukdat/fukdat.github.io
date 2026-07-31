/* ------------------------------------------------------------
   smooth-scroll.js — Lenis driven by the GSAP ticker so
   ScrollTrigger stays perfectly in sync (single RAF loop).
   ------------------------------------------------------------ */
import { $$, reduced } from '../lib/utils.js';

export function initSmoothScroll() {
  if (reduced || typeof Lenis === 'undefined') {
    bindAnchors(null);
    return null;
  }

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
    lerp: 0.09,
  });

  lenis.on('scroll', () => ScrollTrigger.update());
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  bindAnchors(lenis);
  return lenis;
}

function bindAnchors(lenis) {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
