/* ------------------------------------------------------------
   grid.js — hero backdrop: a field of hairline crosses that
   bends around the pointer and drifts on its own. Canvas 2D,
   ~300 points, so it stays cheap on every device.
   ------------------------------------------------------------ */
import { $, reduced, coarse } from '../lib/utils.js';

export function initGrid() {
  const canvas = $('#heroGrid');
  if (!canvas || reduced) {
    canvas?.remove();
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  const STEP = 58;
  const RADIUS = 190;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let points = [];
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

  function build() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    points = [];
    for (let y = STEP / 2; y < h; y += STEP) {
      for (let x = STEP / 2; x < w; x += STEP) {
        points.push({ x, y, seed: Math.random() * Math.PI * 2 });
      }
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;

    const t = time * 0.00035;
    ctx.lineCap = 'round';

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const drift = Math.sin(t + p.seed) * 1.6;
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      const near = dist < RADIUS ? 1 - dist / RADIUS : 0;
      const push = near * near * 26;
      const a = Math.atan2(dy, dx);

      const x = p.x + Math.cos(a) * push + drift;
      const y = p.y + Math.sin(a) * push + drift;
      const size = 3 + near * 7;

      ctx.strokeStyle = `rgba(11,11,11,${0.09 + near * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();
    }
  }

  build();

  let running = false;
  const start = () => {
    if (running) return;
    running = true;
    gsap.ticker.add(draw);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    gsap.ticker.remove(draw);
  };
  start();

  if (!coarse) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const r = canvas.getBoundingClientRect();
        pointer.tx = e.clientX - r.left;
        pointer.ty = e.clientY - r.top;
      },
      { passive: true }
    );
  }

  // pause the loop once the hero is out of sight
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: ({ isActive }) => (isActive ? start() : stop()),
  });

  let rw = window.innerWidth;
  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth === rw) return;
      rw = window.innerWidth;
      build();
    },
    { passive: true }
  );
}

export function initProgress(lenis) {
  const bar = $('#progress i');
  if (!bar) return;
  const set = gsap.quickSetter(bar, 'scaleX');
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    set(max > 0 ? Math.min(1, window.scrollY / max) : 0);
  };
  if (lenis) lenis.on('scroll', update);
  else window.addEventListener('scroll', update, { passive: true });
  update();
}
