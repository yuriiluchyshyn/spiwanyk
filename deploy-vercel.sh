#!/bin/bash

echo "🚀 Деплой Пластового Співаника на Vercel"
echo "========================================"

# Перевірка наявності Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI не знайдено"
    echo "📦 Встановлення Vercel CLI..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo "❌ Помилка встановлення Vercel CLI"
        exit 1
    fi
fi

echo "✅ Vercel CLI знайдено"

# Білд проекту
echo "🔨 Білд frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Помилка білду frontend"
    exit 1
fi

echo "✅ Frontend зібрано успішно"

# Деплой frontend
echo "🚀 Деплой frontend на Vercel..."
vercel --prod

echo ""
echo "📋 Наступні кроки:"
echo "1. Створіть окремий репозиторій для backend"
echo "2. Скопіюйте папку backend/ в новий репозиторій"
echo "3. Задеплойте backend окремо на Vercel"
echo "4. Налаштуйте MongoDB Atlas"
echo "5. Оновіть REACT_APP_API_URL в налаштуваннях Vercel"
echo ""
echo "📖 Детальні інструкції в README-VERCEL.md"