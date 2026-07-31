/* ------------------------------------------------------------
   preloader.js — counter + curtain lift. Resolves when done so
   the hero intro can start on an empty stage.
   ------------------------------------------------------------ */
import { $, reduced } from '../lib/utils.js';

export function runPreloader() {
  const loader = $('#loader');
  const num = $('#loaderNum');
  const bar = $('#loaderBar');
  document.body.classList.add('is-loading');

  const finish = () => {
    document.body.classList.remove('is-loading');
    loader?.classList.add('is-done');
  };

  // Nothing to animate against: no loader, reduced motion, or a hidden tab
  // (rAF is frozen there, so the curtain would never lift).
  if (!loader || reduced || document.hidden) {
    loader?.remove();
    finish();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(failsafe);
      finish();
      loader.remove();
      resolve();
    };
    // never trap the page behind the curtain
    const failsafe = setTimeout(done, 4500);

    const state = { v: 0 };
    const tl = gsap.timeline({ onComplete: done });

    tl.to(state, {
      v: 100,
      duration: 1.35,
      ease: 'power2.inOut',
      onUpdate: () => {
        const v = Math.round(state.v);
        num.textContent = String(v).padStart(3, '0');
        bar.style.width = v + '%';
      },
    })
      .to('.loader__inner', { yPercent: -18, opacity: 0, duration: 0.5, ease: 'power2.in' }, '-=0.1')
      .to(
        loader,
        { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' },
        '-=0.25'
      );
  });
}
