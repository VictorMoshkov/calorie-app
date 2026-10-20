# Как убрать геморрой с localtunnel

Сейчас Mini App открывается через **временный туннель** (`loca.lt`). Он часто падает (503), меняет ссылку и показывает страницу с IP.

**Решение:** один раз выложить папку `frontend` в интернет на **постоянный адрес**.  
Тогда **serve** и **localtunnel** больше не нужны.

---

## Вариант 1 — Cloudflare Pages (рекомендую, бесплатно)

1. Зарегистрируйтесь на https://dash.cloudflare.com/
2. **Workers & Pages** → **Create** → **Pages** → **Upload assets**
3. Перетащите **всё содержимое** папки `frontend` (файлы `index.html`, `style.css`, `app.js`)
4. Нажмите **Deploy**
5. Скопируйте ссылку вида: `https://ваш-проект.pages.dev`

### Настройка бота (один раз)

В `backend\.env`:

```
WEBAPP_URL=https://ваш-проект.pages.dev
```

В **BotFather** → ваш бот → **Configure Mini App** → та же ссылка.

Перезапустите бота: `python bot.py`

---

## Вариант 2 — Vercel (тоже бесплатно)

В PowerShell:

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app\frontend
npx vercel login
npx vercel --prod
```

Скопируйте выданный `https://....vercel.app` в `.env` и BotFather, как выше.

---

## Как будет выглядеть обычный день

| Раньше (туннель) | После хостинга |
|------------------|----------------|
| serve + localtunnel + бот | **только бот** |
| Менять ссылку в .env | Ссылка **не меняется** |
| 503, IP-страница | Открывается сразу |

1. Включить **NashVPN** на ПК  
2. `python bot.py`  
3. В Telegram: `/start` → открыть калькулятор  

Окна `serve` и `localtunnel` **можно не запускать**.

---

## Если захотите, чтобы бот работал без ПК

Тогда бота тоже нужно выложить в облако (Render, Railway и т.д.).  
Для начала достаточно постоянного хостинга **только для frontend**.
