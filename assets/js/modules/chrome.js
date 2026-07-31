/* ------------------------------------------------------------
   chrome.js — page furniture: auto-hiding nav, live clock,
   current year, project row hover physics.
   ------------------------------------------------------------ */
import { $, $$, reduced } from '../lib/utils.js';

export function initNav(lenis) {
  const nav = $('#nav');
  if (!nav) return;
  let last = 0;

  const update = (y) => {
    const down = y > last && y > 260;
    nav.classList.toggle('is-hidden', down);
    nav.classList.toggle('is-stuck', y > 40);
    last = y;
  };

  if (lenis) lenis.on('scroll', ({ scroll }) => update(scroll));
  else window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
}

export function initClock() {
  const el = $('#clock');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Moscow',
  });
  const tick = () => (el.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 1000);
}

export function initYear() {
  const y = String(new Date().getFullYear());
  $$('#yr, .yr').forEach((el) => (el.textContent = y));
}

/** Slight skew while a project row slides — subtle, not cartoonish. */
export function initWorkHover() {
  if (reduced) return;
  $$('.work__row').forEach((row) => {
    const body = row.querySelector('.work__body');
    if (!body) return;
    row.addEventListener('mouseenter', () =>
      gsap.to(body, { skewX: -2.4, duration: 0.45, ease: 'expo.out' })
    );
    row.addEventListener('mouseleave', () =>
      gsap.to(body, { skewX: 0, duration: 0.75, ease: 'elastic.out(1, 0.6)' })
    );
  });
}
