#!/bin/bash

# Тестування налаштування проекту
echo "🧪 Тестування налаштування Пластового Співаника"
echo "=============================================="

# Перевірка файлів
echo "📋 Перевірка наявності файлів..."

files=(
    "package.json"
    "src/App.js"
    "src/index.js"
    "public/index.html"
    ".env.example"
    ".gitignore"
    "README.md"
    "run.sh"
    "run.bat"
    "Makefile"
)

missing_files=()

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - ВІДСУТНІЙ"
        missing_files+=("$file")
    fi
done

# Перевірка директорій
echo ""
echo "📁 Перевірка директорій..."

dirs=(
    "src/components"
    "src/contexts"
    "src/services"
    "public"
)

missing_dirs=()

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/"
    else
        echo "❌ $dir/ - ВІДСУТНЯ"
        missing_dirs+=("$dir")
    fi
done

# Перевірка компонентів
echo ""
echo "🧩 Перевірка компонентів..."

components=(
    "src/components/Auth/Login.js"
    "src/components/Header/Header.js"
    "src/components/Home/Home.js"
    "src/components/Songs/SongList.js"
    "src/components/Songs/SongDetail.js"
    "src/components/Songbooks/MySongbooks.js"
    "src/components/Songbooks/CreateSongbookModal.js"
    "src/components/Playlist/Playlist.js"
)

missing_components=()

for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        echo "✅ $(basename "$component")"
    else
        echo "❌ $(basename "$component") - ВІДСУТНІЙ"
        missing_components+=("$component")
    fi
done

# Підсумок
echo ""
echo "📊 Підсумок тестування:"
echo "======================"

if [ ${#missing_files[@]} -eq 0 ] && [ ${#missing_dirs[@]} -eq 0 ] && [ ${#missing_components[@]} -eq 0 ]; then
    echo "🎉 Всі файли та компоненти на місці!"
    echo "✅ Проект готовий до запуску"
    echo ""
    echo "🚀 Для запуску виконайте:"
    echo "   ./run.sh        (Linux/Mac)"
    echo "   run.bat         (Windows)"
    echo "   make run        (Linux/Mac з Make)"
    echo "   npm run setup   (будь-яка система)"
else
    echo "❌ Знайдено проблеми:"
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        echo "   Відсутні файли: ${missing_files[*]}"
    fi
    
    if [ ${#missing_dirs[@]} -gt 0 ]; then
        echo "   Відсутні директорії: ${missing_dirs[*]}"
    fi
    
    if [ ${#missing_components[@]} -gt 0 ]; then
        echo "   Відсутні компоненти: ${missing_components[*]}"
    fi
fi

echo ""
echo "💡 Додаткові можливості:"
echo "   ./setup-backend.sh  - Створити backend структуру"
echo "   make help          - Показати всі Make команди"