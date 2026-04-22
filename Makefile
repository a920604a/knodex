.PHONY: up up-d down down-v logs prod build-frontend dev-backend dev-frontend dev dev-up migrate migrate-down migrate-history install install-backend install-frontend test test-backend test-watch lint clean-db help

# ── 生產部署 ──────────────────────────────────────────────────────────────────

prod: build-frontend
	docker compose up --build -d db backend nginx
	@echo "✓ 啟動完成 → http://localhost:18080"

build-frontend:
	cd frontend && npm run build

# ── Docker（開發） ────────────────────────────────────────────────────────────

up:
	docker compose up --build db backend nginx

up-d:
	docker compose up --build -d db backend nginx

dev-up:
	docker compose --profile dev up --build

down:
	docker compose down

down-v:
	docker compose down -v

logs:
	docker compose logs -f

# ── 本地開發（不用 Docker）────────────────────────────────────────────────────

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "請開兩個終端分別執行 make dev-backend 與 make dev-frontend"

# ── 資料庫 migration ──────────────────────────────────────────────────────────

migrate:
	cd backend && alembic upgrade head

migrate-down:
	cd backend && alembic downgrade -1

migrate-history:
	cd backend && alembic history --verbose

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
	@echo "  make up              啟動 db + backend + nginx（使用現有 dist/）"
	@echo "  make up-d            背景啟動"
	@echo "  make dev-up          啟動全部含前端 dev server（:15173）"
	@echo "  make dev-backend     本地啟動後端"
	@echo "  make dev-frontend    本地啟動前端 dev server"
	@echo "  make down            停止服務"
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
