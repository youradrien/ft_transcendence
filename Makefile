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
	docker compose -f monitoring/docker-compose.yml up -d

elk-down:
	docker compose -f monitoring/docker-compose.yml down

prometheus-up:
	docker compose -f prometheus/docker-compose.yml up -d

prometheus-down:
	docker compose -f prometheus/docker-compose.yml down


#   - permissions Docker
#   - santé d'elastic (port 9200)
#   - status de Kibana (port 5601)
#   - status de Logstash (port 9600)
#   - présence des indices de logs	
elk-status:
	@echo "=== Docker Permissions Check ==="
	@ls -la /var/run/docker.sock 2>/dev/null || echo "⚠️  Warning: Cannot access /var/run/docker.sock"
	@echo "\n=== ELK Containers ==="
	@docker ps --filter "name=elasticsearch" --filter "name=kibana" --filter "name=logstash" --filter "name=filebeat" --format "table {{.Names}}\t{{.Status}}"
	@echo "\n=== Elasticsearch ==="
	@curl -s http://localhost:9200/_cluster/health?pretty || echo "❌ Elasticsearch not ready"
	@echo "\n=== Kibana ==="
	@curl -s http://localhost:5601/api/status 2>/dev/null | grep -o '"level":"[^"]*"' | head -1 || echo "❌ Kibana not ready"
	@echo "\n=== Logstash ==="
	@curl -s http://localhost:9600/_node/stats 2>/dev/null | grep -o '"status":"[^"]*"' || echo "❌ Logstash not ready"
	@echo "\n=== Log Collection ==="
	@curl -s "http://localhost:9200/_cat/count/ft_transcendence-*?v" 2>/dev/null || echo "❌ No indices found yet"

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
	docker compose -f monitoring/docker-compose.yml down -v
# 	docker compose -f prometheus/docker-compose.yml down -v
	docker image prune -f
	docker compose build --no-cache
	docker compose -f monitoring/docker-compose.yml up -d
	@echo "⏳ Waiting for Elasticsearch to be ready..."
	@bash -c 'for i in {1..30}; do \
		if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then \
			echo "✅ Elasticsearch is ready"; \
			break; \
		fi; \
		sleep 1; \
	done'
	@echo "📋 Setting up index template..."
	@bash monitoring/setup_template.sh 2>/dev/null || true
	@echo "📦 Setting up ILM policy (30-days-default)..."
	@bash monitoring/setup_ilm.sh 2>/dev/null || true
	docker compose up -d
# 	docker compose -f prometheus/docker-compose.yml up -d
	@echo "✅ Rebuild complete! Index template and ILM policy are configured."

fclean:
	docker compose down -v
	docker compose -f monitoring/docker-compose.yml down -v
	docker compose -f prometheus/docker-compose.yml down -v
	docker image prune -f
	rm -rf src/front-end/node_modules
	rm -rf src/back-end/node_modules src/back-end/package-lock.json
	rm -rf ./vault-data
	npm cache clean --force

logs:
	docker compose logs -f backend

elk-logs:
	docker compose -f monitoring/docker-compose.yml logs --tail=50

elk-clean:
	@echo "🧹 Cleaning Elasticsearch indices..."
	@bash monitoring/cleanup_indices.sh

test-labels:
	@bash monitoring/test_labels.sh
