#!/bin/bash

# Пластовий Співаник - Запуск без Docker
echo "🎵 Пластовий Співаник - Запуск без Docker"
echo "========================================="

# Перевірка наявності Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не знайдено. Будь ласка, встановіть Node.js (версія 16+)"
    echo "   Завантажити можна з: https://nodejs.org/"
    exit 1
fi

# Перевірка версії Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Потрібна версія Node.js 16 або вище. Поточна версія: $(node -v)"
    exit 1
fi

echo "✅ Node.js знайдено: $(node -v)"

# Перевірка наявності npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не знайдено"
    exit 1
fi

echo "✅ npm знайдено: $(npm -v)"

# Інформація про MongoDB
echo ""
echo "⚠️  MongoDB потрібен для роботи backend"
echo "🔧 Варіанти запуску MongoDB:"
echo "   1. Homebrew: brew services start mongodb-community"
echo "   2. Rancher Desktop: запустіть Rancher та використайте ./run.sh"
echo "   3. Docker Desktop: docker run -d --name mongo -p 27017:27017 mongo:7.0"
echo ""

# Перевірка наявності node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Встановлення залежностей frontend..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Помилка встановлення залежностей frontend"
        exit 1
    fi
    echo "✅ Залежності frontend встановлено"
else
    echo "✅ Залежності frontend вже встановлено"
fi

# Перевірка наявності backend залежностей
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Встановлення залежностей backend..."
    cd backend && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Помилка встановлення залежностей backend"
        exit 1
    fi
    echo "✅ Залежності backend встановлено"
else
    echo "✅ Залежності backend вже встановлено"
fi

# Перевірка наявності .env файлу
if [ ! -f ".env" ]; then
    echo "⚙️  Створення .env файлу..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env файл створено з .env.example"
    else
        echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
        echo "✅ .env файл створено з базовими налаштуваннями"
    fi
else
    echo "✅ .env файл знайдено"
fi

# Перевірка наявності backend/.env файлу
if [ ! -f "backend/.env" ]; then
    echo "⚙️  Створення backend/.env файлу..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "✅ Backend .env файл створено з .env.example"
    else
        cat > backend/.env << EOF
PORT=5001
MONGODB_URI=mongodb://localhost:27017/plast-songbook
JWT_SECRET=plast-songbook-super-secret-jwt-key-2024
NODE_ENV=development
EOF
        echo "✅ Backend .env файл створено з базовими налаштуваннями"
    fi
else
    echo "✅ Backend .env файл знайдено"
fi

echo ""
echo "🚀 Запуск додатку без Docker..."
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5001/api"
echo "   MongoDB: localhost:27017 (має бути запущений окремо)"
echo "   Для зупинки натисніть Ctrl+C"
echo ""

# Запуск повного стеку
if [ -f "./node_modules/.bin/concurrently" ]; then
    npm run full-dev
else
    echo "❌ concurrently не встановлений. Встановлюю залежності..."
    npm install
    npm run full-dev
fi