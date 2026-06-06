# План обучения — от текущего уровня до уверенного прохождения собесов

## Контекст

**Кто я:** Вадим (fukdat) — Python/React Native разработчик  
**Стек:** Python, FastAPI, aiogram, React Native, Expo, TypeScript, PostgreSQL, Docker, Railway, Gemini API  
**Опыт:** Только фриланс, официальной работы не было  
**Цель:** Удалённая работа, от 150k руб. или эквивалент в валюте  
**Формат:** Full-time, Part-time, Контракт — любое  

**Проекты (уже в продакшне):**
- Nail Salon Bot — Python, aiogram, SQLite, Gemini Flash, Railway (живой, реальные клиенты)
- Job Market Analyzer — FastAPI, PostgreSQL, Chart.js (парсер + AI-генерация откликов)
- VPN Telegram Bot — Python, Cloudflare Workers, VLESS
- Demo Nail Salon Bot — Python, aiogram, Gemini Flash

**Правило #1:** Отклики начинаю с Дня 1, параллельно с учёбой. Не "сначала выучу, потом пойду на собес". Прямо сейчас.

---

## НЕДЕЛЯ 1 — Python Core

> Это то, что спрашивают на каждом собесе у backend-разработчика

| День | Тема | Задание |
|------|------|---------|
| **1** | Data types | list/dict/set/tuple — методы, разница, mutability vs immutability. Написать 10 примеров кода. |
| **2** | OOP — основы | `__init__`, `__str__`, `__repr__`, instance vs class variables. Написать 3 класса с нуля. |
| **3** | OOP — наследование | `super()`, полиморфизм, абстрактные классы (`ABC`). 5 задач. |
| **4** | Декораторы | Что такое и как работает. Написать 3 декоратора с нуля. `functools.wraps`. Очень часто спрашивают! |
| **5** | Generators & iterators | `yield` vs `return`, generator expressions, `itertools`. Написать свой `range`. |
| **6** | async/await | `asyncio`, event loop, `async def`, `await`. Написать async-функцию. |
| **7** | Повторение + LeetCode | Повторить всё. LeetCode Easy: Two Sum, Reverse String, Contains Duplicate, Valid Anagram, FizzBuzz. |

**Ресурс:** [stepik.org — Python поколения Z](https://stepik.org/course/58852) (бесплатно)

---

## НЕДЕЛЯ 2 — SQL

> Критично для любой backend-вакансии. Без SQL на собес идти нельзя.

| День | Тема | Задание |
|------|------|---------|
| **8** | SELECT, WHERE, ORDER BY | [sqlbolt.com](https://sqlbolt.com) уроки 1–8 (бесплатно, интерактивно) |
| **9** | JOINs | INNER, LEFT, RIGHT JOIN. 10 задач на [pgexercises.com](https://pgexercises.com) |
| **10** | GROUP BY, агрегаты | COUNT, SUM, AVG, HAVING, подзапросы. 10 задач. |
| **11** | Индексы, транзакции | Что такое индекс и зачем. ACID. BEGIN/COMMIT/ROLLBACK. |
| **12** | Python exceptions | try/except/finally, custom exceptions, context managers (`with`, `__enter__`/`__exit__`). |
| **13** | Type hints + Pydantic | type hints, mypy, pydantic models (уже знаешь через FastAPI — углуби). |
| **14** | Повторение + LeetCode | 5 LeetCode Easy: Best Time to Buy Stock, Maximum Subarray, Palindrome Number, Climbing Stairs, Valid Parentheses. |

---

## НЕДЕЛЯ 3 — FastAPI Advanced + Testing

> Это твои козыри. Углубляем и добавляем тесты — это большой плюс на собесе.

| День | Тема | Задание |
|------|------|---------|
| **15** | JWT Auth в FastAPI | OAuth2PasswordBearer, токены, защищённые эндпоинты. Добавить auth в любой проект. |
| **16** | Middleware + CORS + ошибки | Custom middleware, exception handlers, структура ответов. |
| **17** | pytest — основы | unit tests, fixtures, parametrize. Написать 10 тестов для своего кода. |
| **18** | Тестирование API | FastAPI TestClient + httpx. Тесты для Job Analyzer. |
| **19** | Docker + docker-compose | Dockerfile для FastAPI + PostgreSQL через docker-compose. Задеплоить локально. |
| **20** | Redis — кэширование | Зачем Redis. Простое кэширование запросов в FastAPI. |
| **21** | Повторение + LeetCode Medium | 3 задачи Medium. Behavioral: записать вслух "расскажи о себе" (3 минуты). |

---

## НЕДЕЛЯ 4 — Алгоритмы

> То, что дают на техническом собесе. Не надо быть гением — надо знать паттерны.

| День | Тема | Задание |
|------|------|---------|
| **22** | Big O нотация | O(1), O(n), O(n²), O(log n). Анализировать свой старый код. |
| **23** | Arrays + Two Pointers | 5 задач LeetCode: паттерн Two Pointers. |
| **24** | Hash Maps | 5 задач: Group Anagrams, Top K Frequent Elements. |
| **25** | Binary Search | Логика + 5 задач: Binary Search, Search Insert Position. |
| **26** | Стеки и очереди | Реализовать Stack и Queue с нуля. Valid Parentheses, Min Stack. |
| **27** | Linked Lists | Написать LinkedList с нуля. Reverse Linked List, Merge Two Lists. |
| **28** | LeetCode марафон | 10 смешанных Easy/Medium за день. Таймер 20 мин на задачу. |

**Ресурс:** [neetcode.io](https://neetcode.io) — лучший бесплатный роадмап по алгоритмам

---

## НЕДЕЛЯ 5 — Подготовка к собесу

> Технические знания есть. Теперь учимся их продавать.

| День | Тема | Задание |
|------|------|---------|
| **29** | REST best practices | HTTP коды (200/201/400/401/403/404/500), idempotency, версионирование API. |
| **30** | Git advanced | Rebase vs merge, squash commits, PR workflow, Git flow. |
| **31** | Системный дизайн (основы) | Load balancer, CDN, cache, horizontal vs vertical scaling. Понять концепции. |
| **32** | Поведенческие вопросы | Написать скрипты на: "расскажи о себе", "расскажи о проекте", "как решал проблему". |
| **33** | Мок-собес — Python | Запись на видео. Вслух отвечать на 30 типичных Python-вопросов (список ниже). |
| **34** | Мок-собес — Проекты | Объяснить каждый проект за 2–3 минуты. Архитектура, проблемы, решения. |
| **35** | Полный мок-собес | Алгоритм (30 мин) + Python (20 мин) + SQL (10 мин) + проекты (20 мин). |

---

## НЕДЕЛЯ 6 — Активный поиск + React Native

| День | Тема | Задание |
|------|------|---------|
| **36** | React Native interview prep | Component lifecycle, useState, useEffect, props vs state. |
| **37** | State management | Context API + Zustand (базово). React Navigation. |
| **38** | Презентация портфолио | Для каждого проекта: что делает, стек, проблема, решение, результат. |
| **39** | Массовая рассылка | 20+ откликов hh.ru, 10+ Хабр Карьера, 5+ Upwork proposals. |
| **40** | English prep | "Tell me about yourself" и описание каждого проекта — вслух на английском. |
| **41** | Повторение | Быстрый прогон всех тем. Ответить на все 30 вопросов ниже. |
| **42** | День X | Продолжаю откликаться, иду на собесы, зарабатываю деньги. |

---

## 30 вопросов — Python Junior/Middle собес

> Распечатать. Проверять себя каждую неделю. К концу плана знать все наизусть.

### Python

1. Что такое декоратор? Напишите простой.
2. Разница между `list` и `tuple`?
3. Что такое генератор? `yield` vs `return`?
4. Как работает GIL?
5. Разница между `==` и `is`?
6. Что такое `*args` и `**kwargs`?
7. Mutable vs immutable типы — примеры?
8. Что такое контекстный менеджер (`with`)?
9. Как работает наследование в Python?
10. Что такое `@staticmethod` и `@classmethod`?
11. List comprehension vs `map`/`filter`?
12. Что такое `lambda`?
13. Как работает `async`/`await`?
14. Что такое `__init__` и `__new__`?
15. Разница `copy()` и `deepcopy()`?

### SQL

16. Разница `INNER JOIN` и `LEFT JOIN`?
17. Что такое индекс и зачем он нужен?
18. Что такое транзакция? Что такое ACID?
19. `GROUP BY` vs `WHERE`?
20. Написать запрос: топ-5 клиентов по сумме заказов?

### FastAPI / Backend

21. Что такое REST? Основные HTTP методы?
22. Разница между ошибками 400 и 500?
23. Что такое JWT и как работает?
24. Как работает dependency injection в FastAPI?
25. Что такое Pydantic и зачем использовать?

### Алгоритмы

26. Что такое Big O? Чем O(n) отличается от O(n²)?
27. Как найти дубликаты в списке? (два способа)
28. Как перевернуть строку? (три способа в Python)
29. Почему поиск в `dict` быстрее чем в `list`?
30. Написать бинарный поиск с нуля.

---

## Резюме для hh.ru

**Желаемая должность:** `Python Developer / Fullstack Developer`  
**Зарплата:** `от 150 000 руб.`  
**Занятость:** Полная занятость, проектная работа, частичная занятость  
**График:** Удалённая работа  

### О себе

```
Python-разработчик с опытом создания и деплоя продакшн-проектов.
Специализируюсь на бэкенде (Python, FastAPI) и мобильной разработке
(React Native, Expo). Разрабатываю Telegram-ботов, REST API, интегрирую
AI. Умею самостоятельно вести проект от идеи до деплоя.

Открыт к удалённой работе full-time или по контракту.
```

### Опыт работы

```
Фриланс-разработчик | 2023 — настоящее время
Самозанятый / ИП

— Production Telegram-бот для салона (Python, aiogram, SQLite, Gemini Flash,
  Railway). Работает с реальными клиентами.

— Парсер вакансий с AI-генерацией откликов под HH.ru, FL.ru, Upwork, Kwork
  (FastAPI, PostgreSQL, Chart.js).

— Telegram-бот для раздачи VPN-конфигов (Python, Cloudflare Workers, VLESS).

— Мобильные приложения на React Native + Expo + TypeScript.

Технологии: Python · FastAPI · aiogram · React Native · Expo · TypeScript ·
PostgreSQL · SQLite · Docker · Railway · Gemini API · Git
```

### Ключевые навыки (для hh.ru)

```
Python · FastAPI · aiogram · React Native · Expo · TypeScript ·
PostgreSQL · SQLite · Docker · REST API · Telegram Bot · Gemini API · Git · GitHub · Railway
```

---

## LinkedIn

**Headline:**
```
Python & React Native Developer | Telegram Bots | AI Integration | Remote
```

**About:**
```
Self-driven developer with production experience in Python backend
and React Native mobile development.

What I build:
• REST APIs with FastAPI
• Telegram bots with aiogram (production, real users)
• Mobile apps with React Native + Expo + TypeScript
• AI-powered features via Gemini API

Stack: Python · FastAPI · aiogram · React Native · Expo · TypeScript · PostgreSQL · Docker · Railway

Open to remote full-time or contract work worldwide.
📬 t.me/fukdat
```

---

## Upwork

**Title:**
```
Python Backend & React Native Developer | Telegram Bots | AI Integration
```

**Description:**
```
I build production-ready backends and mobile apps. My work is live —
not just side projects collecting dust.

WHAT I DO:
✅ Python APIs with FastAPI — clean, documented, deployed
✅ Telegram bots with aiogram — appointment systems, VPN, payments
✅ React Native mobile apps with Expo & TypeScript
✅ AI integrations (Gemini API, automated content generation)
✅ PostgreSQL / SQLite, Docker, Railway deployment

RECENT WORK:
• Nail salon booking bot — live in production, handling real appointments
• Job market analyzer — parses HH.ru, Upwork, Kwork; AI writes cover letters
• VPN distribution bot — VLESS + Cloudflare Workers

Available for full-time remote work or hourly contracts.
Portfolio: fukdat.github.io
```

---

## Где искать работу

### Россия (рубли)
- **hh.ru** — основная площадка, резюме + отклики ежедневно
- **Хабр Карьера** — продуктовые компании, платят лучше
- **Telegram:** `@python_jobs`, `@reactnative_jobs`, `@it_rabota`, `@remote_ru`

### СНГ (тенге/доллары, часто выше рублёвых ставок)
- **djinni.co** — популярно в Украине/СНГ
- **Telegram:** `@jobs_tashkent`, казахстанские IT-каналы

### Международка
- **Upwork** — hourly contracts, Python/Telegram ниша
- **LinkedIn** — Open to Work, фильтр Remote
- **Otta.com**, **Remote.co** — европейские удалённые роли

---

## Ежедневный минимум

- **5 откликов в день** на hh.ru (с Дня 1)
- **1–2 Upwork proposal** в неделю
- **30 мин LeetCode** каждый день (без исключений)
- **1.5–2 часа теории** по расписанию выше

---

## Бесплатные ресурсы

| Что | Ссылка |
|-----|--------|
| SQL интерактивно | [sqlbolt.com](https://sqlbolt.com) |
| SQL задачи | [pgexercises.com](https://pgexercises.com) |
| Алгоритмы | [neetcode.io](https://neetcode.io) |
| LeetCode | [leetcode.com](https://leetcode.com) |
| Python курс | [stepik.org/course/58852](https://stepik.org/course/58852) |
| FastAPI docs | [fastapi.tiangolo.com](https://fastapi.tiangolo.com) |
| Mock interviews | [pramp.com](https://pramp.com) |
| Книга по алгоритмам | "Грокаем алгоритмы" — Адитья Бхаргава |

---

*Портфолио: [fukdat.github.io](https://fukdat.github.io) · Telegram: [@fukdat](https://t.me/fukdat) · GitHub: [github.com/fukdat](https://github.com/fukdat)*
