# Matn Memorizer AI backend

## Что делает сервер

`server.js` предоставляет `GET /health` и `POST /api/check`. Endpoint принимает `expected`, `transcript` и `mode`, отправляет их в серверную AI-модель и возвращает `confidence`, `score`, `status`, `corrected`, `summary` и структурированный список ошибок. Ключ AI никогда не попадает во frontend.

Frontend использует браузерное арабское распознавание только как поток транскрипта, а semantic-проверку выполняет backend через AI. Запросы выполняются с задержкой около 450 мс после промежуточного результата, поэтому ошибки обновляются во время чтения.

## Локальный запуск

```bash
cp .env.example .env
# заполнить OPENAI_API_KEY в .env; секрет не коммитить
set -a; . ./.env; set +a
npm start
```

Проверка: `curl http://localhost:3000/health`.

## Docker

```bash
docker build -t matn-ai .
docker run --rm -p 3000:3000 --env-file .env matn-ai
```

## Публикация

GitHub Pages обслуживает только статические файлы и не запускает `server.js`. Для production backend нужен Node/Docker-хостинг с HTTPS. После публикации откройте настройки приложения и укажите URL backend, например `https://ai.example.com`. На сервере задайте `ALLOWED_ORIGIN=https://umartyu-a11y.github.io`.

Если backend и frontend обслуживаются одним Node-сервером, поле URL можно оставить пустым. Для production рекомендуется ограничить CORS конкретным доменом и добавить rate limit/auth перед публичным использованием.

## Ограничения текущего этапа

Входной аудиосигнал пока распознаётся Web Speech API браузера; backend проверяет полученную транскрипцию AI-моделью. Для независимого серверного Arabic ASR с word timestamps/confidence потребуется отдельный speech endpoint и хранение аудио. Проверка таджвида, махраджей и сифатов не заявляется.
