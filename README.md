# Калькулятор калорий — Telegram Mini App

Проект из двух частей:

- **backend** — Python-бот на aiogram (команда `/start` + кнопка WebApp)
- **frontend** — веб-интерфейс калькулятора (калории, БЖУ, добавление еды)

---

## Что понадобится заранее

1. Python и Node.js (у вас уже установлены).
2. Telegram-аккаунт.
3. [ngrok](https://ngrok.com/) — чтобы Telegram мог открыть ваш локальный сайт по HTTPS.

> Telegram Mini App работает **только по HTTPS**. Локальный `http://localhost` бот открыть не сможет — поэтому нужен ngrok.

---

## Шаг 1. Создайте бота в Telegram

1. Откройте [@BotFather](https://t.me/BotFather).
2. Отправьте `/newbot`, придумайте имя и username.
3. Скопируйте **токен** (выглядит как `123456:ABC-DEF...`).

---

## Шаг 2. Установите зависимости бэкенда

Откройте терминал в папке проекта и выполните:

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Создайте файл `.env` (скопируйте из примера):

```powershell
copy .env.example .env
```

Откройте `.env` в редакторе и вставьте токен:

```
BOT_TOKEN=вставьте_токен_от_BotFather
WEBAPP_URL=пока_оставьте_как_есть
```

`WEBAPP_URL` заполним после запуска ngrok.

---

## Шаг 3. Запустите фронтенд (локальный сайт)

Откройте **второй** терминал:

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app\frontend
npx --yes serve -l 3000
```

Сайт будет доступен по адресу: http://localhost:3000

---

## Шаг 4. Откройте HTTPS-туннель через ngrok

Установите ngrok (если ещё нет): https://ngrok.com/download  
Зарегистрируйтесь и выполните `ngrok config add-authtoken ВАШ_ТОКЕН` (токен есть в личном кабинете ngrok).

Откройте **третий** терминал:

```powershell
ngrok http 3000
```

Скопируйте HTTPS-ссылку вида `https://xxxx.ngrok-free.app`.

Вставьте её в `backend/.env`:

```
WEBAPP_URL=https://xxxx.ngrok-free.app
```

---

## Шаг 5. Запустите бота

В первом терминале (где активирован `.venv`):

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app\backend
.\.venv\Scripts\Activate.ps1
python bot.py
```

Должно появиться: `Бот запущен. Нажми Ctrl+C чтобы остановить.`

---

## Шаг 6. Проверьте в Telegram

1. Найдите своего бота в Telegram.
2. Нажмите **Start** (или отправьте `/start`).
3. Нажмите кнопку **«Открыть калькулятор»**.
4. Откроется Mini App — можно добавлять еду и смотреть калории/БЖУ.

---

## Структура проекта

```
calorie-app/
├── backend/
│   ├── bot.py              # логика бота
│   ├── requirements.txt    # Python-зависимости
│   ├── .env.example        # образец настроек
│   └── .env                # ваши секреты (не коммитьте)
├── frontend/
│   ├── index.html          # разметка
│   ├── style.css           # стили
│   └── app.js              # логика калькулятора
└── README.md
```

---

## Без localtunnel (постоянная ссылка)

Если надоело менять ссылку и ловить 503 — см. **[HOSTING-PROSTO.md](HOSTING-PROSTO.md)**  
(Cloudflare Pages / Vercel: один раз залить `frontend`, больше не нужны serve и туннель).

---

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| `BOT_TOKEN not found` | Проверьте, что файл `backend/.env` существует и токен заполнен |
| Кнопка не открывает Mini App | `WEBAPP_URL` должен начинаться с `https://` (ссылка ngrok) |
| ngrok показывает warning-страницу | Нажмите «Visit Site» один раз в браузере |
| PowerShell не запускает Activate | Выполните: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

---

## Как остановить всё

В каждом терминале нажмите `Ctrl+C`.
