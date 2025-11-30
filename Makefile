# Makefile

# Default target
.PHONY: all up build re fclean logs elk-logs elk-up elk-down elk-status elk-clean test-labels generate-ip generate-secret

all: elk-up up

# Build without cache and start the containers
build: generate-secret generate-ip create-db
	docker compose build --no-cache

up: build
	docker compose up -d
	@if [ -f ./src/back-end/.env ]; then \
        : > ./src/back-end/.env && chmod 600 ./src/back-end/.env && echo "Cleared src/back-end/.env"; \
    else \
        echo "No src/back-end/.env to clear"; \
    fi

elk-up:
	@bash monitoring/scripts/master_script.sh up

elk-down:
	@bash monitoring/scripts/master_script.sh clean

elk-status:
	@bash monitoring/scripts/master_script.sh status

create-db:
	@test -f ./src/back-end/database_sql.db || touch ./src/back-end/database_sql.db
	chmod 664 ./src/back-end/database_sql.db
	@echo "database_sql.db créé et permissions définies"

reset-db:
	@rm -f ./src/back-end/database_sql.db
	@touch ./src/back-end/database_sql.db
	chmod 664 ./src/back-end/database_sql.db
	@echo "database_sql.db réinitialisé"


generate-ip:
	@echo "🔍 Detecting local IP..." ; \
	if command -v ip >/dev/null 2>&1 ; then \
		IP=$$(ip address -4 -o addr show eno2 2>/dev/null | awk '{print $$4}' | cut -d/ -f1) ; \
	else \
		echo "⚠️ No IP detected, using localhost" ; \
		IP=localhost ; \
	fi ; \
	if [ -z "$$IP" ] ; then \
		echo "⚠️ No IP detected, using localhost" ; \
		IP=localhost ; \
	else \
		echo "✅ Detected IP: $$IP" ; \
	fi ; \
	echo "Writing VITE_API_URL to front-end .env..." ; \
	echo "VITE_API_URL=https://$$IP:5173" > ./src/front-end/.env ; \
	echo "VITE_API_URL_WS=wss://$$IP:3010" >> ./src/front-end/.env; \
	echo "📝 Updated front-end .env:" ; \
	cat ./src/front-end/.env
# generate-ip:
# 	@echo "🔍 Detecting local IP (network 10.x.x.x)..."
# 	@if command -v ip >/dev/null 2>&1 ; then \
# 		IP=$$(ip -4 -o addr show | awk '{print $$4}' | cut -d/ -f1 | grep '^10\.' | head -n 1); \
# 	else \
# 		echo "⚠️ 'ip' command not found, using localhost"; \
# 		IP="localhost"; \
# 	fi; \
# 	if [ -z "$$IP" ]; then \
# 		echo "⚠️ No 10.x.x.x IP detected, using localhost"; \
# 		IP="localhost"; \
# 	else \
# 		echo "✅ Detected IP: $$IP"; \
# 	fi; \
# 	echo "Writing VITE_API_URL to front-end .env..."; \
# 	echo "VITE_API_URL=https://$$IP:5173" > ./src/front-end/.env; \
# 	echo "VITE_API_URL=https://$$IP:5173/auth" > ./src/back-end/.env; \
# 	echo "📝 Updated front-end .env:"; \
# 	cat ./src/front-end/.env




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

fclean: reset-db
	docker compose down -v
	@bash monitoring/scripts/master_script.sh clean
	docker image prune -f
	docker network prune -f
	rm -rf src/front-end/node_modules
	rm -rf src/back-end/node_modules src/back-end/package-lock.json
	rm -rf ./vault/vault-data
	npm cache clean --force

logs:
	docker compose logs -f backend

elk-logs:
	docker compose -f monitoring/docker-compose.yml logs --tail=50
