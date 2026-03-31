.PHONY: install start dev build clean setup help backend frontend full-dev docker-mongo deploy prepare-backend no-docker stop

# Пластовий Співаник - Makefile

help: ## Показати доступні команди
	@echo "🎵 Пластовий Співаник - Доступні команди:"
	@echo "======================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Встановити залежності (frontend + backend)
	@echo "📦 Встановлення залежностей frontend..."
	npm install
	@echo "📦 Встановлення залежностей backend..."
	cd backend && npm install
	@echo "✅ Всі залежності встановлено"

frontend: ## Запустити тільки frontend
	@echo "🚀 Запуск frontend..."
	npm start

backend: ## Запустити тільки backend
	@echo "🔧 Запуск backend..."
	cd backend && npm run dev

start: frontend ## Запустити frontend (аліас)

dev: full-dev ## Запустити в режимі розробки (frontend + backend)

full-dev: docker-mongo ## Запустити frontend та backend одночасно з MongoDB
	@echo "🚀 Запуск повного стеку (MongoDB + frontend + backend)..."
	@sleep 3
	@if [ -f "./node_modules/.bin/concurrently" ]; then \
		./node_modules/.bin/concurrently "npm start" "cd backend && npm run dev" --names "frontend,backend" --prefix-colors "blue,green"; \
	else \
		echo "❌ concurrently не встановлений. Запускаю npm install..."; \
		npm install; \
		./node_modules/.bin/concurrently "npm start" "cd backend && npm run dev" --names "frontend,backend" --prefix-colors "blue,green"; \
	fi

build: ## Збудувати продакшн версію
	@echo "🏗️  Збірка продакшн версії..."
	npm run build
	@echo "✅ Збірка завершена"

clean: ## Очистити node_modules та перевстановити
	@echo "🧹 Очищення та перевстановлення..."
	rm -rf node_modules package-lock.json
	rm -rf backend/node_modules backend/package-lock.json
	npm install
	cd backend && npm install
	@echo "✅ Очищення завершено"

setup: install ## Повне налаштування
	@echo "✅ Налаштування завершено"

env: ## Створити .env файли
	@if [ ! -f .env ]; then \
		if [ -f .env.example ]; then \
			cp .env.example .env; \
			echo "✅ Frontend .env файл створено"; \
		else \
			echo "REACT_APP_API_URL=http://localhost:5000/api" > .env; \
			echo "✅ Frontend .env файл створено з базовими налаштуваннями"; \
		fi \
	else \
		echo "✅ Frontend .env файл вже існує"; \
	fi
	@if [ ! -f backend/.env ]; then \
		if [ -f backend/.env.example ]; then \
			cp backend/.env.example backend/.env; \
			echo "✅ Backend .env файл створено"; \
		else \
			echo "❌ backend/.env.example не знайдено"; \
		fi \
	else \
		echo "✅ Backend .env файл вже існує"; \
	fi

run: env install full-dev ## Повний запуск (створити .env, встановити залежності, запустити все)
docker-mongo: ## Запустити MongoDB в Docker (Rancher)
	@echo "🗄️  Запуск MongoDB в Docker..."
	@if docker ps | grep -q plast-songbook-mongo; then \
		echo "✅ MongoDB контейнер вже запущений"; \
	else \
		if docker ps -a | grep -q plast-songbook-mongo; then \
			echo "🔄 Зупинка старого контейнера..."; \
			docker stop plast-songbook-mongo; \
			docker rm plast-songbook-mongo; \
		fi; \
		echo "🚀 Запуск нового MongoDB контейнера..."; \
		docker run -d --name plast-songbook-mongo -p 27017:27017 -v plast-songbook-data:/data/db mongo:7.0; \
		echo "✅ MongoDB контейнер запущено"; \
	fi

deploy: build ## Деплой на Vercel
	@echo "🚀 Деплой на Vercel..."
	./deploy-vercel.sh
prepare-backend: ## Підготувати backend для окремого деплою
	@echo "📦 Підготовка backend для Vercel..."
	./prepare-backend-deploy.sh
no-docker: ## Запустити без Docker (потрібен локальний MongoDB)
	@echo "🚀 Запуск без Docker..."
	./run-no-docker.sh
stop: ## Зупинити всі процеси
	@echo "🛑 Зупинка всіх процесів..."
	./stop.sh

seed: ## Заповнити базу тестовими даними
	@echo "🌱 Заповнення бази тестовими даними..."
	cd backend && npm run seed
	@echo "✅ Тестові дані додано"

scrape: ## Парсити пісні з pryvatri.de
	@echo "🕷️  Парсинг пісень з pryvatri.de..."
	cd backend && npm install axios cheerio
	cd backend && npm run scrape
	@echo "✅ Парсинг завершено"

scrape-test: ## Тестувати парсинг однієї пісні
	@echo "🧪 Тестування парсера..."
	cd backend && npm run scrape-test

improve-chords: ## Покращити акорди в існуючих піснях
	@echo "🎸 Покращення акордів..."
	cd backend && npm run improve-chords
	@echo "✅ Акорди покращено"

fix-youtube: ## Виправити YouTube посилання
	@echo "📺 Виправлення YouTube посилань..."
	cd backend && npm run fix-youtube
	@echo "✅ YouTube посилання виправлено"

improve-formatting: ## Покращити форматування пісень
	@echo "📝 Покращення форматування..."
	cd backend && npm run improve-formatting
	@echo "✅ Форматування покращено"

clear-db: ## Очистити базу даних
	@echo "🗑️  Очищення бази даних..."
	cd backend && node src/scripts/clearDatabase.js
	@echo "✅ База даних очищена"

scrape-fresh: clear-db ## Очистити базу та парсити заново
	@echo "🕷️  Свіжий парсинг після очищення бази..."
	cd backend && node src/scripts/scrapeSongs.js
	@echo "✅ Свіжий парсинг завершено"

improve-all: ## Запустити всі скрипти покращення
	@echo "🔧 Запуск всіх скриптів покращення..."
	cd backend && node src/scripts/improveFormatting.js
	cd backend && node src/scripts/improveChords.js
	cd backend && node src/scripts/fixYouTubeUrls.js
	@echo "✅ Всі покращення завершено"
fix-structure: ## Виправити структуру пісень (куплети/приспіви)
	@echo "🔧 Fixing song structures..."
	cd backend && node src/scripts/fixSongStructure.js

improve-all: improve-chords fix-youtube improve-formatting fix-structure ## Запустити всі покращення
	@echo "🎉 All improvements completed!"
clean-texts: ## Очистити тексти пісень від "Куплет" та "Приспів"
	@echo "🧹 Cleaning song texts..."
	cd backend && node src/scripts/cleanSongTexts.js

test-clean: ## Перевірити чи є пісні з "Куплет" в тексті
	@echo "🔍 Testing for songs with 'Куплет'..."
	cd backend && node src/scripts/cleanSongTexts.js --test
scrape-detailed: ## Детальний скрепінг з JSON виводом
	@echo "🎵 Starting detailed scraping..."
	cd backend && node src/scripts/detailedScraper.js
import-json: ## Імпортувати пісні з JSON файлу
	@echo "📥 Importing songs from JSON..."
	cd backend && node src/scripts/importFromJson.js
test-songbooks: ## Тестувати функціональність співаників
	@echo "🧪 Testing songbook functionality..."
	@echo "Make sure backend is running on port 5001"
	@echo "Open http://localhost:3000/my-songbooks to test the interface"
	@echo "Features to test:"
	@echo "  - Create songbook"
	@echo "  - Add sections (sorted alphabetically)"
	@echo "  - Add songs to sections (sorted by title)"
	@echo "  - Add songs to playlist for singing"