# Деплой Пластового Співаника на Vercel

## Налаштування Frontend на Vercel

### 1. Підготовка проекту
```bash
# Переконайтеся що проект готовий до білду
npm run build
```

### 2. Деплой на Vercel
1. Зайдіть на [vercel.com](https://vercel.com)
2. Підключіть ваш GitHub репозиторій
3. Налаштуйте змінні середовища:

#### Environment Variables для Frontend:
```
REACT_APP_API_URL=https://your-backend-url.vercel.app/api
```

### 3. Налаштування Backend (окремий проект)

Створіть окремий Vercel проект для backend:

1. Створіть новий репозиторій тільки з папкою `backend`
2. Додайте `vercel.json` в корінь backend проекту:

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

#### Environment Variables для Backend:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plast-songbook
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
```

### 4. MongoDB Atlas
Для production використовуйте MongoDB Atlas:
1. Створіть акаунт на [mongodb.com/atlas](https://mongodb.com/atlas)
2. Створіть кластер
3. Отримайте connection string
4. Додайте його в MONGODB_URI

### 5. Оновлення API URL
Після деплою backend оновіть `REACT_APP_API_URL` у frontend проекті на Vercel.

## Локальна розробка з Rancher

Для локальної розробки використовуйте оновлений `run.sh`:

```bash
./run.sh
```

Скрипт автоматично:
- Запустить MongoDB в Docker контейнері
- Встановить залежності
- Запустить frontend та backend одночасно

## Структура проекту для Vercel

```
frontend-repo/          # Основний репозиторій для frontend
├── src/
├── public/
├── package.json
├── vercel.json
└── .vercelignore

backend-repo/           # Окремий репозиторій для backend
├── src/
├── package.json
└── vercel.json
```