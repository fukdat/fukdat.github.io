/* ------------------------------------------------------------
   reveal.js — scroll-driven choreography:
   text reveal, stagger, parallax, mask/clip-path, blur, counters.
   ------------------------------------------------------------ */
import { $, $$, reduced, onResize } from '../lib/utils.js';
import { splitChars, splitWords, groupLines } from '../lib/split.js';

const EASE = 'expo.out';

/** Prepare every split element once; returns hero pieces for the intro. */
export function prepareText() {
  const map = new Map();
  $$('[data-split]').forEach((el) => {
    const mode = el.dataset.split;
    map.set(el, mode === 'chars' ? splitChars(el) : splitWords(el));
  });
  return map;
}

export function initReveal(splitMap) {
  if (reduced) {
    gsap.set('[data-reveal]', { opacity: 1 });
    return;
  }

  const heroScope = $('.hero');

  /* ---- split text on scroll (hero handled by the intro) ---- */
  splitMap.forEach((parts, el) => {
    if (heroScope && heroScope.contains(el)) return;

    const mode = el.dataset.split;

    if (mode === 'chars') {
      gsap.set(parts.chars, { yPercent: 108 });
      gsap.to(parts.chars, {
        yPercent: 0,
        duration: 1.05,
        ease: EASE,
        stagger: 0.014,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
      return;
    }

    // lines: words rise together per visual line, line after line
    gsap.set(parts.words, { yPercent: 108 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        const lines = groupLines(parts.masks);
        lines.forEach((line, li) => {
          gsap.to(
            line.map((m) => m.firstElementChild),
            { yPercent: 0, duration: 1.15, ease: EASE, delay: li * 0.075, stagger: 0.018 }
          );
        });
      },
    });
  });

  /* ---- generic reveal (fade + rise + blur), grouped stagger ---- */
  // the hero is choreographed by the intro timeline, not by scroll
  const revealEls = $$('[data-reveal]').filter((el) => !heroScope || !heroScope.contains(el));
  gsap.set(revealEls, { opacity: 0, y: 26, filter: 'blur(7px)' });

  ScrollTrigger.batch(revealEls, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.05,
        ease: EASE,
        stagger: 0.075,
        overwrite: true,
      }),
  });

  /* ---- mask / clip-path reveals ---- */
  $$('[data-mask]').forEach((el) => {
    // внутри может быть и фотография, и заглушка — берём то, что есть
    const inner = el.querySelector('img, .ph');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    gsap.set(el, { clipPath: 'inset(0% 0% 100% 0%)' });
    tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.inOut' });
    if (inner) tl.to(inner, { scale: 1, duration: 1.6, ease: EASE }, 0);
  });

  /* ---- parallax ---- */
  $$('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 0.12;
    gsap.fromTo(
      el,
      { yPercent: -amount * 100 },
      {
        yPercent: amount * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('[data-parallax-wrap]') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  });

  /* ---- counters ---- */
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count) || 0;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => (el.textContent = String(Math.round(obj.v)).padStart(2, '0')),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  /* ---- work rows: line sweep + row lift ---- */
  $$('.work__row').forEach((row) => {
    gsap.fromTo(
      row,
      { opacity: 0.001, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: EASE,
        scrollTrigger: { trigger: row, start: 'top 90%', once: true },
      }
    );
  });

  /* ---- community block scale-in ---- */
  const community = $('.community');
  if (community) {
    gsap.fromTo(
      community,
      { scale: 0.94, borderRadius: '28px' },
      {
        scale: 1,
        borderRadius: '0px',
        ease: 'none',
        scrollTrigger: { trigger: community, start: 'top 92%', end: 'top 40%', scrub: 0.6 },
      }
    );
  }

  /* ---- horizontal rules draw themselves in ---- */
  $$('.rule').forEach((rule) => {
    gsap.fromTo(
      rule,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.4,
        ease: 'expo.inOut',
        scrollTrigger: { trigger: rule, start: 'top 96%', once: true },
      }
    );
  });

  onResize(() => ScrollTrigger.refresh());
}
