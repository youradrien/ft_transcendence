#!/bin/bash
# Ensure kibana_system password in Elasticsearch matches our compose env
# Safe to run repeatedly. Requires elastic superuser credentials.

set -euo pipefail

ES_URL=${ES_URL:-http://localhost:9200}
ES_USER=${ES_USER:-elastic}
ES_PASS=${ELASTIC_PASSWORD:-elastic_password}
KIBANA_PASS=${KIBANA_PASSWORD:-kibana_password}

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔐 Ensuring kibana_system password in Elasticsearch...${NC}"

# Wait for ES to respond with auth
for i in {1..30}; do
  if curl -s -u "$ES_USER:$ES_PASS" "$ES_URL/_security/_authenticate" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -s -u "$ES_USER:$ES_PASS" "$ES_URL/_security/_authenticate" > /dev/null 2>&1; then
  echo -e "${RED}❌ Cannot authenticate to Elasticsearch as $ES_USER at $ES_URL${NC}"
  exit 1
fi

# Set (or reset) kibana_system password to match our env
RESP=$(curl -s -u "$ES_USER:$ES_PASS" -X POST "$ES_URL/_security/user/kibana_system/_password" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$KIBANA_PASS\"}")

if echo "$RESP" | grep -q '"error"'; then
  echo -e "${RED}❌ Failed to set kibana_system password: $RESP${NC}"
  exit 1
fi

echo -e "${GREEN}✅ kibana_system password ensured.${NC}"
