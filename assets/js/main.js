/* ------------------------------------------------------------
   main.js — boots the site once GSAP is on the page.
   Every visual enhancement is additive: without JS the markup
   still reads as a complete document.
   ------------------------------------------------------------ */
import { waitFor, reduced } from './lib/utils.js';
import { runPreloader } from './modules/preloader.js';
import { initSmoothScroll } from './modules/smooth-scroll.js';
import { initCursor, initMagnetic, initPeek } from './modules/cursor.js';
import { prepareText, initReveal } from './modules/reveal.js';
import { playHero } from './modules/hero.js';
import { initMarquee } from './modules/marquee.js';
import { initNav, initClock, initYear, initWorkHover } from './modules/chrome.js';
import { initBackdrop, initProgress } from './modules/backdrop.js';
import { initViz } from './modules/viz.js';
import { initScramble, initSkew, initTilt, initLetterWave, initTornTitle } from './modules/effects.js';

document.documentElement.classList.add('js');

/** Last resort: never leave the page hidden behind an animation that failed. */
function bail() {
  document.documentElement.classList.remove('js');
  document.getElementById('loader')?.remove();
  document.body.classList.remove('is-loading');
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    el.style.opacity = '1';
    el.style.filter = 'none';
    el.style.transform = 'none';
  });
}

(async function boot() {
  try {
    await start();
  } catch (err) {
    console.error('[boot]', err);
    bail();
  }
})();

async function start() {
  initYear();
  initClock();

  const ready = await waitFor(() => window.gsap && window.ScrollTrigger);
  if (!ready) {
    bail(); // libraries blocked — show everything, keep the site usable
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'expo.out' });

  const splitMap = prepareText();
  const lenis = initSmoothScroll();

  initNav(lenis);
  initCursor();
  initMagnetic();
  initPeek();
  initWorkHover();
  initMarquee(lenis);
  initReveal(splitMap);
  initBackdrop();
  initProgress(lenis);
  initScramble();
  initSkew(lenis);
  initTilt();
  initLetterWave();
  initTornTitle();
  initViz();

  await runPreloader();
  playHero(splitMap);

  if (!reduced) ScrollTrigger.refresh();
}
