#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📋 Creating Elasticsearch index template...${NC}"

# Wait for Elasticsearch
for i in {1..30}; do
    if curl -s "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Create index template
curl -X PUT "http://localhost:9200/_index_template/ft_transcendence_template" \
  -H 'Content-Type: application/json' \
  -d '{
  "index_patterns": ["ft_transcendence-*"],
  "priority": 1,
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.lifecycle.name": "30-days-default"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "@version": { "type": "keyword" },
        "app.component": { "type": "keyword" },
        "client.ip": { "type": "ip" },
        "environment": { "type": "keyword" },
        "event_type": { "type": "keyword" },
        "event.original": { "type": "text" },
        "has_2fa": { "type": "boolean" },
        "has_2fa_code": { "type": "boolean" },
        "http.method": { "type": "keyword" },
        "http.url": { "type": "keyword" },
        "http.version": { "type": "keyword" },
        "http_status": { "type": "integer" },
        "ip": { "type": "ip" },
        "log.format": { "type": "keyword" },
        "log.source": { "type": "keyword" },
        "log_level": { "type": "keyword" },
        "message": { "type": "text" },
        "method": { "type": "keyword" },
        "raw_message": { "type": "text" },
        "reason": { "type": "keyword" },
        "request_id": { "type": "keyword" },
        "response_time": { "type": "float" },
        "response_time_ms": { "type": "float" },
        "responseTime": { "type": "float" },
        "service.name": { "type": "keyword" },
        "service.type": { "type": "keyword" },
        "status_code": { "type": "integer" },
        "tags": { "type": "keyword" },
        "url": { "type": "keyword" },
        "user_id": { "type": "long" },
        "username": { "type": "keyword" }
      }
    }
  }
}'

echo ""
echo -e "${GREEN}✅ Index template created!${NC}"
echo -e "${YELLOW}ℹ️  All new ft_transcendence-* indices will use this template${NC}"
