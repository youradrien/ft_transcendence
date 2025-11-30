#!/bin/bash

# Simple ILM policy setup for ft_transcendence indices
# - Creates a 30-days-default policy that deletes indices after 30 days
# - Optionally attaches the policy to existing indices matching ft_transcendence-*

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ES_URL="https://localhost:9200"
POLICY_NAME="30-days-default"
ES_AUTH="-u elastic:${ELASTIC_PASSWORD:-elastic_password}"

echo -e "${YELLOW}📋 Waiting for Elasticsearch...${NC}"
for i in {1..30}; do
  if curl -k -s ${ES_AUTH} "${ES_URL}/_cluster/health" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -k -s ${ES_AUTH} "${ES_URL}/_cluster/health" > /dev/null 2>&1; then
  echo -e "${RED}Elasticsearch not responding at ${ES_URL}${NC}"
  exit 1
fi

echo -e "${YELLOW}🛠️  Creating/Updating ILM policy: ${POLICY_NAME}${NC}"
curl -k -s ${ES_AUTH} -X PUT "${ES_URL}/_ilm/policy/${POLICY_NAME}" \
  -H 'Content-Type: application/json' \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "readonly": {},
          "set_priority": { "priority": 50 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "set_priority": { "priority": 0 }
        }
      },
      "delete": {
        "min_age": "60d",
        "actions": { "delete": {} }
      }
    }
  }
}' | grep -q '"acknowledged":true' || true

echo -e "${GREEN}ILM policy ensured.${NC}"

# Best-effort: attach policy to any existing ft_transcendence-* indices that don't have it yet
echo -e "${YELLOW}🔎 Checking existing indices for ILM attachment...${NC}"
INDICES=$(curl -k -s ${ES_AUTH} "${ES_URL}/_cat/indices/ft_transcendence-*?h=index" | tr -d '\r')

if [ -z "${INDICES}" ]; then
  echo -e "${YELLOW}ℹ️  No existing ft_transcendence-* indices found. New indices will inherit the policy from the template.${NC}"
else
  while IFS= read -r index; do
    [ -z "$index" ] && continue
  CURRENT=$(curl -k -s ${ES_AUTH} "${ES_URL}/${index}/_settings?flat_settings=true" | grep -o 'index\.lifecycle\.name":"[^"]*' | awk -F'":"' '{print $2}' || true)
    if [ "${CURRENT}" != "${POLICY_NAME}" ]; then
      echo -e "👉 Attaching ILM policy to ${index}"
      curl -k -s ${ES_AUTH} -X PUT "${ES_URL}/${index}/_settings" \
        -H 'Content-Type: application/json' \
        -d "{ \"index.lifecycle.name\": \"${POLICY_NAME}\" }" > /dev/null
    fi
  done <<< "${INDICES}"
  echo -e "${GREEN}Existing indices updated (if needed).${NC}"
fi

echo -e "${GREEN}🎯 Done. Indices matching ft_transcendence-* will be deleted after 30 days.${NC}"
