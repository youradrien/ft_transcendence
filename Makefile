# Makefile

# Default target
.PHONY: all up build re fclean logs

all: up

# Build without cache and start the containers
build: generate-secret
	docker compose build --no-cache

# Start the containers (after build)
up: build
	docker compose up -d
	docker compose -f monitoring/docker-compose.yml up -d

# i use this to gen new .env var for JWT token at compile time, just to have to re-log 
# and make previous users JWT-cookies invalid on api
generate-secret:
	@NEW_SECRET=$$(openssl rand -hex 32); \
	if [ -f ./src/back-end/.env ]; then \
		sed -i.bak '/^JWT_SECRET=/d' ./src/back-end/.env && rm -f ./src/back-end/.env.bak; \
	fi; \
	echo "JWT_SECRET=$$NEW_SECRET" >> ./src/back-end/.env
	@echo "Updated JWT_SECRET in .env:"
	@cat ./src/back-end/.env

# Rebuild and restart everything fresh
re: generate-secret
	docker compose down -v
	docker image prune -f
	docker compose build --no-cache
	docker compose up -d
	docker compose -f monitoring/docker-compose.yml up -d

# Stop and clean everything
fclean:
	docker compose down -v
	docker compose -f monitoring/docker-compose.yml down -v
	docker image prune -f
	rm -rf src/front-end/node_modules
	rm -rf src/back-end/node_modules src/back-end/package-lock.json
	rm -rf ./vault-data
	npm cache clean --force
	rm -rf monitoring/es_data

# View backend logs
logs:
	docker compose logs -f backend
