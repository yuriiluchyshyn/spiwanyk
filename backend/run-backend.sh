#!/bin/bash

# Backend запуск для Пластового Співаника
echo "🔧 Пластовий Співаник - Запуск Backend"
echo "====================================="

# Перевірка наявності Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не знайдено. Будь ласка, встановіть Node.js (версія 16+)"
    exit 1
fi

echo "✅ Node.js знайдено: $(node -v)"

# Перевірка наявності MongoDB
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB не знайдено в PATH"
    echo "   Переконайтеся, що MongoDB запущено:"
    echo "   - macOS: brew services start mongodb/brew/mongodb-community"
    echo "   - Ubuntu: sudo systemctl start mongod"
    echo "   - Windows: net start MongoDB"
    echo ""
fi

# Перевірка наявності package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json не знайдено. Переконайтеся, що ви в директорії backend"
    exit 1
fi

# Встановлення залежностей
if [ ! -d "node_modules" ]; then
    echo "📦 Встановлення залежностей..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Помилка встановлення залежностей"
        exit 1
    fi
    echo "✅ Залежності встановлено"
else
    echo "✅ Залежності вже встановлено"
fi

# Перевірка .env файлу
if [ ! -f ".env" ]; then
    echo "⚙️  Створення .env файлу..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env файл створено з .env.example"
    else
        echo "❌ .env.example не знайдено"
        exit 1
    fi
else
    echo "✅ .env файл знайдено"
fi

# Створення директорії для завантажень
if [ ! -d "uploads" ]; then
    mkdir uploads
    echo "✅ Директорія uploads створена"
fi

echo ""
echo "🚀 Запуск backend сервера..."
echo "   API буде доступний за адресою: http://localhost:5000/api"
echo "   Health check: http://localhost:5000/api/health"
echo "   Для зупинки натисніть Ctrl+C"
echo ""

# Запуск сервера
npm run dev