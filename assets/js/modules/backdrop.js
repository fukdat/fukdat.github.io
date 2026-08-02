/* ------------------------------------------------------------
   backdrop.js — облако точек вместо декоративной сетки: камера
   медленно едет сквозь отсканированное пространство. Рисуем в
   маленький буфер попиксельно и растягиваем без сглаживания —
   отсюда крупное «дизерное» зерно, а не гладкий градиент.
   ------------------------------------------------------------ */
import { $, reduced, coarse } from '../lib/utils.js';

const DEPTH = 26;        // глубина сцены до заворота точек
const FOCAL = 0.8;       // фокусное: чем меньше, тем шире угол
const FADE = 22;         // с какой глубины точки гаснут

export function initBackdrop() {
  const canvas = $('#heroGrid');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const buffer = document.createElement('canvas');
  const bctx = buffer.getContext('2d', { alpha: true, willReadFrequently: true });

  let w = 0;
  let h = 0;
  let bw = 0;
  let bh = 0;
  let img = null;
  let pix = null;
  let points = [];
  let camZ = 0;
  const aim = { x: 0, y: 0 };
  const cam = { x: 0, y: 0 };

  /** Точки складываются в пол, стены и стеллажи — читается как помещение. */
  function build() {
    const rect = canvas.getBoundingClientRect();
    // на старте, до раскладки шрифтов, размеры бывают мусорные — ждём ResizeObserver
    if (rect.width < 80 || rect.height < 80) return;
    if (Math.abs(rect.width - w) < 1 && Math.abs(rect.height - h) < 1) return;
    w = rect.width;
    h = rect.height;

    // буфер вдвое мельче экрана: и быстрее, и зерно крупнее
    const scale = coarse ? 0.34 : 0.46;
    bw = Math.round(w * scale);
    bh = Math.round(h * scale);
    canvas.width = bw;
    canvas.height = bh;
    buffer.width = bw;
    buffer.height = bh;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    img = bctx.createImageData(bw, bh);
    pix = new Uint32Array(img.data.buffer);

    const step = coarse ? 0.34 : 0.22;   // шаг сканирования
    points = [];

    const put = (x, y, z, life) => points.push({ x, y, z, life });
    const jit = (v) => (Math.random() - 0.5) * v;

    // пол: регулярная сетка — именно она сходится в точку схода и читается
    // как пространство, а не как случайные искры
    for (let z = 0.6; z < DEPTH; z += step) {
      for (let x = -7; x <= 7; x += step * 1.6) {
        if (Math.random() < 0.07) continue;                  // выпадения скана
        put(x + jit(0.05), 1.4 + jit(0.035), z + jit(0.05), 0.7 + Math.random() * 0.3);
      }
    }

    // свод: дуга над головой, реже и тусклее пола
    for (let z = 0.6; z < DEPTH; z += step * 1.7) {
      for (let x = -6.5; x <= 6.5; x += step * 2.1) {
        if (Math.random() < 0.18) continue;
        const y = -1.5 - Math.cos(x / 5.2) * 0.75;
        put(x + jit(0.06), y + jit(0.05), z + jit(0.06), 0.42 + Math.random() * 0.3);
      }
    }

    // стеллажи по бокам: секции с проходами и подсвеченными полками
    for (let side = -1; side <= 1; side += 2) {
      for (let z = 0.8; z < DEPTH; z += step * 0.9) {
        if (z % 4.4 > 3.2) continue;                         // проходы между секциями
        for (let y = -1.35; y < 1.4; y += step * 0.85) {
          if (Math.random() < 0.18) continue;
          const shelf = Math.abs(((y + 1.35) % 0.62) - 0.05) < 0.07;
          put(side * (2.0 + jit(0.06)), y + jit(0.04), z + jit(0.05),
              (shelf ? 1 : 0.55) + Math.random() * 0.25);
        }
      }
    }

    // дальняя стена: даёт светящуюся глубину в конце прохода
    for (let x = -7; x <= 7; x += step * 1.5) {
      for (let y = -2.2; y < 1.4; y += step * 1.5) {
        if (Math.random() < 0.25) continue;
        put(x + jit(0.05), y + jit(0.05), DEPTH - 0.4 + jit(0.2), 0.3 + Math.random() * 0.25);
      }
    }

    // редкая взвесь: добавляет шум скана, но не превращает кадр в снег
    for (let i = 0; i < 700; i++) {
      put((Math.random() - 0.5) * 11, (Math.random() - 0.5) * 3, Math.random() * DEPTH,
          0.12 + Math.random() * 0.22);
    }
  }

  function draw() {
    if (!pix) return;
    pix.fill(0);

    cam.x += (aim.x - cam.x) * 0.045;
    cam.y += (aim.y - cam.y) * 0.045;

    camZ += reduced ? 0 : 0.012;
    const yaw = cam.x * 0.16;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = bw * 0.66;   // точка схода уведена вправо: слева живёт текст
    const cyc = bh * 0.46;
    const k0 = bh * FOCAL;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let z = p.z - camZ;
      z -= Math.floor(z / DEPTH) * DEPTH;      // бесконечный проезд вперёд
      if (z < 0.55) continue;

      const rx = p.x * cy - (z - DEPTH * 0.5) * sy;
      const rz = p.x * sy + (z - DEPTH * 0.5) * cy + DEPTH * 0.5;
      if (rz < 0.55) continue;

      const k = k0 / rz;
      const sx = (cx + rx * k) | 0;
      const sy2 = (cyc + (p.y - 0.12 + cam.y * 0.22) * k) | 0;
      if (sx < 0 || sx >= bw || sy2 < 0 || sy2 >= bh) continue;

      // яркость от глубины; дизер — вероятностный отсев дальних точек
      let a = (1 - (rz - 0.6) / FADE) * p.life;
      if (a <= 0.02 || Math.random() > a * 3.4) continue;
      if (a > 1) a = 1;

      const cold = 1 - a;                      // дальнее уходит в холодный синий
      const r = (236 - cold * 110) | 0;
      const g = (234 - cold * 96) | 0;
      const b = (228 - cold * 44) | 0;
      const al = (Math.min(1, a * 1.25) * 255) | 0;
      const rgba = (al << 24) | (b << 16) | (g << 8) | r;

      const idx = sy2 * bw + sx;
      pix[idx] = rgba;
      if (a > 0.55) {                          // ближние точки крупнее — глубина резкости
        if (sx + 1 < bw) pix[idx + 1] = rgba;
        if (sy2 + 1 < bh) pix[idx + bw] = rgba;
      }
    }

    bctx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    ctx.drawImage(buffer, 0, 0);
  }

  // размер берём у наблюдателя, а не у первого измерения: на старте
  // страница ещё перекладывается под шрифты и даёт мусорные значения
  const ro = new ResizeObserver(() => {
    build();
    draw();
  });
  ro.observe(canvas);

  build();
  draw();

  if (reduced) return; // статичный кадр — этого достаточно

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
        aim.x = (e.clientX / window.innerWidth - 0.5) * 2;
        aim.y = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );
  }

  // за пределами первого экрана цикл не крутится
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: ({ isActive }) => (isActive ? start() : stop()),
  });
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
