# Запуск бота и Mini App (шпаргалка)

**24/7 без ПК (российский VPS):** пошагово в **[VPS-RU-24-7.md](VPS-RU-24-7.md)**.

## 1. Бот

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app\backend
.\.venv\Scripts\python.exe bot.py
```

VPN (**NashVPN**): включите **до** запуска бота. Без доступа к `api.telegram.org` команда **/start** не отвечает.

Проверка сети (PowerShell):

```powershell
curl.exe -4 --max-time 15 https://api.telegram.org
```

Должен ответить (не таймаут). Если таймаут — Nash другой сервер / вкл или выкл, в `.env` `PROXY_URL=socks5://...`.

Остановка бота: **Ctrl+C**.

## 2. ИИ на телефоне (второе окно)

```powershell
cloudflared tunnel --url http://localhost:8080
```

Скопируйте `https://….trycloudflare.com` → `PUBLIC_API_URL` в `backend\.env` → перезапуск бота.

## 3. Сайт

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app
git push
```

**BotFather Mini App:** `https://victormoshkov.github.io/calorie-app/?v=19`  
В Telegram: **/start**

## Проверка

- Внизу приложения: **Версия 19**
- Штрихкод: **+ Добавить** → **Сканировать штрихкод**
