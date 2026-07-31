/* ------------------------------------------------------------
   marquee.js — seamless ticker. Content is duplicated until it
   overflows twice, then wrapped with a modifier so it never ends.
   Scroll velocity nudges the speed for a physical feel.
   ------------------------------------------------------------ */
import { $$, reduced } from '../lib/utils.js';

export function initMarquee(lenis) {
  const tracks = $$('[data-marquee]');
  if (!tracks.length) return;

  // measure after webfonts land, otherwise the loop length is wrong
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => build(tracks, lenis));
}

function build(tracks, lenis) {
  tracks.forEach((track) => {
    const original = track.innerHTML;
    const parentWidth = track.parentElement.offsetWidth || window.innerWidth;
    let guard = 0;
    while (track.scrollWidth < parentWidth * 2 && guard < 8) {
      track.innerHTML += original;
      guard++;
    }
    // one extra copy guarantees a gap-free wrap
    track.innerHTML += track.innerHTML;

    const half = track.scrollWidth / 2;
    if (reduced || !half) return;

    const dir = parseFloat(track.dataset.dir) || 1;
    const speed = parseFloat(track.dataset.speed) || 0.7;
    const wrap = gsap.utils.wrap(-half, 0);
    const state = { x: dir > 0 ? 0 : -half };

    const tween = gsap.to(state, {
      x: dir > 0 ? -half : 0,
      duration: half / (40 * speed),
      ease: 'none',
      repeat: -1,
      onUpdate: () => gsap.set(track, { x: wrap(state.x) }),
    });

    if (lenis) {
      lenis.on('scroll', ({ velocity }) => {
        const boost = gsap.utils.clamp(0.4, 4.5, 1 + Math.abs(velocity) * 0.035);
        gsap.to(tween, { timeScale: boost, duration: 0.5, overwrite: true });
      });
    }
  });
}
