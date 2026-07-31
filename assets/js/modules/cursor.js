/* ------------------------------------------------------------
   cursor.js — dot + trailing ring with contextual labels,
   magnetic buttons, and the project "peek" follower.
   ------------------------------------------------------------ */
import { $, $$, coarse, reduced } from '../lib/utils.js';

export function initCursor() {
  const cursor = $('#cursor');
  if (!cursor || coarse || reduced) {
    cursor?.remove();
    return;
  }

  const dot = $('.cursor__dot', cursor);
  const ring = $('.cursor__ring', cursor);
  const label = $('.cursor__label', cursor);

  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });

  let shown = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!shown) {
        shown = true;
        gsap.to(cursor, { opacity: 1, duration: 0.4 });
      }
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    },
    { passive: true }
  );

  document.addEventListener('mouseleave', () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));

  // hover states
  const hoverables = $$('a, button, [data-cursor], [data-magnetic]');
  hoverables.forEach((el) => {
    const text = el.dataset.cursor;
    el.addEventListener('mouseenter', () => {
      cursor.classList.add(text ? 'is-label' : 'is-active');
      if (text) label.textContent = text;
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-label', 'is-active');
      label.textContent = '';
    });
  });
}

export function initMagnetic() {
  if (coarse || reduced) return;

  $$('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.32;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.5)' });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

export function initPeek() {
  const peek = $('#peek');
  const rows = $$('[data-peek]');
  if (!peek || !rows.length || coarse || reduced) {
    peek?.remove();
    return;
  }

  const idx = $('.peek__idx', peek);
  const stack = $('.peek__stack', peek);
  const px = gsap.quickTo(peek, 'x', { duration: 0.75, ease: 'power3' });
  const py = gsap.quickTo(peek, 'y', { duration: 0.75, ease: 'power3' });
  const rot = gsap.quickTo(peek, 'rotation', { duration: 0.9, ease: 'power3' });

  let lastX = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      px(e.clientX + 28);
      py(e.clientY - 40);
      rot(gsap.utils.clamp(-9, 9, (e.clientX - lastX) * 0.5));
      lastX = e.clientX;
    },
    { passive: true }
  );

  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      idx.textContent = row.dataset.peek || '';
      stack.textContent = row.dataset.stack || '';
      gsap.killTweensOf(peek);
      gsap.fromTo(
        peek,
        { opacity: 0, scale: 0.85, clipPath: 'inset(0% 0% 100% 0%)' },
        { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.out' }
      );
    });
    row.addEventListener('mouseleave', () => {
      gsap.to(peek, { opacity: 0, scale: 0.9, duration: 0.35, ease: 'power2.out' });
    });
  });
}
