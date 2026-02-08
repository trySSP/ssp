.PHONY: dev frontend backend install install-frontend install-backend

# Run both frontend and backend concurrently
dev:
	@echo "Starting frontend and backend..."
	@make -j2 frontend backend

# Frontend commands
frontend:
	cd frontend && bun install && bun run dev

install-frontend:
	cd frontend && bun install

# Backend commands
backend:
	cd backend && uv sync && uv run uvicorn main:app --reload --port 8000

install-backend:
	cd backend && uv sync

# Install all dependencies
install: install-frontend install-backend
	@echo "All dependencies installed!"
