/* ------------------------------------------------------------
   hero.js — opening sequence: title chars rise out of their
   masks, meta columns cascade, ticker settles in.
   ------------------------------------------------------------ */
import { $, $$, reduced } from '../lib/utils.js';

export function playHero(splitMap) {
  const hero = $('.hero');
  if (!hero) return;

  const titleChars = [];
  splitMap.forEach((parts, el) => {
    if (hero.contains(el) && parts.chars) titleChars.push(...parts.chars);
  });

  // reduced motion, or a tab that was never painted (rAF frozen): show the
  // final composition straight away instead of an intro nobody can see.
  if (reduced || document.hidden) {
    gsap.set([titleChars, '.hero [data-reveal]'], { opacity: 1, yPercent: 0, y: 0, filter: 'none' });
    gsap.set(['.hero__meta', '.hero .ticker', '.hero__foot'], { opacity: 1 });
    gsap.set('.nav', { yPercent: 0 });
    return;
  }

  const meta = $$('.hero [data-reveal]');
  gsap.set(titleChars, { yPercent: 112 });
  gsap.set(meta, { opacity: 0, y: 22, filter: 'blur(6px)' });
  gsap.set('.hero__meta, .hero .ticker', { opacity: 0 });
  gsap.set('.nav', { yPercent: -140 });

  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .to(titleChars, { yPercent: 0, duration: 1.35, stagger: 0.016 }, 0.05)
    .to('.hero__meta, .hero .ticker', { opacity: 1, duration: 1 }, 0.5)
    .to(meta, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, stagger: 0.07 }, 0.6)
    .to('.nav', { yPercent: 0, duration: 1.1 }, 0.35)
    .fromTo(
      '.hero__foot',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 1 },
      0.85
    );
}
