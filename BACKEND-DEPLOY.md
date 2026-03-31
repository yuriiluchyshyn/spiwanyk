# Деплой Backend на Vercel

## Створення окремого репозиторію для backend

### 1. Створіть новий GitHub репозиторій
```bash
# Назва: plast-songbook-backend (або інша)
```

### 2. Скопіюйте backend файли
```bash
# Створіть нову папку
mkdir plast-songbook-backend
cd plast-songbook-backend

# Скопіюйте файли з поточного проекту
cp -r ../Spivanyk/backend/* .
cp ../Spivanyk/backend/.env.example .
cp ../Spivanyk/backend/.gitignore .

# Створіть package.json в корені (якщо потрібно)
cp package.json package.json.bak  # backup
cp src/package.json package.json  # використати backend package.json
```

### 3. Оновіть структуру для Vercel
```bash
# Структура має бути:
plast-songbook-backend/
├── src/
│   ├── server.js
│   ├── models/
│   ├── routes/
│   └── middleware/
├── package.json
├── vercel.json
└── .env.example
```

### 4. Створіть vercel.json в корені
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

### 5. Налаштуйте MongoDB Atlas

1. Зайдіть на [mongodb.com/atlas](https://mongodb.com/atlas)
2. Створіть безкоштовний кластер
3. Створіть користувача бази даних
4. Додайте IP адреси (0.0.0.0/0 для Vercel)
5. Отримайте connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/plast-songbook
```

### 6. Деплой на Vercel

#### Через GitHub:
1. Зайдіть на [vercel.com](https://vercel.com)
2. Підключіть новий GitHub репозиторій
3. Додайте Environment Variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plast-songbook
JWT_SECRET=your-super-secret-production-jwt-key-change-this
NODE_ENV=production
PORT=5000
```

#### Через CLI:
```bash
npm install -g vercel
vercel login
vercel --prod
```

### 7. Оновіть frontend

Після деплою backend оновіть frontend `.env`:
```env
REACT_APP_API_URL=https://your-backend-name.vercel.app
```

Або в Vercel Dashboard для frontend проекту:
```
REACT_APP_API_URL=https://your-backend-name.vercel.app
```

### 8. Тестування

Перевірте що API працює:
```bash
curl https://your-backend-name.vercel.app/api/health
```

Має повернути:
```json
{
  "message": "Пластовий Співаник API працює!",
  "timestamp": "...",
  "environment": "production",
  "cors": "enabled"
}
```

## Структура деплою

```
Frontend Repo (Vercel)     Backend Repo (Vercel)     Database
├── src/                   ├── src/                   MongoDB Atlas
├── public/                │   ├── server.js          ├── Users
├── package.json           │   ├── models/            ├── Songs
├── vercel.json            │   └── routes/            └── Songbooks
└── .env                   ├── package.json
                          └── vercel.json
```

## Налаштування CORS

Backend автоматично налаштований для роботи з різними доменами. Якщо потрібно обмежити доступ, оновіть `src/server.js`:

```javascript
const allowedOrigins = [
  'https://your-frontend.vercel.app',
  'http://localhost:3000' // для розробки
];
```

## Моніторинг

- Vercel Dashboard показує логи та метрики
- MongoDB Atlas має вбудований моніторинг
- Налаштуйте алерти для критичних помилок

## Backup

MongoDB Atlas автоматично створює backup. Для додаткової безпеки:
1. Налаштуйте регулярні експорти
2. Зберігайте копії в різних регіонах
3. Тестуйте відновлення з backup

---

**Примітка:** Після деплою backend не забудьте оновити `REACT_APP_API_URL` у frontend проекті!