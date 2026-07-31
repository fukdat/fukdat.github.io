"""
Генератор фонового коллажа для секции CodeDM: плитки рваной бумаги.
Запуск: python tools/paper.py  ->  assets/img/paper.svg

Фигуры считаются один раз и кладутся в репозиторий как статика —
на странице нет ни SVG-фильтров, ни рантайм-генерации.
"""
import random

random.seed(11)

W = H = 1200
BLEED = 60          # плитки заходят за края, чтобы блок не имел рваной рамки
STEP = 19           # шаг точки вдоль рваного края
AMP = 3.2           # амплитуда «разрыва»

TONES = [
    '#f5f3ee', '#efede6', '#e9e7de', '#f8f7f4', '#f1efe8',
    '#edebf1', '#e9eff1', '#f3eced', '#e6e4db', '#f4f2ec',
]


def edge(x1, y1, x2, y2):
    """Точки вдоль отрезка с перпендикулярным шумом — край рваной бумаги."""
    dx, dy = x2 - x1, y2 - y1
    length = (dx * dx + dy * dy) ** 0.5
    n = max(2, int(length / STEP))
    nx, ny = -dy / length, dx / length      # нормаль к краю
    pts = []
    for i in range(n):
        t = i / n
        off = random.uniform(-AMP, AMP) + random.uniform(-AMP, AMP)
        pts.append((x1 + dx * t + nx * off, y1 + dy * t + ny * off))
    return pts


def tile_path(x, y, w, h):
    pts = (edge(x, y, x + w, y) + edge(x + w, y, x + w, y + h) +
           edge(x + w, y + h, x, y + h) + edge(x, y + h, x, y))
    d = 'M' + ' L'.join(f'{px:.0f},{py:.0f}' for px, py in pts) + ' Z'
    return d


def layout():
    """Кирпичная раскладка со сбитыми рядами — как в исходном логотипе."""
    tiles = []
    y = -BLEED
    while y < H + BLEED / 2:
        row_h = random.uniform(190, 330)
        x = -BLEED - random.uniform(0, 120)
        while x < W + BLEED / 2:
            col_w = random.uniform(230, 420)
            # ряды слегка «дышат» по вертикали
            dy = random.uniform(-14, 14)
            tiles.append((x, y + dy, col_w, row_h + random.uniform(-18, 18)))
            x += col_w - random.uniform(2, 10)   # плитки почти встык, местами внахлёст
        y += row_h - random.uniform(2, 12)
    return tiles


def main():
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'preserveAspectRatio="xMidYMid slice" role="presentation">',
        f'<rect width="{W}" height="{H}" fill="#f2f0ea"/>',
    ]
    for x, y, w, h in layout():
        d = tile_path(x, y, w, h)
        # мягкая тень под плиткой даёт ощущение наклеенных слоёв
        parts.append(f'<path d="{d}" fill="rgba(15,16,19,.055)" transform="translate(4,5)"/>')
        parts.append(f'<path d="{d}" fill="{random.choice(TONES)}" '
                     f'stroke="rgba(15,16,19,.035)" stroke-width=".8"/>')
    parts.append('</svg>')

    svg = ''.join(parts)
    with open('assets/img/paper.svg', 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f'assets/img/paper.svg — {len(svg) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
