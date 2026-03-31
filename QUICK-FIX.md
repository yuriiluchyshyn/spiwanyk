# 🔧 Швидке виправлення проблем

## Проблема з Docker/Rancher Desktop

Якщо ви бачите помилку:
```
Cannot connect to the Docker daemon at unix:///Users/.../.rd/docker.sock
```

### Рішення 1: Запустіть Rancher Desktop
1. Відкрийте **Rancher Desktop** з Applications
2. Дочекайтеся повного запуску (зелений індикатор)
3. Запустіть знову: `./run.sh`

### Рішення 2: Використайте без Docker
```bash
./run-no-docker.sh
```

**Важливо:** Для цього варіанту потрібно встановити MongoDB окремо:
```bash
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Або використайте Docker Desktop
docker run -d --name mongo -p 27017:27017 mongo:7.0
```

## Проблема з concurrently

Якщо ви бачите:
```
sh: concurrently: command not found
```

### Рішення: Встановіть залежності
```bash
npm install
```

Потім запустіть знову:
```bash
npm run full-dev
# або
./run-no-docker.sh
```

## Швидкі команди

### Для роботи з Docker (Rancher)
```bash
./run.sh              # Повний запуск з Docker MongoDB
make run              # Альтернатива через Makefile
```

### Для роботи без Docker
```bash
./run-no-docker.sh    # Запуск без Docker
make no-docker        # Альтернатива через Makefile
```

### Окремі компоненти
```bash
make frontend         # Тільки React frontend
make backend          # Тільки Express backend
make docker-mongo     # Тільки MongoDB в Docker
```

## Перевірка статусу

### Перевірити чи працює MongoDB
```bash
# Якщо використовуєте Docker
docker ps | grep mongo

# Якщо локальний MongoDB
brew services list | grep mongodb
```

### Перевірити чи працює backend
```bash
curl http://localhost:5001/api/health
```

Має повернути:
```json
{
  "message": "Пластовий Співаник API працює!",
  "timestamp": "...",
  "environment": "development",
  "cors": "enabled"
}
```

## Адреси після запуску
- 🎵 **Frontend:** http://localhost:3000
- 🔧 **Backend API:** http://localhost:5001/api
- 🗄️ **MongoDB:** localhost:27017

## Якщо нічого не допомагає

1. **Очистіть все:**
```bash
make clean
```

2. **Встановіть заново:**
```bash
make install
```

3. **Запустіть без Docker:**
```bash
./run-no-docker.sh
```

---

**Примітка:** Для production деплою на Vercel використовуйте `make deploy` після того як все працює локально.