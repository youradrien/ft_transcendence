#!/bin/bash
arg="$1"

chmod +x monitoring/scripts/*.sh

if [ "$arg" == "clean" ] || [ "$arg" == "down" ]; then
	docker compose -f monitoring/docker-compose.yml down -v
	./monitoring/scripts/cleanup_indices.sh
fi


if [ "$arg" == "build" ] || [ "$arg" == "up" ] || [ "$arg" == "re" ]; then

	if [ "$arg" == "re" ]; then
		docker compose -f monitoring/docker-compose.yml down -v
	fi

	docker compose -f monitoring/docker-compose.yml up -d

	for i in {1..30}; do \
		if curl -s -u elastic:elastic_password http://localhost:9200/_cluster/health > /dev/null 2>&1; then \
			echo "✅ Elasticsearch is ready"; \
			break; \
		fi; \
		sleep 1; \
	done

	./monitoring/scripts/ensure_kibana_password.sh
	./monitoring/scripts/setup_template.sh
	./monitoring/scripts/setup_ilm.sh
fi

if [ "$arg" == "status" ] || [ "$arg" == "elk-status" ]; then
	echo -e "\n=== elk containers ==="
	docker compose -f monitoring/docker-compose.yml ps
	echo -e "\n=== elasticsearch health ==="
	curl -s -u elastic:elastic_password http://localhost:9200/_cluster/health?pretty || echo "❌ Elasticsearch is not ready"
	echo -e "\n=== kibana status ==="
	curl -s -u elastic:elastic_password http://localhost:5601/api/status | grep -o '"level":"[^"]*"' | head -1 || echo "❌ Kibana not ready"
	echo -e "\n=== logstash pipelines ==="
	curl -s http://localhost:9600/_node/stats | grep -o '"main":{[^}]*}' || echo "❌ Logstash not ready"
	echo -e "\n=== Log collection ==="
	curl -s -u elastic:elastic_password "http://localhost:9200/ft_transcendence-*/_count" | grep -o '"count":[0-9]*' || echo "❌ No logs found"
fi

