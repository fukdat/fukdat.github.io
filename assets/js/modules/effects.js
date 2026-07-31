/* ------------------------------------------------------------
   effects.js — the small details that make the page feel alive:
   glyph scramble, scroll-velocity skew, pointer tilt, letter wave.
   ------------------------------------------------------------ */
import { $$, reduced, coarse, clamp } from '../lib/utils.js';

const GLYPHS = '$#@%&*+=/\\<>[]{}0123456789';
const CYR = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ';

const randomGlyph = (source) =>
  /[а-яё]/i.test(source) ? CYR[(Math.random() * CYR.length) | 0] : GLYPHS[(Math.random() * GLYPHS.length) | 0];

/**
 * Decode-style text reveal: characters settle left to right while the
 * unresolved tail keeps flickering through random glyphs.
 */
function scramble(el, { duration = 0.6, delay = 0 } = {}) {
  const final = el.dataset.scrambleText || el.textContent;
  el.dataset.scrambleText = final;
  if (el._scrambling) el._scrambling.kill();

  const chars = [...final];
  const state = { p: 0 };
  el._scrambling = gsap.to(state, {
    p: 1,
    duration,
    delay,
    ease: 'power2.out',
    onUpdate: () => {
      const settled = Math.floor(state.p * chars.length);
      el.textContent = chars
        .map((ch, i) => (i < settled || ch === ' ' ? ch : randomGlyph(ch)))
        .join('');
    },
    onComplete: () => {
      el.textContent = final;
      el._scrambling = null;
    },
  });
}

export function initScramble() {
  if (reduced) return;

  // once, when the label scrolls into view
  $$('[data-scramble]').forEach((el) => {
    if (el.children.length) return; // text-only nodes: scrambling rewrites textContent
    ScrollTrigger.create({
      trigger: el,
      start: 'top 94%',
      once: true,
      onEnter: () => scramble(el, { duration: 0.55 }),
    });
  });

  // on hover, for anything interactive
  $$('[data-scramble-hover]').forEach((el) => {
    const target = el.querySelector('span') || el;
    if (!target.textContent.trim()) return;
    el.addEventListener('mouseenter', () => scramble(target, { duration: 0.45 }));
  });
}

/** The page leans a little into fast scrolling, then springs back. */
export function initSkew(lenis) {
  if (reduced || !lenis) return;
  const blocks = $$('[data-skew]');
  if (!blocks.length) return;

  const setters = blocks.map((b) => gsap.quickSetter(b, 'skewY', 'deg'));
  let target = 0;
  let current = 0;

  lenis.on('scroll', ({ velocity }) => {
    target = clamp(velocity * 0.055, -3, 3);
  });

  // one ticker, no per-frame tween churn
  gsap.ticker.add(() => {
    target *= 0.9; // decays to zero the moment scrolling stops
    current += (target - current) * 0.14;
    if (Math.abs(current) < 0.002) {
      if (current === 0) return;
      current = 0;
    }
    setters.forEach((set) => set(current));
  });
}

/** Media block tips towards the pointer — depth without a 3D library. */
export function initTilt() {
  if (reduced || coarse) return;

  $$('[data-tilt]').forEach((el) => {
    const inner = el.querySelector('.about__media-mask') || el;
    const rx = gsap.quickTo(inner, 'rotationX', { duration: 0.8, ease: 'power3' });
    const ry = gsap.quickTo(inner, 'rotationY', { duration: 0.8, ease: 'power3' });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - (r.left + r.width / 2)) / r.width) * 12);
      rx(((e.clientY - (r.top + r.height / 2)) / r.height) * -12);
    });
    el.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

/** Hovering a project sends a wave through the letters of its title. */
export function initLetterWave() {
  if (reduced || coarse) return;

  $$('.work__row').forEach((row) => {
    const chars = [...row.querySelectorAll('.work__title .sp-char')];
    if (!chars.length) return;

    row.addEventListener('mouseenter', () => {
      gsap.fromTo(
        chars,
        { yPercent: 0 },
        {
          yPercent: -16,
          duration: 0.34,
          ease: 'power2.out',
          stagger: { each: 0.012, from: 'start' },
          yoyo: true,
          repeat: 1,
          overwrite: true,
        }
      );
    });
  });
}
