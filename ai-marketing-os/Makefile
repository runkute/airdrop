.PHONY: help build up down restart logs shell-backend shell-frontend migrate seed test lint format clean

# Default target
help:
	@echo "AI Marketing OS - Available Commands"
	@echo "====================================="
	@echo ""
	@echo "Docker Commands:"
	@echo "  make up              Start all services"
	@echo "  make down            Stop all services"
	@echo "  make build           Build all images"
	@echo "  make restart         Restart all services"
	@echo "  make logs            View all logs"
	@echo "  make logs-backend    View backend logs"
	@echo "  make logs-frontend   View frontend logs"
	@echo ""
	@echo "Database Commands:"
	@echo "  make migrate         Run database migrations"
	@echo "  make migrate-create  Create a new migration"
	@echo "  make db-reset        Reset database (WARNING: destroys data)"
	@echo ""
	@echo "Development Commands:"
	@echo "  make shell-backend   Open backend container shell"
	@echo "  make shell-frontend  Open frontend container shell"
	@echo "  make shell-db        Open psql shell"
	@echo "  make test-backend    Run backend tests"
	@echo "  make lint-backend    Lint backend code"
	@echo "  make install         Install all dependencies locally"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean           Remove all containers and volumes"
	@echo "  make setup           Initial project setup"

# Docker operations
up:
	docker compose up -d

up-build:
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-worker:
	docker compose logs -f celery_worker

# Database
migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	@read -p "Migration name: " name; \
	docker compose exec backend alembic revision --autogenerate -m "$$name"

migrate-down:
	docker compose exec backend alembic downgrade -1

db-reset:
	@echo "WARNING: This will destroy all data!"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker compose exec backend alembic downgrade base; \
		docker compose exec backend alembic upgrade head; \
	fi

# Shells
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec postgres psql -U postgres -d ai_marketing_os

shell-redis:
	docker compose exec redis redis-cli

# Testing
test-backend:
	docker compose exec backend pytest tests/ -v --tb=short

lint-backend:
	docker compose exec backend ruff check app/
	docker compose exec backend mypy app/

format-backend:
	docker compose exec backend ruff format app/

# Local development (without Docker)
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

# Celery
worker:
	cd backend && celery -A app.workers.celery_app worker --loglevel=info

beat:
	cd backend && celery -A app.workers.celery_app beat --loglevel=info

flower:
	docker compose exec celery_worker celery -A app.workers.celery_app flower --port=5555

# Setup
setup:
	cp .env.example .env
	@echo "Created .env file - please fill in your API keys"
	make build
	make up
	sleep 10
	make migrate
	@echo "Setup complete! Visit http://localhost:3000"

clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# Generate encryption key
gen-key:
	@python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Health checks
health:
	@curl -s http://localhost:8000/health | python3 -m json.tool

status:
	docker compose ps
