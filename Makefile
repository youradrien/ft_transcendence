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

# i use this to gen new .env var for JWT token at compile time, just to have to re-log 
# and make previous users JWT-cookies invalid on api
generate-secret:
	@openssl rand -hex 32 > .jwt_secret && \
	echo "JWT_SECRET=$$(cat .jwt_secret)" > ./src/back-end/.env
	@cat ./src/back-end/.env
	rm -f .jwt_secret

# Rebuild and restart everything fresh
re: generate-secret
	docker compose down -v
	docker image prune -f
	docker compose build --no-cache
	docker compose up -d

# Stop and clean everything
fclean:
	docker compose down -v
	docker image prune -f
	rm -rf src/front-end/node_modules
	rm -rf src/back-end/node_modules src/back-end/package-lock.json
	rm -rf ./vault-data
	npm cache clean --force

# View backend logs
logs:
	docker compose logs -f backend
