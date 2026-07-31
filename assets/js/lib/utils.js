/* ------------------------------------------------------------
   utils.js — tiny helpers shared by every module.
   ------------------------------------------------------------ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** Resolve once `test()` is truthy, or after `timeout` ms (resolves false). */
export function waitFor(test, timeout = 4000) {
  return new Promise((resolve) => {
    if (test()) return resolve(true);
    const started = performance.now();
    const tick = () => {
      if (test()) return resolve(true);
      if (performance.now() - started > timeout) return resolve(false);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Debounced resize listener that ignores mobile URL-bar height jitter. */
export function onResize(fn, wait = 180) {
  let t;
  let lastW = window.innerWidth;
  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(t);
      t = setTimeout(fn, wait);
    },
    { passive: true }
  );
}
