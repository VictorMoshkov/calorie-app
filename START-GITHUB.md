# Старт: GitHub + бесплатное облако

Два сервиса, оба бесплатно на старте:

| Часть | Где | Зачем |
|-------|-----|--------|
| **Калькулятор** (frontend) | **GitHub Pages** | Постоянная ссылка, без localtunnel |
| **Бот** (backend) | **Fly.io** | Работает 24/7 без вашего ПК |

---

## Часть 1 — Установить Git (если ещё нет)

Скачайте и установите: https://git-scm.com/download/win  
(или в PowerShell: `winget install Git.Git --source winget`)

Закройте и откройте PowerShell заново.

---

## Часть 2 — Репозиторий на GitHub

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app

git init -b main
git add .
git status
```

Убедитесь, что в списке **нет** `.env` и папки `.venv` (они в `.gitignore`).

```powershell
git commit -m "Calorie Mini App: bot and frontend"
```

Установите GitHub CLI (если нет): https://cli.github.com/

```powershell
gh auth login
```

Создайте репозиторий и отправьте код:

```powershell
gh repo create calorie-app --private --source=. --remote=origin --push
```

(`--public` вместо `--private`, если хотите открытый репозиторий.)

### Включить GitHub Pages

1. Откройте репозиторий на https://github.com  
2. **Settings** → **Pages**  
3. **Build and deployment** → Source: **GitHub Actions**  
4. Подождите 1–2 минуты: вкладка **Actions** → workflow **Deploy Mini App** должен стать зелёным  
5. Снова **Settings** → **Pages** — скопируйте ссылку вида:  
   `https://ВАШ_ЛОГИН.github.io/calorie-app/`

Это ваш **WEBAPP_URL**.

---

## Часть 3 — Бот на Fly.io

1. Регистрация: https://fly.io/app/sign-up  
2. Установите flyctl: https://fly.io/docs/hands-on/install-flyctl/  
3. В PowerShell:

```powershell
cd C:\Users\grot-\OneDrive\Desktop\calorie-app\backend
fly auth login
fly launch --no-deploy
```

На вопросы: имя приложения можно `calorie-bot`, регион `ams` (Амстердам).

Задайте секреты (подставьте свои значения):

```powershell
fly secrets set BOT_TOKEN="ваш_токен_от_BotFather" WEBAPP_URL="https://ВАШ_ЛОГИН.github.io/calorie-app/?v=12&api=https://calorie-bot.fly.dev" GROQ_API_KEY="ключ_с_console.groq.com"
fly deploy
```

---

## Часть 4 — BotFather

**Configure Mini App** → тот же URL, что `WEBAPP_URL`.

---

## Готово

- ПК, VPN и `python bot.py` **не нужны** для работы бота.  
- Обновили `frontend` → `git push` → сайт обновится сам.  
- Обновили `bot.py` → `fly deploy` в папке `backend`.

---

## Если Fly.io не подойдёт

См. `render.yaml` и **CLOUD-BOT.md** (Render Worker, обычно платный).
