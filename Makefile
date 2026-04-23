.PHONY: up down down-v logs prod build-frontend build dev dev-frontend migrate migrate-down migrate-history install install-backend install-frontend test test-backend test-watch lint clean-db help

# ── 生產部署 ──────────────────────────────────────────────────────────────────

prod: build-frontend
	docker compose up --build -d db backend nginx
	@echo "✓ 啟動完成 → http://localhost:18080"

build-frontend:
	cd frontend && npm run build

# ── Docker（開發） ────────────────────────────────────────────────────────────

up:
	docker compose up -d db backend nginx

build:
	docker compose build backend frontend-dev

dev: dev-backend dev-frontend

dev-backend:
	docker compose up -d db backend 

dev-frontend:
	docker compose up -d frontend-dev

down:
	docker compose --profile dev down

down-v:
	docker compose --profile dev down -v

logs:
	docker compose logs -f

# ── 資料庫 migration ──────────────────────────────────────────────────────────

migrate:
	docker compose exec backend alembic upgrade head

migrate-down:
	docker compose exec backend alembic downgrade -1

migrate-history:
	docker compose exec backend alembic history --verbose

# ── 安裝依賴 ──────────────────────────────────────────────────────────────────

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

# ── 測試 ──────────────────────────────────────────────────────────────────────

test: test-backend

test-backend:
	cd backend && pytest -v

test-watch:
	cd backend && pytest -v --tb=short -p no:cacheprovider

# ── 型別檢查 ──────────────────────────────────────────────────────────────────

lint:
	cd frontend && npx tsc --noEmit

# ── 清理 ──────────────────────────────────────────────────────────────────────

clean-db:
	rm -rf pgdata pdfdata
	mkdir -p pgdata pdfdata

# ── 說明 ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  【生產】"
	@echo "  make prod            build 前端 → 啟動 db + backend + nginx（:18080）"
	@echo "  make build-frontend  只 build 前端靜態檔（frontend/dist/）"
	@echo ""
	@echo "  【開發】"
	@echo "  make dev-backend     啟動 db + backend（:8000）"
	@echo "  make dev-frontend    只啟動 frontend-dev（:5173）"
	@echo "  make build           重新 build backend / frontend-dev image"
	@echo "  make up              啟動 db + backend + nginx（production 用）"
	@echo "  make down            停止所有服務"
	@echo "  make down-v          停止並刪除 volume"
	@echo ""
	@echo "  【資料庫】"
	@echo "  make migrate         執行 DB migration"
	@echo "  make migrate-down    回滾一個 migration"
	@echo ""
	@echo "  【品質】"
	@echo "  make test            執行後端測試"
	@echo "  make lint            TypeScript 型別檢查"
	@echo "  make install         安裝前後端依賴"
	@echo ""
	@echo "  【清理】"
	@echo "  make clean-db        清除本地 DB 資料（pgdata/pdfdata）"
	@echo ""
