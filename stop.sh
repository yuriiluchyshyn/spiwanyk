#!/bin/bash

echo "🛑 Зупинка всіх процесів Пластового Співаника..."

# Зупинка backend процесів
echo "🔧 Зупинка backend..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "nodemon.*server.js" 2>/dev/null

# Зупинка frontend процесів
echo "🎨 Зупинка frontend..."
pkill -f "react-scripts" 2>/dev/null
pkill -f "webpack" 2>/dev/null

# Зупинка concurrently
echo "🔄 Зупинка concurrently..."
pkill -f "concurrently" 2>/dev/null

# Перевірка портів
echo "🔍 Перевірка портів..."
FRONTEND_PIDS=$(lsof -ti:3000 2>/dev/null)
BACKEND_PIDS=$(lsof -ti:5001 2>/dev/null)

if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "⚠️  Порт 3000 зайнятий. Зупиняю процеси: $FRONTEND_PIDS"
    for pid in $FRONTEND_PIDS; do
        kill -9 $pid 2>/dev/null
    done
fi

if [ ! -z "$BACKEND_PIDS" ]; then
    echo "⚠️  Порт 5001 зайнятий. Зупиняю процеси: $BACKEND_PIDS"
    for pid in $BACKEND_PIDS; do
        kill -9 $pid 2>/dev/null
    done
fi

sleep 2

# Фінальна перевірка
FRONTEND_CHECK=$(lsof -ti:3000 2>/dev/null)
BACKEND_CHECK=$(lsof -ti:5001 2>/dev/null)

if [ -z "$FRONTEND_CHECK" ] && [ -z "$BACKEND_CHECK" ]; then
    echo "✅ Всі процеси зупинено. Порти 3000 та 5001 вільні"
else
    echo "⚠️  Деякі процеси можуть ще працювати:"
    [ ! -z "$FRONTEND_CHECK" ] && echo "   - Порт 3000: PID $FRONTEND_CHECK"
    [ ! -z "$BACKEND_CHECK" ] && echo "   - Порт 5001: PID $BACKEND_CHECK"
fi

echo ""
echo "🚀 Тепер можна запускати заново:"
echo "   ./run.sh або ./run-no-docker.sh"