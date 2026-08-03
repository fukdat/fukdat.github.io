/* ------------------------------------------------------------
   viz.js — у каждой работы свой объект-скан справа от названия.
   Тот же приём, что и в фоне: точки в мелкий буфер, растяжение
   без сглаживания. Кадр считается только когда объект в зоне
   видимости и пока идёт наведение, иначе canvas просто стоит.
   ------------------------------------------------------------ */
import { $$, reduced, coarse } from '../lib/utils.js';

/** Четыре формы под четыре проекта — узнаваемые силуэты, не абстракция. */
const SHAPES = {
  // решётка данных: парсер вакансий
  lattice(push) {
    for (let x = -1; x <= 1; x += 0.1) {
      for (let y = -1; y <= 1; y += 0.1) {
        for (let z = -1; z <= 1; z += 0.5) {
          if (Math.random() < 0.35) continue;
          push(x, y, z, 0.35 + Math.random() * 0.65);
        }
      }
    }
  },
  // тор: цикл записи и напоминаний
  torus(push) {
    for (let i = 0; i < 4200; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const r = 0.42 + Math.cos(v) * 0.2;
      push(Math.cos(u) * r, Math.sin(v) * 0.2, Math.sin(u) * r, 0.4 + Math.random() * 0.6);
    }
  },
  // сфера-оболочка: сеть и туннели
  shell(push) {
    for (let i = 0; i < 4000; i++) {
      const t = Math.acos(2 * Math.random() - 1);
      const p = Math.random() * Math.PI * 2;
      const r = 0.62 + (Math.random() - 0.5) * 0.06;
      push(Math.sin(t) * Math.cos(p) * r, Math.cos(t) * r, Math.sin(t) * Math.sin(p) * r,
           0.3 + Math.random() * 0.7);
    }
  },
  // волна: диалоговый сценарий
  wave(push) {
    for (let x = -1; x <= 1; x += 0.028) {
      for (let z = -1; z <= 1; z += 0.09) {
        push(x, Math.sin(x * 4.2 + z * 2.6) * 0.24, z, 0.3 + Math.random() * 0.7);
      }
    }
  },
};

const ORDER = ['lattice', 'torus', 'shell', 'wave'];

export function initViz() {
  const rows = $$('.work__row');
  if (!rows.length) return;

  rows.forEach((row, i) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'work__viz';
    canvas.setAttribute('aria-hidden', 'true');
    row.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    const buffer = document.createElement('canvas');
    const bctx = buffer.getContext('2d', { alpha: true, willReadFrequently: true });

    const pts = [];
    SHAPES[ORDER[i % ORDER.length]]((x, y, z, life) => pts.push({ x, y, z, life }));

    let bw = 0;
    let bh = 0;
    let img = null;
    let pix = null;
    let spin = i * 1.4;
    let speed = 0.0016;

    function size() {
      const r = canvas.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) return false;
      const s = coarse ? 0.3 : 0.4;
      bw = Math.round(r.width * s);
      bh = Math.round(r.height * s);
      canvas.width = bw;
      canvas.height = bh;
      buffer.width = bw;
      buffer.height = bh;
      img = bctx.createImageData(bw, bh);
      pix = new Uint32Array(img.data.buffer);
      return true;
    }

    function draw() {
      if (!pix) return;
      pix.fill(0);
      spin += speed;

      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      const tilt = 0.42;
      const scale = Math.min(bw, bh) * 1.05;
      const cx = bw * 0.5;
      const cy = bh * 0.5;

      for (let j = 0; j < pts.length; j++) {
        const p = pts[j];
        const rx = p.x * cs - p.z * sn;
        const rz = p.x * sn + p.z * cs;
        const ry = p.y * Math.cos(tilt) - rz * Math.sin(tilt);
        const dz = p.y * Math.sin(tilt) + rz * Math.cos(tilt);

        const k = scale / (2.6 + dz);
        const sx = (cx + rx * k) | 0;
        const sy = (cy + ry * k) | 0;
        if (sx < 0 || sx >= bw || sy < 0 || sy >= bh) continue;

        const depth = 1 - (dz + 1) / 2.4;          // ближе — ярче
        const a = p.life * (0.28 + depth * 0.72);
        if (Math.random() > a * 2.5) continue;

        const al = (Math.min(1, a) * 255) | 0;
        pix[sy * bw + sx] = (al << 24) | (228 << 16) | (234 << 8) | 236;
      }

      bctx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, bw, bh);
      ctx.drawImage(buffer, 0, 0);
    }

    new ResizeObserver(() => {
      if (size()) draw();
    }).observe(canvas);
    if (size()) draw();

    if (reduced) return;

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

    // крутится только пока строка на экране
    ScrollTrigger.create({
      trigger: row,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: ({ isActive }) => (isActive ? start() : stop()),
    });

    row.addEventListener('mouseenter', () => gsap.to({ v: speed }, {
      v: 0.012, duration: 0.6, ease: 'power2.out', onUpdate() { speed = this.targets()[0].v; },
    }));
    row.addEventListener('mouseleave', () => gsap.to({ v: speed }, {
      v: 0.0016, duration: 1.1, ease: 'power2.out', onUpdate() { speed = this.targets()[0].v; },
    }));
  });
}
