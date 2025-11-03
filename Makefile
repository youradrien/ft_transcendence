# Makefile

# Default target
.PHONY: all up build re fclean logs elk-logs elk-up elk-down elk-status elk-clean test-labels

all: elk-up up

# Build without cache and start the containers
build: generate-secret
	docker compose build --no-cache

up: build
	docker compose up -d

elk-up:
	@bash monitoring/scripts/master_script.sh up

elk-down:
	@bash monitoring/scripts/master_script.sh clean

elk-status:
	@bash monitoring/scripts/master_script.sh status

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

re: generate-secret
	docker compose down -v
	docker image prune -f
	docker compose build --no-cache
	@bash monitoring/scripts/master_script.sh re
	docker compose up -d
	@echo "✅ Rebuild complete! Index template and ILM policy are configured."

fclean:
	docker compose down -v
	docker compose -f monitoring/docker-compose.yml down -v
	docker image prune -f
	docker network prune -f
	rm -rf src/front-end/node_modules
	rm -rf src/back-end/node_modules src/back-end/package-lock.json
	rm -rf ./vault-data
	npm cache clean --force

logs:
	docker compose logs -f backend

elk-logs:
	docker compose -f monitoring/docker-compose.yml logs --tail=50
