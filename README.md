# $tripple$dallar$ — портфолио

Одностраничное портфолио разработчика. Статика без сборки: GitHub Pages отдаёт
репозиторий как есть.

**Прод:** https://fukdat.github.io/

## Стек

- HTML + CSS (собственная дизайн-система на CSS-переменных, без фреймворков)
- ES-модули без бандлера
- [GSAP](https://gsap.com/) + ScrollTrigger — вся анимация
- [Lenis](https://lenis.darkroom.engineering/) — плавный скролл, синхронизирован
  с тикером GSAP (один RAF-цикл на страницу)
- Шрифты: Geist Mono (дисплей/UI) и IBM Plex Mono (акцентная гарнитура) —
  обе с кириллицей, Google Fonts

## Структура

```
index.html
assets/
  css/main.css          дизайн-система + все секции
  img/portrait.jpg
  js/
    main.js             бутстрап
    lib/split.js        разбиение текста на слова/буквы в масках
    lib/utils.js        мелкие хелперы
    modules/
      preloader.js      счётчик + подъём шторки
      smooth-scroll.js  Lenis ↔ ScrollTrigger
      hero.js           вступительная анимация
      reveal.js         reveal / stagger / parallax / mask / счётчики
      cursor.js         курсор, magnetic-кнопки, превью проектов
      marquee.js        бесшовные бегущие строки
      grid.js           canvas-сетка в hero + прогресс скролла
      chrome.js         навигация, часы, hover проектов
khoumkafe/              отдельный лендинг (не трогать)
```

## Локальный запуск

```bash
python -m http.server 8125
```

Открыть http://localhost:8125.

## Принципы

- Без JS страница остаётся читаемой: анимации только добавляют.
- `prefers-reduced-motion: reduce` отключает движение целиком.
- Курсор, magnetic-эффекты и превью проектов не инициализируются на тач-устройствах.
