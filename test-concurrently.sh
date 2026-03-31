#!/bin/bash

echo "🧪 Тестування concurrently..."

if [ -f "./node_modules/.bin/concurrently" ]; then
    echo "✅ concurrently знайдено локально"
    echo "🚀 Тестовий запуск..."
    ./node_modules/.bin/concurrently "echo 'Frontend OK'" "echo 'Backend OK'" --names "test1,test2" --prefix-colors "blue,green"
else
    echo "❌ concurrently не знайдено"
    echo "📦 Встановлення залежностей..."
    npm install
    if [ -f "./node_modules/.bin/concurrently" ]; then
        echo "✅ concurrently встановлено"
        ./node_modules/.bin/concurrently "echo 'Frontend OK'" "echo 'Backend OK'" --names "test1,test2" --prefix-colors "blue,green"
    else
        echo "❌ Помилка встановлення concurrently"
    fi
fi