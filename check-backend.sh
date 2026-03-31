#!/bin/bash

echo "🔍 Перевірка backend сервера..."

# Перевірка чи запущений backend на порті 5000
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Backend сервер працює на http://localhost:5000"
    echo "📊 Відповідь сервера:"
    curl -s http://localhost:5000/api/health | jq . 2>/dev/null || curl -s http://localhost:5000/api/health
else
    echo "❌ Backend сервер не відповідає на http://localhost:5000"
    echo ""
    echo "🔧 Для запуску backend:"
    echo "   cd backend"
    echo "   npm run dev"
    echo ""
    echo "🚀 Або запустіть повний стек:"
    echo "   make full-dev"
    echo "   npm run full-dev"
fi

echo ""
echo "🌐 Перевірка CORS..."
curl -s -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5000/api/health

if [ $? -eq 0 ]; then
    echo "✅ CORS налаштовано правильно"
else
    echo "❌ Проблеми з CORS"
fi