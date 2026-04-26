.PHONY: help install dev web-build web-start typecheck lint test clean

help:
	@echo "Targets:"
	@echo "  make install        Install Next.js dependencies"
	@echo "  make dev            Start the app locally"
	@echo "  make web-build      Build the app for production"
	@echo "  make web-start      Start the production server"
	@echo "  make typecheck      Run TypeScript checks"
	@echo "  make lint           Run app validation"
	@echo "  make test           Run automated tests"
	@echo "  make clean          Remove generated local build files"

install:
	npm install

dev:
	npm run dev

web-build:
	npm run build

web-start:
	npm run start

typecheck:
	npm run typecheck

lint:
	npm run lint

test:
	npm run test

clean:
	rm -rf .next tsconfig.tsbuildinfo tsconfig.typecheck.tsbuildinfo
